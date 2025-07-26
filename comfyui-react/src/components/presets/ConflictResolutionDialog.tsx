// ============================================================================
// ComfyUI React - Conflict Resolution Dialog Component
// ============================================================================

import React, { useState } from 'react'
import type { IPreset } from '@/types/preset'
import type { IImportConflict } from '@/services/importService'
import './ConflictResolutionDialog.css'

interface ConflictResolutionDialogProps {
  conflicts: IImportConflict[]
  onResolve: (resolutions: Array<{ conflict: IImportConflict; resolution: 'replace' | 'skip' | 'merge' | 'rename' }>) => void
  onCancel: () => void
}

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  conflicts,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<Record<string, 'replace' | 'skip' | 'merge' | 'rename'>>(
    conflicts.reduce((acc, _conflict, index) => ({
      ...acc,
      [index]: 'skip' // Default to skip
    }), {})
  )
  const [renamedPresets, setRenamedPresets] = useState<Record<string, string>>({})
  const [currentConflictIndex, setCurrentConflictIndex] = useState(0)
  const [comparisonView, setComparisonView] = useState<'side-by-side' | 'diff'>('side-by-side')

  const currentConflict = conflicts[currentConflictIndex]

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Handle resolution change
  const handleResolutionChange = (index: number, resolution: 'replace' | 'skip' | 'merge' | 'rename') => {
    setResolutions(prev => ({
      ...prev,
      [index]: resolution
    }))

    // If rename is selected, set default renamed name
    if (resolution === 'rename' && !renamedPresets[index]) {
      const conflict = conflicts[index]
      setRenamedPresets(prev => ({
        ...prev,
        [index]: `${conflict.importedPreset.name} (Imported)`
      }))
    }
  }

  // Handle rename input change
  const handleRenameChange = (index: number, newName: string) => {
    setRenamedPresets(prev => ({
      ...prev,
      [index]: newName
    }))
  }

  // Navigate between conflicts
  const navigateConflict = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentConflictIndex > 0) {
      setCurrentConflictIndex(currentConflictIndex - 1)
    } else if (direction === 'next' && currentConflictIndex < conflicts.length - 1) {
      setCurrentConflictIndex(currentConflictIndex + 1)
    }
  }

  // Apply all resolutions
  const handleApplyAll = () => {
    const finalResolutions = conflicts.map((conflict, index) => {
      const resolution = resolutions[index]
      
      // Apply rename if needed
      if (resolution === 'rename' && renamedPresets[index]) {
        conflict.importedPreset.name = renamedPresets[index]
      }

      return {
        conflict,
        resolution
      }
    })

    onResolve(finalResolutions)
  }

  // Quick actions
  const applyQuickAction = (action: 'replace-all' | 'skip-all' | 'rename-all') => {
    const newResolutions: Record<string, 'replace' | 'skip' | 'rename'> = {}
    
    conflicts.forEach((_, index) => {
      switch (action) {
        case 'replace-all':
          newResolutions[index] = 'replace'
          break
        case 'skip-all':
          newResolutions[index] = 'skip'
          break
        case 'rename-all':
          newResolutions[index] = 'rename'
          // Set default renamed names
          if (!renamedPresets[index]) {
            setRenamedPresets(prev => ({
              ...prev,
              [index]: `${conflicts[index].importedPreset.name} (Imported)`
            }))
          }
          break
      }
    })

    setResolutions(newResolutions)
  }

  // Render preset details
  const renderPresetDetails = (preset: IPreset, title: string) => (
    <div className="preset-details">
      <h4>{title}</h4>
      <div className="details-grid">
        <div className="detail-item">
          <span className="label">Name:</span>
          <span className="value">{preset.name}</span>
        </div>
        
        {preset.description && (
          <div className="detail-item full-width">
            <span className="label">Description:</span>
            <span className="value">{preset.description}</span>
          </div>
        )}

        <div className="detail-item">
          <span className="label">Category:</span>
          <span className="value">{preset.category}</span>
        </div>

        <div className="detail-item">
          <span className="label">Tags:</span>
          <span className="value">{preset.tags?.join(', ') || 'None'}</span>
        </div>

        <div className="detail-item">
          <span className="label">Created:</span>
          <span className="value">{formatDate(preset.createdAt)}</span>
        </div>

        <div className="detail-item">
          <span className="label">Modified:</span>
          <span className="value">{formatDate(preset.lastModified)}</span>
        </div>

        <div className="detail-item">
          <span className="label">Size:</span>
          <span className="value">{formatSize(preset.size)}</span>
        </div>

        <div className="detail-item">
          <span className="label">Compressed:</span>
          <span className="value">{preset.compressed ? 'Yes' : 'No'}</span>
        </div>

        {preset.metadata && (
          <>
            <div className="detail-section-header full-width">Generation Settings</div>
            
            <div className="detail-item">
              <span className="label">Model:</span>
              <span className="value">{preset.metadata.model.name}</span>
            </div>

            <div className="detail-item">
              <span className="label">Steps:</span>
              <span className="value">{preset.metadata.generation.steps}</span>
            </div>

            <div className="detail-item">
              <span className="label">CFG:</span>
              <span className="value">{preset.metadata.generation.cfg}</span>
            </div>

            <div className="detail-item">
              <span className="label">Sampler:</span>
              <span className="value">{preset.metadata.generation.sampler}</span>
            </div>

            <div className="detail-item">
              <span className="label">Size:</span>
              <span className="value">
                {preset.metadata.dimensions.width} × {preset.metadata.dimensions.height}
              </span>
            </div>

            <div className="detail-item full-width">
              <span className="label">Positive:</span>
              <span className="value prompt">{preset.metadata.prompts.positive}</span>
            </div>

            <div className="detail-item full-width">
              <span className="label">Negative:</span>
              <span className="value prompt">{preset.metadata.prompts.negative}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // Render differences
  const renderDifferences = () => {
    if (!currentConflict.differences || currentConflict.differences.length === 0) {
      return <div className="no-differences">No significant differences found</div>
    }

    return (
      <div className="differences-list">
        <h4>Differences</h4>
        {currentConflict.differences.map((diff, index) => (
          <div key={index} className="difference-item">
            <div className="diff-field">{diff.field}</div>
            <div className="diff-values">
              <div className="diff-value existing">
                <span className="label">Existing:</span>
                <span className="value">{formatDiffValue(diff.existing)}</span>
              </div>
              <div className="diff-value imported">
                <span className="label">Imported:</span>
                <span className="value">{formatDiffValue(diff.imported)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Format difference values for display
  const formatDiffValue = (value: any): string => {
    if (value === null || value === undefined) return 'None'
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object') return JSON.stringify(value, null, 2)
    return String(value)
  }

  return (
    <div className="conflict-resolution-overlay" onClick={onCancel}>
      <div className="conflict-resolution-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <h2>Resolve Import Conflicts</h2>
          <div className="conflict-counter">
            {currentConflictIndex + 1} of {conflicts.length}
          </div>
          <button className="close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button
            className="quick-action-btn"
            onClick={() => applyQuickAction('replace-all')}
          >
            Replace All
          </button>
          <button
            className="quick-action-btn"
            onClick={() => applyQuickAction('skip-all')}
          >
            Skip All
          </button>
          <button
            className="quick-action-btn"
            onClick={() => applyQuickAction('rename-all')}
          >
            Rename All
          </button>
          
          <div className="view-toggle">
            <button
              className={`toggle-btn ${comparisonView === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setComparisonView('side-by-side')}
            >
              Side by Side
            </button>
            <button
              className={`toggle-btn ${comparisonView === 'diff' ? 'active' : ''}`}
              onClick={() => setComparisonView('diff')}
            >
              Differences
            </button>
          </div>
        </div>

        {/* Conflict Content */}
        <div className="conflict-content">
          {comparisonView === 'side-by-side' ? (
            <div className="comparison-view">
              <div className="preset-column existing">
                {renderPresetDetails(currentConflict.existingPreset, 'Existing Preset')}
              </div>
              <div className="preset-column imported">
                {renderPresetDetails(currentConflict.importedPreset, 'Imported Preset')}
              </div>
            </div>
          ) : (
            <div className="diff-view">
              {renderDifferences()}
            </div>
          )}

          {/* Resolution Options */}
          <div className="resolution-options">
            <h4>Choose Resolution:</h4>
            <div className="resolution-choices">
              <label className="resolution-choice">
                <input
                  type="radio"
                  name={`resolution-${currentConflictIndex}`}
                  value="replace"
                  checked={resolutions[currentConflictIndex] === 'replace'}
                  onChange={() => handleResolutionChange(currentConflictIndex, 'replace')}
                />
                <div className="choice-content">
                  <span className="choice-label">Replace</span>
                  <span className="choice-description">
                    Replace existing preset with imported version
                  </span>
                </div>
              </label>

              <label className="resolution-choice">
                <input
                  type="radio"
                  name={`resolution-${currentConflictIndex}`}
                  value="skip"
                  checked={resolutions[currentConflictIndex] === 'skip'}
                  onChange={() => handleResolutionChange(currentConflictIndex, 'skip')}
                />
                <div className="choice-content">
                  <span className="choice-label">Skip</span>
                  <span className="choice-description">
                    Keep existing preset, skip importing this one
                  </span>
                </div>
              </label>

              <label className="resolution-choice">
                <input
                  type="radio"
                  name={`resolution-${currentConflictIndex}`}
                  value="rename"
                  checked={resolutions[currentConflictIndex] === 'rename'}
                  onChange={() => handleResolutionChange(currentConflictIndex, 'rename')}
                />
                <div className="choice-content">
                  <span className="choice-label">Import as New</span>
                  <span className="choice-description">
                    Import with a different name
                  </span>
                </div>
              </label>

              {resolutions[currentConflictIndex] === 'rename' && (
                <div className="rename-input">
                  <input
                    type="text"
                    value={renamedPresets[currentConflictIndex] || ''}
                    onChange={(e) => handleRenameChange(currentConflictIndex, e.target.value)}
                    placeholder="Enter new name"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="dialog-navigation">
          <button
            className="nav-btn"
            onClick={() => navigateConflict('prev')}
            disabled={currentConflictIndex === 0}
          >
            ← Previous
          </button>

          <div className="resolution-summary">
            Replace: {Object.values(resolutions).filter(r => r === 'replace').length} | 
            Skip: {Object.values(resolutions).filter(r => r === 'skip').length} | 
            Rename: {Object.values(resolutions).filter(r => r === 'rename').length}
          </div>

          <button
            className="nav-btn"
            onClick={() => navigateConflict('next')}
            disabled={currentConflictIndex === conflicts.length - 1}
          >
            Next →
          </button>
        </div>

        {/* Actions */}
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel Import
          </button>
          <button className="btn btn-primary" onClick={handleApplyAll}>
            Apply All Resolutions
          </button>
        </div>
      </div>
    </div>
  )
}