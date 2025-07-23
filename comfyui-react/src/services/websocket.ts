// ComfyUI WebSocket Service
// Handles real-time communication with ComfyUI server

import type {
  WebSocketConfig,
  WebSocketEventHandlers,
  WebSocketServiceInterface,
  WebSocketServiceState,
  ComfyUIMessage,
  GenerationProgress,
  ConnectionStats,
  MessageQueueItem
} from '@/types/websocket'

export class ComfyUIWebSocketService implements WebSocketServiceInterface {
  private ws: WebSocket | null = null
  private config: Required<WebSocketConfig>
  private eventHandlers: Map<keyof WebSocketEventHandlers, Set<Function>> = new Map()
  
  // State management
  private state: WebSocketServiceState = {
    connectionState: 'disconnected',
    lastError: null,
    reconnectAttempts: 0,
    isReconnecting: false,
    connectedAt: null,
    lastHeartbeat: null,
    serverInfo: null
  }

  private progress: GenerationProgress = {
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
  }

  private connectionStats: ConnectionStats = {
    totalConnections: 0,
    totalReconnections: 0,
    totalMessages: 0,
    averageLatency: 0,
    uptime: 0,
    lastError: null,
    messagesPerSecond: 0
  }

  // Internal management
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private messageQueue: MessageQueueItem[] = []
  private latencyTests: number[] = []
  private debug = false
  private messageRateCounter = 0
  private messageRateTimer: NodeJS.Timeout | null = null

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectInterval: config.reconnectInterval ?? 5000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageTimeout: config.messageTimeout ?? 10000,
      debug: config.debug ?? false
    }

    this.debug = this.config.debug
    this.initializeEventHandlers()
    this.startMessageRateTracking()
  }

  // Connection Management
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.CONNECTING || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        this.log('Connecting to ComfyUI WebSocket...')
        this.updateState({ connectionState: 'connecting' })
        
        this.ws = new WebSocket(this.config.url)
        
        const connectionTimeout = setTimeout(() => {
          this.handleConnectionError(new Error('Connection timeout'))
          reject(new Error('Connection timeout'))
        }, this.config.messageTimeout)

        this.ws.onopen = () => {
          clearTimeout(connectionTimeout)
          this.handleConnectionOpen()
          resolve()
        }

        this.ws.onclose = (event) => {
          clearTimeout(connectionTimeout)
          this.handleConnectionClose(event)
          if (!this.state.isReconnecting) {
            reject(new Error(`Connection closed: ${event.reason || 'Unknown reason'}`))
          }
        }

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout)
          this.handleConnectionError(error)
          reject(error)
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event)
        }

      } catch (error) {
        this.handleConnectionError(error as Error)
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.log('Disconnecting from ComfyUI WebSocket...')
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.updateState({ 
      isReconnecting: false,
      connectionState: 'disconnected' 
    })

    if (this.ws) {
      this.ws.close(1000, 'Client initiated disconnect')
      this.ws = null
    }
  }

  async reconnect(): Promise<void> {
    this.log('Attempting to reconnect...')
    this.disconnect()
    
    this.updateState({ 
      isReconnecting: true,
      reconnectAttempts: this.state.reconnectAttempts + 1 
    })

    this.connectionStats.totalReconnections++

    await new Promise(resolve => setTimeout(resolve, this.config.reconnectInterval))
    return this.connect()
  }

  // Event Management
  addEventListener<T extends keyof WebSocketEventHandlers>(
    event: T, 
    handler: NonNullable<WebSocketEventHandlers[T]>
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    
    this.eventHandlers.get(event)!.add(handler)
    
    // Return unsubscribe function
    return () => {
      this.removeEventListener(event, handler)
    }
  }

  removeEventListener<T extends keyof WebSocketEventHandlers>(
    event: T, 
    handler: NonNullable<WebSocketEventHandlers[T]>
  ): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  // State Access
  getState(): WebSocketServiceState {
    return { ...this.state }
  }

  getProgress(): GenerationProgress {
    return { ...this.progress }
  }

  getConnectionStats(): ConnectionStats {
    return {
      ...this.connectionStats,
      uptime: this.state.connectedAt ? Date.now() - this.state.connectedAt : 0
    }
  }

  // Utility Methods
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getLatency(): number | null {
    if (this.latencyTests.length === 0) return null
    return this.latencyTests.reduce((a, b) => a + b, 0) / this.latencyTests.length
  }

  clearProgress(): void {
    this.progress = {
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
    }
    this.emitEvent('onProgress', this.progress)
  }

  // Debug Methods
  enableDebug(): void {
    this.debug = true
  }

  disableDebug(): void {
    this.debug = false
  }

  getDebugInfo(): Record<string, any> {
    return {
      state: this.state,
      progress: this.progress,
      stats: this.getConnectionStats(),
      config: this.config,
      messageQueueLength: this.messageQueue.length,
      eventHandlerCounts: Object.fromEntries(
        Array.from(this.eventHandlers.entries()).map(([key, set]) => [key, set.size])
      )
    }
  }

  // Private Methods
  private initializeEventHandlers(): void {
    const events: (keyof WebSocketEventHandlers)[] = [
      'onOpen', 'onClose', 'onError', 'onMessage',
      'onExecutionStart', 'onExecutionSuccess', 'onExecutionCached',
      'onExecutionInterrupted', 'onExecutionError', 'onProgress',
      'onExecuting', 'onStatus', 'onB64Image'
    ]

    events.forEach(event => {
      this.eventHandlers.set(event, new Set())
    })
  }

  private handleConnectionOpen(): void {
    this.log('WebSocket connected successfully')
    
    this.updateState({
      connectionState: 'connected',
      lastError: null,
      reconnectAttempts: 0,
      isReconnecting: false,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now()
    })

    this.connectionStats.totalConnections++
    this.startHeartbeat()
    this.emitEvent('onOpen')
  }

  private handleConnectionClose(event: CloseEvent): void {
    this.log(`WebSocket closed: ${event.code} - ${event.reason}`)
    
    this.stopHeartbeat()
    this.updateState({
      connectionState: 'disconnected',
      connectedAt: null,
      lastHeartbeat: null
    })

    this.emitEvent('onClose', event)

    // Auto-reconnect if enabled and not a clean close
    if (this.config.autoReconnect && event.code !== 1000 && !this.state.isReconnecting) {
      if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
        this.scheduleReconnect()
      } else {
        this.log('Max reconnection attempts reached')
        this.updateState({ lastError: 'Max reconnection attempts reached' })
      }
    }
  }

  private handleConnectionError(error: Event | Error): void {
    const errorMessage = error instanceof Error ? error.message : 'WebSocket error'
    this.log(`WebSocket error: ${errorMessage}`)
    
    this.updateState({
      connectionState: 'error',
      lastError: errorMessage
    })

    this.connectionStats.lastError = errorMessage
    this.emitEvent('onError', error)
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: ComfyUIMessage = JSON.parse(event.data)
      
      this.connectionStats.totalMessages++
      this.messageRateCounter++
      this.updateLastHeartbeat()
      
      this.log(`Received message: ${message.type}`, message.data)
      
      // Add to message queue
      const queueItem: MessageQueueItem = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        timestamp: Date.now(),
        processed: false,
        retryCount: 0
      }
      
      this.messageQueue.push(queueItem)
      this.processMessageQueue()
      
    } catch (error) {
      this.log('Failed to parse WebSocket message:', error)
      this.updateState({ lastError: 'Failed to parse message' })
    }
  }

  private processMessageQueue(): void {
    const unprocessedMessages = this.messageQueue.filter(item => !item.processed)
    
    for (const item of unprocessedMessages) {
      try {
        this.processMessage(item.message)
        item.processed = true
      } catch (error) {
        this.log(`Failed to process message ${item.id}:`, error)
        item.retryCount++
        
        if (item.retryCount >= 3) {
          item.processed = true // Mark as processed to avoid infinite retries
        }
      }
    }
    
    // Clean up old processed messages
    if (this.messageQueue.length > 1000) {
      this.messageQueue = this.messageQueue.slice(-500)
    }
  }

  private processMessage(message: ComfyUIMessage): void {
    // Update progress state based on message type
    this.updateProgressFromMessage(message)
    
    // Emit general message event
    this.emitEvent('onMessage', message)
    
    // Emit specific message events
    switch (message.type) {
      case 'execution_start':
        this.emitEvent('onExecutionStart', message.data)
        break
      case 'execution_success':
        this.emitEvent('onExecutionSuccess', message.data)
        break
      case 'execution_cached':
        this.emitEvent('onExecutionCached', message.data)
        break
      case 'execution_interrupted':
        this.emitEvent('onExecutionInterrupted', message.data)
        break
      case 'execution_error':
        this.emitEvent('onExecutionError', message.data)
        break
      case 'progress':
        this.emitEvent('onProgress', message.data)
        break
      case 'executing':
        this.emitEvent('onExecuting', message.data)
        break
      case 'status':
        this.emitEvent('onStatus', message.data)
        break
      case 'b64_image':
        this.emitEvent('onB64Image', message.data)
        break
    }
  }

  private updateProgressFromMessage(message: ComfyUIMessage): void {
    const now = Date.now()
    
    switch (message.type) {
      case 'execution_start':
        this.progress = {
          ...this.progress,
          promptId: message.data.prompt_id,
          isGenerating: true,
          startTime: now,
          endTime: null,
          executedNodes: [],
          lastUpdate: now
        }
        break
        
      case 'executing':
        if (message.data.node) {
          this.progress = {
            ...this.progress,
            currentNode: message.data.node,
            lastUpdate: now
          }
        } else {
          // Node is null, execution finished
          this.progress = {
            ...this.progress,
            currentNode: null,
            isGenerating: false,
            endTime: now,
            lastUpdate: now
          }
        }
        break
        
      case 'progress':
        this.progress = {
          ...this.progress,
          progress: message.data.value,
          maxProgress: message.data.max,
          currentNode: message.data.node,
          lastUpdate: now
        }
        break
        
      case 'execution_success':
      case 'execution_interrupted':
      case 'execution_error':
        this.progress = {
          ...this.progress,
          isGenerating: false,
          endTime: now,
          lastUpdate: now
        }
        break
        
      case 'status':
        this.progress = {
          ...this.progress,
          queueRemaining: message.data.status.exec_info.queue_remaining,
          lastUpdate: now
        }
        break
        
      case 'execution_cached':
        this.progress = {
          ...this.progress,
          cachedNodes: message.data.nodes,
          lastUpdate: now
        }
        break
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    
    this.log(`Scheduling reconnection attempt ${this.state.reconnectAttempts + 1}`)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.reconnect().catch(error => {
        this.log('Reconnection failed:', error)
      })
    }, this.config.reconnectInterval)
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        const now = Date.now()
        const timeSinceLastMessage = now - (this.state.lastHeartbeat || 0)
        
        if (timeSinceLastMessage > this.config.heartbeatInterval * 2) {
          this.log('Heartbeat timeout detected, reconnecting...')
          this.reconnect()
        }
      }
    }, this.config.heartbeatInterval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private startMessageRateTracking(): void {
    this.messageRateTimer = setInterval(() => {
      this.connectionStats.messagesPerSecond = this.messageRateCounter
      this.messageRateCounter = 0
    }, 1000)
  }

  private updateState(updates: Partial<WebSocketServiceState>): void {
    this.state = { ...this.state, ...updates }
  }

  private updateLastHeartbeat(): void {
    this.state.lastHeartbeat = Date.now()
  }

  private emitEvent<T extends keyof WebSocketEventHandlers>(
    event: T, 
    ...args: any[]
  ): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          (handler as Function)(...args)
        } catch (error) {
          this.log(`Error in event handler for ${event}:`, error)
        }
      })
    }
  }

  private log(message: string, ...args: any[]): void {
    if (this.debug) {
      console.log(`[ComfyUI WebSocket] ${message}`, ...args)
    }
  }

  // Cleanup
  destroy(): void {
    this.disconnect()
    
    if (this.messageRateTimer) {
      clearInterval(this.messageRateTimer)
      this.messageRateTimer = null
    }
    
    this.eventHandlers.clear()
    this.messageQueue = []
  }
}