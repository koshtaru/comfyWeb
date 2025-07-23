// ============================================================================
// ComfyUI React - Navigation Component
// ============================================================================

import { Link, useLocation } from 'react-router-dom'
import { useAppStore, useAPIStore } from '@/store'
import { TAB_CONFIG } from '@/constants/routes'

export default function Navigation() {
  const location = useLocation()
  const { activeTab, setActiveTab } = useAppStore()
  const { isConnected } = useAPIStore()

  const handleTabClick = (tabKey: typeof activeTab) => {
    setActiveTab(tabKey)
  }

  return (
    <header className="border-b border-comfy-border bg-comfy-bg-secondary">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="text-xl font-bold text-comfy-accent-orange transition-colors hover:text-comfy-accent-blue"
            >
              ComfyUI React
            </Link>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  isConnected ? 'bg-comfy-success' : 'bg-comfy-error'
                }`}
              ></div>
              <span className="text-xs text-comfy-text-secondary">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            {TAB_CONFIG.map(tab => {
              const isActive = location.pathname === tab.path

              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  onClick={() => handleTabClick(tab.key)}
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
    </header>
  )
}
