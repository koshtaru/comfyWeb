// ============================================================================ 
// ComfyUI React - ComfyUI API Service
// ============================================================================

import { apiClient } from './client'
import type {
  IPromptRequest,
  IPromptResponse,
  IQueueResponse,
  IHistoryResponse,
  ISystemStatsResponse,
  IObjectInfo,
  IInterruptResponse,
  IUploadResponse,
  IViewParams,
  APIResponse,
} from './types'

// System API
export const systemAPI = {
  /**
   * Get system statistics and device information
   */
  getStats: async (): Promise<ISystemStatsResponse> => {
    const response = await apiClient.get<ISystemStatsResponse>('/system_stats')
    return response.data
  },

  /**
   * Get object info (available nodes, models, etc.)
   */
  getObjectInfo: async (): Promise<IObjectInfo> => {
    const response = await apiClient.get<IObjectInfo>('/object_info')
    return response.data
  },
}

// Prompt/Generation API
export const promptAPI = {
  /**
   * Submit a workflow for generation
   */
  submit: async (request: IPromptRequest): Promise<IPromptResponse> => {
    const response = await apiClient.post<IPromptResponse>('/prompt', request)
    return response.data
  },

  /**
   * Get current queue status
   */
  getQueue: async (): Promise<IQueueResponse> => {
    const response = await apiClient.get<IQueueResponse>('/queue')
    return response.data
  },

  /**
   * Get generation history
   * @param maxItems Maximum number of items to retrieve
   */
  getHistory: async (maxItems?: number): Promise<IHistoryResponse> => {
    const params = maxItems ? { max_items: maxItems } : {}
    const response = await apiClient.get<IHistoryResponse>('/history', { params })
    return response.data
  },

  /**
   * Get specific history item by prompt ID
   */
  getHistoryItem: async (promptId: string): Promise<IHistoryResponse> => {
    const response = await apiClient.get<IHistoryResponse>(`/history/${promptId}`)
    return response.data
  },

  /**
   * Clear generation history
   */
  clearHistory: async (): Promise<APIResponse> => {
    const response = await apiClient.post<APIResponse>('/history/clear')
    return response.data
  },

  /**
   * Delete specific history item
   */
  deleteHistoryItem: async (promptId: string): Promise<APIResponse> => {
    const response = await apiClient.delete<APIResponse>(`/history/${promptId}`)
    return response.data
  },
}

// Queue Management API
export const queueAPI = {
  /**
   * Clear the entire queue
   */
  clear: async (): Promise<APIResponse> => {
    const response = await apiClient.post<APIResponse>('/queue/clear')
    return response.data
  },

  /**
   * Cancel a specific queue item
   */
  cancel: async (promptId: string): Promise<APIResponse> => {
    const response = await apiClient.delete<APIResponse>(`/queue/${promptId}`)
    return response.data
  },

  /**
   * Interrupt current generation
   */
  interrupt: async (): Promise<IInterruptResponse> => {
    const response = await apiClient.post<IInterruptResponse>('/interrupt')
    return response.data
  },
}

// File/Media API
export const fileAPI = {
  /**
   * Upload an image file
   */
  uploadImage: async (file: File, subfolder?: string): Promise<IUploadResponse> => {
    const formData = new FormData()
    formData.append('image', file)
    if (subfolder) {
      formData.append('subfolder', subfolder)
    }

    const response = await apiClient.post<IUploadResponse>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Get image/file URL for viewing
   */
  getViewURL: (params: IViewParams): string => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
    
    return `${apiClient.defaults.baseURL}/view?${searchParams.toString()}`
  },

  /**
   * Download file as blob
   */
  downloadFile: async (params: IViewParams): Promise<Blob> => {
    const response = await apiClient.get('/view', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}

// Model Management API
export const modelAPI = {
  /**
   * Get available checkpoints
   */
  getCheckpoints: async (): Promise<string[]> => {
    const objectInfo = await systemAPI.getObjectInfo()
    // Extract checkpoint names from object info
    const checkpointLoader = objectInfo['CheckpointLoaderSimple']
    if (checkpointLoader?.input?.required?.ckpt_name) {
      return checkpointLoader.input.required.ckpt_name[0] || []
    }
    return []
  },

  /**
   * Get available VAE models
   */
  getVAEs: async (): Promise<string[]> => {
    const objectInfo = await systemAPI.getObjectInfo()
    const vaeLoader = objectInfo['VAELoader']
    if (vaeLoader?.input?.required?.vae_name) {
      return vaeLoader.input.required.vae_name[0] || []
    }
    return []
  },

  /**
   * Get available samplers
   */
  getSamplers: async (): Promise<string[]> => {
    const objectInfo = await systemAPI.getObjectInfo()
    const ksampler = objectInfo['KSampler']
    if (ksampler?.input?.required?.sampler_name) {
      return ksampler.input.required.sampler_name[0] || []
    }
    return []
  },

  /**
   * Get available schedulers
   */
  getSchedulers: async (): Promise<string[]> => {
    const objectInfo = await systemAPI.getObjectInfo()
    const ksampler = objectInfo['KSampler']
    if (ksampler?.input?.required?.scheduler) {
      return ksampler.input.required.scheduler[0] || []
    }
    return []
  },
}

// Utility functions
export const utilAPI = {
  /**
   * Test API connection
   */
  testConnection: async (): Promise<boolean> => {
    try {
      await systemAPI.getStats()
      return true
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  },

  /**
   * Get server status
   */
  getServerStatus: async (): Promise<{
    online: boolean
    stats?: ISystemStatsResponse
    error?: string
  }> => {
    try {
      const stats = await systemAPI.getStats()
      return { online: true, stats }
    } catch (error: any) {
      return { 
        online: false, 
        error: error.error || error.message || 'Unknown error' 
      }
    }
  },

  /**
   * Generate a unique client ID for WebSocket connections
   */
  generateClientId: (): string => {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
}

// Export all APIs
export const comfyAPI = {
  system: systemAPI,
  prompt: promptAPI,
  queue: queueAPI,
  file: fileAPI,
  model: modelAPI,
  util: utilAPI,
}