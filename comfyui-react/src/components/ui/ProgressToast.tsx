// ============================================================================
// ComfyUI React - Floating Progress Toast Component
// ============================================================================

import React, { useState, useEffect } from 'react'

interface ProgressToastProps {
  isVisible: boolean
  progress: number
  maxProgress: number
  currentNode?: string
  onDismiss?: () => void
  autoHideDelay?: number
}

export const ProgressToast: React.FC<ProgressToastProps> = ({
  isVisible,
  progress,
  maxProgress,
  currentNode,
  onDismiss,
  autoHideDelay = 3000
}) => {
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const [localVisible, setLocalVisible] = useState(isVisible)

  // Handle visibility changes
  useEffect(() => {
    if (isVisible && !localVisible) {
      setLocalVisible(true)
      setIsAnimatingOut(false)
    } else if (!isVisible && localVisible) {
      // Auto-hide after completion
      const timer = setTimeout(() => {
        handleDismiss()
      }, autoHideDelay)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible, localVisible, autoHideDelay])

  const handleDismiss = () => {
    setIsAnimatingOut(true)
    setTimeout(() => {
      setLocalVisible(false)
      setIsAnimatingOut(false)
      onDismiss?.()
    }, 300) // Match animation duration
  }

  // Calculate progress percentage
  const progressPercentage = maxProgress > 0 ? Math.round((progress / maxProgress) * 100) : 0

  if (!localVisible) return null

  return (
    <div
      className={`fixed top-20 right-4 z-50 transition-all duration-300 ease-in-out transform ${
        isAnimatingOut 
          ? 'translate-x-full opacity-0' 
          : 'translate-x-0 opacity-100'
      }`}
      style={{ maxWidth: '320px', minWidth: '280px' }}
    >
      <div className="bg-comfy-bg-secondary border border-comfy-border rounded-lg p-4 shadow-lg backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-comfy-text-primary">
              Generating
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-comfy-text-secondary hover:text-comfy-text-primary transition-colors duration-200 p-1"
            title="Dismiss"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Progress Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-comfy-text-secondary">
              Step {progress} of {maxProgress}
            </span>
            <span className="text-comfy-text-primary font-medium">
              {progressPercentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-comfy-bg-tertiary rounded-full h-2">
            <div 
              className="bg-green-400 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${progressPercentage}%`,
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.3)'
              }}
            />
          </div>

          {/* Current Node */}
          {currentNode && (
            <div className="text-xs text-comfy-text-secondary truncate">
              <span className="opacity-75">Executing:</span> {currentNode}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgressToast