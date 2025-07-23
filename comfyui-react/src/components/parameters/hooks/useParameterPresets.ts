import { useCallback, useState } from 'react'

export interface PresetOption {
  label: string
  value: number
  description?: string
}

/**
 * Hook for managing parameter presets and quick selections
 * Handles common preset values and quick selection functionality
 */
export const useParameterPresets = (
  presets: PresetOption[] = [],
  onChange?: (value: number) => void
) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetOption | null>(null)

  // Apply a preset value
  const applyPreset = useCallback((preset: PresetOption) => {
    setSelectedPreset(preset)
    if (onChange) {
      onChange(preset.value)
    }
  }, [onChange])

  // Check if current value matches a preset
  const getCurrentPreset = useCallback((currentValue: number): PresetOption | null => {
    return presets.find(preset => preset.value === currentValue) || null
  }, [presets])

  // Clear preset selection
  const clearPreset = useCallback(() => {
    setSelectedPreset(null)
  }, [])

  // Check if a preset is currently active
  const isPresetActive = useCallback((preset: PresetOption, currentValue: number): boolean => {
    return preset.value === currentValue
  }, [])

  return {
    selectedPreset,
    applyPreset,
    getCurrentPreset,
    clearPreset,
    isPresetActive,
    availablePresets: presets
  }
}