import React, { useMemo } from 'react'
import { ParameterInput } from './ParameterInput'

interface BatchControlProps {
  batchSize: number
  batchCount: number
  onBatchSizeChange: (value: number) => void
  onBatchCountChange: (value: number) => void
  disabled?: boolean
  className?: string
  showWarnings?: boolean
}

export const BatchControl: React.FC<BatchControlProps> = ({
  batchSize,
  batchCount,
  onBatchSizeChange,
  onBatchCountChange,
  disabled = false,
  className = '',
  showWarnings = true
}) => {
  // Calculate total images and performance metrics
  const totalImages = useMemo(() => batchSize * batchCount, [batchSize, batchCount])
  const estimatedTime = useMemo(() => getTimeEstimate(totalImages), [totalImages])
  const performanceWarning = useMemo(() => getPerformanceWarning(batchSize, totalImages), [batchSize, totalImages])
  const memoryWarning = useMemo(() => getMemoryWarning(batchSize), [batchSize])

  return (
    <div className={`batch-control ${className}`}>
      <div className="batch-dual-control">
        <ParameterInput
          label="Batch Size"
          value={batchSize}
          min={1}
          max={8}
          step={1}
          onChange={onBatchSizeChange}
          disabled={disabled}
          className="batch-size-input"
          aria-label="Number of images generated simultaneously"
        />
        
        <ParameterInput
          label="Batch Count"
          value={batchCount}
          min={1}
          max={100}
          step={1}
          onChange={onBatchCountChange}
          disabled={disabled}
          className="batch-count-input"
          aria-label="Number of batches to generate"
        />
      </div>

      <div className="batch-total-display">
        <div className="batch-total-label">Total Images</div>
        <div className="batch-total-value">{totalImages}</div>
      </div>

      <div className="batch-info">
        <div className="info-item">
          <span className="info-label">Est. Time:</span>
          <span className="info-value">{estimatedTime}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Memory Usage:</span>
          <span className={`info-value ${getMemoryClass(batchSize)}`}>
            {getMemoryLabel(batchSize)}
          </span>
        </div>
        <div className="info-item">
          <span className="info-label">Efficiency:</span>
          <span className={`info-value ${getEfficiencyClass(batchSize)}`}>
            {getEfficiencyLabel(batchSize)}
          </span>
        </div>
      </div>

      {showWarnings && performanceWarning && (
        <div className="batch-warning performance-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
          </svg>
          {performanceWarning}
        </div>
      )}

      {showWarnings && memoryWarning && (
        <div className="batch-warning memory-warning">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13,14H11V10H13M13,18H11V16H13M1,21H23L12,2L1,21Z"/>
          </svg>
          {memoryWarning}
        </div>
      )}

      <div className="batch-tips">
        <div className="tip-text">
          💡 <strong>Batch Size</strong> affects VRAM usage. <strong>Batch Count</strong> affects total generation time.
        </div>
        <div className="tip-text">
          🚀 Higher batch sizes are more efficient but require more VRAM.
        </div>
      </div>
    </div>
  )
}

// Helper functions for batch analysis
function getTimeEstimate(totalImages: number): string {
  // Rough estimates based on typical generation times
  const baseTimePerImage = 20 // seconds
  const totalSeconds = totalImages * baseTimePerImage
  
  if (totalSeconds < 60) return `~${totalSeconds}s`
  if (totalSeconds < 3600) return `~${Math.round(totalSeconds / 60)}min`
  
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.round((totalSeconds % 3600) / 60)
  return `~${hours}h ${minutes}m`
}

function getPerformanceWarning(_batchSize: number, totalImages: number): string | null {
  if (totalImages > 50) {
    return `Large batch (${totalImages} images) will take significant time to complete`
  }
  if (totalImages > 20) {
    return `Medium batch (${totalImages} images) - consider running in smaller chunks`
  }
  return null
}

function getMemoryWarning(batchSize: number): string | null {
  if (batchSize >= 8) {
    return 'Maximum batch size - requires 12GB+ VRAM'
  }
  if (batchSize >= 6) {
    return 'High batch size - requires 8GB+ VRAM'
  }
  if (batchSize >= 4) {
    return 'Medium batch size - requires 6GB+ VRAM'
  }
  return null
}

function getMemoryClass(batchSize: number): string {
  if (batchSize >= 6) return 'memory-high'
  if (batchSize >= 4) return 'memory-medium'
  return 'memory-low'
}

function getMemoryLabel(batchSize: number): string {
  if (batchSize >= 6) return 'High'
  if (batchSize >= 4) return 'Medium'
  return 'Low'
}

function getEfficiencyClass(batchSize: number): string {
  if (batchSize >= 4) return 'efficiency-high'
  if (batchSize >= 2) return 'efficiency-medium'
  return 'efficiency-low'
}

function getEfficiencyLabel(batchSize: number): string {
  if (batchSize >= 4) return 'Optimal'
  if (batchSize >= 2) return 'Good'
  return 'Basic'
}