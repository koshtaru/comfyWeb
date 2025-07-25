import React, { useState } from 'react'
import type { ValidationResult, ValidationError } from '@/utils/workflowValidator'

interface ValidationResultsProps {
  result: ValidationResult
  onDismiss?: () => void
}

export const ValidationResults: React.FC<ValidationResultsProps> = ({ 
  result, 
  onDismiss 
}) => {
  // Filter out non-actionable warnings (unknown node types)
  const actionableWarnings = result.warnings.filter(warning => 
    !(warning.type === 'schema' && warning.message.startsWith('Unknown node type:'))
  )
  
  // Start collapsed by default for warnings, expanded only for critical errors
  const hasErrors = result.errors.length > 0
  const [isCollapsed, setIsCollapsed] = useState(!hasErrors)
  
  if (result.isValid && actionableWarnings.length === 0) {
    return (
      <div className="validation-results success">
        <div className="validation-header">
          <svg className="validation-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
          <span className="validation-title">Workflow Valid</span>
          <div className="validation-stats">
            {result.nodeCount} nodes, {result.nodeTypes.length} types
          </div>
          {onDismiss && (
            <button className="dismiss-button" onClick={onDismiss}>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`validation-results ${hasErrors ? 'error' : 'warning'}`}>
      <div className="validation-header">
        <svg className="validation-icon" viewBox="0 0 24 24" width="20" height="20">
          <path fill="currentColor" d={
            hasErrors 
              ? "M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
              : "M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"
          } />
        </svg>
        
        <div className="validation-title-section">
          <span className="validation-title">
            {hasErrors ? 'Validation Failed' : 'Validation Warnings'}
          </span>
          <div className="validation-stats">
            {result.errors.length > 0 && (
              <span className="error-count">{result.errors.length} errors</span>
            )}
            {actionableWarnings.length > 0 && (
              <span className="warning-count">{actionableWarnings.length} warnings</span>
            )}
            <span className="node-count">{result.nodeCount} nodes</span>
          </div>
        </div>

        <div className="validation-actions">
          <button 
            className="collapse-button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand details' : 'Collapse details'}
          >
            <svg 
              viewBox="0 0 24 24" 
              width="16" 
              height="16"
              style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
            >
              <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
            </svg>
          </button>
          
          {onDismiss && (
            <button className="dismiss-button" onClick={onDismiss}>
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <div className="validation-details">
          {result.errors.length > 0 && (
            <div className="validation-section">
              <h4 className="section-title">Errors</h4>
              <div className="validation-list">
                {result.errors.map((error, index) => (
                  <ValidationErrorItem key={index} error={error} />
                ))}
              </div>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="validation-section">
              <h4 className="section-title">Warnings</h4>
              <div className="validation-list">
                {result.warnings
                  .filter(warning => {
                    // Hide common "Unknown node type" warnings that aren't actionable
                    if (warning.type === 'schema' && warning.message.startsWith('Unknown node type:')) {
                      return false
                    }
                    return true
                  })
                  .map((warning, index) => (
                    <ValidationErrorItem key={index} error={warning} />
                  ))}
              </div>
            </div>
          )}

          {/* Node Types Found section removed to reduce clutter - not actionable for users */}
        </div>
      )}
    </div>
  )
}

interface ValidationErrorItemProps {
  error: ValidationError
}

const ValidationErrorItem: React.FC<ValidationErrorItemProps> = ({ error }) => {
  const getTypeIcon = (type: ValidationError['type']) => {
    switch (type) {
      case 'syntax':
        return (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M8,3A5,5 0 0,0 3,8V16A5,5 0 0,0 8,21H16A5,5 0 0,0 21,16V8A5,5 0 0,0 16,3H8M15.5,17L14.25,15.75L15.75,14.25L14.25,12.75L15.5,11.5L18,14L15.5,16.5V17M8.5,17L6,14.5L8.5,12L9.75,13.25L8.25,14.75L9.75,16.25L8.5,17Z" />
          </svg>
        )
      case 'structure':
        return (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M12,18.17L8.83,15L7.42,16.41L12,21L16.59,16.41L15.17,15M12,5.83L15.17,9L16.58,7.59L12,3L7.41,7.59L8.83,9L12,5.83Z" />
          </svg>
        )
      case 'node':
        return (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4Z" />
          </svg>
        )
      case 'connection':
        return (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M21.71,11.29L12.71,2.29C12.32,1.9 11.69,1.9 11.3,2.29L2.29,11.29C1.9,11.68 1.9,12.32 2.29,12.71L11.3,21.71C11.69,22.1 12.32,22.1 12.71,21.71L21.71,12.71C22.1,12.32 22.1,11.68 21.71,11.29Z" />
          </svg>
        )
      case 'schema':
        return (
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        )
    }
  }

  return (
    <div className={`validation-item ${error.severity}`}>
      <div className="validation-item-header">
        <div className="validation-item-icon">
          {getTypeIcon(error.type)}
        </div>
        <div className="validation-item-content">
          <span className="validation-item-message">{error.message}</span>
          {error.nodeId && (
            <span className="validation-item-node">Node: {error.nodeId}</span>
          )}
        </div>
        <span className="validation-item-type">{error.type}</span>
      </div>
    </div>
  )
}