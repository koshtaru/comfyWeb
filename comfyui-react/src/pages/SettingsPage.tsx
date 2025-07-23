// ============================================================================
// ComfyUI React - Settings Page
// ============================================================================

import { useState, useEffect } from 'react'
import { useAPIStore } from '@/store'
import { comfyAPI } from '@/services/api'

export default function SettingsPage() {
  const {
    endpoint,
    isConnected,
    connectionStatus,
    setEndpoint,
    testConnection,
  } = useAPIStore()

  const [tempEndpoint, setTempEndpoint] = useState(endpoint)
  const [serverInfo, setServerInfo] = useState<any>(null)

  // Load server info on mount and endpoint change
  useEffect(() => {
    const loadServerInfo = async () => {
      if (isConnected) {
        try {
          const status = await comfyAPI.util.getServerStatus()
          setServerInfo(status)
        } catch (error) {
          console.error('Failed to load server info:', error)
        }
      }
    }
    loadServerInfo()
  }, [isConnected])

  const handleTest = async () => {
    await testConnection()
  }

  const handleApply = () => {
    setEndpoint(tempEndpoint)
  }

  return (
    <div className="space-y-6">
      <div className="comfy-panel p-6">
        <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
          Settings
        </h1>
        <p className="mb-6 text-comfy-text-secondary">
          Configure your ComfyUI connection and application preferences.
        </p>

        <div className="space-y-6">
          {/* API Connection Settings */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-comfy-text-primary">
              API Connection
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-comfy-text-primary">
                  ComfyUI Server URL
                </label>
                <input
                  type="url"
                  value={tempEndpoint}
                  onChange={e => setTempEndpoint(e.target.value)}
                  className="comfy-input"
                  placeholder="http://127.0.0.1:8188"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleTest}
                  className="comfy-button"
                  disabled={connectionStatus === 'connecting'}
                >
                  {connectionStatus === 'connecting'
                    ? 'Testing...'
                    : 'Test Connection'}
                </button>
                <button
                  onClick={handleApply}
                  className="comfy-button-secondary"
                >
                  Apply
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isConnected
                      ? 'bg-comfy-success'
                      : connectionStatus === 'connecting'
                        ? 'animate-pulse bg-comfy-accent-orange'
                        : 'bg-comfy-error'
                  }`}
                ></div>
                <span className="text-sm text-comfy-text-secondary">
                  {isConnected
                    ? 'Connected'
                    : connectionStatus === 'connecting'
                      ? 'Connecting...'
                      : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Server Information */}
          {isConnected && serverInfo?.stats && (
            <div>
              <h2 className="mb-4 text-lg font-semibold text-comfy-text-primary">
                Server Information
              </h2>
              
              <div className="rounded-md bg-comfy-bg-tertiary p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-comfy-text-primary">
                      Operating System
                    </p>
                    <p className="text-sm text-comfy-text-secondary">
                      {serverInfo.stats.system.os}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-comfy-text-primary">
                      Python Version
                    </p>
                    <p className="text-sm text-comfy-text-secondary">
                      {serverInfo.stats.system.python_version}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-comfy-text-primary">
                      PyTorch Version
                    </p>
                    <p className="text-sm text-comfy-text-secondary">
                      {serverInfo.stats.system.pytorch_version}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-comfy-text-primary">
                      Devices
                    </p>
                    <p className="text-sm text-comfy-text-secondary">
                      {serverInfo.stats.devices.length} device(s) available
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Application Settings */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-comfy-text-primary">
              Application
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-comfy-text-primary">
                    Auto-save generations
                  </label>
                  <p className="text-xs text-comfy-text-secondary">
                    Automatically save completed generations to history
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-comfy-accent-orange"
                  defaultChecked
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-comfy-text-primary">
                    Show generation metadata
                  </label>
                  <p className="text-xs text-comfy-text-secondary">
                    Display detailed metadata for generated images
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-comfy-accent-orange"
                  defaultChecked
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
