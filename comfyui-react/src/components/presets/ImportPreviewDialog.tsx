// ============================================================================
// ComfyUI React - Import Preview Dialog Component
// ============================================================================

import React, { useState, useMemo } from 'react'
import type { IPreset } from '@/types/preset'
import type { IImportValidationResult } from '@/services/importService'
import './ImportPreviewDialog.css'

interface ImportPreviewDialogProps {
  presets: IPreset[]
  validation: IImportValidationResult
  onConfirm: (selectedPresets: IPreset[]) => void
  onCancel: () => void
  sourceFormat?: string
}

export const ImportPreviewDialog: React.FC<ImportPreviewDialogProps> = ({
  presets,
  validation,
  onConfirm,
  onCancel,
  sourceFormat
}) => {
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(
    new Set(presets.map(p => p.id))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name')
  const [expandedPresets, setExpandedPresets] = useState<Set<string>>(new Set())

  // Filter and sort presets
  const filteredPresets = useMemo(() => {
    let filtered = presets

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(preset => 
        preset.name.toLowerCase().includes(query) ||
        preset.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        preset.metadata?.model?.name?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(preset => preset.category === filterCategory)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    return filtered
  }, [presets, searchQuery, filterCategory, sortBy])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(presets.map(p => p.category).filter(Boolean))
    return ['all', ...Array.from(cats)]
  }, [presets])

  // Calculate statistics
  const stats = useMemo(() => {
    const selected = filteredPresets.filter(p => selectedPresets.has(p.id))
    return {
      total: filteredPresets.length,
      selected: selected.length,
      totalSize: selected.reduce((sum, p) => sum + p.size, 0)
    }
  }, [filteredPresets, selectedPresets])

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
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Toggle preset selection
  const togglePresetSelection = (presetId: string) => {
    const newSelection = new Set(selectedPresets)
    if (newSelection.has(presetId)) {
      newSelection.delete(presetId)
    } else {
      newSelection.add(presetId)
    }
    setSelectedPresets(newSelection)
  }

  // Toggle all selection
  const toggleAllSelection = () => {
    if (selectedPresets.size === filteredPresets.length) {
      setSelectedPresets(new Set())
    } else {
      setSelectedPresets(new Set(filteredPresets.map(p => p.id)))
    }
  }

  // Toggle preset expansion
  const togglePresetExpansion = (presetId: string) => {
    const newExpanded = new Set(expandedPresets)
    if (newExpanded.has(presetId)) {
      newExpanded.delete(presetId)
    } else {
      newExpanded.add(presetId)
    }
    setExpandedPresets(newExpanded)
  }

  // Handle confirm
  const handleConfirm = () => {
    const selected = presets.filter(p => selectedPresets.has(p.id))
    onConfirm(selected)
  }

  // Get format badge
  const getFormatBadge = () => {
    switch (validation.format) {
      case 'automatic1111':
        return { text: 'A1111', color: 'orange' }
      case 'invokeai':
        return { text: 'InvokeAI', color: 'purple' }
      case 'comfyui':
        return { text: 'ComfyUI', color: 'blue' }
      default:
        return { text: 'Unknown', color: 'gray' }
    }
  }

  const formatBadge = getFormatBadge()

  return (
    <div className="import-preview-overlay" onClick={onCancel}>
      <div className="import-preview-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="preview-header">
          <div className="header-info">
            <h2>Import Preview</h2>
            <div className="format-info">
              <span className={`format-badge ${formatBadge.color}`}>
                {formatBadge.text}
              </span>
              {validation.version && (
                <span className="version">v{validation.version}</span>
              )}
            </div>
          </div>
          <button className="close-btn" onClick={onCancel}>
            ✕
          </button>
        </div>

        {/* Validation messages */}
        {(validation.warnings.length > 0 || validation.errors.length > 0) && (
          <div className="validation-messages">
            {validation.errors.map((error, index) => (
              <div key={`error-${index}`} className="message error">
                <span className="icon">❌</span>
                <span>{error}</span>
              </div>
            ))}
            {validation.warnings.map((warning, index) => (
              <div key={`warning-${index}`} className="message warning">
                <span className="icon">⚠️</span>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filters and controls */}
        <div className="preview-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="date">Sort by Date</option>
          </select>

          <button className="select-all-btn" onClick={toggleAllSelection}>
            {selectedPresets.size === filteredPresets.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Statistics bar */}
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{stats.total} presets</span>
          </div>
          <div className="stat">
            <span className="stat-label">Selected:</span>
            <span className="stat-value">{stats.selected} presets</span>
          </div>
          <div className="stat">
            <span className="stat-label">Size:</span>
            <span className="stat-value">{formatSize(stats.totalSize)}</span>
          </div>
        </div>

        {/* Preset list */}
        <div className="preset-list">
          {filteredPresets.length === 0 ? (
            <div className="empty-state">
              <p>No presets match your filters</p>
            </div>
          ) : (
            filteredPresets.map(preset => (
              <div 
                key={preset.id} 
                className={`preset-item ${selectedPresets.has(preset.id) ? 'selected' : ''}`}
              >
                <div className="preset-header">
                  <input
                    type="checkbox"
                    checked={selectedPresets.has(preset.id)}
                    onChange={() => togglePresetSelection(preset.id)}
                  />
                  
                  <div className="preset-info" onClick={() => togglePresetExpansion(preset.id)}>
                    <div className="preset-name">{preset.name}</div>
                    <div className="preset-meta">
                      <span className="category">{preset.category}</span>
                      <span className="size">{formatSize(preset.size)}</span>
                      <span className="date">{formatDate(preset.createdAt)}</span>
                    </div>
                  </div>

                  <button
                    className="expand-btn"
                    onClick={() => togglePresetExpansion(preset.id)}
                  >
                    {expandedPresets.has(preset.id) ? '▼' : '▶'}
                  </button>
                </div>

                {expandedPresets.has(preset.id) && (
                  <div className="preset-details">
                    {preset.description && (
                      <div className="detail-row">
                        <span className="label">Description:</span>
                        <span className="value">{preset.description}</span>
                      </div>
                    )}
                    
                    {preset.tags && preset.tags.length > 0 && (
                      <div className="detail-row">
                        <span className="label">Tags:</span>
                        <div className="tags">
                          {preset.tags.map(tag => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {preset.metadata && (
                      <>
                        <div className="detail-row">
                          <span className="label">Model:</span>
                          <span className="value">{preset.metadata.model.name}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Resolution:</span>
                          <span className="value">
                            {preset.metadata.dimensions.width} × {preset.metadata.dimensions.height}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Steps:</span>
                          <span className="value">{preset.metadata.generation.steps}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Sampler:</span>
                          <span className="value">{preset.metadata.generation.sampler}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="preview-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={selectedPresets.size === 0}
          >
            Import {stats.selected} Preset{stats.selected !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}