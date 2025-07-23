// Generation Progress Component
// Real-time progress display for ComfyUI image generation

import React from 'react'
import { useComfyProgress } from '@/contexts/WebSocketContext'

interface GenerationProgressProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  showDetails = true,
  compact = false,
  className = ''
}) => {
  const {
    progress,
    progressPercentage,
    estimatedTimeRemaining,
    generationDuration,
    isGenerating,
    currentNode,
    queueRemaining,
    clearProgress
  } = useComfyProgress()

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--'
    
    if (seconds < 60) {
      return `${seconds}s`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage < 25) return 'progress-low'
    if (percentage < 75) return 'progress-medium'
    return 'progress-high'
  }

  if (compact) {
    return (
      <div className={`generation-progress compact ${className}`}>
        {isGenerating ? (
          <div className="progress-compact">
            <div className="progress-bar-mini">
              <div 
                className={`progress-fill-mini ${getProgressColor(progressPercentage)}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="progress-text-mini">
              {progressPercentage}%
            </span>
          </div>
        ) : (
          <div className="progress-idle">
            <span className="idle-text">Ready</span>
          </div>
        )}
      </div>
    )
  }

  if (!isGenerating && !progress.promptId) {
    return (
      <div className={`generation-progress idle ${className}`}>
        <div className="idle-state">
          <svg className="idle-icon" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,9H13V7H11V9M11,17H13V11H11V17Z" />
          </svg>
          <span className="idle-message">Ready for generation</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`generation-progress ${isGenerating ? 'active' : 'completed'} ${className}`}>
      <div className="progress-header">
        <div className="progress-info">
          <h3 className="progress-title">
            {isGenerating ? 'Generating' : 'Generation Complete'}
          </h3>
          {progress.promptId && (
            <span className="prompt-id">ID: {progress.promptId.slice(-8)}</span>
          )}
        </div>
        
        <div className="progress-actions">
          {!isGenerating && (
            <button
              type="button"
              className="comfy-button small secondary"
              onClick={clearProgress}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="progress-main">
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className={`progress-fill ${getProgressColor(progressPercentage)}`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="progress-text">
            <span className="percentage">{progressPercentage}%</span>
            {progress.maxProgress > 0 && (
              <span className="steps">
                {progress.progress} / {progress.maxProgress}
              </span>
            )}
          </div>
        </div>

        {currentNode && (
          <div className="current-node">
            <div className="node-indicator">
              <div className="node-pulse"></div>
              <span className="node-text">Processing: {currentNode}</span>
            </div>
          </div>
        )}
      </div>

      {showDetails && (
        <div className="progress-details">
          <div className="detail-grid">
            {generationDuration !== null && (
              <div className="detail-item">
                <span className="detail-label">Duration:</span>
                <span className="detail-value">{formatTime(generationDuration)}</span>
              </div>
            )}
            
            {isGenerating && estimatedTimeRemaining !== null && (
              <div className="detail-item">
                <span className="detail-label">Remaining:</span>
                <span className="detail-value">{formatTime(estimatedTimeRemaining)}</span>
              </div>
            )}
            
            {queueRemaining > 0 && (
              <div className="detail-item">
                <span className="detail-label">Queue:</span>
                <span className="detail-value">{queueRemaining} remaining</span>
              </div>
            )}
            
            {progress.executedNodes.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Nodes:</span>
                <span className="detail-value">{progress.executedNodes.length} executed</span>
              </div>
            )}
            
            {progress.cachedNodes && progress.cachedNodes.length > 0 && (
              <div className="detail-item">
                <span className="detail-label">Cached:</span>
                <span className="detail-value">{progress.cachedNodes.length} nodes</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}