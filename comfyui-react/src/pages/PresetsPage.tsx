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

  // Load presets on mount
  useEffect(() => {
    loadPresets()
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
    // Convert presets array to JSON string for the store
    const jsonData = JSON.stringify(presets)
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