// ============================================================================
// ComfyUI React - API Configuration Store
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ConnectionStatus } from '@/types'

interface APIState {
  // State
  endpoint: string
  isConnected: boolean
  connectionStatus: ConnectionStatus
  lastConnectionTest: string | null
  connectionError: string | null

  // Actions
  setEndpoint: (endpoint: string) => void
  setIsConnected: (isConnected: boolean) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  setConnectionError: (error: string | null) => void
  testConnection: () => Promise<boolean>
  resetConnection: () => void
}

const DEFAULT_ENDPOINT = 'http://127.0.0.1:8188'

import { createCustomAPIClient } from '@/services/api'

// API connection test using our API service
const testAPIConnection = async (endpoint: string): Promise<boolean> => {
  try {
    const customClient = createCustomAPIClient(endpoint)
    const response = await customClient.get('/system_stats')
    return response.status === 200
  } catch (error) {
    console.error('Connection test failed:', error)
    return false
  }
}

export const useAPIStore = create<APIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        endpoint: DEFAULT_ENDPOINT,
        isConnected: false,
        connectionStatus: 'disconnected',
        lastConnectionTest: null,
        connectionError: null,

        // Actions
        setEndpoint: endpoint => {
          set(
            {
              endpoint: endpoint.replace(/\/$/, ''), // Remove trailing slash
              isConnected: false,
              connectionStatus: 'disconnected',
              connectionError: null,
            },
            false,
            'setEndpoint'
          )
        },

        setIsConnected: isConnected =>
          set({ isConnected }, false, 'setIsConnected'),

        setConnectionStatus: connectionStatus =>
          set({ connectionStatus }, false, 'setConnectionStatus'),

        setConnectionError: connectionError =>
          set({ connectionError }, false, 'setConnectionError'),

        testConnection: async () => {
          const { endpoint } = get()

          set(
            {
              connectionStatus: 'connecting',
              connectionError: null,
            },
            false,
            'testConnection:start'
          )

          try {
            const isConnected = await testAPIConnection(endpoint)

            set(
              {
                isConnected,
                connectionStatus: isConnected ? 'connected' : 'error',
                lastConnectionTest: new Date().toISOString(),
                connectionError: isConnected
                  ? null
                  : 'Failed to connect to ComfyUI API',
              },
              false,
              'testConnection:complete'
            )

            return isConnected
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error'

            set(
              {
                isConnected: false,
                connectionStatus: 'error',
                lastConnectionTest: new Date().toISOString(),
                connectionError: errorMessage,
              },
              false,
              'testConnection:error'
            )

            return false
          }
        },

        resetConnection: () =>
          set(
            {
              isConnected: false,
              connectionStatus: 'disconnected',
              connectionError: null,
              lastConnectionTest: null,
            },
            false,
            'resetConnection'
          ),
      }),
      {
        name: 'comfyui-api-store',
        partialize: state => ({
          endpoint: state.endpoint,
          lastConnectionTest: state.lastConnectionTest,
        }),
      }
    ),
    {
      name: 'ComfyUI API Store',
    }
  )
)
