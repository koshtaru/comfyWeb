// ============================================================================
// ComfyUI React - Preset Card Component
// ============================================================================

import React, { useState } from 'react'
import type { IPreset } from '@/types/preset'
import './PresetCard.css'

interface PresetCardProps {
  preset: IPreset
  selected: boolean
  onSelect: () => void
  onEdit: (updates: Partial<IPreset>) => void
  onDelete: () => void
  onToggleSelection: (selected: boolean) => void
  onToggleCompression: () => void
  viewMode: 'grid' | 'list'
}

export const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onToggleSelection,
  onToggleCompression,
  viewMode
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(preset.name)
  const [editTags, setEditTags] = useState(preset.tags?.join(', ') || '')

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get category color
  const getCategoryColor = (category?: string): string => {
    switch (category) {
      case 'quality': return '#10b981'
      case 'speed': return '#f59e0b'
      case 'style': return '#8b5cf6'
      case 'dimension': return '#06b6d4'
      case 'custom': return '#ef4444'
      case 'imported': return '#6b7280'
      default: return '#374151'
    }
  }

  // Handle edit save
  const handleEditSave = () => {
    const updates: Partial<IPreset> = {
      name: editName.trim(),
      tags: editTags.split(',').map(tag => tag.trim()).filter(Boolean)
    }
    
    onEdit(updates)
    setIsEditing(false)
  }

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditName(preset.name)
    setEditTags(preset.tags?.join(', ') || '')
    setIsEditing(false)
  }

  const cardClassName = [
    'preset-card',
    viewMode,
    selected ? 'selected' : '',
    preset.compressed ? 'compressed' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={cardClassName}>
      {/* Selection checkbox */}
      <div className="preset-checkbox">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelection(e.target.checked)}
          aria-label={`Select ${preset.name}`}
        />
      </div>

      {/* Main content area */}
      <div className="preset-content" onClick={onSelect}>
        {/* Header */}
        <div className="preset-header">
          <div className="preset-title">
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="edit-input"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSave()
                  if (e.key === 'Escape') handleEditCancel()
                }}
                autoFocus
              />
            ) : (
              <h3 className="preset-name">{preset.name}</h3>
            )}
          </div>
          
          <div className="preset-badges">
            {preset.category && (
              <span 
                className="badge category"
                style={{ backgroundColor: getCategoryColor(preset.category) }}
              >
                {preset.category}
              </span>
            )}
            
            {preset.compressed && (
              <span className="badge compressed">
                📦 Compressed
              </span>
            )}
            
            <span className="badge size">
              {formatSize(preset.size)}
            </span>
          </div>
        </div>

        {/* Metadata preview */}
        <div className="preset-metadata">
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="label">Model:</span>
              <span className="value">{preset.metadata.model.name}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Steps:</span>
              <span className="value">{preset.metadata.generation.steps}</span>
            </div>
            <div className="metadata-item">
              <span className="label">CFG:</span>
              <span className="value">{preset.metadata.generation.cfg}</span>
            </div>
            <div className="metadata-item">
              <span className="label">Size:</span>
              <span className="value">
                {preset.metadata.dimensions.width}×{preset.metadata.dimensions.height}
              </span>
            </div>
          </div>
          
          {/* Prompt preview */}
          <div className="prompt-preview">
            <div className="prompt-positive">
              {preset.metadata.prompts.positive.slice(0, 100)}
              {preset.metadata.prompts.positive.length > 100 && '...'}
            </div>
            {preset.metadata.prompts.negative && (
              <div className="prompt-negative">
                Negative: {preset.metadata.prompts.negative.slice(0, 60)}
                {preset.metadata.prompts.negative.length > 60 && '...'}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {(preset.tags && preset.tags.length > 0) && (
          <div className="preset-tags">
            {isEditing ? (
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Tag1, Tag2, Tag3"
                className="edit-input tags-input"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSave()
                  if (e.key === 'Escape') handleEditCancel()
                }}
              />
            ) : (
              preset.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))
            )}
          </div>
        )}

        {/* Footer with dates */}
        <div className="preset-footer">
          <div className="preset-dates">
            <span className="date-item">
              Created: {formatDate(preset.createdAt)}
            </span>
            {new Date(preset.lastModified).getTime() !== new Date(preset.createdAt).getTime() && (
              <span className="date-item">
                Modified: {formatDate(preset.lastModified)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="preset-actions">
        <button
          className="action-btn apply"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          title="Apply this preset"
        >
          ✓
        </button>
        
        <button
          className="action-btn edit"
          onClick={(e) => {
            e.stopPropagation()
            if (isEditing) {
              handleEditSave()
            } else {
              setIsEditing(true)
            }
          }}
          title={isEditing ? "Save changes" : "Edit preset"}
        >
          {isEditing ? '💾' : '✏️'}
        </button>
        
        {isEditing && (
          <button
            className="action-btn cancel"
            onClick={(e) => {
              e.stopPropagation()
              handleEditCancel()
            }}
            title="Cancel editing"
          >
            ✕
          </button>
        )}
        
        <button
          className="action-btn compress"
          onClick={(e) => {
            e.stopPropagation()
            onToggleCompression()
          }}
          title={preset.compressed ? "Decompress preset" : "Compress preset"}
        >
          {preset.compressed ? '📂' : '📦'}
        </button>
        
        <button
          className="action-btn details"
          onClick={(e) => {
            e.stopPropagation()
            setShowDetails(!showDetails)
          }}
          title="Toggle details"
        >
          {showDetails ? '👁️‍🗨️' : '👁️'}
        </button>
        
        <button
          className="action-btn delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          title="Delete preset"
        >
          🗑️
        </button>
      </div>

      {/* Detailed view */}
      {showDetails && (
        <div className="preset-details">
          <div className="details-section">
            <h4>Generation Settings</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Sampler:</span>
                <span className="value">{preset.metadata.generation.sampler}</span>
              </div>
              <div className="detail-item">
                <span className="label">Scheduler:</span>
                <span className="value">{preset.metadata.generation.scheduler}</span>
              </div>
              <div className="detail-item">
                <span className="label">Seed:</span>
                <span className="value">{preset.metadata.generation.seed}</span>
              </div>
              <div className="detail-item">
                <span className="label">Batch Size:</span>
                <span className="value">{preset.metadata.dimensions.batchSize}</span>
              </div>
              {preset.metadata.generation.denoise && (
                <div className="detail-item">
                  <span className="label">Denoise:</span>
                  <span className="value">{preset.metadata.generation.denoise}</span>
                </div>
              )}
            </div>
          </div>

          <div className="details-section">
            <h4>Model Information</h4>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Architecture:</span>
                <span className="value">{preset.metadata.model.architecture}</span>
              </div>
              {preset.metadata.model.hash && (
                <div className="detail-item">
                  <span className="label">Hash:</span>
                  <span className="value">{preset.metadata.model.hash.slice(0, 8)}...</span>
                </div>
              )}
            </div>
          </div>

          {preset.metadata.compatibility && (
            <div className="details-section">
              <h4>Compatibility</h4>
              <div className="details-grid">
                {preset.metadata.compatibility.comfyuiVersion && (
                  <div className="detail-item">
                    <span className="label">ComfyUI Version:</span>
                    <span className="value">{preset.metadata.compatibility.comfyuiVersion}</span>
                  </div>
                )}
                {preset.metadata.compatibility.requiredNodes && (
                  <div className="detail-item">
                    <span className="label">Required Nodes:</span>
                    <span className="value">{preset.metadata.compatibility.requiredNodes.length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="details-section">
            <h4>Full Prompts</h4>
            <div className="prompt-full">
              <div className="prompt-section">
                <label>Positive:</label>
                <div className="prompt-text positive">
                  {preset.metadata.prompts.positive}
                </div>
              </div>
              {preset.metadata.prompts.negative && (
                <div className="prompt-section">
                  <label>Negative:</label>
                  <div className="prompt-text negative">
                    {preset.metadata.prompts.negative}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}