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
  
  // Simplified state management like original
  private state: WebSocketServiceState = {
    connectionState: 'disconnected',
    lastError: null,
    reconnectAttempts: 0,
    isReconnecting: false,
    connectedAt: null,
    lastHeartbeat: null,
    serverInfo: null
  }
  
  // Simple flags like original
  private isManualDisconnect = false

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
  private reconnectTimer: NodeJS.Timeout | null = null
  private messageQueue: MessageQueueItem[] = []
  private latencyTests: number[] = []
  private debug = false

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      autoReconnect: config.autoReconnect ?? false,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 3,
      reconnectInterval: config.reconnectInterval ?? 3000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      messageTimeout: config.messageTimeout ?? 10000,
      debug: config.debug ?? false
    }

    this.debug = this.config.debug
    this.initializeEventHandlers()
    // Remove message rate tracking - simpler approach
  }

  // Connection Management - Simple synchronous like original
  connect(): void {
    if (this.state.connectionState === 'connecting' || this.state.connectionState === 'connected') {
      return
    }

    this.isManualDisconnect = false
    this.updateState({ connectionState: 'connecting' })
    
    try {
      this.log(`Connecting to ComfyUI WebSocket at: ${this.config.url}`)
      this.ws = new WebSocket(this.config.url)
      this.log('WebSocket object created, setting up handlers...')
      this.setupEventHandlers()
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.handleConnectionError(error as Error)
    }
  }

  disconnect(): void {
    this.isManualDisconnect = true
    this.clearReconnectTimer()
    
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
    }
    
    this.updateState({ connectionState: 'disconnected' })
  }

  // Setup event handlers like original - called after WebSocket creation
  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.log('WebSocket connected to ComfyUI')
      this.updateState({ 
        connectionState: 'connected',
        connectedAt: Date.now(),
        lastError: null,
        reconnectAttempts: 0
      })
      this.emitEvent('onOpen')
    }

    this.ws.onmessage = (event) => {
      try {
        this.handleMessage(event)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
        this.emitEvent('onError', { type: 'parse_error', error, data: event.data })
      }
    }

    this.ws.onclose = (event) => {
      console.error(`🔌 [CRITICAL] WebSocket connection closed during operation!`)
      console.error(`🔌 Close Code: ${event.code}`)
      console.error(`🔌 Close Reason: "${event.reason}"`)
      console.error(`🔌 Was Clean: ${event.wasClean}`)
      console.error(`🔌 Manual Disconnect: ${this.isManualDisconnect}`)
      console.error(`🔌 Connection State: ${this.state.connectionState}`)
      console.error(`🔌 Timestamp: ${new Date().toISOString()}`)
      
      // Log common close codes for debugging
      const closeCodeMeanings: Record<number, string> = {
        1000: 'Normal Closure',
        1001: 'Going Away',
        1002: 'Protocol Error',
        1003: 'Unsupported Data',
        1005: 'No Status Received',
        1006: 'Abnormal Closure',
        1007: 'Invalid frame payload data',
        1008: 'Policy Violation',
        1009: 'Message Too Big',
        1010: 'Mandatory Extension',
        1011: 'Internal Server Error',
        1015: 'TLS Handshake Error'
      }
      
      const meaning = closeCodeMeanings[event.code] || 'Unknown Close Code'
      console.error(`🔌 Close Code Meaning: ${meaning}`)
      
      this.log(`WebSocket disconnected: ${event.code} ${event.reason}`)
      this.updateState({ connectionState: 'disconnected' })
      this.emitEvent('onClose', event)
      
      // Disable automatic reconnection to prevent infinite loops
      // if (!this.isManualDisconnect && this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
      //   this.scheduleReconnect()
      // }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.handleConnectionError(error)
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // Simple reconnect like original
  reconnect(): void {
    this.log('Attempting to reconnect...')
    this.disconnect()
    this.connect()
  }

  // scheduleReconnect method removed - automatic reconnection disabled to prevent infinite loops

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
      'onExecuting', 'onStatus', 'onExecuted', 'onB64Image'
    ]

    events.forEach(event => {
      this.eventHandlers.set(event, new Set())
    })
  }

  // Removed old complex connection handlers - using simple setupEventHandlers instead

  private handleConnectionError(error: Event | Error): void {
    this.updateState({ connectionState: 'error' })
    this.emitEvent('onError', { type: 'connection_error', error })
    
    // Disable automatic reconnection to prevent infinite loops
    // if (!this.isManualDisconnect && this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
    //   this.scheduleReconnect()
    // }
  }

  private handleMessage(event: MessageEvent): void {
    console.log(`🔌 [MESSAGE] Raw WebSocket message received:`, event.data)
    
    try {
      const message: ComfyUIMessage = JSON.parse(event.data)
      
      console.log(`🔌 [MESSAGE] Parsed message type: ${message.type}`, message.data)
      
      this.connectionStats.totalMessages++
      
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
        console.log(`🔌 [PROCESS] Processing message ${item.message.type}`)
        this.processMessage(item.message)
        item.processed = true
        console.log(`🔌 [PROCESS] Successfully processed ${item.message.type}`)
      } catch (error) {
        console.error(`🔌 [ERROR] Failed to process message ${item.id} (${item.message.type}):`, error)
        console.error(`🔌 [ERROR] Message data:`, item.message.data)
        this.log(`Failed to process message ${item.id}:`, error)
        item.retryCount++
        
        if (item.retryCount >= 3) {
          console.warn(`🔌 [WARN] Giving up on message ${item.id} after 3 retries`)
          item.processed = true // Mark as processed to avoid infinite retries
        }
        
        // Don't let processing errors bubble up and close the connection
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
      case 'executed':
        console.log('🔌 [EXECUTED] Node execution completed:', {
          nodeId: message.data.node,
          promptId: message.data.prompt_id,
          output: message.data.output
        })
        this.emitEvent('onExecuted', message.data)
        break
      case 'b64_image':
        this.log('Received generated image data:', {
          prompt_id: message.data.prompt_id,
          node_id: message.data.node_id,
          imageType: message.data.image_type
        })
        this.emitEvent('onB64Image', message.data)
        break
      default:
        // Log unknown message types to help debug missing events
        console.log(`🔌 [UNKNOWN] Received unknown message type: ${(message as any).type}`, (message as any).data)
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
          // Node is null - don't mark as finished yet, wait for actual completion events
          this.progress = {
            ...this.progress,
            currentNode: null,
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


  // Heartbeat removed - keeping it simple like original implementation

  // Message rate tracking removed - keeping it simple

  private updateState(updates: Partial<WebSocketServiceState>): void {
    this.state = { ...this.state, ...updates }
  }

  // Removed heartbeat tracking - keeping it simple

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


  // Client registration removed - not needed like original

  // Cleanup
  destroy(): void {
    this.disconnect()
    this.eventHandlers.clear()
    this.messageQueue = []
  }
}