// WebSocket Types for ComfyUI Real-time Communication
// Defines all message types and interfaces for ComfyUI WebSocket protocol

export interface ComfyUIWebSocketMessage {
  type: string
  data: any
}

// Execution Status Messages
export interface ExecutionStartMessage extends ComfyUIWebSocketMessage {
  type: 'execution_start'
  data: {
    prompt_id: string
    timestamp: number
  }
}

export interface ExecutionSuccessMessage extends ComfyUIWebSocketMessage {
  type: 'execution_success'
  data: {
    prompt_id: string
    timestamp: number
  }
}

export interface ExecutionCachedMessage extends ComfyUIWebSocketMessage {
  type: 'execution_cached'
  data: {
    prompt_id: string
    nodes: string[]
    timestamp: number
  }
}

export interface ExecutionInterruptedMessage extends ComfyUIWebSocketMessage {
  type: 'execution_interrupted'
  data: {
    prompt_id: string
    node_id: string
    node_type: string
    executed: string[]
    timestamp: number
  }
}

export interface ExecutionErrorMessage extends ComfyUIWebSocketMessage {
  type: 'execution_error'
  data: {
    prompt_id: string
    node_id: string
    node_type: string
    executed: string[]
    exception_message: string
    exception_type: string
    traceback: string[]
    current_inputs: Record<string, any>
    current_outputs: Record<string, any>
    timestamp: number
  }
}

// Progress Messages
export interface ProgressMessage extends ComfyUIWebSocketMessage {
  type: 'progress'
  data: {
    value: number
    max: number
    prompt_id: string
    node: string
    timestamp: number
  }
}

export interface ExecutingMessage extends ComfyUIWebSocketMessage {
  type: 'executing'
  data: {
    node: string | null
    prompt_id: string
    timestamp: number
  }
}

// Status Messages
export interface StatusMessage extends ComfyUIWebSocketMessage {
  type: 'status'
  data: {
    status: {
      exec_info: {
        queue_remaining: number
      }
    }
    sid?: string
    timestamp: number
  }
}

// B64 Image Messages
export interface B64ImageMessage extends ComfyUIWebSocketMessage {
  type: 'b64_image'
  data: {
    image_type: string
    image_data: string
    prompt_id: string
    node_id: string
    timestamp: number
  }
}

// Union type for all possible messages
export type ComfyUIMessage = 
  | ExecutionStartMessage
  | ExecutionSuccessMessage  
  | ExecutionCachedMessage
  | ExecutionInterruptedMessage
  | ExecutionErrorMessage
  | ProgressMessage
  | ExecutingMessage
  | StatusMessage
  | B64ImageMessage

// WebSocket Connection States
export type WebSocketState = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'reconnecting'

// WebSocket Service Configuration
export interface WebSocketConfig {
  url: string
  autoReconnect?: boolean
  maxReconnectAttempts?: number
  reconnectInterval?: number
  heartbeatInterval?: number
  messageTimeout?: number
  debug?: boolean
}

// WebSocket Event Handlers
export interface WebSocketEventHandlers {
  onOpen?: () => void
  onClose?: (event: CloseEvent) => void
  onError?: (error: Event) => void
  onMessage?: (message: ComfyUIMessage) => void
  
  // Specific message handlers
  onExecutionStart?: (data: ExecutionStartMessage['data']) => void
  onExecutionSuccess?: (data: ExecutionSuccessMessage['data']) => void
  onExecutionCached?: (data: ExecutionCachedMessage['data']) => void
  onExecutionInterrupted?: (data: ExecutionInterruptedMessage['data']) => void
  onExecutionError?: (data: ExecutionErrorMessage['data']) => void
  onProgress?: (data: ProgressMessage['data']) => void
  onExecuting?: (data: ExecutingMessage['data']) => void
  onStatus?: (data: StatusMessage['data']) => void
  onB64Image?: (data: B64ImageMessage['data']) => void
}

// Generation Progress State
export interface GenerationProgress {
  promptId: string | null
  currentNode: string | null
  currentNodeType: string | null
  progress: number
  maxProgress: number
  isGenerating: boolean
  startTime: number | null
  endTime: number | null
  queueRemaining: number
  executedNodes: string[]
  cachedNodes?: string[]
  lastUpdate: number
}

// Error Information
export interface GenerationError {
  promptId: string
  nodeId: string
  nodeType: string
  message: string
  type: string
  traceback: string[]
  inputs: Record<string, any>
  outputs: Record<string, any>
  timestamp: number
}

// Generated Image Data
export interface GeneratedImage {
  promptId: string
  nodeId: string
  imageType: string
  imageData: string // base64 encoded
  timestamp: number
  url?: string // processed blob URL
}

// WebSocket Service State
export interface WebSocketServiceState {
  connectionState: WebSocketState
  lastError: string | null
  reconnectAttempts: number
  isReconnecting: boolean
  connectedAt: number | null
  lastHeartbeat: number | null
  serverInfo: {
    version?: string
    capabilities?: string[]
  } | null
}

// Connection Statistics
export interface ConnectionStats {
  totalConnections: number
  totalReconnections: number
  totalMessages: number
  averageLatency: number
  uptime: number
  lastError: string | null
  messagesPerSecond: number
}

// Message Queue for handling backpressure
export interface MessageQueueItem {
  id: string
  message: ComfyUIMessage
  timestamp: number
  processed: boolean
  retryCount: number
}

// WebSocket Service Interface
export interface WebSocketServiceInterface {
  // Connection Management
  connect(): Promise<void>
  disconnect(): void
  reconnect(): Promise<void>
  
  // State Management
  getState(): WebSocketServiceState
  getProgress(): GenerationProgress
  getConnectionStats(): ConnectionStats
  
  // Event Management
  addEventListener<T extends keyof WebSocketEventHandlers>(
    event: T, 
    handler: NonNullable<WebSocketEventHandlers[T]>
  ): () => void
  
  removeEventListener<T extends keyof WebSocketEventHandlers>(
    event: T, 
    handler: NonNullable<WebSocketEventHandlers[T]>
  ): void
  
  // Utility Methods
  isConnected(): boolean
  getLatency(): number | null
  clearProgress(): void
  
  // Debug Methods
  enableDebug(): void
  disableDebug(): void
  getDebugInfo(): Record<string, any>
}