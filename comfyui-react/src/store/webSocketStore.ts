// ============================================================================
// ComfyUI React - WebSocket State Store
// ============================================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ComfyUIWebSocketService } from '@/services/websocket'
import { uploadToasts } from '@/utils/toast'
import { useAPIStore } from './apiStore'
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

interface WebSocketStoreState {
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
  
  // Service instance
  service: ComfyUIWebSocketService | null
  
  // Configuration
  config: WebSocketConfig
  showToastNotifications: boolean
  
  // Message handlers
  messageHandlers: Set<(message: ComfyUIMessage) => void>
}

interface WebSocketStoreActions {
  // Configuration
  setConfig: (config: Partial<WebSocketConfig>) => void
  setShowToastNotifications: (show: boolean) => void
  
  // Connection methods
  connect: () => void
  disconnect: () => void
  reconnect: () => void
  
  // State updates (internal)
  setConnectionState: (state: WebSocketState) => void
  setConnected: (connected: boolean) => void
  setReconnecting: (reconnecting: boolean) => void
  setLastError: (error: string | null) => void
  setConnectionStats: (stats: ConnectionStats) => void
  
  // Generation state updates
  setProgress: (progress: GenerationProgress) => void
  setProgressPercentage: (percentage: number) => void
  setEstimatedTimeRemaining: (time: number | null) => void
  setGenerationDuration: (duration: number | null) => void
  
  // Error management
  addError: (error: GenerationError) => void
  clearErrors: () => void
  
  // Image management
  addGeneratedImage: (image: GeneratedImage) => void
  addGeneratedImages: (images: GeneratedImage[]) => void
  clearImages: () => void
  
  // Health updates
  updateHealth: (health: Partial<WebSocketStoreState['health']>) => void
  
  // Utility methods
  clearProgress: () => void
  
  // Message subscription
  subscribeToMessages: (handler: (message: ComfyUIMessage) => void) => () => void
  
  // Service management
  initializeService: () => void
  destroyService: () => void
  getService: () => ComfyUIWebSocketService | null
}

type WebSocketStore = WebSocketStoreState & WebSocketStoreActions

// Default configuration
const defaultConfig: WebSocketConfig = {
  url: 'ws://192.168.1.15:8188/ws',
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectInterval: 5000,
  heartbeatInterval: 30000,
  messageTimeout: 300000,
  debug: false
}

// Default states
const defaultProgress: GenerationProgress = {
  isGenerating: false,
  currentNode: null,
  currentNodeType: null,
  progress: 0,
  maxProgress: 0,
  queueRemaining: 0,
  promptId: null,
  startTime: null,
  endTime: null,
  executedNodes: [],
  cachedNodes: []
}

const defaultConnectionStats: ConnectionStats = {
  totalConnections: 0,
  totalReconnections: 0,
  totalMessages: 0,
  averageLatency: 0,
  uptime: 0,
  lastError: null,
  messagesPerSecond: 0
}

const defaultHealth = {
  isHealthy: false,
  latency: null,
  uptime: 0,
  reconnectCount: 0,
  messageRate: 0,
  lastError: null
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

export const useWebSocketStore = create<WebSocketStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      connectionState: 'disconnected',
      isConnected: false,
      isReconnecting: false,
      lastError: null,
      connectionStats: defaultConnectionStats,
      progress: defaultProgress,
      progressPercentage: 0,
      estimatedTimeRemaining: null,
      generationDuration: null,
      recentErrors: [],
      hasErrors: false,
      latestError: null,
      generatedImages: [],
      latestImage: null,
      health: defaultHealth,
      service: null,
      config: defaultConfig,
      showToastNotifications: true,
      messageHandlers: new Set(),

      // Configuration actions
      setConfig: (newConfig) => {
        set((state) => ({ config: { ...state.config, ...newConfig } }), false, 'setConfig')
      },

      setShowToastNotifications: (show) => 
        set({ showToastNotifications: show }, false, 'setShowToastNotifications'),

      // Connection methods
      connect: () => {
        set({ connectionState: 'connecting' }, false, 'connect:start')
        
        // Initialize service if needed, then connect
        const state = get()
        if (!state.service) {
          // Initialize service with safe approach
          try {
            const endpoint = 'http://192.168.1.15:8188'
            const clientId = generationService.getClientId()
            const websocketUrl = convertToWebSocketURL(endpoint, clientId)
            
            const finalConfig = { ...state.config, url: websocketUrl }
            const service = new ComfyUIWebSocketService(finalConfig)
            
            // Add existing message handlers to the new service
            state.messageHandlers.forEach(handler => {
              try {
                service.addEventListener('onMessage', handler)
              } catch (error) {
                console.error('Failed to add existing message handler:', error)
              }
            })
            
            // Set up event listeners (avoiding get() calls)
            service.addEventListener('onOpen', () => {
              set({ 
                connectionState: 'connected',
                isConnected: true,
                isReconnecting: false
              }, false, 'onOpen')
              
              // Show connection success toast
              uploadToasts.info('Connected', {
                message: 'Connected to ComfyUI server',
                duration: 3000
              })
            })
            
            service.addEventListener('onClose', () => {
              set({ 
                connectionState: 'disconnected',
                isConnected: false,
                isReconnecting: false
              }, false, 'onClose')
              
              // Show disconnection toast
              uploadToasts.warning('Disconnected', {
                message: 'Lost connection to ComfyUI server',
                duration: 5000
              })
            })
            
            service.addEventListener('onError', (error) => {
              set({ 
                connectionState: 'error',
                isConnected: false,
                lastError: error instanceof Error ? error.message : 'WebSocket error'
              }, false, 'onError')
              
              // Show error toast
              uploadToasts.error('Connection Error', {
                message: error instanceof Error ? error.message : 'Failed to connect to ComfyUI server',
                duration: 8000
              })
            })

            // Add progress event handlers (simplified, no throttling for now)
            service.addEventListener('onProgress', (progressData) => {
              console.log('[WebSocketStore] Received progress data:', progressData)
              if (progressData && typeof progressData === 'object') {
                set((state) => {
                  const newProgress = {
                    ...state.progress,
                    progress: progressData.value || 0,
                    maxProgress: progressData.max || 100,
                    currentNode: progressData.node || state.progress.currentNode,
                    isGenerating: true,
                    lastUpdate: Date.now()
                  }
                  const newPercentage = progressData.max ? Math.round((progressData.value / progressData.max) * 100) : 0
                  console.log('[WebSocketStore] Updating progress:', newProgress, 'percentage:', newPercentage)
                  return {
                    progress: newProgress,
                    progressPercentage: newPercentage
                  }
                }, false, 'onProgress')
              } else {
                console.warn('[WebSocketStore] Invalid progress data received:', progressData)
              }
            })

            // Add execution start handler
            service.addEventListener('onExecutionStart', (data) => {
              const execData = data as any
              console.log('[WebSocketStore] Execution started:', execData)
              if (execData?.prompt_id) {
                set((state) => ({
                  progress: {
                    ...state.progress,
                    promptId: execData.prompt_id,
                    isGenerating: true,
                    startTime: Date.now(),
                    progress: 0,
                    maxProgress: 0,
                    currentNode: null,
                    lastUpdate: Date.now()
                  },
                  progressPercentage: 0
                }), false, 'onExecutionStart')
              }
            })

            // Add execution success handler  
            service.addEventListener('onExecutionSuccess', (data) => {
              const execData = data as any
              if (execData?.prompt_id) {
                set((state) => ({
                  progress: {
                    ...state.progress,
                    isGenerating: false,
                    endTime: Date.now()
                  }
                }), false, 'onExecutionSuccess')
                
                // Show completion toast
                uploadToasts.info('Generation Complete', {
                  message: 'Image generation completed successfully',
                  duration: 4000
                })
              }
            })

            // Add executed event handler for individual node completion
            service.addEventListener('onExecuted', (data) => {
              const execData = data as any
              if (execData?.node && execData?.outputs) {
                // Check if this execution has images
                const hasImages = Object.values(execData.outputs).some((output: any) => 
                  output && Array.isArray(output.images) && output.images.length > 0
                )
                
                if (hasImages) {
                  // Convert outputs to image format and add to store
                  const images: any[] = []
                  Object.entries(execData.outputs).forEach(([nodeId, output]: [string, any]) => {
                    if (output?.images && Array.isArray(output.images)) {
                      output.images.forEach((img: any) => {
                        if (img.filename) {
                          const endpoint = 'http://192.168.1.15:8188' // Use current endpoint
                          images.push({
                            promptId: execData.prompt_id || 'unknown',
                            nodeId: nodeId,
                            imageType: img.type || 'png',
                            timestamp: Date.now(),
                            url: `${endpoint}/view?filename=${encodeURIComponent(img.filename)}&type=output`
                          })
                        }
                      })
                    }
                  })
                  
                  if (images.length > 0) {
                    get().addGeneratedImages(images)
                  }
                }
              }
            })
            
            set({ service }, false, 'initializeService')
            
            // Connect after setting up service
            service.connect()
          } catch (error) {
            console.error('Failed to initialize WebSocket service:', error)
            set({ 
              connectionState: 'error',
              lastError: error instanceof Error ? error.message : 'Failed to initialize'
            }, false, 'connect:error')
          }
        } else {
          // Service exists, just connect
          try {
            state.service.connect()
          } catch (error) {
            console.error('Connection failed:', error)
            set({ 
              connectionState: 'error',
              lastError: error instanceof Error ? error.message : 'Connection failed'
            }, false, 'connect:error')
          }
        }
      },

      disconnect: () => {
        const state = get()
        
        if (state.service) {
          try {
            state.service.disconnect()
          } catch (error) {
            console.error('Disconnect failed:', error)
          }
        }
        
        set({ 
          connectionState: 'disconnected',
          isConnected: false,
          isReconnecting: false
        }, false, 'disconnect')
      },

      reconnect: () => {
        set({ connectionState: 'reconnecting', isReconnecting: true }, false, 'reconnect:start')
        
        const state = get()
        if (state.service) {
          try {
            state.service.reconnect()
          } catch (error) {
            console.error('Reconnect failed:', error)
            set({ 
              connectionState: 'error',
              isConnected: false,
              isReconnecting: false,
              lastError: error instanceof Error ? error.message : 'Reconnect failed'
            }, false, 'reconnect:error')
          }
        } else {
          // No service, try fresh connection
          setTimeout(() => {
            get().connect()
          }, 1000)
        }
      },

      // State update methods
      setConnectionState: (connectionState) => 
        set({ connectionState }, false, 'setConnectionState'),

      setConnected: (isConnected) => 
        set({ isConnected }, false, 'setConnected'),

      setReconnecting: (isReconnecting) => 
        set({ isReconnecting }, false, 'setReconnecting'),

      setLastError: (lastError) => 
        set({ lastError }, false, 'setLastError'),

      setConnectionStats: (connectionStats) => 
        set({ connectionStats }, false, 'setConnectionStats'),

      setProgress: (progress) => 
        set({ progress }, false, 'setProgress'),

      setProgressPercentage: (progressPercentage) => 
        set({ progressPercentage }, false, 'setProgressPercentage'),

      setEstimatedTimeRemaining: (estimatedTimeRemaining) => 
        set({ estimatedTimeRemaining }, false, 'setEstimatedTimeRemaining'),

      setGenerationDuration: (generationDuration) => 
        set({ generationDuration }, false, 'setGenerationDuration'),

      addError: (error) => 
        set(
          (state) => ({
            recentErrors: [error, ...state.recentErrors].slice(0, 50),
            hasErrors: true,
            latestError: error
          }),
          false,
          'addError'
        ),

      clearErrors: () => {
        set(
          {
            recentErrors: [],
            hasErrors: false,
            latestError: null
          },
          false,
          'clearErrors'
        )
      },

      addGeneratedImage: (image) => 
        set(
          (state) => ({
            generatedImages: [image, ...state.generatedImages].slice(0, 100),
            latestImage: image
          }),
          false,
          'addGeneratedImage'
        ),

      addGeneratedImages: (images) => {
        set(
          (state) => ({
            generatedImages: [...images, ...state.generatedImages].slice(0, 100),
            latestImage: images[0] || state.latestImage
          }),
          false,
          'addGeneratedImages'
        )
        
        // Show image generation toast
        if (images.length > 0) {
          uploadToasts.info('Images Generated', {
            message: `Generated ${images.length} image${images.length > 1 ? 's' : ''}`,
            duration: 4000
          })
        }
      },

      clearImages: () => {
        set(
          {
            generatedImages: [],
            latestImage: null
          },
          false,
          'clearImages'
        )
      },

      updateHealth: (healthUpdate) => 
        set(
          (state) => ({
            health: { ...state.health, ...healthUpdate }
          }),
          false,
          'updateHealth'
        ),

      clearProgress: () => {
        set(
          {
            progress: defaultProgress,
            progressPercentage: 0,
            estimatedTimeRemaining: null,
            generationDuration: null
          },
          false,
          'clearProgress'
        )
      },

      subscribeToMessages: (handler) => {
        const state = get()
        
        // Add to message handlers set
        state.messageHandlers.add(handler)
        
        // If service exists, add the listener
        if (state.service) {
          try {
            state.service.addEventListener('onMessage', handler)
          } catch (error) {
            console.error('Failed to add message listener:', error)
          }
        }
        
        // Return unsubscribe function
        return () => {
          const currentState = get()
          currentState.messageHandlers.delete(handler)
          if (currentState.service) {
            try {
              currentState.service.removeEventListener('onMessage', handler)
            } catch (error) {
              console.error('Failed to remove message listener:', error)
            }
          }
        }
      },

      initializeService: () => {
        // This will be called by connect() when needed
        console.log('Service initialization handled by connect()')
      },

      destroyService: () => {
        const state = get()
        
        if (state.service) {
          try {
            state.service.disconnect()
            state.service.destroy()
          } catch (error) {
            console.error('Failed to destroy service:', error)
          }
        }
        set({ service: null }, false, 'destroyService')
      },

      // Helper method to get service safely
      getService: () => {
        return get().service
      }
    }),
    {
      name: 'WebSocket Store'
    }
  )
)

// Simplified selector hooks to prevent infinite loops
export const useWebSocketConnection = () => {
  const connectionState = useWebSocketStore((state) => state.connectionState)
  const isConnected = useWebSocketStore((state) => state.isConnected)
  const isReconnecting = useWebSocketStore((state) => state.isReconnecting)
  const lastError = useWebSocketStore((state) => state.lastError)
  const health = useWebSocketStore((state) => state.health)
  const connect = useWebSocketStore((state) => state.connect)
  const disconnect = useWebSocketStore((state) => state.disconnect)
  const reconnect = useWebSocketStore((state) => state.reconnect)
  
  return {
    connectionState,
    isConnected,
    isReconnecting,
    lastError,
    isHealthy: health.isHealthy,
    latency: health.latency,
    connect,
    disconnect,
    reconnect
  }
}

export const useGenerationProgress = () => {
  const progress = useWebSocketStore((state) => state.progress)
  const progressPercentage = useWebSocketStore((state) => state.progressPercentage)
  const estimatedTimeRemaining = useWebSocketStore((state) => state.estimatedTimeRemaining)
  const generationDuration = useWebSocketStore((state) => state.generationDuration)
  const clearProgress = useWebSocketStore((state) => state.clearProgress)
  
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

export const useGenerationErrors = () => {
  const recentErrors = useWebSocketStore((state) => state.recentErrors)
  const hasErrors = useWebSocketStore((state) => state.hasErrors)
  const latestError = useWebSocketStore((state) => state.latestError)
  const clearErrors = useWebSocketStore((state) => state.clearErrors)
  
  return {
    recentErrors,
    hasErrors,
    latestError,
    errorCount: recentErrors.length,
    clearErrors
  }
}

export const useGeneratedImages = () => {
  const generatedImages = useWebSocketStore((state) => state.generatedImages)
  const latestImage = useWebSocketStore((state) => state.latestImage)
  const clearImages = useWebSocketStore((state) => state.clearImages)
  
  return {
    generatedImages,
    latestImage,
    imageCount: generatedImages.length,
    clearImages
  }
}