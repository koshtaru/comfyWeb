// ============================================================================
// ComfyUI React - Type Definitions
// ============================================================================

// Application State Types
export interface IAppState {
  isGenerating: boolean
  currentWorkflow: ComfyUIWorkflow | null
  workflowMetadata: WorkflowMetadata | null
  generationHistory: GenerationHistoryItem[]
  activeTab: TabType
  setIsGenerating: (isGenerating: boolean) => void
  setCurrentWorkflow: (workflow: ComfyUIWorkflow | null) => void
  setWorkflowMetadata: (metadata: WorkflowMetadata | null) => void
  addToHistory: (item: GenerationHistoryItem) => void
  setActiveTab: (tab: TabType) => void
}

// API Configuration Types
export interface IAPIConfig {
  endpoint: string
  isConnected: boolean
  connectionStatus: ConnectionStatus
  setEndpoint: (endpoint: string) => void
  setIsConnected: (isConnected: boolean) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  testConnection: () => Promise<boolean>
}

// Preset Management Types
export interface IPresetState {
  presets: WorkflowPreset[]
  activePreset: WorkflowPreset | null
  setPresets: (presets: WorkflowPreset[]) => void
  setActivePreset: (preset: WorkflowPreset | null) => void
  addPreset: (preset: WorkflowPreset) => void
  deletePreset: (presetId: string) => void
  updatePreset: (presetId: string, preset: Partial<WorkflowPreset>) => void
}

// ComfyUI Workflow Types
export interface ComfyUIWorkflow {
  [key: string]: ComfyUINode
}

export interface ComfyUINode {
  inputs: Record<string, any>
  class_type: string
  _meta?: {
    title?: string
  }
}

// Workflow Metadata Types
export interface WorkflowMetadata {
  generation: GenerationParams
  model: ModelInfo
  image: ImageInfo
  timing: TimingInfo
  prompts: PromptInfo
}

export interface GenerationParams {
  steps: number
  cfg: number
  sampler: string
  scheduler: string
  seed: number
  width: number
  height: number
  batchSize: number
}

export interface ModelInfo {
  name: string
  architecture: string
  hash?: string
}

export interface ImageInfo {
  width: number
  height: number
  batchSize: number
}

export interface TimingInfo {
  duration: number
  startTime: string
  endTime: string
}

export interface PromptInfo {
  positive: string
  negative: string
}

// Generation History Types
export interface GenerationHistoryItem {
  id: string
  timestamp: string
  workflow: ComfyUIWorkflow
  metadata: WorkflowMetadata
  images: string[]
  status: GenerationStatus
}

// Preset Types
export interface WorkflowPreset {
  id: string
  name: string
  createdAt: string
  workflowData: ComfyUIWorkflow
  metadata: WorkflowMetadata
  tags?: string[]
}

// UI Types
export type TabType = 'generate' | 'history' | 'models' | 'settings' | 'queue'

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

export type GenerationStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

// WebSocket Types
export interface WebSocketMessage {
  type: string
  data: any
}

export interface ProgressUpdate {
  node: string
  progress: number
  max: number
  step: number
  totalSteps: number
}

// API Response Types
export interface ComfyUIQueueResponse {
  queue_running: QueueItem[]
  queue_pending: QueueItem[]
}

export interface QueueItem {
  prompt_id: string
  number: number
  outputs: Record<string, any>
}

export interface ComfyUIHistoryResponse {
  [prompt_id: string]: HistoryItem
}

export interface HistoryItem {
  prompt: [number, string, ComfyUIWorkflow, any]
  outputs: Record<string, any>
  status: {
    status_str: string
    completed: boolean
    messages: string[]
  }
}

// Route Types
export interface RouteConfig {
  path: string
  name: string
  icon?: string
  component: React.ComponentType
}

// Re-export timing analysis types for better integration
export type {
  ExecutionTiming,
  NodeTiming,
  PerformanceMetrics as TimingPerformanceMetrics,
  NodePerformanceData,
  TimingTrend,
  BottleneckAnalysis,
  TimingAnalyzerConfig,
  TimingVisualizationConfig
} from './timing'
