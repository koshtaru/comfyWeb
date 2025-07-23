import React, { useState, useEffect, useRef } from 'react'
import { usePresetManager, type ParameterSet, type ParameterPreset } from './hooks/usePresetManager'

interface PresetCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  parameters: ParameterSet
  onPresetCreated?: (preset: ParameterPreset) => void
}

export const PresetCreationDialog: React.FC<PresetCreationDialogProps> = ({
  isOpen,
  onClose,
  parameters,
  onPresetCreated
}) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'quality' | 'speed' | 'custom'>('custom')
  const [tags, setTags] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { createPreset, presets } = usePresetManager()

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setDescription('')
      setCategory('custom')
      setTags('')
      setError(null)
      setIsCreating(false)
      
      // Focus name input
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleCreate()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, name, description])

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Preset name is required'
    }

    if (name.trim().length < 2) {
      return 'Preset name must be at least 2 characters'
    }

    if (name.trim().length > 50) {
      return 'Preset name must be less than 50 characters'
    }

    // Check for duplicate names
    const existingPreset = presets.find(
      p => p.name.toLowerCase() === name.trim().toLowerCase()
    )
    if (existingPreset) {
      return 'A preset with this name already exists'
    }

    if (description.length > 200) {
      return 'Description must be less than 200 characters'
    }

    return null
  }

  const handleCreate = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      // Parse tags
      const tagList = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .slice(0, 10) // Limit to 10 tags

      const newPreset = createPreset(
        name.trim(),
        parameters,
        description.trim() || undefined,
        category
      )

      // Add tags if provided
      if (tagList.length > 0) {
        newPreset.tags = [...newPreset.tags, ...tagList]
      }

      if (onPresetCreated) {
        onPresetCreated(newPreset)
      }

      onClose()
    } catch (err) {
      console.error('Error creating preset:', err)
      setError('Failed to create preset. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    if (isCreating) return
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel()
    }
  }

  if (!isOpen) return null

  return (
    <div className="preset-dialog-overlay" onClick={handleBackdropClick}>
      <div className="preset-dialog">
        <div className="preset-dialog-header">
          <h3>Create New Preset</h3>
          <button 
            className="preset-dialog-close"
            onClick={handleCancel}
            disabled={isCreating}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="preset-dialog-body">
          {error && (
            <div className="preset-dialog-error">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Current Parameters Preview */}
          <div className="preset-dialog-preview">
            <h4>Current Parameters</h4>
            <div className="preset-preview-grid">
              <div className="preview-item">
                <span className="preview-label">Steps:</span>
                <span className="preview-value">{parameters.steps}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">CFG Scale:</span>
                <span className="preview-value">{parameters.cfg}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Dimensions:</span>
                <span className="preview-value">{parameters.width}×{parameters.height}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Seed:</span>
                <span className="preview-value">{parameters.seed === -1 ? 'Random' : parameters.seed}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Batch Size:</span>
                <span className="preview-value">{parameters.batchSize}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Batch Count:</span>
                <span className="preview-value">{parameters.batchCount}</span>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="preset-dialog-form">
            <div className="form-field">
              <label htmlFor="preset-name">
                Preset Name <span className="required">*</span>
              </label>
              <input
                id="preset-name"
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Custom Settings"
                maxLength={50}
                disabled={isCreating}
                className={error && error.includes('name') ? 'error' : ''}
              />
              <div className="field-hint">
                {name.length}/50 characters
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="preset-description">Description</label>
              <textarea
                id="preset-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of when to use this preset..."
                maxLength={200}
                rows={3}
                disabled={isCreating}
              />
              <div className="field-hint">
                {description.length}/200 characters
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="preset-category">Category</label>
              <select
                id="preset-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                disabled={isCreating}
              >
                <option value="custom">Custom</option>
                <option value="quality">Quality</option>
                <option value="speed">Speed</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="preset-tags">Tags (Optional)</label>
              <input
                id="preset-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., portrait, landscape, experimental"
                disabled={isCreating}
              />
              <div className="field-hint">
                Separate tags with commas. Maximum 10 tags.
              </div>
            </div>
          </div>
        </div>

        <div className="preset-dialog-footer">
          <button
            className="preset-dialog-button secondary"
            onClick={handleCancel}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            className="preset-dialog-button primary"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? (
              <>
                <span className="loading-spinner"></span>
                Creating...
              </>
            ) : (
              <>
                💾 Create Preset
              </>
            )}
          </button>
        </div>

        <div className="preset-dialog-shortcuts">
          <span>Press <kbd>Esc</kbd> to cancel or <kbd>Ctrl+Enter</kbd> to save</span>
        </div>
      </div>
    </div>
  )
}