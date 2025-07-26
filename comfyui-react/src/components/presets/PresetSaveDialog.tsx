// ============================================================================
// ComfyUI React - Preset Save Dialog Component
// ============================================================================

import React, { useState, useEffect } from 'react'
import type { IPreset, IPresetCreateInput, PresetCategory, IPresetValidationResult } from '@/types/preset'
import type { ComfyUIWorkflow } from '@/types'
import { compressionService } from '@/utils/compression'
import './PresetSaveDialog.css'

interface PresetSaveDialogProps {
  onSave: (preset: Omit<IPreset, 'id' | 'createdAt' | 'lastModified' | 'size'>) => Promise<void>
  onClose: () => void
  initialData?: Partial<IPresetCreateInput>
  workflowData?: ComfyUIWorkflow
}

export const PresetSaveDialog: React.FC<PresetSaveDialogProps> = ({
  onSave,
  onClose,
  initialData,
  workflowData
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    category: initialData?.category || 'custom' as PresetCategory,
    tags: initialData?.tags?.join(', ') || '',
    description: ''
  })

  // UI state
  const [saving, setSaving] = useState(false)
  const [validation, setValidation] = useState<IPresetValidationResult>({
    isValid: true,
    errors: [],
    warnings: []
  })
  const [compressionPreview, setCompressionPreview] = useState<{
    originalSize: number
    compressedSize: number
    ratio: number
  } | null>(null)
  const [useCompression, setUseCompression] = useState(true)

  // Generate compression preview when workflow data is available
  useEffect(() => {
    if (workflowData && useCompression) {
      const generatePreview = async () => {
        try {
          const result = await compressionService.compressWorkflow(workflowData)
          setCompressionPreview({
            originalSize: result.originalSize,
            compressedSize: result.compressedSize,
            ratio: result.ratio
          })
        } catch (error) {
          console.error('Failed to generate compression preview:', error)
          setCompressionPreview(null)
        }
      }
      generatePreview()
    } else {
      setCompressionPreview(null)
    }
  }, [workflowData, useCompression])

  // Validate form data
  useEffect(() => {
    const validateForm = (): IPresetValidationResult => {
      const errors: string[] = []
      const warnings: string[] = []
      const suggestions: string[] = []

      // Name validation
      if (!formData.name.trim()) {
        errors.push('Preset name is required')
      } else if (formData.name.trim().length < 3) {
        errors.push('Preset name must be at least 3 characters long')
      } else if (formData.name.trim().length > 50) {
        errors.push('Preset name must be less than 50 characters')
      }

      // Name format validation
      if (formData.name.trim() && !/^[a-zA-Z0-9\s\-_()]+$/.test(formData.name.trim())) {
        warnings.push('Preset name contains special characters that may cause issues')
      }

      // Category validation
      const validCategories: PresetCategory[] = ['quality', 'speed', 'style', 'custom', 'imported', 'dimension']
      if (!validCategories.includes(formData.category)) {
        errors.push('Invalid category selected')
      }

      // Tags validation
      if (formData.tags.trim()) {
        const tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        if (tags.length > 10) {
          warnings.push('Consider using fewer than 10 tags for better organization')
        }
        
        const longTags = tags.filter(tag => tag.length > 20)
        if (longTags.length > 0) {
          warnings.push('Some tags are very long - consider shortening them')
        }

        const duplicateTags = tags.filter((tag, index) => tags.indexOf(tag) !== index)
        if (duplicateTags.length > 0) {
          warnings.push('Duplicate tags detected - they will be removed')
        }
      }

      // Workflow data validation
      if (!workflowData) {
        errors.push('No workflow data available to save')
      }

      // Suggestions
      if (!formData.tags.trim()) {
        suggestions.push('Consider adding tags to help organize and find this preset later')
      }

      if (!formData.description.trim()) {
        suggestions.push('Adding a description helps remember what this preset is for')
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }
    }

    setValidation(validateForm())
  }, [formData, workflowData])

  // Handle form field changes
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle save
  const handleSave = async () => {
    if (!validation.isValid || !workflowData) return

    setSaving(true)
    try {
      // Extract metadata from workflow (this would need to be implemented based on your workflow structure)
      const metadata = extractMetadataFromWorkflow(workflowData)
      
      // Process tags
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .filter((tag, index, arr) => arr.indexOf(tag) === index) // Remove duplicates

      // Create preset object
      const preset: Omit<IPreset, 'id' | 'createdAt' | 'lastModified' | 'size'> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        workflowData,
        metadata,
        compressed: useCompression,
        tags,
        category: formData.category,
        version: '1.0.0'
      }

      await onSave(preset)
      onClose()
    } catch (error) {
      console.error('Failed to save preset:', error)
      // You might want to show an error toast here
    } finally {
      setSaving(false)
    }
  }

  // Extract metadata from workflow (placeholder implementation)
  const extractMetadataFromWorkflow = (workflow: ComfyUIWorkflow) => {
    // This would need to be implemented based on your actual workflow structure
    // For now, returning a basic structure
    return {
      model: {
        name: 'Unknown Model',
        architecture: 'SD1.5',
        hash: undefined
      },
      generation: {
        steps: 20,
        cfg: 7.0,
        sampler: 'euler',
        scheduler: 'normal',
        seed: -1,
        denoise: undefined
      },
      dimensions: {
        width: 512,
        height: 512,
        batchSize: 1
      },
      prompts: {
        positive: '',
        negative: ''
      },
      timingEstimate: undefined,
      compatibility: undefined
    }
  }

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Format percentage
  const formatPercent = (ratio: number): string => {
    return ((1 - ratio) * 100).toFixed(1) + '%'
  }

  return (
    <div className="preset-save-dialog-overlay" onClick={onClose}>
      <div className="preset-save-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <h2>Save New Preset</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Form */}
        <form className="dialog-form" onSubmit={(e) => e.preventDefault()}>
          {/* Name field */}
          <div className="form-group">
            <label htmlFor="preset-name">Preset Name *</label>
            <input
              id="preset-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter a descriptive name for this preset"
              className={validation.errors.some(e => e.includes('name')) ? 'error' : ''}
              maxLength={50}
              autoFocus
            />
            <div className="character-count">
              {formData.name.length}/50
            </div>
          </div>

          {/* Category field */}
          <div className="form-group">
            <label htmlFor="preset-category">Category</label>
            <select
              id="preset-category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              <option value="custom">Custom</option>
              <option value="quality">Quality</option>
              <option value="speed">Speed</option>
              <option value="style">Style</option>
              <option value="dimension">Dimension</option>
            </select>
          </div>

          {/* Tags field */}
          <div className="form-group">
            <label htmlFor="preset-tags">Tags</label>
            <input
              id="preset-tags"
              type="text"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="portrait, high-quality, detailed (separate with commas)"
            />
            <div className="help-text">
              Use tags to organize and search for presets later
            </div>
          </div>

          {/* Description field */}
          <div className="form-group">
            <label htmlFor="preset-description">Description</label>
            <textarea
              id="preset-description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Optional description of what this preset is good for..."
              rows={3}
              maxLength={200}
            />
            <div className="character-count">
              {formData.description.length}/200
            </div>
          </div>

          {/* Compression option */}
          <div className="form-group">
            <div className="checkbox-group">
              <input
                id="use-compression"
                type="checkbox"
                checked={useCompression}
                onChange={(e) => setUseCompression(e.target.checked)}
              />
              <label htmlFor="use-compression">Enable compression</label>
            </div>
            <div className="help-text">
              Compression reduces storage space but may slightly increase load times
            </div>
            
            {/* Compression preview */}
            {compressionPreview && (
              <div className="compression-preview">
                <div className="preview-item">
                  <span className="label">Original size:</span>
                  <span className="value">{formatSize(compressionPreview.originalSize)}</span>
                </div>
                <div className="preview-item">
                  <span className="label">Compressed size:</span>
                  <span className="value">{formatSize(compressionPreview.compressedSize)}</span>
                </div>
                <div className="preview-item savings">
                  <span className="label">Space saved:</span>
                  <span className="value">{formatPercent(compressionPreview.ratio)}</span>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Validation messages */}
        {(validation.errors.length > 0 || validation.warnings.length > 0 || validation.suggestions?.length) && (
          <div className="validation-messages">
            {/* Errors */}
            {validation.errors.map((error, index) => (
              <div key={`error-${index}`} className="validation-message error">
                <span className="icon">❌</span>
                <span className="message">{error}</span>
              </div>
            ))}

            {/* Warnings */}
            {validation.warnings.map((warning, index) => (
              <div key={`warning-${index}`} className="validation-message warning">
                <span className="icon">⚠️</span>
                <span className="message">{warning}</span>
              </div>
            ))}

            {/* Suggestions */}
            {validation.suggestions?.map((suggestion, index) => (
              <div key={`suggestion-${index}`} className="validation-message suggestion">
                <span className="icon">💡</span>
                <span className="message">{suggestion}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!validation.isValid || saving}
          >
            {saving ? (
              <>
                <span className="spinner small"></span>
                Saving...
              </>
            ) : (
              'Save Preset'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}