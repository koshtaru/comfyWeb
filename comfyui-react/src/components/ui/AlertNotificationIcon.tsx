// ============================================================================
// ComfyUI React - Alert Notification Icon Component
// ============================================================================

import React, { useState, useRef, useEffect } from 'react'

interface AlertNotificationIconProps {
  hasErrors: boolean
  hasWarnings: boolean
  errorCount: number
  warningCount: number
  isOpen: boolean
  onToggle: () => void
  children?: React.ReactNode // For dropdown content
}

const AlertNotificationIcon: React.FC<AlertNotificationIconProps> = ({
  hasErrors,
  hasWarnings,
  errorCount,
  warningCount,
  isOpen,
  onToggle,
  children
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isAnimatingIn, setIsAnimatingIn] = useState(false)

  // Calculate values first (before any early returns)
  const hasIssues = hasErrors || hasWarnings
  const totalCount = errorCount + warningCount
  const iconColor = hasErrors ? 'text-red-400' : 'text-orange-400'
  const badgeColor = hasErrors ? 'bg-red-500' : 'bg-orange-500'

  // Always call hooks in the same order - Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          onToggle()
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onToggle])

  // Animation effect when new issues appear
  useEffect(() => {
    if (hasIssues) {
      setIsAnimatingIn(true)
      const timer = setTimeout(() => setIsAnimatingIn(false), 600)
      return () => clearTimeout(timer)
    }
  }, [hasIssues, totalCount])

  // Don't render if no issues (after all hooks are called)
  if (!hasIssues) return null

  return (
    <div ref={dropdownRef} className="relative">
      {/* Alert Icon Button */}
      <button
        onClick={onToggle}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 hover:bg-comfy-bg-tertiary focus:outline-none focus:ring-2 focus:ring-comfy-accent-orange focus:ring-opacity-50 ${
          isAnimatingIn ? 'animate-bounce' : ''
        }`}
        title={`${totalCount} validation ${totalCount === 1 ? 'issue' : 'issues'}`}
      >
        {/* Triangle Warning Icon */}
        <svg 
          viewBox="0 0 24 24" 
          className={`w-5 h-5 transition-colors duration-200 ${iconColor}`}
          fill="currentColor"
        >
          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
        </svg>

        {/* Notification Badge */}
        {totalCount > 0 && (
          <div 
            className={`absolute -top-1 -right-1 ${badgeColor} text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm transition-all duration-200 ${
              isAnimatingIn ? 'scale-110' : 'scale-100'
            }`}
          >
            {totalCount > 99 ? '99+' : totalCount}
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && children && (
        <div 
          className={`absolute top-full right-0 mt-2 z-50 transition-all duration-200 ease-out ${
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
          style={{ minWidth: '320px', maxWidth: '400px' }}
        >
          <div className="bg-comfy-bg-secondary border border-comfy-border rounded-lg shadow-lg backdrop-blur-sm">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

export default AlertNotificationIcon