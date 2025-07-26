// ============================================================================
// ComfyUI React - API Client Configuration
// ============================================================================

import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import type { APIClientConfig, APIEndpoints, IAPIError } from './types'

// Default API endpoints
const DEFAULT_ENDPOINTS: APIEndpoints = {
  // System
  systemStats: '/system_stats',
  objectInfo: '/object_info',

  // Prompt/Generation
  prompt: '/prompt',
  queue: '/queue',
  history: '/history',
  interrupt: '/interrupt',

  // Files
  view: '/view',
  upload: '/upload/image',

  // WebSocket
  ws: '/ws',
}

// Default configuration
const DEFAULT_CONFIG: APIClientConfig = {
  baseURL: import.meta.env.VITE_API_URL || 'http://192.168.1.15:8188',
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second base delay
  endpoints: DEFAULT_ENDPOINTS,
}

// Retry delay with exponential backoff
const getRetryDelay = (retryCount: number, baseDelay: number): number => {
  return baseDelay * Math.pow(2, retryCount) + Math.random() * 1000
}

// Create API client with retry logic
export const createAPIClient = (config: Partial<APIClientConfig> = {}): AxiosInstance => {
  const clientConfig = { ...DEFAULT_CONFIG, ...config }

  const client = axios.create({
    baseURL: clientConfig.baseURL,
    timeout: clientConfig.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add timestamp to prevent caching
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now(),
        }
      }

      // Log request in development
      if (import.meta.env.DEV) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params,
        })
      }

      return config
    },
    (error) => {
      console.error('[API] Request error:', error)
      return Promise.reject(error)
    }
  )

  // Response interceptor with retry logic
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log successful response in development
      if (import.meta.env.DEV) {
        console.log(`[API] ${response.status} ${response.config.url}`, response.data)
      }

      return response
    },
    async (error) => {
      const config = error.config

      // Don't retry if no config or already retried max times
      if (!config || config.__retryCount >= clientConfig.retries) {
        console.error('[API] Request failed after retries:', error)
        return Promise.reject(formatAPIError(error))
      }

      // Initialize retry count
      config.__retryCount = config.__retryCount || 0
      config.__retryCount++

      // Calculate delay for exponential backoff
      const delay = getRetryDelay(config.__retryCount, clientConfig.retryDelay)

      console.warn(
        `[API] Request failed, retrying in ${delay}ms (attempt ${config.__retryCount}/${clientConfig.retries}):`,
        error.message
      )

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))

      // Retry the request
      return client(config)
    }
  )

  return client
}

// Format API errors consistently
const formatAPIError = (error: unknown): IAPIError => {
  // Type guard for axios errors
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { 
      response: { 
        status: number
        statusText: string
        data?: { 
          error?: string
          details?: string
          node_errors?: Record<string, unknown>
        } 
      }
      message?: string
    }
    return {
      error: axiosError.response.data?.error || `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`,
      details: axiosError.response.data?.details || axiosError.message,
      node_errors: axiosError.response.data?.node_errors,
    }
  } else if (error && typeof error === 'object' && 'request' in error) {
    // Request was made but no response received
    return {
      error: 'Network Error',
      details: 'Unable to connect to ComfyUI server. Please check your connection and server status.',
    }
  } else if (error instanceof Error) {
    // Something else happened
    return {
      error: 'Request Error',
      details: error.message || 'An unexpected error occurred',
    }
  } else {
    return {
      error: 'Request Error',
      details: 'An unexpected error occurred',
    }
  }
}

// Default API client instance
export const apiClient = createAPIClient()

// API client with custom configuration
export const createCustomAPIClient = (baseURL: string, options: Partial<APIClientConfig> = {}) => {
  return createAPIClient({
    ...options,
    baseURL,
  })
}

// Helper function to get full endpoint URL
export const getEndpointURL = (endpoint: keyof APIEndpoints, baseURL?: string): string => {
  const base = baseURL || DEFAULT_CONFIG.baseURL
  const path = DEFAULT_ENDPOINTS[endpoint]
  return `${base}${path}`
}

// Helper function to create WebSocket URL
export const getWebSocketURL = (baseURL?: string): string => {
  const base = baseURL || DEFAULT_CONFIG.baseURL
  const wsURL = base.replace(/^http/, 'ws') + DEFAULT_ENDPOINTS.ws
  return wsURL
}

// Export configuration for external use
export { DEFAULT_CONFIG, DEFAULT_ENDPOINTS }
export type { APIClientConfig, APIEndpoints }