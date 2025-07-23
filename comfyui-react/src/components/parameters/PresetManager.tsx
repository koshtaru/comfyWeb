import React, { useState } from 'react'
import { usePresetManager, type ParameterSet, type ParameterPreset } from './hooks/usePresetManager'
import { PresetCreationDialog } from './PresetCreationDialog'

interface PresetManagerProps {
  currentParameters: ParameterSet
  onApplyPreset: (parameters: ParameterSet) => void
  className?: string
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  currentParameters,
  onApplyPreset,
  className = ''
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<ParameterPreset | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterCategory, setFilterCategory] = useState<'all' | 'quality' | 'speed' | 'dimension' | 'custom'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportExport, setShowImportExport] = useState(false)
  const [importData, setImportData] = useState('')

  const {
    presets,
    loading,
    error,
    qualityPresets,
    speedPresets,
    dimensionPresets,
    customPresets,
    updatePreset,
    deletePreset,
    exportPresets,
    importPresets,
    clearError
  } = usePresetManager()

  // Filter presets based on category and search
  const getFilteredPresets = (): ParameterPreset[] => {
    let filtered = presets

    // Filter by category
    if (filterCategory !== 'all') {
      switch (filterCategory) {
        case 'quality':
          filtered = qualityPresets
          break
        case 'speed':
          filtered = speedPresets
          break
        case 'dimension':
          filtered = dimensionPresets
          break
        case 'custom':
          filtered = customPresets
          break
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.description?.toLowerCase().includes(query) ||
        preset.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered
  }

  const handleApplyPreset = (preset: ParameterPreset) => {
    onApplyPreset(preset.parameters)
  }

  const handleDeletePreset = (preset: ParameterPreset) => {
    if (preset.isDefault) {
      alert('Cannot delete default presets')
      return
    }

    if (confirm(`Delete preset "${preset.name}"? This cannot be undone.`)) {
      deletePreset(preset.id)
    }
  }

  const handleEditPreset = (preset: ParameterPreset) => {
    if (preset.isDefault) {
      alert('Cannot edit default presets')
      return
    }
    setEditingPreset(preset)
  }

  const handleSaveEdit = (updatedPreset: Partial<ParameterPreset>) => {
    if (!editingPreset) return
    
    updatePreset(editingPreset.id, updatedPreset)
    setEditingPreset(null)
  }

  const handleExport = () => {
    try {
      const exportData = exportPresets()
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `comfyui-presets-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to export presets')
    }
  }

  const handleImport = () => {
    if (!importData.trim()) {
      alert('Please paste preset data to import')
      return
    }

    try {
      const importedCount = importPresets(importData)
      alert(`Successfully imported ${importedCount} presets`)
      setImportData('')
      setShowImportExport(false)
    } catch (err) {
      alert('Failed to import presets. Please check the data format.')
    }
  }

  const filteredPresets = getFilteredPresets()

  if (loading) {
    return (
      <div className={`preset-manager loading ${className}`}>
        <div className="loading-message">Loading presets...</div>
      </div>
    )
  }

  return (
    <div className={`preset-manager ${className}`}>
      {/* Header */}
      <div className="preset-manager-header">
        <h3>Preset Manager</h3>
        <div className="header-actions">
          <button
            className="action-button primary"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            ➕ New Preset
          </button>
          <button
            className="action-button secondary"
            onClick={() => setShowImportExport(!showImportExport)}
          >
            🔄 Import/Export
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="preset-manager-error">
          <span>⚠️ {error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {/* Import/Export Panel */}
      {showImportExport && (
        <div className="import-export-panel">
          <div className="panel-header">
            <h4>Import/Export Presets</h4>
            <button onClick={() => setShowImportExport(false)}>×</button>
          </div>
          
          <div className="panel-actions">
            <button className="action-button" onClick={handleExport}>
              📤 Export All Custom Presets
            </button>
          </div>
          
          <div className="import-section">
            <label htmlFor="import-data">Import Preset Data (JSON):</label>
            <textarea
              id="import-data"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste exported preset JSON data here..."
              rows={8}
            />
            <button
              className="action-button primary"
              onClick={handleImport}
              disabled={!importData.trim()}
            >
              📥 Import Presets
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="preset-manager-controls">
        <div className="filter-controls">
          <div className="category-filters">
            {[
              { key: 'all', label: 'All', count: presets.length },
              { key: 'quality', label: 'Quality', count: qualityPresets.length },
              { key: 'speed', label: 'Speed', count: speedPresets.length },
              { key: 'dimension', label: 'Dimensions', count: dimensionPresets.length },
              { key: 'custom', label: 'Custom', count: customPresets.length }
            ].map(({ key, label, count }) => (
              <button
                key={key}
                className={`filter-button ${filterCategory === key ? 'active' : ''}`}
                onClick={() => setFilterCategory(key as any)}
              >
                {label} ({count})
              </button>
            ))}
          </div>
          
          <div className="search-control">
            <input
              type="text"
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="view-controls">
            <button
              className={`view-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`view-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Preset List */}
      <div className={`preset-list ${viewMode}`}>
        {filteredPresets.length === 0 ? (
          <div className="preset-empty">
            {searchQuery ? (
              <p>No presets match your search "{searchQuery}"</p>
            ) : filterCategory === 'custom' ? (
              <p>No custom presets yet. Create your first preset!</p>
            ) : (
              <p>No presets in this category</p>
            )}
          </div>
        ) : (
          filteredPresets.map((preset) => (
            <div key={preset.id} className="preset-card">
              <div className="preset-card-header">
                <div className="preset-info">
                  <h4 className="preset-name">{preset.name}</h4>
                  <div className="preset-badges">
                    {preset.isDefault && <span className="badge default">Default</span>}
                    <span className={`badge category-${preset.category}`}>
                      {preset.category}
                    </span>
                  </div>
                </div>
                
                <div className="preset-actions">
                  <button
                    className="action-button small"
                    onClick={() => handleApplyPreset(preset)}
                    title="Apply this preset"
                  >
                    ✓ Apply
                  </button>
                  {!preset.isDefault && (
                    <>
                      <button
                        className="action-button small secondary"
                        onClick={() => handleEditPreset(preset)}
                        title="Edit preset"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="action-button small danger"
                        onClick={() => handleDeletePreset(preset)}
                        title="Delete preset"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {preset.description && (
                <div className="preset-description">{preset.description}</div>
              )}
              
              <div className="preset-parameters">
                <div className="param-grid">
                  <div className="param-item">
                    <span className="param-label">Steps:</span>
                    <span className="param-value">{preset.parameters.steps}</span>
                  </div>
                  <div className="param-item">
                    <span className="param-label">CFG:</span>
                    <span className="param-value">{preset.parameters.cfg}</span>
                  </div>
                  <div className="param-item">
                    <span className="param-label">Size:</span>
                    <span className="param-value">{preset.parameters.width}×{preset.parameters.height}</span>
                  </div>
                  <div className="param-item">
                    <span className="param-label">Batch:</span>
                    <span className="param-value">{preset.parameters.batchSize}</span>
                  </div>
                </div>
              </div>
              
              {preset.tags.length > 0 && (
                <div className="preset-tags">
                  {preset.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              
              <div className="preset-meta">
                <span className="meta-item">
                  Created: {new Date(preset.createdAt).toLocaleDateString()}
                </span>
                {preset.updatedAt !== preset.createdAt && (
                  <span className="meta-item">
                    Updated: {new Date(preset.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Creation Dialog */}
      <PresetCreationDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        parameters={currentParameters}
        onPresetCreated={() => {
          setIsCreateDialogOpen(false)
          // Refresh will happen automatically via the hook
        }}
      />

      {/* Edit Dialog (simplified version) */}
      {editingPreset && (
        <div className="preset-edit-overlay">
          <div className="preset-edit-dialog">
            <h3>Edit Preset: {editingPreset.name}</h3>
            <p>Editing functionality would go here...</p>
            <div className="dialog-actions">
              <button onClick={() => setEditingPreset(null)}>Cancel</button>
              <button onClick={() => handleSaveEdit({})}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}