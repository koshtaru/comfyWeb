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

// ComfyUI Workflow Types - Supports both API and UI export formats
export type ComfyUIWorkflow = ComfyUIWorkflowAPI | ComfyUIWorkflowUI

// Simple node mapping format (used by ComfyUI API and internal processing)
export interface ComfyUIWorkflowAPI {
  [key: string]: ComfyUINode
}

// Complete UI export format (exported from ComfyUI interface)
export interface ComfyUIWorkflowUI {
  nodes: Record<string, ComfyUINode>
  links: Array<[number, number, number, number, number, string]>
  groups: any[]
  config: Record<string, any>
  extra?: Record<string, any>
  version?: number
}

export interface ComfyUINode {
  inputs: Record<string, any>
  class_type: string
  _meta?: {
    title?: string
  }
}

// Type guard utilities for workflow format detection
export function isComfyUIWorkflowUI(workflow: ComfyUIWorkflow): workflow is ComfyUIWorkflowUI {
  return typeof workflow === 'object' && workflow !== null && 'nodes' in workflow && 'links' in workflow
}

export function isComfyUIWorkflowAPI(workflow: ComfyUIWorkflow): workflow is ComfyUIWorkflowAPI {
  return !isComfyUIWorkflowUI(workflow)
}

// Helper to extract nodes from either format
export function getWorkflowNodes(workflow: ComfyUIWorkflow): Record<string, ComfyUINode> {
  return isComfyUIWorkflowUI(workflow) ? workflow.nodes : workflow
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
export type TabType = 'generate' | 'history' | 'models' | 'settings' | 'queue' | 'websocket-test'

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

// Re-export preset types for better integration
export type {
  IPreset,
  IPresetMetadata,
  IPresetCreateInput,
  IPresetUpdateInput,
  IPresetStorageInfo,
  IPresetOperationResult,
  IPresetImportResult,
  IPresetSearchOptions,
  IPresetValidationResult,
  IPresetServiceConfig,
  IPresetExportData,
  IPresetsExportData,
  PresetCategory,
  ICompressionOptions,
  IPresetStorageConfig
} from './preset'

// Re-export component types for better integration
export type {
  BaseComponentProps,
  FormControlProps,
  ColorVariant,
  SizeVariant,
  ButtonVariant,
  InputVariant,
  ModalProps,
  ToastData,
  TooltipProps,
  ProgressProps,
  SpinnerProps,
  BadgeProps,
  CardProps,
  PanelProps,
  SelectOption,
  SelectProps,
  SliderProps,
  TabItem,
  TabsProps,
  FileUploadProps
} from './component'
