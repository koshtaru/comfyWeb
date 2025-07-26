// Simplified AlertNotificationIcon for testing
import React from 'react'

interface AlertNotificationIconProps {
  hasErrors: boolean
  hasWarnings: boolean
  errorCount: number
  warningCount: number
  isOpen: boolean
  onToggle: () => void
  children?: React.ReactNode
}

const AlertNotificationIconSimple: React.FC<AlertNotificationIconProps> = ({
  hasErrors,
  hasWarnings,
  errorCount,
  warningCount,
  isOpen,
  onToggle,
  children
}) => {
  const hasIssues = hasErrors || hasWarnings
  
  if (!hasIssues) return null
  
  return (
    <div className="relative">
      <button onClick={onToggle} className="text-orange-400">
        ⚠️ {errorCount + warningCount}
      </button>
      {isOpen && children}
    </div>
  )
}

export default AlertNotificationIconSimple