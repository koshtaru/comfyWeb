// ============================================================================
// ComfyUI React - Navigation Component
// ============================================================================

import { Link, useLocation } from 'react-router-dom'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { TAB_CONFIG } from '@/constants/routes'

export default function Navigation() {
  const location = useLocation()
  const { 
    isConnected: wsConnected, 
    connectionState, 
    isReconnecting,
    connect: connectWS 
  } = useWebSocketContext()

  return (
    <header className="relative border-b border-comfy-border bg-comfy-bg-secondary">
      {/* Absolute Far Left - WebSocket Button */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 flex items-center space-x-4">
        <button
          className={`transition-colors duration-200 ${
            wsConnected
              ? 'comfy-button text-white'
              : 'comfy-button secondary'
          }`}
          style={wsConnected ? {
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            width: '100px'
          } : {
            width: '100px'
          }}
          onClick={() => {
            if (!wsConnected && !isReconnecting && connectionState !== 'connecting') {
              console.log('[Navigation] WebSocket connect requested')
              connectWS()
            }
          }}
          disabled={wsConnected || isReconnecting || connectionState === 'connecting'}
          title={wsConnected ? 'WebSocket Connected' : 'Connect to ComfyUI WebSocket'}
        >
          {wsConnected 
            ? 'Connected' 
            : isReconnecting 
              ? 'Reconnecting...'
              : connectionState === 'connecting'
                ? 'Connecting...'
                : 'Connect'
          }
        </button>

        <Link
          to="/"
          className="text-xl font-bold text-comfy-accent-orange transition-colors hover:text-comfy-accent-blue"
        >
          ComfyUI React
        </Link>
      </div>

      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side - Spacer */}
          <div></div>

          {/* Right Side - Navigation Tabs and Actions */}
          <div className="flex items-center space-x-4">
            {/* Navigation Tabs */}
            <nav className="flex items-center space-x-1">
              {TAB_CONFIG.map(tab => {
                const isActive = location.pathname === tab.path

                return (
                  <Link
                    key={tab.key}
                    to={tab.path}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-comfy-accent-orange text-comfy-text-primary shadow-comfy'
                        : 'text-comfy-text-secondary hover:bg-comfy-bg-tertiary hover:text-comfy-text-primary'
                    } `}
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-base">{tab.icon}</span>
                      <span>{tab.name}</span>
                    </span>
                  </Link>
                )
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {/* Quick Actions */}
              <button className="comfy-button-secondary px-3 py-1 text-sm">
                Help
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
