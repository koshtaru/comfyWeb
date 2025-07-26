// ============================================================================
// ComfyUI React - Validation Dropdown Panel Component
// ============================================================================

import React, { useState } from 'react'
import type { ValidationResult, ValidationError } from '@/utils/workflowValidator'

interface ValidationDropdownProps {
  validationResult: ValidationResult
  onMarkAllRead?: () => void
  onDismiss?: () => void
}

export const ValidationDropdown: React.FC<ValidationDropdownProps> = ({
  validationResult,
  onMarkAllRead,
  onDismiss
}) => {
  const [expandedSections, setExpandedSections] = useState<{ errors: boolean; warnings: boolean }>({
    errors: true,
    warnings: true
  })

  // Filter out non-actionable warnings (unknown node types)
  const actionableWarnings = validationResult.warnings.filter(warning => 
    !(warning.type === 'schema' && warning.message.startsWith('Unknown node type:'))
  )

  const hasErrors = validationResult.errors.length > 0
  const hasWarnings = actionableWarnings.length > 0
  const totalIssues = validationResult.errors.length + actionableWarnings.length

  const toggleSection = (section: 'errors' | 'warnings') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  if (!hasErrors && !hasWarnings) {
    return (
      <div className="p-4">
        <div className="flex items-center space-x-2 text-green-400">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
            <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
          <span className="text-sm font-medium">No validation issues</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-comfy-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-orange-400" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <span className="text-sm font-medium text-comfy-text-primary">
              Validation Issues
            </span>
            <span className="text-xs text-comfy-text-secondary">
              ({totalIssues})
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-comfy-accent-orange hover:text-comfy-accent-blue transition-colors duration-200"
              >
                Mark all read
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-comfy-text-secondary hover:text-comfy-text-primary transition-colors duration-200 p-1"
                title="Close"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 space-y-2">
        {/* Errors Section */}
        {hasErrors && (
          <ValidationSection
            title="Errors"
            items={validationResult.errors}
            count={validationResult.errors.length}
            severity="error"
            isExpanded={expandedSections.errors}
            onToggle={() => toggleSection('errors')}
          />
        )}

        {/* Warnings Section */}
        {hasWarnings && (
          <ValidationSection
            title="Warnings"
            items={actionableWarnings}
            count={actionableWarnings.length}
            severity="warning"
            isExpanded={expandedSections.warnings}
            onToggle={() => toggleSection('warnings')}
          />
        )}
      </div>
    </div>
  )
}

interface ValidationSectionProps {
  title: string
  items: ValidationError[]
  count: number
  severity: 'error' | 'warning'
  isExpanded: boolean
  onToggle: () => void
}

const ValidationSection: React.FC<ValidationSectionProps> = ({
  title,
  items,
  count,
  severity,
  isExpanded,
  onToggle
}) => {
  const sectionColor = severity === 'error' ? 'text-red-400' : 'text-orange-400'
  const bgColor = severity === 'error' ? 'bg-red-900/10' : 'bg-orange-900/10'
  const borderColor = severity === 'error' ? 'border-red-500/20' : 'border-orange-500/20'

  return (
    <div className={`rounded-md ${bgColor} ${borderColor} border`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center justify-between hover:bg-black/10 transition-colors duration-200"
      >
        <div className="flex items-center space-x-2">
          <svg viewBox="0 0 24 24" className={`w-4 h-4 ${sectionColor}`} fill="currentColor">
            {severity === 'error' ? (
              <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            ) : (
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            )}
          </svg>
          <span className={`text-sm font-medium ${sectionColor}`}>
            {title}
          </span>
          <span className="text-xs text-comfy-text-secondary">
            ({count})
          </span>
        </div>
        <svg 
          viewBox="0 0 24 24" 
          className={`w-4 h-4 text-comfy-text-secondary transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : 'rotate-0'
          }`}
          fill="currentColor"
        >
          <path d="M7,10L12,15L17,10H7Z"/>
        </svg>
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {items.slice(0, 10).map((item, index) => (
            <ValidationItem key={index} error={item} severity={severity} />
          ))}
          {items.length > 10 && (
            <div className="text-xs text-comfy-text-secondary text-center pt-2">
              ... and {items.length - 10} more {title.toLowerCase()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ValidationItemProps {
  error: ValidationError
  severity: 'error' | 'warning'
}

const ValidationItem: React.FC<ValidationItemProps> = ({ error }) => {
  const getTypeIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'syntax':
        return <path d="M8,3A5,5 0 0,0 3,8V16A5,5 0 0,0 8,21H16A5,5 0 0,0 21,16V8A5,5 0 0,0 16,3H8M15.5,17L14.25,15.75L15.75,14.25L14.25,12.75L15.5,11.5L18,14L15.5,16.5V17M8.5,17L6,14.5L8.5,12L9.75,13.25L8.25,14.75L9.75,16.25L8.5,17Z" />
      case 'structure':
        return <path d="M12,18.17L8.83,15L7.42,16.41L12,21L16.59,16.41L15.17,15M12,5.83L15.17,9L16.58,7.59L12,3L7.41,7.59L8.83,9L12,5.83Z" />
      case 'node':
        return <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" />
      case 'connection':
        return <path d="M21.71,11.29L12.71,2.29C12.32,1.9 11.69,1.9 11.3,2.29L2.29,11.29C1.9,11.68 1.9,12.32 2.29,12.71L11.3,21.71C11.69,22.1 12.32,22.1 12.71,21.71L21.71,12.71C22.1,12.32 22.1,11.68 21.71,11.29Z" />
      case 'schema':
        return <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
      default:
        return <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
    }
  }

  return (
    <div className="flex items-start space-x-2 p-2 rounded-md hover:bg-black/5 transition-colors duration-200">
      <div className="flex-shrink-0 mt-0.5">
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-comfy-text-secondary" fill="currentColor">
          {getTypeIcon(error.type)}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-comfy-text-primary break-words">
          {error.message}
        </p>
        {error.nodeId && (
          <p className="text-xs text-comfy-text-secondary mt-1">
            Node: {error.nodeId}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">
        <span className="text-xs text-comfy-text-secondary bg-comfy-bg-tertiary px-1.5 py-0.5 rounded">
          {error.type}
        </span>
      </div>
    </div>
  )
}

export default ValidationDropdown