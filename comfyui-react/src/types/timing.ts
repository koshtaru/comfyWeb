// Timing Analysis Types
// Defines interfaces for timing data collection and analysis

export interface NodeTiming {
  nodeId: string
  nodeType?: string
  startTime: number
  endTime?: number
  duration?: number
  cachedExecution?: boolean
  progressEvents: ProgressEvent[]
}

export interface ProgressEvent {
  timestamp: number
  value: number
  max: number
}

export interface ExecutionTiming {
  promptId: string
  startTime: number
  endTime?: number
  totalDuration?: number
  queueTime?: number
  executionTime?: number
  nodes: Map<string, NodeTiming>
  completedNodes: string[]
  cachedNodes: string[]
  status: 'running' | 'completed' | 'error' | 'interrupted'
  errorInfo?: {
    nodeId: string
    nodeType: string
    message: string
    timestamp: number
  }
}

export interface PerformanceMetrics {
  totalExecutions: number
  averageExecutionTime: number
  averageQueueTime: number
  successRate: number
  errorRate: number
  averageNodesPerExecution: number
  averageCacheHitRate: number
  estimatedGpuUtilization: number
}

export interface NodePerformanceData {
  nodeType: string
  totalExecutions: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  cacheHitRate: number
  errorRate: number
  isBottleneck: boolean
  bottleneckScore: number
}

export interface TimingTrend {
  timestamp: number
  executionTime: number
  queueTime: number
  nodeCount: number
  cacheHitRate: number
  gpuUtilization: number
}

export interface BottleneckAnalysis {
  slowestNodes: NodePerformanceData[]
  criticalPath: string[]
  bottleneckThreshold: number
  recommendations: string[]
}

export interface TimingExportData {
  exportTimestamp: number
  timeRange: {
    startTime: number
    endTime: number
  }
  executions: ExecutionTiming[]
  metrics: PerformanceMetrics
  nodePerformance: NodePerformanceData[]
  trends: TimingTrend[]
  bottlenecks: BottleneckAnalysis
}

export interface TimingAnalyzerConfig {
  maxExecutions: number
  trendSampleInterval: number
  bottleneckThreshold: number
  enableRealTimeUpdates: boolean
  exportFormat: 'csv' | 'json'
}

export interface TimingVisualizationConfig {
  showNodeTypes: boolean
  showCachedNodes: boolean
  colorScheme: 'default' | 'performance' | 'accessibility'
  chartHeight: number
  animationDuration: number
  tooltipEnabled: boolean
}