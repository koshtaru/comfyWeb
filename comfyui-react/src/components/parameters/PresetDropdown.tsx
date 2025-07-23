import React, { useState, useRef, useEffect } from 'react'
import { usePresetManager, type ParameterSet, type ParameterPreset } from './hooks/usePresetManager'

interface PresetDropdownProps {
  currentParameters: ParameterSet
  onApplyPreset: (parameters: ParameterSet) => void
  onCreatePreset?: (parameters: ParameterSet) => void
  className?: string
  disabled?: boolean
}

export const PresetDropdown: React.FC<PresetDropdownProps> = ({
  currentParameters,
  onApplyPreset,
  onCreatePreset,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'quality' | 'speed' | 'dimension' | 'custom'>('all')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const {
    presets,
    loading,
    error,
    qualityPresets,
    speedPresets,
    dimensionPresets,
    customPresets,
    deletePreset,
    clearError
  } = usePresetManager()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Get filtered presets based on category
  const getFilteredPresets = (): ParameterPreset[] => {
    switch (selectedCategory) {
      case 'quality':
        return qualityPresets
      case 'speed':
        return speedPresets
      case 'dimension':
        return dimensionPresets
      case 'custom':
        return customPresets
      default:
        return presets
    }
  }

  // Check if current parameters match a preset
  const getCurrentPreset = (): ParameterPreset | null => {
    return presets.find(preset => 
      preset.parameters.steps === currentParameters.steps &&
      preset.parameters.cfg === currentParameters.cfg &&
      preset.parameters.width === currentParameters.width &&
      preset.parameters.height === currentParameters.height &&
      preset.parameters.batchSize === currentParameters.batchSize &&
      preset.parameters.batchCount === currentParameters.batchCount
    ) || null
  }

  const handleApplyPreset = (preset: ParameterPreset) => {
    onApplyPreset(preset.parameters)
    setIsOpen(false)
  }

  const handleDeletePreset = (preset: ParameterPreset, event: React.MouseEvent) => {
    event.stopPropagation()
    if (preset.isDefault) return
    
    if (confirm(`Delete preset "${preset.name}"?`)) {
      deletePreset(preset.id)
    }
  }

  const handleCreatePreset = () => {
    if (onCreatePreset) {
      onCreatePreset(currentParameters)
    }
    setIsOpen(false)
  }

  const currentPreset = getCurrentPreset()
  const filteredPresets = getFilteredPresets()

  if (loading) {
    return (
      <div className={`preset-dropdown loading ${className}`}>
        <button className="preset-dropdown-trigger" disabled>
          <span>Loading presets...</span>
        </button>
      </div>
    )
  }

  return (
    <div className={`preset-dropdown ${className}`} ref={dropdownRef}>
      <button
        className={`preset-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="preset-current">
          {currentPreset ? currentPreset.name : 'Custom Settings'}
        </span>
        <svg 
          className={`preset-dropdown-arrow ${isOpen ? 'rotated' : ''}`}
          viewBox="0 0 24 24" 
          width="16" 
          height="16"
        >
          <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
        </svg>
      </button>

      {isOpen && (
        <div className="preset-dropdown-menu">
          {error && (
            <div className="preset-error">
              <span>{error}</span>
              <button onClick={clearError} className="error-close">×</button>
            </div>
          )}

          {/* Category Filter */}
          <div className="preset-category-filter">
            <button
              className={selectedCategory === 'all' ? 'active' : ''}
              onClick={() => setSelectedCategory('all')}
            >
              All ({presets.length})
            </button>
            <button
              className={selectedCategory === 'quality' ? 'active' : ''}
              onClick={() => setSelectedCategory('quality')}
            >
              Quality ({qualityPresets.length})
            </button>
            <button
              className={selectedCategory === 'speed' ? 'active' : ''}
              onClick={() => setSelectedCategory('speed')}
            >
              Speed ({speedPresets.length})
            </button>
            <button
              className={selectedCategory === 'dimension' ? 'active' : ''}
              onClick={() => setSelectedCategory('dimension')}
            >
              Sizes ({dimensionPresets.length})
            </button>
            <button
              className={selectedCategory === 'custom' ? 'active' : ''}
              onClick={() => setSelectedCategory('custom')}
            >
              Custom ({customPresets.length})
            </button>
          </div>

          {/* Preset List */}
          <div className="preset-list">
            {filteredPresets.length === 0 ? (
              <div className="preset-empty">
                {selectedCategory === 'custom' 
                  ? 'No custom presets. Create one below!'
                  : 'No presets in this category'
                }
              </div>
            ) : (
              filteredPresets.map((preset) => (
                <div
                  key={preset.id}
                  className={`preset-item ${currentPreset?.id === preset.id ? 'active' : ''}`}
                  onClick={() => handleApplyPreset(preset)}
                >
                  <div className="preset-main">
                    <div className="preset-header">
                      <span className="preset-name">{preset.name}</span>
                      <div className="preset-badges">
                        {preset.isDefault && <span className="preset-badge default">Default</span>}
                        <span className={`preset-badge category-${preset.category}`}>
                          {preset.category}
                        </span>
                      </div>
                    </div>
                    
                    {preset.description && (
                      <div className="preset-description">{preset.description}</div>
                    )}
                    
                    <div className="preset-params">
                      <span>Steps: {preset.parameters.steps}</span>
                      <span>CFG: {preset.parameters.cfg}</span>
                      <span>{preset.parameters.width}×{preset.parameters.height}</span>
                      {preset.parameters.batchSize > 1 && (
                        <span>Batch: {preset.parameters.batchSize}</span>
                      )}
                    </div>
                  </div>
                  
                  {!preset.isDefault && (
                    <button
                      className="preset-delete"
                      onClick={(e) => handleDeletePreset(preset, e)}
                      title="Delete preset"
                      aria-label={`Delete preset ${preset.name}`}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="preset-actions">
            {onCreatePreset && (
              <button
                className="preset-action-button create"
                onClick={handleCreatePreset}
              >
                💾 Save Current as Preset
              </button>
            )}
            
            <div className="preset-action-group">
              <button className="preset-action-button secondary">
                📤 Export
              </button>
              <button className="preset-action-button secondary">
                📥 Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}