// ============================================================================
// ComfyUI React - Preset Management Store
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { WorkflowPreset, ComfyUIWorkflow, WorkflowMetadata } from '@/types'

interface PresetState {
  // State
  presets: WorkflowPreset[]
  activePreset: WorkflowPreset | null
  isLoadingPresets: boolean

  // Actions
  setPresets: (presets: WorkflowPreset[]) => void
  setActivePreset: (preset: WorkflowPreset | null) => void
  addPreset: (
    name: string,
    workflow: ComfyUIWorkflow,
    metadata: WorkflowMetadata
  ) => void
  deletePreset: (presetId: string) => void
  updatePreset: (presetId: string, updates: Partial<WorkflowPreset>) => void
  duplicatePreset: (presetId: string, newName: string) => void
  exportPresets: () => string
  importPresets: (data: string) => boolean
  clearPresets: () => void
  searchPresets: (query: string) => WorkflowPreset[]
}

// Generate unique ID for presets
const generatePresetId = (): string => {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Compress workflow data for storage (simple JSON stringify)
const compressWorkflow = (workflow: ComfyUIWorkflow): string => {
  try {
    return JSON.stringify(workflow)
  } catch (error) {
    console.error('Failed to compress workflow:', error)
    return '{}'
  }
}

// Decompress workflow data
const decompressWorkflow = (compressed: string): ComfyUIWorkflow => {
  try {
    return JSON.parse(compressed)
  } catch (error) {
    console.error('Failed to decompress workflow:', error)
    return {}
  }
}

export const usePresetStore = create<PresetState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        presets: [],
        activePreset: null,
        isLoadingPresets: false,

        // Actions
        setPresets: presets => set({ presets }, false, 'setPresets'),

        setActivePreset: activePreset =>
          set({ activePreset }, false, 'setActivePreset'),

        addPreset: (name, workflow, metadata) => {
          const newPreset: WorkflowPreset = {
            id: generatePresetId(),
            name: name.trim() || 'Untitled Preset',
            createdAt: new Date().toISOString(),
            workflowData: workflow,
            metadata,
            tags: [],
          }

          set(
            state => ({
              presets: [newPreset, ...state.presets],
            }),
            false,
            'addPreset'
          )
        },

        deletePreset: presetId =>
          set(
            state => ({
              presets: state.presets.filter(preset => preset.id !== presetId),
              activePreset:
                state.activePreset?.id === presetId ? null : state.activePreset,
            }),
            false,
            'deletePreset'
          ),

        updatePreset: (presetId, updates) =>
          set(
            state => ({
              presets: state.presets.map(preset =>
                preset.id === presetId ? { ...preset, ...updates } : preset
              ),
              activePreset:
                state.activePreset?.id === presetId
                  ? { ...state.activePreset, ...updates }
                  : state.activePreset,
            }),
            false,
            'updatePreset'
          ),

        duplicatePreset: (presetId, newName) => {
          const { presets } = get()
          const originalPreset = presets.find(p => p.id === presetId)

          if (originalPreset) {
            const duplicatedPreset: WorkflowPreset = {
              ...originalPreset,
              id: generatePresetId(),
              name: newName.trim() || `${originalPreset.name} (Copy)`,
              createdAt: new Date().toISOString(),
            }

            set(
              state => ({
                presets: [duplicatedPreset, ...state.presets],
              }),
              false,
              'duplicatePreset'
            )
          }
        },

        exportPresets: () => {
          const { presets } = get()
          const exportData = {
            version: '1.0.0',
            exportDate: new Date().toISOString(),
            presets: presets.map(preset => ({
              ...preset,
              workflowData: compressWorkflow(preset.workflowData),
            })),
          }
          return JSON.stringify(exportData, null, 2)
        },

        importPresets: data => {
          try {
            const importData = JSON.parse(data)

            if (!importData.presets || !Array.isArray(importData.presets)) {
              return false
            }

            const importedPresets: WorkflowPreset[] = importData.presets.map(
              (preset: any) => ({
                ...preset,
                id: generatePresetId(), // Generate new IDs to avoid conflicts
                workflowData: decompressWorkflow(preset.workflowData),
                createdAt: new Date().toISOString(), // Update creation date
              })
            )

            set(
              state => ({
                presets: [...importedPresets, ...state.presets],
              }),
              false,
              'importPresets'
            )

            return true
          } catch (error) {
            console.error('Failed to import presets:', error)
            return false
          }
        },

        clearPresets: () =>
          set({ presets: [], activePreset: null }, false, 'clearPresets'),

        searchPresets: query => {
          const { presets } = get()
          const lowercaseQuery = query.toLowerCase().trim()

          if (!lowercaseQuery) return presets

          return presets.filter(
            preset =>
              preset.name.toLowerCase().includes(lowercaseQuery) ||
              preset.tags?.some(tag =>
                tag.toLowerCase().includes(lowercaseQuery)
              ) ||
              preset.metadata.prompts.positive
                .toLowerCase()
                .includes(lowercaseQuery) ||
              preset.metadata.prompts.negative
                .toLowerCase()
                .includes(lowercaseQuery)
          )
        },
      }),
      {
        name: 'comfyui-preset-store',
        // Store everything except temporary loading states
        partialize: state => ({
          presets: state.presets,
          activePreset: state.activePreset,
        }),
      }
    ),
    {
      name: 'ComfyUI Preset Store',
    }
  )
)
