// ============================================================================
// ComfyUI React - Main Layout Component
// ============================================================================

import { Outlet, useLocation } from 'react-router-dom'
import Navigation from './Navigation'

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-comfy-bg-primary">
      {/* Navigation Header */}
      <Navigation />

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-comfy-border bg-comfy-bg-secondary">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between text-sm text-comfy-text-secondary">
            <div className="flex items-center space-x-4">
              <span>ComfyUI React Interface</span>
              <span>•</span>
              <span className="capitalize">
                Current: {location.pathname.slice(1) || 'generate'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Ready</span>
              <div className="h-2 w-2 rounded-full bg-comfy-success"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
