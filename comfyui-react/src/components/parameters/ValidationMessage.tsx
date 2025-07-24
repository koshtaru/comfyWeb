import React from 'react'
import type { ValidationSeverity } from './hooks/useEnhancedValidation'

interface ValidationMessageProps {
  message: string | null
  severity: ValidationSeverity
  icon?: string | null
  compact?: boolean
  show?: boolean
  className?: string
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  message,
  severity,
  icon,
  compact = false,
  show = true,
  className = ''
}) => {
  if (!message || !show) {
    return null
  }

  const baseClasses = [
    'parameter-validation-message',
    severity,
    compact ? 'compact' : '',
    show ? 'show' : 'hide',
    className
  ].filter(Boolean).join(' ')

  // Default icons if none provided
  const defaultIcon = icon || getDefaultIcon(severity)

  return (
    <div className={baseClasses} role="alert" aria-live="polite">
      {defaultIcon && (
        <span className="parameter-validation-icon" aria-hidden="true">
          {defaultIcon}
        </span>
      )}
      <span className="parameter-validation-text">
        {message}
      </span>
    </div>
  )
}

function getDefaultIcon(severity: ValidationSeverity): string {
  switch (severity) {
    case 'error':
      return '❌'
    case 'warning':
      return '⚠️'
    case 'info':
      return '💡'
    default:
      return '✅'
  }
}

export default ValidationMessage