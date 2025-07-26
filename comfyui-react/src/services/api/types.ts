// ============================================================================
// ComfyUI React - API Type Definitions
// ============================================================================

import type { ComfyUIWorkflow } from '@/types'

// Base API Response
export interface APIResponse<T = any> {
  data: T
  status: number
  message?: string
}

// System Stats API
export interface ISystemStatsResponse {
  system: {
    os: string
    python_version: string
    pytorch_version: string
    embedded_python: boolean
  }
  devices: Array<{
    name: string
    type: string
    index: number
    vram_total: number
    vram_free: number
    torch_vram_total: number
    torch_vram_free: number
  }>
}

// Prompt/Generation API
export interface IPromptRequest {
  prompt: ComfyUIWorkflow
  client_id?: string
  extra_data?: {
    extra_pnginfo?: Record<string, any>
    workflow?: ComfyUIWorkflow
  }
}

export interface IPromptResponse {
  prompt_id: string
  number: number
  node_errors?: Record<string, any>
}

// Queue API
export interface IQueueItem {
  prompt_id: string
  number: number
  outputs: Record<string, any>
  status?: {
    status_str: string
    completed: boolean
    messages: string[]
  }
}

export interface IQueueResponse {
  queue_running: IQueueItem[]
  queue_pending: IQueueItem[]
}

// History API
export interface IHistoryItem {
  prompt: [number, string, ComfyUIWorkflow, any]
  outputs: Record<string, IHistoryOutput>
  status: {
    status_str: string
    completed: boolean
    messages: string[]
  }
}

export interface IHistoryOutput {
  images?: Array<{
    filename: string
    subfolder: string
    type: string
  }>
  gifs?: Array<{
    filename: string
    subfolder: string
    type: string
  }>
}

export interface IHistoryResponse {
  [prompt_id: string]: IHistoryItem
}

// WebSocket Message Types
export interface IWebSocketMessage {
  type: 'status' | 'progress' | 'executing' | 'executed' | 'execution_start' | 'execution_cached' | 'execution_error'
  data: Record<string, unknown>
}

export interface IExecutionProgress {
  node: string
  prompt_id: string
  value: number
  max: number
}

export interface IExecutionStatus {
  status: {
    exec_info: {
      queue_remaining: number
    }
  }
  sid?: string
}

// Object Info API (for models, samplers, etc.)
export interface IObjectInfo {
  [key: string]: {
    input: {
      required?: Record<string, any>
      optional?: Record<string, any>
    }
    output: string[]
    output_is_list: boolean[]
    output_name: string[]
    name: string
    display_name: string
    description: string
    category: string
    python_module: string
  }
}

// Model/Checkpoint Info
export interface IModelInfo {
  checkpoints: string[]
  vae: string[]
  loras: string[]
  upscale_models: string[]
  embeddings: string[]
  hypernetworks: string[]
  samplers: string[]
  schedulers: string[]
}

// Error Response
export interface IAPIError {
  error: string
  details?: string
  node_errors?: Record<string, string>
}

// Upload Response
export interface IUploadResponse {
  name: string
  subfolder: string
  type: string
}

// View Response (for images)
export interface IViewParams {
  filename: string
  type: string
  subfolder?: string
  channel?: string
  preview?: string
}

// Interrupt Response
export interface IInterruptResponse {
  success: boolean
  message?: string
}

// API Endpoints Configuration
export interface APIEndpoints {
  // System
  systemStats: string
  objectInfo: string

  // Prompt/Generation
  prompt: string
  queue: string
  history: string
  interrupt: string

  // Files
  view: string
  upload: string

  // WebSocket
  ws: string
}

// API Client Configuration
export interface APIClientConfig {
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
  endpoints: APIEndpoints
}

// Request/Response Interceptor Types
export interface RequestInterceptor {
  onRequest?: (config: Record<string, unknown>) => Record<string, unknown>
  onRequestError?: (error: unknown) => Promise<unknown>
}

export interface ResponseInterceptor {
  onResponse?: (response: Record<string, unknown>) => Record<string, unknown>
  onResponseError?: (error: unknown) => Promise<unknown>
}