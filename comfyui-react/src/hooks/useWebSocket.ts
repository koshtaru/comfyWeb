// React Hooks for ComfyUI WebSocket Integration
// Provides reactive interfaces for real-time ComfyUI communication

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ComfyUIWebSocketService } from '@/services/websocket'
import type {
  WebSocketConfig,
  WebSocketState,
  GenerationProgress,
  GenerationError,
  GeneratedImage,
  ConnectionStats,
  WebSocketEventHandlers
} from '@/types/websocket'

// Hook for basic WebSocket connection management
export const useWebSocket = (config: WebSocketConfig) => {
  const [connectionState, setConnectionState] = useState<WebSocketState>('disconnected')
  const [lastError, setLastError] = useState<string | null>(null)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    totalConnections: 0,
    totalReconnections: 0,
    totalMessages: 0,
    averageLatency: 0,
    uptime: 0,
    lastError: null,
    messagesPerSecond: 0
  })

  const serviceRef = useRef<ComfyUIWebSocketService | null>(null)
  const mountedRef = useRef(true)

  // Initialize WebSocket service
  useEffect(() => {
    serviceRef.current = new ComfyUIWebSocketService(config)
    
    const service = serviceRef.current

    // Set up event listeners
    const unsubscribes = [
      service.addEventListener('onOpen', () => {
        if (!mountedRef.current) return
        setConnectionState('connected')
        setLastError(null)
        setIsReconnecting(false)
      }),

      service.addEventListener('onClose', () => {
        if (!mountedRef.current) return
        setConnectionState('disconnected')
      }),

      service.addEventListener('onError', () => {
        if (!mountedRef.current) return
        setConnectionState('error')
        const state = service.getState()
        setLastError(state.lastError)
      })
    ]

    // Stats update timer
    const statsTimer = setInterval(() => {
      if (!mountedRef.current || !serviceRef.current) return
      setConnectionStats(serviceRef.current.getConnectionStats())
      
      const state = serviceRef.current.getState()
      setConnectionState(state.connectionState)
      setLastError(state.lastError)
      setIsReconnecting(state.isReconnecting)
    }, 1000)

    return () => {
      mountedRef.current = false
      unsubscribes.forEach(unsub => unsub())
      clearInterval(statsTimer)
      service.destroy()
    }
  }, [config])

  // Connection methods
  const connect = useCallback(async () => {
    if (!serviceRef.current) return
    try {
      await serviceRef.current.connect()
    } catch (error) {
      console.error('Failed to connect:', error)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (!serviceRef.current) return
    serviceRef.current.disconnect()
  }, [])

  const reconnect = useCallback(async () => {
    if (!serviceRef.current) return
    try {
      await serviceRef.current.reconnect()
    } catch (error) {
      console.error('Failed to reconnect:', error)
    }
  }, [])

  return {
    // State
    connectionState,
    lastError,
    isReconnecting,
    isConnected: connectionState === 'connected',
    connectionStats,
    
    // Methods
    connect,
    disconnect,
    reconnect,
    
    // Service access for advanced usage
    service: serviceRef.current
  }
}

// Hook for generation progress tracking
export const useGenerationProgress = (service: ComfyUIWebSocketService | null) => {
  const [progress, setProgress] = useState<GenerationProgress>({
    promptId: null,
    currentNode: null,
    currentNodeType: null,
    progress: 0,
    maxProgress: 0,
    isGenerating: false,
    startTime: null,
    endTime: null,
    queueRemaining: 0,
    executedNodes: [],
    lastUpdate: 0
  })

  const [recentErrors, setRecentErrors] = useState<GenerationError[]>([])
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])

  useEffect(() => {
    if (!service) return

    const unsubscribes = [
      // Progress updates
      service.addEventListener('onProgress', (data) => {
        setProgress(prev => ({
          ...prev,
          progress: data.value,
          maxProgress: data.max,
          currentNode: data.node,
          promptId: data.prompt_id,
          lastUpdate: Date.now()
        }))
      }),

      // Execution state changes
      service.addEventListener('onExecuting', (data) => {
        setProgress(prev => ({
          ...prev,
          currentNode: data.node,
          promptId: data.prompt_id,
          isGenerating: data.node !== null,
          lastUpdate: Date.now()
        }))
      }),

      // Execution start
      service.addEventListener('onExecutionStart', (data) => {
        setProgress(prev => ({
          ...prev,
          promptId: data.prompt_id,
          isGenerating: true,
          startTime: Date.now(),
          endTime: null,
          executedNodes: [],
          progress: 0,
          maxProgress: 0,
          lastUpdate: Date.now()
        }))
      }),

      // Execution completion
      service.addEventListener('onExecutionSuccess', (data) => {
        setProgress(prev => ({
          ...prev,
          promptId: data.prompt_id,
          isGenerating: false,
          endTime: Date.now(),
          currentNode: null,
          lastUpdate: Date.now()
        }))
      }),

      // Queue status
      service.addEventListener('onStatus', (data) => {
        setProgress(prev => ({
          ...prev,
          queueRemaining: data.status.exec_info.queue_remaining,
          lastUpdate: Date.now()
        }))
      }),

      // Error handling
      service.addEventListener('onExecutionError', (data) => {
        const error: GenerationError = {
          promptId: data.prompt_id,
          nodeId: data.node_id,
          nodeType: data.node_type,
          message: data.exception_message,
          type: data.exception_type,
          traceback: data.traceback,
          inputs: data.current_inputs,
          outputs: data.current_outputs,
          timestamp: Date.now()
        }

        setRecentErrors(prev => [error, ...prev.slice(0, 9)]) // Keep last 10 errors
        
        setProgress(prev => ({
          ...prev,
          isGenerating: false,
          endTime: Date.now(),
          lastUpdate: Date.now()
        }))
      }),

      // Image generation
      service.addEventListener('onB64Image', (data) => {
        const image: GeneratedImage = {
          promptId: data.prompt_id,
          nodeId: data.node_id,
          imageType: data.image_type,
          imageData: data.image_data,
          timestamp: Date.now()
        }

        // Convert base64 to blob URL for display
        try {
          const binary = atob(image.imageData)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
          }
          const blob = new Blob([bytes], { type: `image/${image.imageType}` })
          image.url = URL.createObjectURL(blob)
        } catch (error) {
          console.error('Failed to process image data:', error)
        }

        setGeneratedImages(prev => [image, ...prev.slice(0, 49)]) // Keep last 50 images
      })
    ]

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [service])

  // Computed values
  const progressPercentage = useMemo(() => {
    if (progress.maxProgress === 0) return 0
    return Math.round((progress.progress / progress.maxProgress) * 100)
  }, [progress.progress, progress.maxProgress])

  const estimatedTimeRemaining = useMemo(() => {
    if (!progress.isGenerating || !progress.startTime || progress.progress === 0) {
      return null
    }

    const elapsed = Date.now() - progress.startTime
    const rate = progress.progress / elapsed
    const remaining = (progress.maxProgress - progress.progress) / rate

    return Math.round(remaining / 1000) // Convert to seconds
  }, [progress])

  const generationDuration = useMemo(() => {
    if (!progress.startTime) return null
    const endTime = progress.endTime || Date.now()
    return Math.round((endTime - progress.startTime) / 1000) // Convert to seconds
  }, [progress.startTime, progress.endTime])

  // Utility methods
  const clearProgress = useCallback(() => {
    service?.clearProgress()
  }, [service])

  const clearErrors = useCallback(() => {
    setRecentErrors([])
  }, [])

  const clearImages = useCallback(() => {
    // Clean up blob URLs to prevent memory leaks
    generatedImages.forEach(img => {
      if (img.url) {
        URL.revokeObjectURL(img.url)
      }
    })
    setGeneratedImages([])
  }, [generatedImages])

  return {
    // Progress state
    progress,
    progressPercentage,
    estimatedTimeRemaining,
    generationDuration,
    
    // Error state
    recentErrors,
    hasErrors: recentErrors.length > 0,
    latestError: recentErrors[0] || null,
    
    // Image state
    generatedImages,
    latestImage: generatedImages[0] || null,
    
    // Utility methods
    clearProgress,
    clearErrors,
    clearImages
  }
}

// Hook for WebSocket message listening
export const useWebSocketMessages = (
  service: ComfyUIWebSocketService | null,
  handlers: Partial<WebSocketEventHandlers>
) => {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!service) return

    const unsubscribes: (() => void)[] = []

    // Register all provided handlers
    Object.entries(handlersRef.current).forEach(([event, handler]) => {
      if (handler) {
        const unsubscribe = service.addEventListener(
          event as keyof WebSocketEventHandlers,
          handler as any
        )
        unsubscribes.push(unsubscribe)
      }
    })

    return () => {
      unsubscribes.forEach(unsub => unsub())
    }
  }, [service])
}

// Hook for connection health monitoring
export const useConnectionHealth = (service: ComfyUIWebSocketService | null) => {
  const [health, setHealth] = useState({
    isHealthy: false,
    latency: null as number | null,
    uptime: 0,
    reconnectCount: 0,
    messageRate: 0,
    lastError: null as string | null
  })

  useEffect(() => {
    if (!service) return

    const updateHealth = () => {
      const stats = service.getConnectionStats()
      const state = service.getState()
      
      setHealth({
        isHealthy: service.isConnected() && state.lastError === null,
        latency: service.getLatency(),
        uptime: stats.uptime,
        reconnectCount: stats.totalReconnections,
        messageRate: stats.messagesPerSecond,
        lastError: state.lastError
      })
    }

    // Update immediately
    updateHealth()

    // Update periodically
    const timer = setInterval(updateHealth, 1000)

    return () => {
      clearInterval(timer)
    }
  }, [service])

  return health
}

// Hook for debugging WebSocket service
export const useWebSocketDebug = (service: ComfyUIWebSocketService | null) => {
  const [debugInfo, setDebugInfo] = useState<Record<string, any> | null>(null)
  const [debugEnabled, setDebugEnabled] = useState(false)

  useEffect(() => {
    if (!service) return

    const updateDebugInfo = () => {
      if (debugEnabled) {
        setDebugInfo(service.getDebugInfo())
      }
    }

    if (debugEnabled) {
      updateDebugInfo()
      const timer = setInterval(updateDebugInfo, 1000)
      return () => clearInterval(timer)
    }
  }, [service, debugEnabled])

  const toggleDebug = useCallback(() => {
    if (!service) return
    
    const newState = !debugEnabled
    setDebugEnabled(newState)
    
    if (newState) {
      service.enableDebug()
    } else {
      service.disableDebug()
      setDebugInfo(null)
    }
  }, [service, debugEnabled])

  return {
    debugInfo,
    debugEnabled,
    toggleDebug
  }
}