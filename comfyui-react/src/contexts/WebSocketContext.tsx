// WebSocket Context Provider for ComfyUI React
// Provides global WebSocket state and functionality across the application

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { ComfyUIWebSocketService } from '@/services/websocket'
import { useWebSocket, useGenerationProgress, useConnectionHealth } from '@/hooks/useWebSocket'
import { uploadToasts } from '@/utils/toast'
import { useAPIStore } from '@/store/apiStore'
import { generationService } from '@/services/generationService'
import type { 
  WebSocketConfig, 
  WebSocketState, 
  GenerationProgress, 
  GenerationError, 
  GeneratedImage,
  ConnectionStats,
  ComfyUIMessage
} from '@/types/websocket'

// Context interface
interface WebSocketContextValue {
  // Connection state
  connectionState: WebSocketState
  isConnected: boolean
  isReconnecting: boolean
  lastError: string | null
  connectionStats: ConnectionStats
  
  // Generation state
  progress: GenerationProgress
  progressPercentage: number
  estimatedTimeRemaining: number | null
  generationDuration: number | null
  
  // Error and image state
  recentErrors: GenerationError[]
  hasErrors: boolean
  latestError: GenerationError | null
  generatedImages: GeneratedImage[]
  latestImage: GeneratedImage | null
  
  // Connection health
  health: {
    isHealthy: boolean
    latency: number | null
    uptime: number
    reconnectCount: number
    messageRate: number
    lastError: string | null
  }
  
  // Methods
  connect: () => void
  disconnect: () => void
  reconnect: () => void
  clearProgress: () => void
  clearErrors: () => void
  clearImages: () => void
  
  // Service access
  service: ComfyUIWebSocketService | null
  
  // Message subscription
  subscribeToMessages: (handler: (message: ComfyUIMessage) => void) => () => void
}

// Create context
const WebSocketContext = createContext<WebSocketContextValue | null>(null)

// Provider props
interface WebSocketProviderProps {
  children: React.ReactNode
  config?: Partial<WebSocketConfig>
  autoConnect?: boolean
  showToastNotifications?: boolean
}

// Default configuration
const defaultConfig: WebSocketConfig = {
  url: 'ws://192.168.1.15:8188/ws',
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 5000,
  heartbeatInterval: 30000,
  messageTimeout: 300000, // 5 minutes instead of 10 seconds - allow for long generations
  debug: false
}

// Utility function to convert HTTP endpoint to WebSocket URL
const convertToWebSocketURL = (httpEndpoint: string, clientId?: string): string => {
  try {
    const url = new URL(httpEndpoint)
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${url.host}/ws`
    return clientId ? `${wsUrl}?clientId=${clientId}` : wsUrl
  } catch (error) {
    console.warn('Invalid HTTP endpoint, falling back to default WebSocket URL:', error)
    return 'ws://192.168.1.15:8188/ws'
  }
}

// Provider component
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({
  children,
  config = {},
  autoConnect: _autoConnect = false, // Renamed to indicate it's intentionally unused
  showToastNotifications = true
}) => {
  const { endpoint } = useAPIStore()
  
  // Dynamically generate WebSocket URL from API endpoint
  const dynamicWebSocketURL = useMemo(() => {
    console.log('WebSocket URL generation - endpoint from store:', endpoint)
    if (config.url) {
      console.log('Using provided WebSocket URL:', config.url)
      return config.url // Use provided URL if specified
    }
    
    // Force use of current endpoint from store, ignore any cached values
    const currentEndpoint = endpoint || 'http://192.168.1.15:8188'
    // Get client ID from generation service
    const clientId = generationService.getClientId()
    const wsUrl = convertToWebSocketURL(currentEndpoint, clientId)
    console.log('Generated WebSocket URL from endpoint:', currentEndpoint, '→', wsUrl, 'with clientId:', clientId)
    return wsUrl
  }, [endpoint, config.url])
  
  const finalConfig = { 
    ...defaultConfig, 
    ...config,
    url: dynamicWebSocketURL
  }
  
  // Core WebSocket hook
  const {
    connectionState,
    lastError,
    isReconnecting,
    isConnected,
    connectionStats,
    connect: connectWS,
    disconnect: disconnectWS,
    reconnect: reconnectWS,
    service
  } = useWebSocket(finalConfig)

  // Generation progress hook
  const {
    progress,
    progressPercentage,
    estimatedTimeRemaining,
    generationDuration,
    recentErrors,
    hasErrors,
    latestError,
    generatedImages,
    latestImage,
    clearProgress: clearProgressHook,
    clearErrors: clearErrorsHook,
    clearImages: clearImagesHook
  } = useGenerationProgress(service)

  // Connection health hook
  const health = useConnectionHealth(service)

  // Toast notifications state
  const [lastToastState, setLastToastState] = useState<{
    connectionState: WebSocketState
    hasErrors: boolean
    errorCount: number
  }>({
    connectionState: 'disconnected',
    hasErrors: false,
    errorCount: 0
  })

  // Auto-connect disabled to prevent browser crashes
  // useEffect(() => {
  //   console.log('Auto-connect effect:', { autoConnect, service: !!service, connectWS: !!connectWS })
  //   if (autoConnect && service && connectWS) {
  //     console.log('Attempting auto-connect...')
  //     try {
  //       connectWS()
  //     } catch (error) {
  //       console.error('Auto-connect failed:', error)
  //     }
  //   } else {
  //     console.log('Auto-connect skipped:', { autoConnect, service: !!service, connectWS: !!connectWS })
  //   }
  // }, [autoConnect, service, connectWS])

  // Toast notifications for connection state changes
  useEffect(() => {
    if (!showToastNotifications) return

    // Connection state notifications
    if (connectionState !== lastToastState.connectionState) {
      switch (connectionState) {
        case 'connected':
          if (lastToastState.connectionState === 'reconnecting') {
            uploadToasts.info('Reconnected', {
              message: 'Connection to ComfyUI restored',
              duration: 3000
            })
          } else if (lastToastState.connectionState !== 'disconnected') {
            uploadToasts.info('Connected', {
              message: 'Connected to ComfyUI server',
              duration: 3000
            })
          }
          break
          
        case 'disconnected':
          if (lastToastState.connectionState === 'connected') {
            uploadToasts.warning('Disconnected', {
              message: 'Lost connection to ComfyUI server',
              duration: 5000
            })
          }
          break
          
        case 'error':
          uploadToasts.error('Connection Error', {
            message: lastError || 'Failed to connect to ComfyUI server',
            duration: 8000,
            action: {
              label: 'Retry',
              onClick: () => reconnectWS()
            }
          })
          break
          
        case 'reconnecting':
          uploadToasts.info('Reconnecting', {
            message: 'Attempting to reconnect to ComfyUI...',
            duration: 3000
          })
          break
      }
    }

    // Error notifications
    if (hasErrors && recentErrors.length > lastToastState.errorCount) {
      const newError = recentErrors[0]
      uploadToasts.error('Generation Error', {
        message: `${newError.nodeType}: ${newError.message}`,
        duration: 10000,
        action: {
          label: 'Details',
          onClick: () => console.error('Generation Error Details:', newError)
        }
      })
    }

    // Update last toast state
    setLastToastState({
      connectionState,
      hasErrors,
      errorCount: recentErrors.length
    })
  }, [
    connectionState,
    lastError,
    hasErrors,
    recentErrors.length,
    showToastNotifications,
    // Removed lastToastState to prevent infinite loop
    reconnectWS
  ])

  // Generation completion notifications
  useEffect(() => {
    if (!showToastNotifications || !progress.promptId) return

    // Notify when generation completes successfully
    if (!progress.isGenerating && progress.endTime && progress.startTime) {
      const duration = Math.round((progress.endTime - progress.startTime) / 1000)
      
      if (recentErrors.length === 0 || recentErrors[0].promptId !== progress.promptId) {
        uploadToasts.info('Generation Complete', {
          message: `Completed in ${duration}s`,
          duration: 4000
        })
      }
    }
  }, [
    progress.isGenerating,
    progress.endTime,
    progress.startTime,
    progress.promptId,
    recentErrors.length,
    showToastNotifications
  ])

  // Image generation notifications
  useEffect(() => {
    if (!showToastNotifications || generatedImages.length === 0) return

    const latestImage = generatedImages[0]
    if (latestImage && Date.now() - latestImage.timestamp < 5000) {
      uploadToasts.info('Image Generated', {
        message: `New image from ${latestImage.nodeId}`,
        duration: 3000
      })
    }
  }, [generatedImages.length, showToastNotifications])

  // Message subscription method
  const subscribeToMessages = useCallback((handler: (message: ComfyUIMessage) => void) => {
    if (!service) {
      return () => {} // Return empty unsubscribe function
    }

    return service.addEventListener('onMessage', handler)
  }, [service])

  // Enhanced connection methods with error handling
  const connect = useCallback(() => {
    try {
      connectWS()
    } catch (error) {
      console.error('Connection failed:', error)
      if (showToastNotifications) {
        uploadToasts.error('Connection Failed', {
          message: 'Failed to connect to ComfyUI server',
          duration: 8000,
          action: {
            label: 'Retry',
            onClick: connect
          }
        })
      }
    }
  }, [connectWS, showToastNotifications])

  const disconnect = useCallback(() => {
    disconnectWS()
    if (showToastNotifications) {
      uploadToasts.info('Disconnected', {
        message: 'Disconnected from ComfyUI server',
        duration: 3000
      })
    }
  }, [disconnectWS, showToastNotifications])

  const reconnect = useCallback(() => {
    try {
      if (showToastNotifications) {
        uploadToasts.info('Reconnecting', {
          message: 'Attempting to reconnect...',
          duration: 3000
        })
      }
      reconnectWS()
    } catch (error) {
      console.error('Reconnection failed:', error)
      if (showToastNotifications) {
        uploadToasts.error('Reconnection Failed', {
          message: 'Failed to reconnect to ComfyUI server',
          duration: 8000,
          action: {
            label: 'Retry',
            onClick: reconnect
          }
        })
      }
    }
  }, [reconnectWS, showToastNotifications])

  // Enhanced utility methods
  const clearProgress = useCallback(() => {
    clearProgressHook()
    if (showToastNotifications) {
      uploadToasts.info('Progress Cleared', {
        message: 'Generation progress has been reset',
        duration: 2000
      })
    }
  }, [clearProgressHook, showToastNotifications])

  const clearErrors = useCallback(() => {
    clearErrorsHook()
    if (showToastNotifications) {
      uploadToasts.info('Errors Cleared', {
        message: 'Error history has been cleared',
        duration: 2000
      })
    }
  }, [clearErrorsHook, showToastNotifications])

  const clearImages = useCallback(() => {
    clearImagesHook()
    if (showToastNotifications) {
      uploadToasts.info('Images Cleared', {
        message: 'Generated images cleared from memory',
        duration: 2000
      })
    }
  }, [clearImagesHook, showToastNotifications])

  // Context value
  const contextValue: WebSocketContextValue = {
    // Connection state
    connectionState,
    isConnected,
    isReconnecting,
    lastError,
    connectionStats,
    
    // Generation state
    progress,
    progressPercentage,
    estimatedTimeRemaining,
    generationDuration,
    
    // Error and image state
    recentErrors,
    hasErrors,
    latestError,
    generatedImages,
    latestImage,
    
    // Connection health
    health,
    
    // Methods
    connect,
    disconnect,
    reconnect,
    clearProgress,
    clearErrors,
    clearImages,
    
    // Service access
    service,
    
    // Message subscription
    subscribeToMessages
  }

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  )
}

// Hook to use WebSocket context
export const useWebSocketContext = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext)
  
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider')
  }
  
  return context
}

// Hook for connection status only (lightweight)
export const useConnectionStatus = () => {
  const { connectionState, isConnected, isReconnecting, lastError, health } = useWebSocketContext()
  
  return {
    connectionState,
    isConnected,
    isReconnecting,
    lastError,
    isHealthy: health.isHealthy,
    latency: health.latency
  }
}

// Hook for generation progress only
export const useComfyProgress = () => {
  const {
    progress,
    progressPercentage,
    estimatedTimeRemaining,
    generationDuration,
    clearProgress
  } = useWebSocketContext()
  
  return {
    progress,
    progressPercentage,
    estimatedTimeRemaining,
    generationDuration,
    isGenerating: progress.isGenerating,
    currentNode: progress.currentNode,
    queueRemaining: progress.queueRemaining,
    clearProgress
  }
}

// Hook for error handling
export const useGenerationErrors = () => {
  const {
    recentErrors,
    hasErrors,
    latestError,
    clearErrors
  } = useWebSocketContext()
  
  return {
    recentErrors,
    hasErrors,
    latestError,
    errorCount: recentErrors.length,
    clearErrors
  }
}

// Hook for generated images
export const useGeneratedImages = () => {
  const {
    generatedImages,
    latestImage,
    clearImages
  } = useWebSocketContext()
  
  return {
    generatedImages,
    latestImage,
    imageCount: generatedImages.length,
    clearImages
  }
}