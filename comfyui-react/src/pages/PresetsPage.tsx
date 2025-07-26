// ============================================================================
// ComfyUI React - Presets Page
// ============================================================================

import React, { useEffect } from 'react'
import { PresetManager } from '@/components/presets/PresetManager'
import { Container } from '@/components/ui/Container'
import { usePresetStore } from '@/store/presetStore'

const PresetsPage: React.FC = () => {
  const {
    presets,
    isLoadingPresets: loading,
    lastError: error,
    loadPresets,
    createPreset,
    updatePreset,
    deletePreset,
    importPresets,
    setActivePreset
  } = usePresetStore()

  // Load presets on mount with debugging
  useEffect(() => {
    console.log('[PresetsPage] Component mounted, loading presets...')
    loadPresets().then(() => {
      console.log('[PresetsPage] Load presets completed')
    }).catch((err) => {
      console.error('[PresetsPage] Load presets failed:', err)
    })
  }, [loadPresets])

  // Debug log current state
  useEffect(() => {
    console.log('[PresetsPage] State update:', {
      presetsCount: presets.length,
      loading,
      error,
      presets: presets.slice(0, 2) // First 2 presets for debugging
    })
  }, [presets, loading, error])

  const handlePresetSelect = (preset: any) => {
    setActivePreset(preset)
  }

  const handlePresetSave = async (presetData: any) => {
    await createPreset(presetData)
  }

  const handlePresetUpdate = async (id: string, updates: any) => {
    await updatePreset(id, updates)
  }

  const handlePresetDelete = async (id: string) => {
    await deletePreset(id)
  }

  const handlePresetsImport = async (presets: any[]) => {
    console.log('[PresetsPage] handlePresetsImport called with:', presets?.length, 'presets')
    console.trace('[PresetsPage] handlePresetsImport call stack')
    
    // This should only be called when importing from files, not during normal loading
    // The PresetImportExport component should handle the format conversion
    if (!Array.isArray(presets) || presets.length === 0) {
      console.warn('[PresetsPage] handlePresetsImport called with invalid data')
      return
    }
    
    // Convert presets array to proper import format
    const importData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      presets: presets,
      metadata: {
        totalCount: presets.length,
        totalSize: presets.reduce((sum, p) => sum + (p.size || 0), 0),
        compressionUsed: presets.some(p => p.compressed)
      }
    }
    
    const jsonData = JSON.stringify(importData)
    await importPresets(jsonData)
  }

  return (
    <Container>
      <PresetManager
        presets={presets}
        onPresetSelect={handlePresetSelect}
        onPresetSave={handlePresetSave}
        onPresetUpdate={handlePresetUpdate}
        onPresetDelete={handlePresetDelete}
        onPresetsImport={handlePresetsImport}
        loading={loading}
        error={error}
      />
    </Container>
  )
}

export default PresetsPage