// Custom hook for managing ComfyUI generation
import { useState, useCallback, useEffect } from 'react'
import { generationService } from '@/services/generationService'
import { useWebSocketStore } from '@/store'
import { useAPIStore } from '@/store/apiStore'
import type { ComfyUIWorkflow } from '@/types'
import { createComponentLogger } from '@/utils/logger'
import { uploadToasts } from '@/utils/toast'

// Event data interfaces
interface ExecutionEventData {
  prompt_id?: string
  node?: string
}

interface ExecutionSuccessData extends ExecutionEventData {
  outputs?: Record<string, {
    images?: Array<{
      filename: string
      subfolder: string
      type: string
    }>
  }>
}

interface ExecutionErrorData extends ExecutionEventData {
  exception_message?: string
  exception_type?: string
  traceback?: string[]
  node_id?: string
  node_type?: string
}

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
  const logger = createComponentLogger('useGeneration')
  
  const isConnected = useWebSocketStore((state) => state.isConnected)
  const getService = useWebSocketStore((state) => state.getService)
  const connectWS = useWebSocketStore((state) => state.connect)
  const addGeneratedImages = useWebSocketStore((state) => state.addGeneratedImages)
  const setProgress = useWebSocketStore((state) => state.setProgress)
  const service = getService()
  const { endpoint } = useAPIStore()
  
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    currentPromptId: null,
    error: null,
    lastGeneration: null
  })

  // Create unique instance ID to prevent duplicate event handling
  const instanceId = useState(() => `gen_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`)[0]

  // Log hook initialization
  logger.info('useGeneration hook initialized', { isConnected, endpoint, instanceId })

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

      // Initialize progress in WebSocket store
      setProgress({
        promptId: response.prompt_id,
        currentNode: null,
        currentNodeType: null,
        progress: 0,
        maxProgress: 0,
        isGenerating: true,
        startTime: Date.now(),
        endTime: null,
        queueRemaining: response.number || 0,
        executedNodes: [],
        cachedNodes: [],
        lastUpdate: Date.now()
      })

      console.log('[Generation] Workflow submitted successfully:', {
        promptId: response.prompt_id,
        queueNumber: response.number,
        nodeErrors: response.node_errors
      })

      // Show generation start toast
      uploadToasts.info('Generation Started', {
        message: `Workflow submitted to queue (position: ${response.number || 'unknown'})`,
        duration: 3000
      })
      
      // Check if there were node errors
      if (response.node_errors && Object.keys(response.node_errors).length > 0) {
        console.error('[Generation] ⚠️ NODE ERRORS - Workflow won\'t execute properly:', response.node_errors)
        
        // Create detailed error message from node errors
        const nodeErrorMessages = Object.entries(response.node_errors).map(([nodeId, error]: [string, any]) => {
          if (error.type === 'value_not_found') {
            return `Node ${nodeId}: ${error.message}. Possible missing input or invalid connection.`
          }
          return `Node ${nodeId}: ${error.message || 'Unknown error'}`
        }).join('\n')
        
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: `Workflow has validation errors:\n${nodeErrorMessages}`,
          currentPromptId: null
        }))
        return // Don't continue with generation if there are node errors
      }

      // Fallback: Check generation status after a reasonable time if WebSocket doesn't update
      setTimeout(() => {
        setState(prev => {
          if (prev.isGenerating && prev.currentPromptId === response.prompt_id) {
            console.log('[Generation] WebSocket didn\'t detect completion after 120s, marking as complete')
            return {
              ...prev,
              isGenerating: false
            }
          }
          return prev
        })
      }, 120000) // 120 seconds timeout to allow for model loading and long generations

    } catch (error: unknown) {
      console.error('[Generation] Failed to start generation:', error)
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to start generation',
        currentPromptId: null
      }))
    }
  }, [isConnected, service, connectWS, setProgress, addGeneratedImages])

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
    } catch (error: unknown) {
      console.error('[Generation] Failed to interrupt generation:', error)
      setState(prev => ({
        ...prev,
        error: (error instanceof Error ? error.message : String(error)) || 'Failed to interrupt generation'
      }))
    }
  }, [state.isGenerating])

  // Listen to WebSocket events to update generation state
  useEffect(() => {
    if (!service) return

    console.log(`[Generation:${instanceId}] Setting up WebSocket event listeners`)

    const unsubscribeStart = service.addEventListener('onExecutionStart', (data: ExecutionEventData) => {
      console.log(`[Generation:${instanceId}] Execution started:`, data)
      setState(prev => {
        if (data.prompt_id && data.prompt_id === prev.currentPromptId) {
          return {
            ...prev,
            isGenerating: true
          }
        }
        return prev
      })
    })

    const unsubscribeSuccess = service.addEventListener('onExecutionSuccess', (data: ExecutionSuccessData) => {
      console.log(`[Generation:${instanceId}] ✅ Execution completed successfully:`, data)
      
      // Wait a bit for executed events, then check history API and mark as complete
      console.log(`[Generation:${instanceId}] Workflow execution complete, waiting for image outputs...`)
      
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
                  if (historyData && data.prompt_id && historyData[data.prompt_id]) {
                    const promptData = historyData[data.prompt_id]
                    console.log('[Generation] Found prompt data in history:', promptData)
                    
                    if (promptData.outputs) {
                      console.log('[Generation] Processing outputs from history:', promptData.outputs)
                      
                      // Extract images from outputs (same logic as original script.js)
                      const imageUrls: Array<{
                        promptId: string | undefined
                        nodeId: string
                        imageType: string
                        timestamp: number
                        url: string
                      }> = []
                      
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
                        // Add images directly to the WebSocket store
                        addGeneratedImages(imageUrls)
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
    const unsubscribeExecuted = service.addEventListener('onExecuted', (data: ExecutionSuccessData) => {
      console.log(`[Generation:${instanceId}] 🖼️ Node executed with outputs:`, data)
      
      // Check if this execution contains images in any output
      let hasImages = false
      if (data.outputs && typeof data.outputs === 'object') {
        for (const [, outputValue] of Object.entries(data.outputs)) {
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

    const unsubscribeError = service.addEventListener('onExecutionError', (data: ExecutionErrorData) => {
      console.error(`[Generation:${instanceId}] Execution error:`, data)
      // Always mark as not generating and show error on any execution error
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: `Generation failed: ${data.exception_message || 'Unknown error'}`
      }))
    })

    const unsubscribeInterrupted = service.addEventListener('onExecutionInterrupted', (data: ExecutionEventData) => {
      console.log(`[Generation:${instanceId}] Execution interrupted:`, data)
      // Always mark as not generating on interruption
      setState(prev => ({
        ...prev,
        isGenerating: false
      }))
    })

    return () => {
      console.log(`[Generation:${instanceId}] Cleaning up WebSocket event listeners`)
      unsubscribeStart()
      unsubscribeSuccess()
      unsubscribeExecuted()
      unsubscribeError() 
      unsubscribeInterrupted()
    }
  }, [service, endpoint, addGeneratedImages])

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