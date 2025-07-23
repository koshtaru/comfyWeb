// ============================================================================
// ComfyUI React - Settings Page
// ============================================================================

import { useState } from 'react'
import { useAPIStore } from '@/store'

export default function SettingsPage() {
  const {
    endpoint,
    isConnected,
    connectionStatus,
    setEndpoint,
    testConnection,
  } = useAPIStore()

  const [tempEndpoint, setTempEndpoint] = useState(endpoint)

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
