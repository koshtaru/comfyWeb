// ============================================================================
// ComfyUI React - Presets Page
// ============================================================================

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PresetManager } from '@/components/presets/PresetManager'
import { Container } from '@/components/ui/Container'
import { usePresetStore } from '@/store/presetStore'
import { ROUTES } from '@/constants/routes'
import type { IPreset } from '@/types/preset'

const PresetsPage: React.FC = () => {
  const navigate = useNavigate()
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

  // Load presets on mount
  useEffect(() => {
    loadPresets().catch((err) => {
      console.error('[PresetsPage] Load presets failed:', err)
    })
  }, [loadPresets])

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

  const handleApplyAndNavigate = (preset: IPreset) => {
    // Store the preset to be loaded in the global state
    setActivePreset(preset)
    
    // Navigate to the txt2img page with the preset data in navigation state
    navigate(ROUTES.GENERATE, { 
      state: { 
        presetToLoad: preset,
        source: 'presets-page'
      } 
    })
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
        onPresetApplyAndNavigate={handleApplyAndNavigate}
        loading={loading}
        error={error}
      />
    </Container>
  )
}

export default PresetsPage