// ============================================================================
// ComfyUI React - Import Progress Dialog Component
// ============================================================================

import React, { useEffect, useState } from 'react'
import type { IImportProgress } from '@/services/importService'
import './ImportProgressDialog.css'

interface ImportProgressDialogProps {
  progress: IImportProgress
  onCancel?: () => void
  onComplete?: () => void
  allowCancel?: boolean
}

export const ImportProgressDialog: React.FC<ImportProgressDialogProps> = ({
  progress,
  onCancel,
  onComplete,
  allowCancel = true
}) => {
  const [elapsedTime, setElapsedTime] = useState(0)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
  const startTime = React.useRef(Date.now())

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.current) / 1000)
      setElapsedTime(elapsed)

      // Estimate time remaining
      if (progress.processed > 0 && progress.processed < progress.total) {
        const timePerItem = elapsed / progress.processed
        const remaining = (progress.total - progress.processed) * timePerItem
        setEstimatedTimeRemaining(Math.ceil(remaining))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [progress.processed, progress.total])

  // Check if import is complete
  useEffect(() => {
    if (progress.processed === progress.total && onComplete) {
      // Give a small delay to show 100% completion
      setTimeout(onComplete, 500)
    }
  }, [progress.processed, progress.total, onComplete])

  // Calculate percentage
  const percentage = progress.total > 0 
    ? Math.round((progress.processed / progress.total) * 100)
    : 0

  // Format time
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Get status color
  const getStatusColor = (): string => {
    if (progress.failed > 0) return 'warning'
    if (progress.processed === progress.total) return 'success'
    return 'primary'
  }

  // Calculate items per second
  const itemsPerSecond = elapsedTime > 0 
    ? (progress.processed / elapsedTime).toFixed(1)
    : '0'

  return (
    <div className="import-progress-overlay">
      <div className="import-progress-dialog">
        {/* Header */}
        <div className="progress-header">
          <h3>Importing Presets</h3>
          {allowCancel && progress.processed < progress.total && (
            <button className="cancel-btn" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>

        {/* Current preset */}
        {progress.currentPreset && (
          <div className="current-preset">
            <span className="label">Processing:</span>
            <span className="preset-name">{progress.currentPreset}</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className={`progress-fill ${getStatusColor()}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="progress-text">{percentage}%</div>
        </div>

        {/* Statistics */}
        <div className="import-stats">
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-value">{progress.processed}</span>
              <span className="stat-label">Processed</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{progress.succeeded}</span>
              <span className="stat-label">Succeeded</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{progress.skipped}</span>
              <span className="stat-label">Skipped</span>
            </div>
            <div className="stat-item">
              <span className="stat-value error">{progress.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>

          <div className="time-stats">
            <div className="time-item">
              <span className="label">Elapsed:</span>
              <span className="value">{formatTime(elapsedTime)}</span>
            </div>
            {estimatedTimeRemaining !== null && progress.processed < progress.total && (
              <div className="time-item">
                <span className="label">Remaining:</span>
                <span className="value">~{formatTime(estimatedTimeRemaining)}</span>
              </div>
            )}
            <div className="time-item">
              <span className="label">Speed:</span>
              <span className="value">{itemsPerSecond} presets/s</span>
            </div>
          </div>
        </div>

        {/* Errors */}
        {progress.errors.length > 0 && (
          <div className="error-section">
            <h4>Errors ({progress.errors.length})</h4>
            <div className="error-list">
              {progress.errors.slice(0, 5).map((error, index) => (
                <div key={index} className="error-item">
                  <span className="error-preset">{error.preset}:</span>
                  <span className="error-message">{error.error}</span>
                </div>
              ))}
              {progress.errors.length > 5 && (
                <div className="error-more">
                  ...and {progress.errors.length - 5} more errors
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completion message */}
        {progress.processed === progress.total && (
          <div className="completion-message">
            <div className="completion-icon">✓</div>
            <h4>Import Complete!</h4>
            <p>
              Successfully imported {progress.succeeded} presets
              {progress.skipped > 0 && `, skipped ${progress.skipped}`}
              {progress.failed > 0 && `, failed ${progress.failed}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}