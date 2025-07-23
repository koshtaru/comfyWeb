// ComfyUI Message Parser and Event Handler Utilities
// Advanced parsing and handling of ComfyUI WebSocket messages

import type {
  ComfyUIMessage,
  GenerationProgress,
  GenerationError,
  GeneratedImage,
  ExecutionStartMessage,
  ExecutionSuccessMessage,
  ExecutionErrorMessage,
  ProgressMessage,
  ExecutingMessage,
  StatusMessage,
  B64ImageMessage
} from '@/types/websocket'

// Message validation utilities
export class MessageValidator {
  static isValidMessage(data: any): data is ComfyUIMessage {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.type === 'string' &&
      data.data !== undefined
    )
  }

  static isExecutionStart(message: ComfyUIMessage): message is ExecutionStartMessage {
    return message.type === 'execution_start' &&
           typeof message.data.prompt_id === 'string'
  }

  static isExecutionSuccess(message: ComfyUIMessage): message is ExecutionSuccessMessage {
    return message.type === 'execution_success' &&
           typeof message.data.prompt_id === 'string'
  }

  static isExecutionError(message: ComfyUIMessage): message is ExecutionErrorMessage {
    return message.type === 'execution_error' &&
           typeof message.data.prompt_id === 'string' &&
           typeof message.data.node_id === 'string' &&
           typeof message.data.exception_message === 'string'
  }

  static isProgress(message: ComfyUIMessage): message is ProgressMessage {
    return message.type === 'progress' &&
           typeof message.data.value === 'number' &&
           typeof message.data.max === 'number'
  }

  static isExecuting(message: ComfyUIMessage): message is ExecutingMessage {
    return message.type === 'executing' &&
           typeof message.data.prompt_id === 'string'
  }

  static isStatus(message: ComfyUIMessage): message is StatusMessage {
    return message.type === 'status' &&
           message.data.status &&
           message.data.status.exec_info &&
           typeof message.data.status.exec_info.queue_remaining === 'number'
  }

  static isB64Image(message: ComfyUIMessage): message is B64ImageMessage {
    return message.type === 'b64_image' &&
           typeof message.data.image_data === 'string' &&
           typeof message.data.prompt_id === 'string'
  }
}

// Progress state calculator
export class ProgressCalculator {
  static calculateProgress(
    currentProgress: GenerationProgress,
    message: ComfyUIMessage
  ): GenerationProgress {
    const now = Date.now()
    let newProgress = { ...currentProgress, lastUpdate: now }

    switch (message.type) {
      case 'execution_start':
        if (MessageValidator.isExecutionStart(message)) {
          newProgress = {
            ...newProgress,
            promptId: message.data.prompt_id,
            isGenerating: true,
            startTime: now,
            endTime: null,
            progress: 0,
            maxProgress: 0,
            currentNode: null,
            currentNodeType: null,
            executedNodes: [],
            cachedNodes: undefined
          }
        }
        break

      case 'executing':
        if (MessageValidator.isExecuting(message)) {
          if (message.data.node) {
            // Add node to executed list if not already there
            const executedNodes = newProgress.executedNodes.includes(message.data.node)
              ? newProgress.executedNodes
              : [...newProgress.executedNodes, message.data.node]

            newProgress = {
              ...newProgress,
              currentNode: message.data.node,
              executedNodes,
              isGenerating: true
            }
          } else {
            // Node is null, execution finished
            newProgress = {
              ...newProgress,
              currentNode: null,
              currentNodeType: null,
              isGenerating: false,
              endTime: now
            }
          }
        }
        break

      case 'progress':
        if (MessageValidator.isProgress(message)) {
          newProgress = {
            ...newProgress,
            progress: message.data.value,
            maxProgress: message.data.max,
            currentNode: message.data.node || newProgress.currentNode
          }
        }
        break

      case 'execution_success':
      case 'execution_interrupted':
      case 'execution_error':
        newProgress = {
          ...newProgress,
          isGenerating: false,
          endTime: now,
          currentNode: null,
          currentNodeType: null
        }
        break

      case 'status':
        if (MessageValidator.isStatus(message)) {
          newProgress = {
            ...newProgress,
            queueRemaining: message.data.status.exec_info.queue_remaining
          }
        }
        break

      case 'execution_cached':
        if (message.data.nodes && Array.isArray(message.data.nodes)) {
          newProgress = {
            ...newProgress,
            cachedNodes: message.data.nodes
          }
        }
        break
    }

    return newProgress
  }

  static estimateTimeRemaining(progress: GenerationProgress): number | null {
    if (!progress.isGenerating || !progress.startTime || progress.progress === 0) {
      return null
    }

    const elapsed = Date.now() - progress.startTime
    const rate = progress.progress / elapsed
    
    if (rate <= 0 || progress.maxProgress <= progress.progress) {
      return null
    }

    const remaining = (progress.maxProgress - progress.progress) / rate
    return Math.round(remaining / 1000) // Convert to seconds
  }

  static calculateGenerationDuration(progress: GenerationProgress): number | null {
    if (!progress.startTime) return null
    const endTime = progress.endTime || Date.now()
    return Math.round((endTime - progress.startTime) / 1000) // Convert to seconds
  }

  static getProgressPercentage(progress: GenerationProgress): number {
    if (progress.maxProgress === 0) return 0
    return Math.round((progress.progress / progress.maxProgress) * 100)
  }
}

// Error parsing and analysis
export class ErrorAnalyzer {
  static parseError(message: ExecutionErrorMessage): GenerationError {
    return {
      promptId: message.data.prompt_id,
      nodeId: message.data.node_id,
      nodeType: message.data.node_type,
      message: message.data.exception_message,
      type: message.data.exception_type,
      traceback: message.data.traceback || [],
      inputs: message.data.current_inputs || {},
      outputs: message.data.current_outputs || {},
      timestamp: Date.now()
    }
  }

  static categorizeError(error: GenerationError): {
    category: 'memory' | 'model' | 'input' | 'network' | 'node' | 'unknown'
    severity: 'low' | 'medium' | 'high' | 'critical'
    suggestions: string[]
  } {
    const message = error.message.toLowerCase()
    const type = error.type.toLowerCase()

    // Memory errors
    if (message.includes('out of memory') || message.includes('cuda out of memory')) {
      return {
        category: 'memory',
        severity: 'high',
        suggestions: [
          'Reduce batch size',
          'Use smaller image dimensions',
          'Free up GPU memory',
          'Close other applications'
        ]
      }
    }

    // Model loading errors
    if (message.includes('model') && (message.includes('not found') || message.includes('failed to load'))) {
      return {
        category: 'model',
        severity: 'critical',
        suggestions: [
          'Check if the model file exists',
          'Verify model path is correct',
          'Ensure model is compatible',
          'Try a different model'
        ]
      }
    }

    // Input validation errors
    if (message.includes('invalid') || message.includes('dimension') || type.includes('value')) {
      return {
        category: 'input',
        severity: 'medium',
        suggestions: [
          'Check input parameters',
          'Verify image dimensions',
          'Ensure values are within valid ranges',
          'Review node connections'
        ]
      }
    }

    // Network/connection errors
    if (message.includes('connection') || message.includes('timeout') || message.includes('network')) {
      return {
        category: 'network',
        severity: 'medium',
        suggestions: [
          'Check network connection',
          'Verify server is running',
          'Try reconnecting',
          'Check firewall settings'
        ]
      }
    }

    // Node-specific errors
    if (message.includes('node') || error.nodeType !== 'unknown') {
      return {
        category: 'node',
        severity: 'medium',
        suggestions: [
          `Check ${error.nodeType} node configuration`,
          'Verify node inputs are correct',
          'Update custom nodes if needed',
          'Check node compatibility'
        ]
      }
    }

    // Unknown errors
    return {
      category: 'unknown',
      severity: 'medium',
      suggestions: [
        'Check the error details',
        'Verify workflow configuration',
        'Try a simpler workflow',
        'Report this issue'
      ]
    }
  }

  static formatErrorForUser(error: GenerationError): {
    title: string
    message: string
    details: string
    actions: Array<{ label: string; action: string }>
  } {
    const analysis = this.categorizeError(error)
    
    return {
      title: `${error.nodeType} Error`,
      message: error.message,
      details: `Node: ${error.nodeId}\nType: ${error.type}\nSeverity: ${analysis.severity}`,
      actions: analysis.suggestions.map(suggestion => ({
        label: suggestion,
        action: 'suggestion'
      }))
    }
  }
}

// Image processing utilities
export class ImageProcessor {
  static parseB64Image(message: B64ImageMessage): GeneratedImage {
    const image: GeneratedImage = {
      promptId: message.data.prompt_id,
      nodeId: message.data.node_id,
      imageType: message.data.image_type,
      imageData: message.data.image_data,
      timestamp: Date.now()
    }

    // Convert base64 to blob URL
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

    return image
  }

  static getImageMetadata(image: GeneratedImage): {
    size: number
    dimensions?: { width: number; height: number }
    format: string
  } {
    const sizeInBytes = Math.round((image.imageData.length * 3) / 4) // Approximate base64 to binary size
    
    return {
      size: sizeInBytes,
      format: image.imageType,
      // Dimensions would need to be extracted from image headers or provided separately
    }
  }

  static cleanupImageUrls(images: GeneratedImage[]): void {
    images.forEach(image => {
      if (image.url) {
        URL.revokeObjectURL(image.url)
      }
    })
  }
}

// Message event dispatcher
export class MessageEventDispatcher {
  private handlers: Map<string, Set<(data: any) => void>> = new Map()

  addEventListener(type: string, handler: (data: any) => void): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set())
    }
    
    this.handlers.get(type)!.add(handler)
    
    return () => {
      this.removeEventListener(type, handler)
    }
  }

  removeEventListener(type: string, handler: (data: any) => void): void {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  dispatch(message: ComfyUIMessage): void {
    // Dispatch to general message handlers
    this.emit('message', message)
    
    // Dispatch to specific message type handlers
    this.emit(message.type, message.data)
    
    // Dispatch to category handlers
    const category = this.categorizeMessage(message)
    if (category) {
      this.emit(category, message)
    }
  }

  private emit(type: string, data: any): void {
    const handlers = this.handlers.get(type)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          console.error(`Error in message handler for ${type}:`, error)
        }
      })
    }
  }

  private categorizeMessage(message: ComfyUIMessage): string | null {
    switch (message.type) {
      case 'execution_start':
      case 'execution_success':
      case 'execution_cached':
      case 'execution_interrupted':
      case 'execution_error':
        return 'execution'
      
      case 'progress':
      case 'executing':
        return 'progress'
      
      case 'status':
        return 'status'
      
      case 'b64_image':
        return 'image'
      
      default:
        return null
    }
  }

  destroy(): void {
    this.handlers.clear()
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map()
  private startTimes: Map<string, number> = new Map()

  startTiming(operation: string): void {
    this.startTimes.set(operation, performance.now())
  }

  endTiming(operation: string): number {
    const startTime = this.startTimes.get(operation)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    this.startTimes.delete(operation)

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, [])
    }

    const times = this.metrics.get(operation)!
    times.push(duration)

    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift()
    }

    return duration
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation)
    if (!times || times.length === 0) return 0

    return times.reduce((sum, time) => sum + time, 0) / times.length
  }

  getMetrics(): Record<string, { average: number; count: number; latest: number }> {
    const result: Record<string, { average: number; count: number; latest: number }> = {}

    for (const [operation, times] of this.metrics.entries()) {
      if (times.length > 0) {
        result[operation] = {
          average: this.getAverageTime(operation),
          count: times.length,
          latest: times[times.length - 1]
        }
      }
    }

    return result
  }

  reset(): void {
    this.metrics.clear()
    this.startTimes.clear()
  }
}