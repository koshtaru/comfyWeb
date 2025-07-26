// ============================================================================
// ComfyUI React - Enhanced Preset Manager with Compression & Storage
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import type { IPreset, IPresetSearchOptions, PresetCategory, IPresetStorageInfo } from '@/types/preset'
import { storageMonitorService, type StorageAnalysis } from '@/services/storageMonitor'
import { compressionService } from '@/utils/compression'
import { PresetCard } from './PresetCard'
import { PresetSaveDialog } from './PresetSaveDialog'
import { PresetStorageIndicator } from './PresetStorageIndicator'
import { PresetImportExport } from './PresetImportExport'
import './PresetManager.css'

interface PresetManagerProps {
  presets: IPreset[]
  onPresetSelect: (preset: IPreset) => void
  onPresetSave: (preset: Omit<IPreset, 'id' | 'createdAt' | 'lastModified' | 'size'>) => Promise<void>
  onPresetUpdate: (id: string, updates: Partial<IPreset>) => Promise<void>
  onPresetDelete: (id: string) => Promise<void>
  onPresetsImport: (presets: IPreset[]) => Promise<void>
  onPresetApplyAndNavigate: (preset: IPreset) => void
  loading?: boolean
  error?: string | null
  className?: string
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  presets,
  onPresetSelect,
  onPresetSave,
  onPresetUpdate,
  onPresetDelete,
  onPresetsImport,
  onPresetApplyAndNavigate,
  loading = false,
  error = null,
  className = ''
}) => {
  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [showImportExport, setShowImportExport] = useState(false)
  const [showStorageInfo, setShowStorageInfo] = useState(false)
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())

  // Search and Filter State
  const [searchOptions, setSearchOptions] = useState<IPresetSearchOptions>({
    query: '',
    category: undefined,
    sortBy: 'lastModified',
    sortOrder: 'desc',
    limit: 50,
    offset: 0
  })

  // Storage Analytics State
  const [storageAnalysis, setStorageAnalysis] = useState<StorageAnalysis | null>(null)
  const [storageInfo, setStorageInfo] = useState<IPresetStorageInfo | null>(null)

  // Load storage analytics on mount and when presets change
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const [analysis, info] = await Promise.all([
          storageMonitorService.analyzeStorage(presets),
          storageMonitorService.getPresetStorageInfo(presets)
        ])
        setStorageAnalysis(analysis)
        setStorageInfo(info)
      } catch (error) {
        console.error('Failed to load storage data:', error)
      }
    }

    if (presets.length > 0) {
      loadStorageData()
    }
  }, [presets])

  // Filter and sort presets based on search options
  const filteredPresets = useMemo(() => {
    let filtered = [...presets]

    // Apply text search
    if (searchOptions.query) {
      const query = searchOptions.query.toLowerCase()
      filtered = filtered.filter(preset =>
        preset.name.toLowerCase().includes(query) ||
        preset.metadata.prompts.positive.toLowerCase().includes(query) ||
        preset.metadata.prompts.negative.toLowerCase().includes(query) ||
        preset.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Apply category filter
    if (searchOptions.category) {
      filtered = filtered.filter(preset => preset.category === searchOptions.category)
    }

    // Apply date range filter
    if (searchOptions.dateRange) {
      filtered = filtered.filter(preset => {
        const presetDate = new Date(preset.lastModified)
        return presetDate >= searchOptions.dateRange!.from && presetDate <= searchOptions.dateRange!.to
      })
    }

    // Apply tags filter
    if (searchOptions.tags && searchOptions.tags.length > 0) {
      filtered = filtered.filter(preset =>
        preset.tags?.some(tag => searchOptions.tags!.includes(tag))
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { sortBy = 'lastModified', sortOrder = 'desc' } = searchOptions
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'lastModified':
          comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
          break
        case 'size':
          comparison = a.size - b.size
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    // Apply pagination
    const { limit = 50, offset = 0 } = searchOptions
    return filtered.slice(offset, offset + limit)
  }, [presets, searchOptions])

  // Category counts for filter tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<PresetCategory | 'all', number> = {
      all: presets.length,
      quality: 0,
      speed: 0,
      style: 0,
      custom: 0,
      imported: 0,
      dimension: 0
    }

    presets.forEach(preset => {
      if (preset.category) {
        counts[preset.category]++
      }
    })

    return counts
  }, [presets])

  // Handle preset actions
  const handlePresetSelect = (preset: IPreset) => {
    onPresetSelect(preset)
    storageMonitorService.trackPresetUsage(preset.id)
  }

  const handlePresetDelete = async (preset: IPreset) => {
    if (window.confirm(`Delete preset "${preset.name}"? This cannot be undone.`)) {
      try {
        await onPresetDelete(preset.id)
      } catch (error) {
        console.error('Failed to delete preset:', error)
      }
    }
  }

  const handleBulkDelete = async () => {
    if (selectedPresets.size === 0) return
    
    const count = selectedPresets.size
    if (window.confirm(`Delete ${count} selected presets? This cannot be undone.`)) {
      try {
        await Promise.all(
          Array.from(selectedPresets).map(id => onPresetDelete(id))
        )
        setSelectedPresets(new Set())
      } catch (error) {
        console.error('Failed to delete presets:', error)
      }
    }
  }

  const handleCompressionToggle = async (preset: IPreset) => {
    try {
      if (preset.compressed) {
        // Decompress the preset (implementation would depend on storage structure)
        await onPresetUpdate(preset.id, { compressed: false })
      } else {
        // Compress the preset
        const result = await compressionService.compressWorkflow(preset.workflowData)
        await onPresetUpdate(preset.id, { 
          compressed: true,
          size: result.compressedSize 
        })
      }
    } catch (error) {
      console.error('Failed to toggle compression:', error)
    }
  }

  // Handle search and filter changes
  const handleSearchChange = (query: string) => {
    setSearchOptions(prev => ({ ...prev, query, offset: 0 }))
  }

  const handleCategoryFilter = (category: PresetCategory | undefined) => {
    setSearchOptions(prev => ({ ...prev, category, offset: 0 }))
  }

  const handleSortChange = (sortBy: IPresetSearchOptions['sortBy'], sortOrder: IPresetSearchOptions['sortOrder']) => {
    setSearchOptions(prev => ({ ...prev, sortBy, sortOrder, offset: 0 }))
  }

  // Render loading state
  if (loading) {
    return (
      <div className={`preset-manager loading ${className}`}>
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading presets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`preset-manager ${className}`}>
      {/* Header with actions */}
      <div className="preset-manager-header">
        <div className="header-title">
          <h2>Preset Manager</h2>
          <span className="preset-count">{presets.length} presets</span>
        </div>
        
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowSaveDialog(true)}
          >
            <span className="icon">➕</span>
            New Preset
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => setShowImportExport(true)}
          >
            <span className="icon">🔄</span>
            Import/Export
          </button>
          
          <button
            className="btn btn-secondary"
            onClick={() => setShowStorageInfo(!showStorageInfo)}
          >
            <span className="icon">📊</span>
            Storage
          </button>
          
          {selectedPresets.size > 0 && (
            <button
              className="btn btn-danger"
              onClick={handleBulkDelete}
            >
              <span className="icon">🗑️</span>
              Delete ({selectedPresets.size})
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="preset-manager-error">
          <span className="icon">⚠️</span>
          <span className="error-message">{error}</span>
        </div>
      )}

      {/* Storage information panel */}
      {showStorageInfo && storageInfo && (
        <PresetStorageIndicator
          storageInfo={storageInfo}
          storageAnalysis={storageAnalysis}
          onClose={() => setShowStorageInfo(false)}
        />
      )}

      {/* Search and filter controls */}
      <div className="preset-manager-controls">
        <div className="search-section">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search presets by name, prompt, or tags..."
              value={searchOptions.query || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="filter-section">
          <div className="category-filters">
            <button
              className={`filter-tab ${!searchOptions.category ? 'active' : ''}`}
              onClick={() => handleCategoryFilter(undefined)}
            >
              All ({categoryCounts.all})
            </button>
            {Object.entries(categoryCounts).map(([category, count]) => {
              if (category === 'all' || count === 0) return null
              return (
                <button
                  key={category}
                  className={`filter-tab ${searchOptions.category === category ? 'active' : ''}`}
                  onClick={() => handleCategoryFilter(category as PresetCategory)}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)} ({count})
                </button>
              )
            })}
          </div>

          <div className="sort-controls">
            <select
              value={`${searchOptions.sortBy}-${searchOptions.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [any, any]
                handleSortChange(sortBy, sortOrder)
              }}
              className="sort-select"
            >
              <option value="lastModified-desc">Recently Modified</option>
              <option value="lastModified-asc">Oldest Modified</option>
              <option value="createdAt-desc">Recently Created</option>
              <option value="createdAt-asc">Oldest Created</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest Size</option>
              <option value="size-asc">Smallest Size</option>
            </select>
          </div>

          <div className="view-controls">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Presets grid/list */}
      <div className={`presets-container ${viewMode}-view`}>
        {filteredPresets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No presets found</h3>
            <p>
              {searchOptions.query
                ? `No presets match "${searchOptions.query}"`
                : searchOptions.category
                ? `No presets in ${searchOptions.category} category`
                : 'Get started by creating your first preset'
              }
            </p>
            {!searchOptions.query && !searchOptions.category && (
              <button
                className="btn btn-primary"
                onClick={() => setShowSaveDialog(true)}
              >
                Create First Preset
              </button>
            )}
          </div>
        ) : (
          <div className="presets-grid">
            {filteredPresets.map(preset => (
              <PresetCard
                key={preset.id}
                preset={preset}
                selected={selectedPresets.has(preset.id)}
                onSelect={() => handlePresetSelect(preset)}
                onEdit={(updates) => onPresetUpdate(preset.id, updates)}
                onDelete={() => handlePresetDelete(preset)}
                onApplyAndNavigate={onPresetApplyAndNavigate}
                onToggleSelection={(selected) => {
                  const newSelection = new Set(selectedPresets)
                  if (selected) {
                    newSelection.add(preset.id)
                  } else {
                    newSelection.delete(preset.id)
                  }
                  setSelectedPresets(newSelection)
                }}
                onToggleCompression={() => handleCompressionToggle(preset)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {presets.length > (searchOptions.limit || 50) && (
        <div className="pagination">
          <button
            className="btn btn-secondary"
            disabled={searchOptions.offset === 0}
            onClick={() => setSearchOptions(prev => ({ 
              ...prev, 
              offset: Math.max(0, (prev.offset || 0) - (prev.limit || 50)) 
            }))}
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Showing {(searchOptions.offset || 0) + 1}-{Math.min(presets.length, (searchOptions.offset || 0) + (searchOptions.limit || 50))} of {presets.length}
          </span>
          
          <button
            className="btn btn-secondary"
            disabled={(searchOptions.offset || 0) + (searchOptions.limit || 50) >= presets.length}
            onClick={() => setSearchOptions(prev => ({ 
              ...prev, 
              offset: (prev.offset || 0) + (prev.limit || 50) 
            }))}
          >
            Next
          </button>
        </div>
      )}

      {/* Dialogs */}
      {showSaveDialog && (
        <PresetSaveDialog
          onSave={onPresetSave}
          onClose={() => setShowSaveDialog(false)}
        />
      )}

      {showImportExport && (
        <PresetImportExport
          presets={presets}
          onImport={onPresetsImport}
          onClose={() => setShowImportExport(false)}
        />
      )}
    </div>
  )
}