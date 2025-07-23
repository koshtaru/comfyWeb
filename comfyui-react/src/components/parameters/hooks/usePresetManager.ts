import { useState, useCallback, useEffect } from 'react'

// Complete parameter set interface
export interface ParameterSet {
  steps: number
  cfg: number
  width: number
  height: number
  seed: number
  batchSize: number
  batchCount: number
  sampler?: string
  scheduler?: string
}

// Preset with metadata
export interface ParameterPreset {
  id: string
  name: string
  description?: string
  parameters: ParameterSet
  createdAt: string
  updatedAt: string
  isDefault: boolean
  category: 'quality' | 'speed' | 'custom' | 'dimension'
  tags: string[]
}

// Default presets as specified in the task
const DEFAULT_PRESETS: ParameterPreset[] = [
  {
    id: 'fast-draft',
    name: 'Fast Draft',
    description: 'Quick generation for testing ideas',
    parameters: {
      steps: 10,
      cfg: 5.0,
      width: 512,
      height: 512,
      seed: -1,
      batchSize: 1,
      batchCount: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    category: 'speed',
    tags: ['fast', 'draft', 'testing']
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Good balance of quality and speed',
    parameters: {
      steps: 20,
      cfg: 7.0,
      width: 768,
      height: 768,
      seed: -1,
      batchSize: 1,
      batchCount: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    category: 'quality',
    tags: ['balanced', 'recommended', 'standard']
  },
  {
    id: 'high-quality',
    name: 'High Quality',
    description: 'Maximum quality for final renders',
    parameters: {
      steps: 50,
      cfg: 8.0,
      width: 1024,
      height: 1024,
      seed: -1,
      batchSize: 1,
      batchCount: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    category: 'quality',
    tags: ['high-quality', 'final', 'slow']
  }
]

// Dimension presets
const DIMENSION_PRESETS: ParameterPreset[] = [
  {
    id: 'square-512',
    name: '512×512 Square',
    description: 'Classic square format',
    parameters: {
      steps: 20,
      cfg: 7.0,
      width: 512,
      height: 512,
      seed: -1,
      batchSize: 1,
      batchCount: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    category: 'dimension',
    tags: ['square', '512', 'classic']
  },
  {
    id: 'square-768',
    name: '768×768 Square',
    description: 'Medium square format',
    parameters: {
      steps: 20,
      cfg: 7.0,
      width: 768,
      height: 768,
      seed: -1,
      batchSize: 1,
      batchCount: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    category: 'dimension',
    tags: ['square', '768', 'medium']
  },
  {
    id: 'square-1024',
    name: '1024×1024 Square',
    description: 'High resolution square',
    parameters: {
      steps: 20,
      cfg: 7.0,
      width: 1024,
      height: 1024,
      seed: -1,
      batchSize: 1,
      batchCount: 1
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDefault: true,
    category: 'dimension',
    tags: ['square', '1024', 'high-res']
  }
]

const STORAGE_KEY = 'comfyui-parameter-presets'
const STORAGE_VERSION = '1.0'

interface StorageData {
  version: string
  presets: ParameterPreset[]
  lastUpdated: string
}

/**
 * Comprehensive preset management hook
 * Handles full parameter set presets with localStorage persistence
 */
export const usePresetManager = () => {
  const [presets, setPresets] = useState<ParameterPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate unique ID for new presets
  const generateId = useCallback((name: string): string => {
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const nameSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20)
    return `${nameSlug}-${timestamp}-${randomStr}`
  }, [])

  // Load presets from localStorage
  const loadPresets = useCallback(() => {
    try {
      setLoading(true)
      setError(null)

      const stored = localStorage.getItem(STORAGE_KEY)
      let loadedPresets: ParameterPreset[] = []

      if (stored) {
        const data: StorageData = JSON.parse(stored)
        
        // Check version compatibility
        if (data.version === STORAGE_VERSION) {
          loadedPresets = data.presets || []
        } else {
          console.warn('Preset storage version mismatch, using defaults')
        }
      }

      // Always include default presets (merge with custom presets)
      const allDefaults = [...DEFAULT_PRESETS, ...DIMENSION_PRESETS]
      const customPresets = loadedPresets.filter(p => !p.isDefault)
      
      const mergedPresets = [
        ...allDefaults,
        ...customPresets
      ]

      setPresets(mergedPresets)
    } catch (err) {
      console.error('Error loading presets:', err)
      setError('Failed to load presets')
      // Fallback to defaults only
      setPresets([...DEFAULT_PRESETS, ...DIMENSION_PRESETS])
    } finally {
      setLoading(false)
    }
  }, [])

  // Save presets to localStorage
  const savePresets = useCallback((presetsToSave: ParameterPreset[]) => {
    try {
      // Only save custom presets to localStorage (defaults are always included)
      const customPresets = presetsToSave.filter(p => !p.isDefault)
      
      const data: StorageData = {
        version: STORAGE_VERSION,
        presets: customPresets,
        lastUpdated: new Date().toISOString()
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (err) {
      console.error('Error saving presets:', err)
      setError('Failed to save presets')
    }
  }, [])

  // Create new preset
  const createPreset = useCallback((
    name: string,
    parameters: ParameterSet,
    description?: string,
    category: ParameterPreset['category'] = 'custom'
  ): ParameterPreset => {
    const newPreset: ParameterPreset = {
      id: generateId(name),
      name,
      description,
      parameters: { ...parameters },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false,
      category,
      tags: category === 'custom' ? ['custom', 'user-created'] : []
    }

    const updatedPresets = [...presets, newPreset]
    setPresets(updatedPresets)
    savePresets(updatedPresets)

    return newPreset
  }, [presets, generateId, savePresets])

  // Update existing preset
  const updatePreset = useCallback((id: string, updates: Partial<ParameterPreset>) => {
    const updatedPresets = presets.map(preset => 
      preset.id === id
        ? { ...preset, ...updates, updatedAt: new Date().toISOString() }
        : preset
    )
    
    setPresets(updatedPresets)
    savePresets(updatedPresets)
  }, [presets, savePresets])

  // Delete preset (only custom presets can be deleted)
  const deletePreset = useCallback((id: string) => {
    const preset = presets.find(p => p.id === id)
    if (preset?.isDefault) {
      setError('Cannot delete default presets')
      return false
    }

    const updatedPresets = presets.filter(p => p.id !== id)
    setPresets(updatedPresets)
    savePresets(updatedPresets)
    return true
  }, [presets, savePresets])

  // Get preset by ID
  const getPreset = useCallback((id: string): ParameterPreset | null => {
    return presets.find(p => p.id === id) || null
  }, [presets])

  // Get presets by category
  const getPresetsByCategory = useCallback((category: ParameterPreset['category']): ParameterPreset[] => {
    return presets.filter(p => p.category === category)
  }, [presets])

  // Export presets to JSON
  const exportPresets = useCallback((): string => {
    const customPresets = presets.filter(p => !p.isDefault)
    return JSON.stringify({
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      presets: customPresets
    }, null, 2)
  }, [presets])

  // Import presets from JSON
  const importPresets = useCallback((jsonData: string, replaceExisting: boolean = false) => {
    try {
      const data = JSON.parse(jsonData)
      
      if (!data.presets || !Array.isArray(data.presets)) {
        throw new Error('Invalid preset format')
      }

      const importedPresets: ParameterPreset[] = data.presets.map((preset: any) => ({
        ...preset,
        id: generateId(preset.name), // Generate new IDs to avoid conflicts
        importedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

      let updatedPresets: ParameterPreset[]
      
      if (replaceExisting) {
        // Keep only default presets and add imported ones
        const defaultPresets = presets.filter(p => p.isDefault)
        updatedPresets = [...defaultPresets, ...importedPresets]
      } else {
        // Add to existing presets
        updatedPresets = [...presets, ...importedPresets]
      }

      setPresets(updatedPresets)
      savePresets(updatedPresets)
      
      return importedPresets.length
    } catch (err) {
      console.error('Error importing presets:', err)
      setError('Failed to import presets: Invalid format')
      return 0
    }
  }, [presets, generateId, savePresets])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load presets on mount
  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  return {
    // State
    presets,
    loading,
    error,
    
    // Actions
    createPreset,
    updatePreset,
    deletePreset,
    
    // Queries
    getPreset,
    getPresetsByCategory,
    
    // Categories
    qualityPresets: getPresetsByCategory('quality'),
    speedPresets: getPresetsByCategory('speed'),
    dimensionPresets: getPresetsByCategory('dimension'),
    customPresets: getPresetsByCategory('custom'),
    
    // Import/Export
    exportPresets,
    importPresets,
    
    // Utility
    clearError,
    reload: loadPresets
  }
}