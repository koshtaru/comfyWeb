// Error Display Component
// Shows generation errors with analysis and recovery suggestions

import React, { useState } from 'react'
import { useGenerationErrors } from '@/contexts/WebSocketContext'
import { ErrorAnalyzer } from '@/utils/messageParser'

interface ErrorDisplayProps {
  maxErrors?: number
  showDetails?: boolean
  className?: string
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  maxErrors = 5,
  showDetails = true,
  className = ''
}) => {
  const { recentErrors, hasErrors, clearErrors } = useGenerationErrors()
  const [expandedError, setExpandedError] = useState<string | null>(null)

  const displayErrors = recentErrors.slice(0, maxErrors)

  if (!hasErrors) {
    return null
  }

  const toggleErrorExpansion = (errorId: string) => {
    setExpandedError(expandedError === errorId ? null : errorId)
  }

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }


  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z" />
          </svg>
        )
      case 'high':
        return (
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
      case 'medium':
        return (
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
    }
  }

  return (
    <div className={`error-display ${className}`}>
      <div className="error-header">
        <div className="error-title">
          <svg className="error-icon" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
          <h3>Generation Errors ({recentErrors.length})</h3>
        </div>
        
        <button
          type="button"
          className="comfy-button small secondary"
          onClick={clearErrors}
        >
          Clear All
        </button>
      </div>

      <div className="error-list">
        {displayErrors.map((error) => {
          const errorId = `${error.promptId}-${error.nodeId}-${error.timestamp}`
          const isExpanded = expandedError === errorId
          const analysis = ErrorAnalyzer.categorizeError(error)

          return (
            <div key={errorId} className={`error-item ${analysis.severity}`}>
              <div className="error-summary" onClick={() => toggleErrorExpansion(errorId)}>
                <div className="error-main">
                  <div className="error-info">
                    <div className="error-node">
                      <span className="node-type">{error.nodeType}</span>
                      <span className="node-id">#{error.nodeId}</span>
                    </div>
                    <div className="error-message-preview">
                      {error.message.slice(0, 100)}
                      {error.message.length > 100 && '...'}
                    </div>
                  </div>
                  
                  <div className="error-meta">
                    <div className="error-severity">
                      <span className={`severity-badge ${analysis.severity}`}>
                        {getSeverityIcon(analysis.severity)}
                        {analysis.severity}
                      </span>
                    </div>
                    <div className="error-time">
                      {formatTimestamp(error.timestamp)}
                    </div>
                  </div>
                </div>

                <button className="expand-toggle" type="button">
                  <svg 
                    viewBox="0 0 24 24" 
                    width="16" 
                    height="16"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
                  </svg>
                </button>
              </div>

              {isExpanded && showDetails && (
                <div className="error-details">
                  <div className="error-full-message">
                    <h4>Error Message:</h4>
                    <pre className="error-text">{error.message}</pre>
                  </div>

                  <div className="error-metadata">
                    <div className="metadata-grid">
                      <div className="metadata-item">
                        <span className="metadata-label">Type:</span>
                        <span className="metadata-value">{error.type}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Category:</span>
                        <span className="metadata-value">{analysis.category}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Prompt ID:</span>
                        <span className="metadata-value">{error.promptId}</span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Node:</span>
                        <span className="metadata-value">{error.nodeId}</span>
                      </div>
                    </div>
                  </div>

                  {analysis.suggestions.length > 0 && (
                    <div className="error-suggestions">
                      <h4>Suggestions:</h4>
                      <ul className="suggestion-list">
                        {analysis.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="suggestion-item">
                            <svg className="suggestion-icon" viewBox="0 0 24 24" width="14" height="14">
                              <path fill="currentColor" d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" />
                            </svg>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {error.traceback.length > 0 && (
                    <div className="error-traceback">
                      <h4>Stack Trace:</h4>
                      <pre className="traceback-text">
                        {error.traceback.join('\n')}
                      </pre>
                    </div>
                  )}

                  {Object.keys(error.inputs).length > 0 && (
                    <div className="error-inputs">
                      <h4>Node Inputs:</h4>
                      <pre className="inputs-text">
                        {JSON.stringify(error.inputs, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {recentErrors.length > maxErrors && (
        <div className="error-overflow">
          <span className="overflow-text">
            and {recentErrors.length - maxErrors} more error(s)
          </span>
        </div>
      )}
    </div>
  )
}