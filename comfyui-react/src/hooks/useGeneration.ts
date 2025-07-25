// Custom hook for managing ComfyUI generation
import { useState, useCallback, useEffect } from 'react'
import { generationService } from '@/services/generationService'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { useAPIStore } from '@/store/apiStore'
import type { ComfyUIWorkflow } from '@/types'

export interface GenerationState {
  isGenerating: boolean
  currentPromptId: string | null
  error: string | null
  lastGeneration: {
    promptId: string
    nodeCount: number
    startTime: number
  } | null
}

export interface UseGenerationReturn {
  state: GenerationState
  generate: (workflow: ComfyUIWorkflow) => Promise<void>
  interrupt: () => Promise<void>
  clearError: () => void
  isReady: boolean
}

export const useGeneration = (): UseGenerationReturn => {
  const { isConnected, service, connect: connectWS } = useWebSocketContext()
  const { endpoint } = useAPIStore()
  
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    currentPromptId: null,
    error: null,
    lastGeneration: null
  })

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Generate image from workflow
  const generate = useCallback(async (workflow: ComfyUIWorkflow) => {
    console.log('[useGeneration] generate called with workflow:', !!workflow)
    
    if (!workflow) {
      console.error('[useGeneration] No workflow provided')
      setState(prev => ({ ...prev, error: 'No workflow provided' }))
      return
    }

    if (state.isGenerating) {
      console.warn('[Generation] Generation already in progress')
      return
    }

    try {
      setState(prev => ({
        ...prev,
        isGenerating: true,
        error: null,
        currentPromptId: null
      }))

      // Ensure WebSocket is connected for real-time updates during generation
      if (service && !isConnected) {
        console.log('[Generation] Connecting WebSocket for real-time updates...')
        try {
          connectWS()
        } catch (wsError) {
          console.warn('[Generation] WebSocket connection failed, continuing without real-time updates:', wsError)
        }
      }

      console.log('[Generation] Starting generation with workflow:', {
        nodeCount: Object.keys(workflow).length,
        clientId: generationService.getClientId()
      })

      const response = await generationService.generateImage(workflow)
      
      setState(prev => ({
        ...prev,
        currentPromptId: response.prompt_id,
        lastGeneration: {
          promptId: response.prompt_id,
          nodeCount: Object.keys(workflow).length,
          startTime: Date.now()
        }
      }))

      console.log('[Generation] Workflow submitted successfully:', {
        promptId: response.prompt_id,
        queueNumber: response.number,
        nodeErrors: response.node_errors
      })
      
      // Check if there were node errors
      if (response.node_errors && Object.keys(response.node_errors).length > 0) {
        console.error('[Generation] ⚠️ NODE ERRORS - Workflow won\'t execute properly:', response.node_errors)
        setState(prev => ({
          ...prev,
          error: 'Workflow has node errors - check console for details'
        }))
      }

      // Fallback: Check generation status after a reasonable time if WebSocket doesn't update
      setTimeout(() => {
        setState(prev => {
          if (prev.isGenerating && prev.currentPromptId === response.prompt_id) {
            console.log('[Generation] WebSocket didn\'t detect completion after 30s, marking as complete')
            return {
              ...prev,
              isGenerating: false
            }
          }
          return prev
        })
      }, 30000) // 30 seconds timeout to allow for long generations

    } catch (error: any) {
      console.error('[Generation] Failed to start generation:', error)
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error.message || 'Failed to start generation',
        currentPromptId: null
      }))
    }
  }, [state.isGenerating, isConnected, service, connectWS])

  // Interrupt current generation
  const interrupt = useCallback(async () => {
    if (!state.isGenerating) {
      console.warn('[Generation] No generation to interrupt')
      return
    }

    try {
      console.log('[Generation] Interrupting generation')
      await generationService.interruptGeneration()
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        currentPromptId: null
      }))

      console.log('[Generation] Generation interrupted successfully')
    } catch (error: any) {
      console.error('[Generation] Failed to interrupt generation:', error)
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to interrupt generation'
      }))
    }
  }, [state.isGenerating])

  // Listen to WebSocket events to update generation state
  useEffect(() => {
    if (!service) return

    const unsubscribeStart = service.addEventListener('onExecutionStart', (data: any) => {
      console.log('[Generation] Execution started:', data)
      if (data.prompt_id === state.currentPromptId) {
        setState(prev => ({
          ...prev,
          isGenerating: true
        }))
      }
    })

    const unsubscribeSuccess = service.addEventListener('onExecutionSuccess', (data: any) => {
      console.log('[Generation] ✅ Execution completed successfully:', data)
      console.log('[Generation] Current prompt ID:', state.currentPromptId)
      console.log('[Generation] Event prompt ID:', data.prompt_id)
      
      // Wait a bit for executed events, then check history API and mark as complete
      console.log('[Generation] Workflow execution complete, waiting for image outputs...')
      
      setTimeout(async () => {
        setState(prev => {
          if (prev.isGenerating && prev.currentPromptId === data.prompt_id) {
            console.log('[Generation] ⚠️ No executed events received after 3s, checking history API...')
            
            // Try to fetch images from ComfyUI history API as fallback
            try {
              const historyEndpoint = `${endpoint}/history/${data.prompt_id}`
              console.log('[Generation] Fetching from history API:', historyEndpoint)
              
              fetch(historyEndpoint)
                .then(response => response.json())
                .then(historyData => {
                  console.log('[Generation] History API response:', historyData)
                  
                  // Process history data to extract images (matching original HTML/JS approach)
                  if (historyData && historyData[data.prompt_id]) {
                    const promptData = historyData[data.prompt_id]
                    console.log('[Generation] Found prompt data in history:', promptData)
                    
                    if (promptData.outputs) {
                      console.log('[Generation] Processing outputs from history:', promptData.outputs)
                      
                      // Extract images from outputs (same logic as original script.js)
                      const imageUrls: any[] = []
                      
                      for (const nodeId in promptData.outputs) {
                        const nodeOutput = promptData.outputs[nodeId]
                        console.log(`[Generation] Checking node ${nodeId}:`, nodeOutput)
                        
                        if (nodeOutput.images && Array.isArray(nodeOutput.images)) {
                          console.log(`[Generation] Found ${nodeOutput.images.length} images in node ${nodeId}`)
                          
                          for (const image of nodeOutput.images) {
                            console.log('[Generation] Processing image from history:', image)
                            if (image.filename) {
                              const imageUrl = `${endpoint}/view?filename=${encodeURIComponent(image.filename)}&type=output`
                              imageUrls.push({
                                promptId: data.prompt_id,
                                nodeId: nodeId,
                                imageType: image.type || 'png',
                                timestamp: Date.now(),
                                url: imageUrl
                              })
                            }
                          }
                        }
                      }
                      
                      if (imageUrls.length > 0) {
                        console.log(`[Generation] 🎉 Found ${imageUrls.length} images from history API!`)
                        // Trigger a custom event to update the images in the WebSocket context
                        window.dispatchEvent(new CustomEvent('comfyui-images-found', { 
                          detail: { images: imageUrls } 
                        }))
                      } else {
                        console.log('[Generation] ⚠️ No images found in history data')
                      }
                    }
                  }
                })
                .catch(error => {
                  console.error('[Generation] Failed to fetch from history API:', error)
                })
            } catch (error) {
              console.error('[Generation] Error checking history API:', error)
            }
            
            return {
              ...prev,
              isGenerating: false
            }
          }
          return prev
        })
      }, 3000) // 3 second grace period for executed events
    })
    
    // Also listen for executed events which contain the actual outputs
    const unsubscribeExecuted = service.addEventListener('onExecuted', (data: any) => {
      console.log('[Generation] 🖼️ Node executed with outputs:', data)
      
      // Check if this execution contains images in any output
      let hasImages = false
      if (data.output && typeof data.output === 'object') {
        for (const [outputKey, outputValue] of Object.entries(data.output)) {
          if (outputValue && Array.isArray((outputValue as any).images)) {
            hasImages = true
            break
          }
        }
      }
      
      if (hasImages) {
        console.log('[Generation] 🖼️ Images generated in executed event, marking as complete')
        setState(prev => ({
          ...prev,
          isGenerating: false
        }))
      }
    })

    const unsubscribeError = service.addEventListener('onExecutionError', (data: any) => {
      console.error('[Generation] Execution error:', data)
      // Always mark as not generating and show error on any execution error
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: `Generation failed: ${data.exception_message || 'Unknown error'}`
      }))
    })

    const unsubscribeInterrupted = service.addEventListener('onExecutionInterrupted', (data: any) => {
      console.log('[Generation] Execution interrupted:', data)
      // Always mark as not generating on interruption
      setState(prev => ({
        ...prev,
        isGenerating: false
      }))
    })

    return () => {
      unsubscribeStart()
      unsubscribeSuccess()
      unsubscribeExecuted()
      unsubscribeError() 
      unsubscribeInterrupted()
    }
  }, [service, state.currentPromptId])

  // Check if ready to generate - don't require persistent WebSocket connection
  // ComfyUI WebSocket will connect when needed for real-time updates
  const isReady = !state.isGenerating

  return {
    state,
    generate,
    interrupt,
    clearError,
    isReady
  }
}