// Timing Analyzer - Processes WebSocket events for performance analysis
// Calculates node execution times, identifies bottlenecks, and tracks trends

import type {
  ComfyUIMessage,
  ExecutionStartMessage,
  ExecutionSuccessMessage,
  ExecutionErrorMessage,
  ExecutionInterruptedMessage,
  ExecutionCachedMessage,
  ExecutingMessage,
  ProgressMessage
} from '@/types/websocket'
import type {
  ExecutionTiming,
  NodeTiming,
  PerformanceMetrics,
  NodePerformanceData,
  TimingTrend,
  BottleneckAnalysis,
  TimingAnalyzerConfig,
  ProgressEvent
} from '@/types/timing'

export class TimingAnalyzer {
  private executions = new Map<string, ExecutionTiming>()
  private executionHistory: ExecutionTiming[] = []
  private trends: TimingTrend[] = []
  private config: Required<TimingAnalyzerConfig>
  private trendTimer: NodeJS.Timeout | null = null
  private listeners: Set<(data: any) => void> = new Set()

  constructor(config: Partial<TimingAnalyzerConfig> = {}) {
    this.config = {
      maxExecutions: config.maxExecutions ?? 100,
      trendSampleInterval: config.trendSampleInterval ?? 30000, // 30 seconds
      bottleneckThreshold: config.bottleneckThreshold ?? 2000, // 2 seconds
      enableRealTimeUpdates: config.enableRealTimeUpdates ?? true,
      exportFormat: config.exportFormat ?? 'csv'
    }

    if (this.config.enableRealTimeUpdates) {
      this.startTrendTracking()
    }
  }

  // Process WebSocket messages for timing analysis
  processMessage(message: ComfyUIMessage): void {
    const timestamp = message.data.timestamp || Date.now()

    switch (message.type) {
      case 'execution_start':
        this.handleExecutionStart(message as ExecutionStartMessage, timestamp)
        break
      case 'executing':
        this.handleExecuting(message as ExecutingMessage, timestamp)
        break
      case 'progress':
        this.handleProgress(message as ProgressMessage, timestamp)
        break
      case 'execution_success':
        this.handleExecutionSuccess(message as ExecutionSuccessMessage, timestamp)
        break
      case 'execution_error':
        this.handleExecutionError(message as ExecutionErrorMessage, timestamp)
        break
      case 'execution_interrupted':
        this.handleExecutionInterrupted(message as ExecutionInterruptedMessage, timestamp)
        break
      case 'execution_cached':
        this.handleExecutionCached(message as ExecutionCachedMessage, timestamp)
        break
    }

    this.notifyListeners()
  }

  private handleExecutionStart(message: ExecutionStartMessage, timestamp: number): void {
    const execution: ExecutionTiming = {
      promptId: message.data.prompt_id,
      startTime: timestamp,
      nodes: new Map(),
      completedNodes: [],
      cachedNodes: [],
      status: 'running'
    }

    this.executions.set(message.data.prompt_id, execution)
  }

  private handleExecuting(message: ExecutingMessage, timestamp: number): void {
    const execution = this.executions.get(message.data.prompt_id)
    if (!execution) return

    const { node } = message.data

    if (node) {
      // Node execution started
      const existingNode = execution.nodes.get(node)
      if (!existingNode) {
        const nodeTiming: NodeTiming = {
          nodeId: node,
          startTime: timestamp,
          progressEvents: []
        }
        execution.nodes.set(node, nodeTiming)
      }
    } else {
      // Execution finished (node is null)
      execution.endTime = timestamp
      execution.totalDuration = execution.endTime - execution.startTime
      execution.status = 'completed'
      
      this.finalizeExecution(execution)
    }
  }

  private handleProgress(message: ProgressMessage, timestamp: number): void {
    const execution = this.executions.get(message.data.prompt_id)
    if (!execution) return

    const { node, value, max } = message.data
    const nodeTiming = execution.nodes.get(node)
    
    if (nodeTiming) {
      const progressEvent: ProgressEvent = {
        timestamp,
        value,
        max
      }
      nodeTiming.progressEvents.push(progressEvent)
    }
  }

  private handleExecutionSuccess(message: ExecutionSuccessMessage, timestamp: number): void {
    const execution = this.executions.get(message.data.prompt_id)
    if (!execution) return

    execution.endTime = timestamp
    execution.totalDuration = execution.endTime - execution.startTime
    execution.status = 'completed'
    
    this.finalizeExecution(execution)
  }

  private handleExecutionError(message: ExecutionErrorMessage, timestamp: number): void {
    const execution = this.executions.get(message.data.prompt_id)
    if (!execution) return

    execution.endTime = timestamp
    execution.totalDuration = execution.endTime - execution.startTime
    execution.status = 'error'
    execution.errorInfo = {
      nodeId: message.data.node_id,
      nodeType: message.data.node_type,
      message: message.data.exception_message,
      timestamp
    }

    // Mark incomplete nodes
    execution.completedNodes = message.data.executed
    
    this.finalizeExecution(execution)
  }

  private handleExecutionInterrupted(message: ExecutionInterruptedMessage, timestamp: number): void {
    const execution = this.executions.get(message.data.prompt_id)
    if (!execution) return

    execution.endTime = timestamp
    execution.totalDuration = execution.endTime - execution.startTime
    execution.status = 'interrupted'
    execution.completedNodes = message.data.executed

    this.finalizeExecution(execution)
  }

  private handleExecutionCached(message: ExecutionCachedMessage, timestamp: number): void {
    const execution = this.executions.get(message.data.prompt_id)
    if (!execution) return

    execution.cachedNodes = message.data.nodes

    // Mark cached nodes in timing data
    message.data.nodes.forEach(nodeId => {
      const nodeTiming = execution.nodes.get(nodeId)
      if (nodeTiming) {
        nodeTiming.cachedExecution = true
        nodeTiming.endTime = timestamp
        nodeTiming.duration = 0 // Cached nodes have minimal execution time
      }
    })
  }

  private finalizeExecution(execution: ExecutionTiming): void {
    // Calculate node durations
    execution.nodes.forEach((nodeTiming) => {
      if (!nodeTiming.endTime && execution.endTime) {
        // Estimate end time for incomplete nodes
        nodeTiming.endTime = execution.endTime
      }
      
      if (nodeTiming.endTime) {
        nodeTiming.duration = nodeTiming.endTime - nodeTiming.startTime
      }
    })

    // Calculate queue time vs execution time
    const firstNodeStart = Math.min(...Array.from(execution.nodes.values()).map(n => n.startTime))
    execution.queueTime = firstNodeStart - execution.startTime
    execution.executionTime = execution.totalDuration! - execution.queueTime

    // Add to history
    this.executionHistory.unshift(execution)
    
    // Maintain history size
    if (this.executionHistory.length > this.config.maxExecutions) {
      this.executionHistory = this.executionHistory.slice(0, this.config.maxExecutions)
    }

    // Remove from active executions
    this.executions.delete(execution.promptId)
  }

  // Calculate performance metrics
  calculateMetrics(): PerformanceMetrics {
    if (this.executionHistory.length === 0) {
      return {
        totalExecutions: 0,
        averageExecutionTime: 0,
        averageQueueTime: 0,
        successRate: 0,
        errorRate: 0,
        averageNodesPerExecution: 0,
        averageCacheHitRate: 0,
        estimatedGpuUtilization: 0
      }
    }

    const completedExecutions = this.executionHistory.filter(e => e.status === 'completed')
    const totalExecutions = this.executionHistory.length
    const successfulExecutions = completedExecutions.length

    const averageExecutionTime = completedExecutions.reduce((sum, e) => sum + (e.executionTime || 0), 0) / successfulExecutions || 0
    const averageQueueTime = completedExecutions.reduce((sum, e) => sum + (e.queueTime || 0), 0) / successfulExecutions || 0
    const averageNodesPerExecution = completedExecutions.reduce((sum, e) => sum + e.nodes.size, 0) / successfulExecutions || 0
    
    const totalCacheableNodes = completedExecutions.reduce((sum, e) => sum + e.nodes.size, 0)
    const totalCachedNodes = completedExecutions.reduce((sum, e) => sum + e.cachedNodes.length, 0)
    const averageCacheHitRate = totalCacheableNodes > 0 ? totalCachedNodes / totalCacheableNodes : 0

    // Rough GPU utilization estimate based on execution efficiency
    const estimatedGpuUtilization = Math.min(100, (averageExecutionTime / (averageExecutionTime + averageQueueTime)) * 100)

    return {
      totalExecutions,
      averageExecutionTime,
      averageQueueTime,
      successRate: (successfulExecutions / totalExecutions) * 100,
      errorRate: ((totalExecutions - successfulExecutions) / totalExecutions) * 100,
      averageNodesPerExecution,
      averageCacheHitRate: averageCacheHitRate * 100,
      estimatedGpuUtilization
    }
  }

  // Analyze node performance
  analyzeNodePerformance(): NodePerformanceData[] {
    const nodeStats = new Map<string, {
      durations: number[]
      executions: number
      cacheHits: number
      errors: number
    }>()

    this.executionHistory.forEach(execution => {
      execution.nodes.forEach((nodeTiming, nodeId) => {
        const nodeType = nodeTiming.nodeType || 'unknown'
        
        if (!nodeStats.has(nodeType)) {
          nodeStats.set(nodeType, {
            durations: [],
            executions: 0,
            cacheHits: 0,
            errors: 0
          })
        }

        const stats = nodeStats.get(nodeType)!
        stats.executions++
        
        if (nodeTiming.duration !== undefined) {
          stats.durations.push(nodeTiming.duration)
        }
        
        if (nodeTiming.cachedExecution) {
          stats.cacheHits++
        }
        
        if (execution.status === 'error' && execution.errorInfo?.nodeId === nodeId) {
          stats.errors++
        }
      })
    })

    return Array.from(nodeStats.entries()).map(([nodeType, stats]) => {
      const averageDuration = stats.durations.reduce((sum, d) => sum + d, 0) / stats.durations.length || 0
      const minDuration = Math.min(...stats.durations) || 0
      const maxDuration = Math.max(...stats.durations) || 0
      const cacheHitRate = (stats.cacheHits / stats.executions) * 100
      const errorRate = (stats.errors / stats.executions) * 100
      const isBottleneck = averageDuration > this.config.bottleneckThreshold
      const bottleneckScore = averageDuration / this.config.bottleneckThreshold

      return {
        nodeType,
        totalExecutions: stats.executions,
        averageDuration,
        minDuration,
        maxDuration,
        cacheHitRate,
        errorRate,
        isBottleneck,
        bottleneckScore
      }
    }).sort((a, b) => b.averageDuration - a.averageDuration)
  }

  // Generate timing trends
  generateTrends(sampleCount: number = 20): TimingTrend[] {
    const recentExecutions = this.executionHistory
      .filter(e => e.status === 'completed')
      .slice(0, sampleCount)
      .reverse()

    return recentExecutions.map(execution => ({
      timestamp: execution.startTime,
      executionTime: execution.executionTime || 0,
      queueTime: execution.queueTime || 0,
      nodeCount: execution.nodes.size,
      cacheHitRate: (execution.cachedNodes.length / execution.nodes.size) * 100,
      gpuUtilization: this.estimateGpuUtilization(execution)
    }))
  }

  // Perform bottleneck analysis
  analyzeBottlenecks(): BottleneckAnalysis {
    const nodePerformance = this.analyzeNodePerformance()
    const slowestNodes = nodePerformance
      .filter(node => node.isBottleneck)
      .slice(0, 5)

    const recommendations: string[] = []
    
    if (slowestNodes.length > 0) {
      recommendations.push(`Consider optimizing ${slowestNodes[0].nodeType} nodes (avg: ${slowestNodes[0].averageDuration.toFixed(0)}ms)`)
    }
    
    const highErrorRateNodes = nodePerformance.filter(node => node.errorRate > 5)
    if (highErrorRateNodes.length > 0) {
      recommendations.push(`Address error-prone nodes: ${highErrorRateNodes.map(n => n.nodeType).join(', ')}`)
    }

    const lowCacheRateNodes = nodePerformance.filter(node => node.cacheHitRate < 20 && node.totalExecutions > 5)
    if (lowCacheRateNodes.length > 0) {
      recommendations.push(`Improve caching for: ${lowCacheRateNodes.map(n => n.nodeType).join(', ')}`)
    }

    return {
      slowestNodes,
      criticalPath: this.calculateCriticalPath(),
      bottleneckThreshold: this.config.bottleneckThreshold,
      recommendations
    }
  }

  private calculateCriticalPath(): string[] {
    // Simplified critical path calculation
    const nodePerformance = this.analyzeNodePerformance()
    return nodePerformance
      .filter(node => node.isBottleneck)
      .map(node => node.nodeType)
      .slice(0, 3)
  }

  private estimateGpuUtilization(execution: ExecutionTiming): number {
    const totalTime = execution.totalDuration || 0
    const actualExecutionTime = execution.executionTime || 0
    return totalTime > 0 ? (actualExecutionTime / totalTime) * 100 : 0
  }

  private startTrendTracking(): void {
    this.trendTimer = setInterval(() => {
      const currentTrend = this.generateCurrentTrend()
      if (currentTrend) {
        this.trends.push(currentTrend)
        
        // Keep only recent trends (last hour)
        const oneHourAgo = Date.now() - 3600000
        this.trends = this.trends.filter(trend => trend.timestamp > oneHourAgo)
      }
    }, this.config.trendSampleInterval)
  }

  private generateCurrentTrend(): TimingTrend | null {
    const recentExecution = this.executionHistory[0]
    if (!recentExecution || recentExecution.status !== 'completed') {
      return null
    }

    return {
      timestamp: Date.now(),
      executionTime: recentExecution.executionTime || 0,
      queueTime: recentExecution.queueTime || 0,
      nodeCount: recentExecution.nodes.size,
      cacheHitRate: (recentExecution.cachedNodes.length / recentExecution.nodes.size) * 100,
      gpuUtilization: this.estimateGpuUtilization(recentExecution)
    }
  }

  private notifyListeners(): void {
    const data = {
      metrics: this.calculateMetrics(),
      nodePerformance: this.analyzeNodePerformance(),
      trends: this.generateTrends(),
      bottlenecks: this.analyzeBottlenecks()
    }

    this.listeners.forEach(listener => {
      try {
        listener(data)
      } catch (error) {
        console.error('Error in timing analyzer listener:', error)
      }
    })
  }

  // Public API
  addListener(listener: (data: any) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getExecutionHistory(): ExecutionTiming[] {
    return [...this.executionHistory]
  }

  getCurrentExecutions(): ExecutionTiming[] {
    return Array.from(this.executions.values())
  }

  getTrends(): TimingTrend[] {
    return [...this.trends]
  }

  clear(): void {
    this.executions.clear()
    this.executionHistory = []
    this.trends = []
  }

  destroy(): void {
    if (this.trendTimer) {
      clearInterval(this.trendTimer)
      this.trendTimer = null
    }
    this.listeners.clear()
    this.clear()
  }
}