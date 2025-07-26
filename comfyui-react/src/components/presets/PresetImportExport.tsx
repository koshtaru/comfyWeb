// ============================================================================
// ComfyUI React - Preset Import/Export Component
// ============================================================================

import React, { useState, useRef, useCallback } from 'react'
import type { IPreset, IPresetExportData, IPresetsExportData, IPresetImportResult } from '@/types/preset'
import './PresetImportExport.css'

interface PresetImportExportProps {
  presets: IPreset[]
  onImport: (presets: IPreset[]) => Promise<void>
  onClose: () => void
}

export const PresetImportExport: React.FC<PresetImportExportProps> = ({
  presets,
  onImport,
  onClose
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [importData, setImportData] = useState('')
  const [importResult, setImportResult] = useState<IPresetImportResult | null>(null)
  const [exportOptions, setExportOptions] = useState({
    includeMetadata: true,
    useCompression: true,
    singleFile: true
  })

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Helper functions
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const generateChecksum = (data: string): string => {
    // Simple checksum for data integrity
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  // Export functions
  const handleExportSelected = async () => {
    if (selectedPresets.size === 0) return

    setExporting(true)
    try {
      const presetsToExport = presets.filter(p => selectedPresets.has(p.id))
      await exportPresets(presetsToExport)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const handleExportAll = async () => {
    setExporting(true)
    try {
      await exportPresets(presets)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  const exportPresets = async (presetsToExport: IPreset[]) => {
    if (exportOptions.singleFile) {
      // Export all presets in a single file
      const exportData: IPresetsExportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        presets: presetsToExport,
        metadata: {
          totalCount: presetsToExport.length,
          totalSize: presetsToExport.reduce((sum, p) => sum + p.size, 0),
          compressionUsed: exportOptions.useCompression
        }
      }

      if (exportOptions.includeMetadata) {
        const jsonString = JSON.stringify(exportData, null, 2)
        exportData.checksum = generateChecksum(jsonString)
      }

      const finalData = JSON.stringify(exportData, null, 2)
      downloadFile(
        finalData,
        `comfyui-presets-${presetsToExport.length}-${new Date().toISOString().split('T')[0]}.json`,
        'application/json'
      )
    } else {
      // Export each preset as a separate file
      for (const preset of presetsToExport) {
        const exportData: IPresetExportData = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          preset
        }

        if (exportOptions.includeMetadata) {
          const jsonString = JSON.stringify(exportData, null, 2)
          exportData.checksum = generateChecksum(jsonString)
        }

        const finalData = JSON.stringify(exportData, null, 2)
        downloadFile(
          finalData,
          `preset-${preset.name.replace(/[^a-zA-Z0-9]/g, '-')}.json`,
          'application/json'
        )
      }
    }
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Import functions
  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.name.endsWith('.json')) {
      setImportResult({
        success: false,
        imported: [],
        skipped: 0,
        errors: ['Only JSON files are supported'],
        warnings: []
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        setImportData(content)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }, [])

  const handleImport = async () => {
    if (!importData.trim()) return

    setImporting(true)
    setImportResult(null)

    try {
      const result = await importPresetsFromJSON(importData)
      setImportResult(result)

      if (result.success && result.imported.length > 0) {
        await onImport(result.imported)
        // Clear import data on success
        setTimeout(() => {
          setImportData('')
        }, 2000)
      }
    } catch (error) {
      setImportResult({
        success: false,
        imported: [],
        skipped: 0,
        errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      })
    } finally {
      setImporting(false)
    }
  }

  const importPresetsFromJSON = async (jsonData: string): Promise<IPresetImportResult> => {
    const result: IPresetImportResult = {
      success: false,
      imported: [],
      skipped: 0,
      errors: [],
      warnings: []
    }

    try {
      const data = JSON.parse(jsonData)

      // Validate data structure
      if (!data.version) {
        result.errors.push('Invalid file format: missing version')
        return result
      }

      let presetsToImport: IPreset[] = []

      // Handle different export formats
      if (data.presets && Array.isArray(data.presets)) {
        // Multi-preset export format
        presetsToImport = data.presets
        
        // Verify checksum if present
        if (data.checksum) {
          const { checksum, ...dataWithoutChecksum } = data
          const calculatedChecksum = generateChecksum(JSON.stringify(dataWithoutChecksum, null, 2))
          if (checksum !== calculatedChecksum) {
            result.warnings.push('Checksum mismatch - data may be corrupted')
          }
        }
      } else if (data.preset) {
        // Single preset export format
        presetsToImport = [data.preset]
        
        // Verify checksum if present
        if (data.checksum) {
          const { checksum, ...dataWithoutChecksum } = data
          const calculatedChecksum = generateChecksum(JSON.stringify(dataWithoutChecksum, null, 2))
          if (checksum !== calculatedChecksum) {
            result.warnings.push('Checksum mismatch - data may be corrupted')
          }
        }
      } else {
        result.errors.push('Invalid file format: no presets found')
        return result
      }

      // Process each preset
      for (const presetData of presetsToImport) {
        try {
          // Validate preset structure
          if (!presetData.name || !presetData.workflowData || !presetData.metadata) {
            result.errors.push(`Invalid preset: ${presetData.name || 'unnamed'} is missing required fields`)
            continue
          }

          // Check for duplicates
          const existingPreset = presets.find(p => p.name === presetData.name)
          if (existingPreset) {
            result.warnings.push(`Preset "${presetData.name}" already exists - skipping`)
            result.skipped++
            continue
          }

          // Generate new ID and timestamps
          const importedPreset: IPreset = {
            ...presetData,
            id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            lastModified: new Date(),
            category: presetData.category || 'imported',
            version: presetData.version || '1.0.0'
          }

          // Recalculate size if needed
          if (!importedPreset.size || importedPreset.size === 0) {
            const workflowSize = new Blob([JSON.stringify(importedPreset.workflowData)]).size
            importedPreset.size = workflowSize
          }

          result.imported.push(importedPreset)
        } catch (error) {
          result.errors.push(`Failed to process preset "${presetData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      result.success = result.imported.length > 0
      return result
    } catch (error) {
      result.errors.push(`JSON parsing failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`)
      return result
    }
  }

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedPresets(new Set(presets.map(p => p.id)))
  }

  const handleSelectNone = () => {
    setSelectedPresets(new Set())
  }

  const handleTogglePreset = (presetId: string) => {
    const newSelection = new Set(selectedPresets)
    if (newSelection.has(presetId)) {
      newSelection.delete(presetId)
    } else {
      newSelection.add(presetId)
    }
    setSelectedPresets(newSelection)
  }

  return (
    <div className="import-export-overlay" onClick={onClose}>
      <div className="import-export-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <h2>Import / Export Presets</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab navigation */}
        <div className="tab-navigation">
          <button
            className={`tab ${activeTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveTab('export')}
          >
            📤 Export
          </button>
          <button
            className={`tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            📥 Import
          </button>
        </div>

        {/* Tab content */}
        <div className="tab-content">
          {/* Export tab */}
          {activeTab === 'export' && (
            <div className="export-content">
              {/* Export options */}
              <div className="options-section">
                <h4>Export Options</h4>
                <div className="options-grid">
                  <label className="option-item">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeMetadata}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeMetadata: e.target.checked
                      }))}
                    />
                    <span>Include metadata & checksums</span>
                  </label>
                  
                  <label className="option-item">
                    <input
                      type="checkbox"
                      checked={exportOptions.useCompression}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        useCompression: e.target.checked
                      }))}
                    />
                    <span>Use compression</span>
                  </label>

                  <label className="option-item">
                    <input
                      type="checkbox"
                      checked={exportOptions.singleFile}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        singleFile: e.target.checked
                      }))}
                    />
                    <span>Single file export</span>
                  </label>
                </div>
              </div>

              {/* Preset selection */}
              <div className="selection-section">
                <div className="section-header">
                  <h4>Select Presets ({selectedPresets.size} of {presets.length})</h4>
                  <div className="selection-controls">
                    <button className="btn-link" onClick={handleSelectAll}>
                      Select All
                    </button>
                    <button className="btn-link" onClick={handleSelectNone}>
                      Select None
                    </button>
                  </div>
                </div>

                <div className="preset-selection-list">
                  {presets.map(preset => (
                    <label key={preset.id} className="preset-selection-item">
                      <input
                        type="checkbox"
                        checked={selectedPresets.has(preset.id)}
                        onChange={() => handleTogglePreset(preset.id)}
                      />
                      <div className="preset-info">
                        <div className="preset-name">{preset.name}</div>
                        <div className="preset-details">
                          {preset.category} • {formatSize(preset.size)}
                          {preset.compressed && <span className="compressed-badge">📦</span>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export actions */}
              <div className="action-section">
                <div className="export-info">
                  {selectedPresets.size > 0 && (
                    <span className="info-text">
                      Selected: {selectedPresets.size} presets, {' '}
                      {formatSize(
                        presets
                          .filter(p => selectedPresets.has(p.id))
                          .reduce((sum, p) => sum + p.size, 0)
                      )}
                    </span>
                  )}
                </div>
                <div className="action-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={handleExportAll}
                    disabled={exporting || presets.length === 0}
                  >
                    {exporting ? 'Exporting...' : `Export All (${presets.length})`}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleExportSelected}
                    disabled={exporting || selectedPresets.size === 0}
                  >
                    {exporting ? 'Exporting...' : `Export Selected (${selectedPresets.size})`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Import tab */}
          {activeTab === 'import' && (
            <div className="import-content">
              {/* File drop zone */}
              <div
                className={`drop-zone ${dragActive ? 'active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="drop-icon">📁</div>
                <div className="drop-text">
                  <strong>Drop JSON files here</strong> or click to browse
                </div>
                <div className="drop-subtext">
                  Supports both single preset and multi-preset export files
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Text import */}
              <div className="text-import-section">
                <h4>Or paste JSON data:</h4>
                <textarea
                  ref={textareaRef}
                  className="import-textarea"
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Paste exported preset JSON data here..."
                  rows={8}
                />
              </div>

              {/* Import result */}
              {importResult && (
                <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
                  <div className="result-header">
                    <span className="result-icon">
                      {importResult.success ? '✅' : '❌'}
                    </span>
                    <span className="result-title">
                      {importResult.success ? 'Import Successful' : 'Import Failed'}
                    </span>
                  </div>
                  
                  <div className="result-details">
                    {importResult.imported.length > 0 && (
                      <div className="result-item success">
                        ✓ Imported {importResult.imported.length} presets
                      </div>
                    )}
                    
                    {importResult.skipped > 0 && (
                      <div className="result-item warning">
                        ⚠ Skipped {importResult.skipped} presets
                      </div>
                    )}
                    
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="result-item error">
                        ❌ {error}
                      </div>
                    ))}
                    
                    {importResult.warnings.map((warning, index) => (
                      <div key={index} className="result-item warning">
                        ⚠ {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import actions */}
              <div className="action-section">
                <div className="action-buttons">
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setImportData('')
                      setImportResult(null)
                    }}
                    disabled={importing}
                  >
                    Clear
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleImport}
                    disabled={importing || !importData.trim()}
                  >
                    {importing ? (
                      <>
                        <span className="spinner"></span>
                        Importing...
                      </>
                    ) : (
                      'Import Presets'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}