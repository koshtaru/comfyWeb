// ============================================================================
// ComfyUI React - Preset Management Store
// ============================================================================

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { 
  WorkflowPreset, 
  ComfyUIWorkflow, 
  WorkflowMetadata,
  IPreset,
  IPresetCreateInput,
  IPresetSearchOptions,
  IPresetStorageInfo
} from '@/types'
import { presetService } from '@/services/presetService'

interface PresetState {
  // Enhanced state with new service integration
  presets: IPreset[]
  activePreset: IPreset | null
  isLoadingPresets: boolean
  storageInfo: IPresetStorageInfo | null
  lastError: string | null

  // Enhanced actions using PresetService
  loadPresets: (options?: IPresetSearchOptions) => Promise<void>
  setActivePreset: (preset: IPreset | null) => void
  createPreset: (input: IPresetCreateInput) => Promise<boolean>
  deletePreset: (presetId: string) => Promise<boolean>
  updatePreset: (presetId: string, updates: Partial<IPreset>) => Promise<boolean>
  duplicatePreset: (presetId: string, newName: string) => Promise<boolean>
  
  // Storage management
  getStorageInfo: () => Promise<void>
  cleanupOldPresets: (keepCount?: number) => Promise<number>
  optimizeStorage: () => Promise<void>
  
  // Import/Export with enhanced functionality
  exportPreset: (presetId: string) => Promise<string>
  exportAllPresets: () => Promise<string>
  importPreset: (data: string) => Promise<boolean>
  importPresets: (data: string, replace?: boolean) => Promise<boolean>
  
  // Search and filter
  searchPresets: (options: IPresetSearchOptions) => Promise<void>
  clearError: () => void
  
  // Legacy compatibility methods (deprecated but maintained for backward compatibility)
  addPreset: (name: string, workflow: ComfyUIWorkflow, metadata: WorkflowMetadata) => Promise<void>
  setPresets: (presets: WorkflowPreset[]) => void
  clearPresets: () => Promise<void>
}

// Helper function to convert legacy WorkflowPreset to IPreset
const convertLegacyPreset = (legacy: WorkflowPreset): IPreset => ({
  id: legacy.id,
  name: legacy.name,
  createdAt: new Date(legacy.createdAt),
  lastModified: new Date(legacy.createdAt),
  workflowData: legacy.workflowData,
  metadata: {
    model: legacy.metadata.model,
    generation: legacy.metadata.generation,
    dimensions: {
      width: legacy.metadata.image.width,
      height: legacy.metadata.image.height,
      batchSize: legacy.metadata.image.batchSize,
    },
    prompts: legacy.metadata.prompts,
    timingEstimate: {
      estimatedSeconds: legacy.metadata.timing.duration,
    },
  },
  compressed: false,
  size: JSON.stringify(legacy.workflowData).length,
  tags: legacy.tags || [],
  category: 'custom',
  version: '1.0.0',
})

export const usePresetStore = create<PresetState>()(
  devtools(
    (set, get) => ({
      // Enhanced initial state
      presets: [],
      activePreset: null,
      isLoadingPresets: false,
      storageInfo: null,
      lastError: null,

      // Enhanced actions using PresetService
      loadPresets: async (options = {}) => {
        set({ isLoadingPresets: true, lastError: null }, false, 'loadPresets:start')
        
        try {
          const presets = await presetService.listPresets(options)
          set({ 
            presets, 
            isLoadingPresets: false 
          }, false, 'loadPresets:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load presets'
          set({ 
            isLoadingPresets: false, 
            lastError: errorMessage 
          }, false, 'loadPresets:error')
        }
      },

      setActivePreset: (activePreset) =>
        set({ activePreset }, false, 'setActivePreset'),

      createPreset: async (input) => {
        set({ lastError: null }, false, 'createPreset:start')
        
        try {
          const result = await presetService.savePreset(input)
          
          if (result.success) {
            const { presets } = get()
            set({ 
              presets: [result.preset!, ...presets]
            }, false, 'createPreset:success')
            return true
          } else {
            set({ lastError: result.error || 'Failed to create preset' }, false, 'createPreset:error')
            return false
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create preset'
          set({ lastError: errorMessage }, false, 'createPreset:error')
          return false
        }
      },

      deletePreset: async (presetId) => {
        set({ lastError: null }, false, 'deletePreset:start')
        
        try {
          const success = await presetService.deletePreset(presetId)
          
          if (success) {
            set(state => ({
              presets: state.presets.filter(p => p.id !== presetId),
              activePreset: state.activePreset?.id === presetId ? null : state.activePreset,
            }), false, 'deletePreset:success')
          }
          
          return success
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete preset'
          set({ lastError: errorMessage }, false, 'deletePreset:error')
          return false
        }
      },

      updatePreset: async (presetId, updates) => {
        set({ lastError: null }, false, 'updatePreset:start')
        
        try {
          const result = await presetService.updatePresetMetadata(presetId, updates)
          
          if (result.success) {
            set(state => ({
              presets: state.presets.map(p => p.id === presetId ? result.preset! : p),
              activePreset: state.activePreset?.id === presetId ? result.preset! : state.activePreset,
            }), false, 'updatePreset:success')
            return true
          } else {
            set({ lastError: result.error || 'Failed to update preset' }, false, 'updatePreset:error')
            return false
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update preset'
          set({ lastError: errorMessage }, false, 'updatePreset:error')
          return false
        }
      },

      duplicatePreset: async (presetId, newName) => {
        set({ lastError: null }, false, 'duplicatePreset:start')
        
        try {
          const originalPreset = await presetService.getPresetById(presetId)
          
          if (!originalPreset) {
            set({ lastError: 'Original preset not found' }, false, 'duplicatePreset:error')
            return false
          }

          const result = await presetService.savePreset({
            name: newName.trim() || `${originalPreset.name} (Copy)`,
            workflowData: originalPreset.workflowData,
            metadata: originalPreset.metadata,
            tags: [...(originalPreset.tags || []), 'duplicate'],
            category: originalPreset.category,
          })
          
          if (result.success) {
            const { presets } = get()
            set({ 
              presets: [result.preset!, ...presets]
            }, false, 'duplicatePreset:success')
            return true
          } else {
            set({ lastError: result.error || 'Failed to duplicate preset' }, false, 'duplicatePreset:error')
            return false
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to duplicate preset'
          set({ lastError: errorMessage }, false, 'duplicatePreset:error')
          return false
        }
      },

      // Storage management
      getStorageInfo: async () => {
        try {
          const storageInfo = await presetService.getStorageInfo()
          set({ storageInfo }, false, 'getStorageInfo')
        } catch (error) {
          console.error('Failed to get storage info:', error)
        }
      },

      cleanupOldPresets: async (keepCount = 100) => {
        try {
          const deletedCount = await presetService.cleanupOldPresets(keepCount)
          
          // Refresh presets after cleanup
          const { loadPresets } = get()
          await loadPresets()
          
          return deletedCount
        } catch (error) {
          console.error('Failed to cleanup presets:', error)
          return 0
        }
      },

      optimizeStorage: async () => {
        try {
          await presetService.optimizeStorage()
          
          // Refresh storage info
          const { getStorageInfo } = get()
          await getStorageInfo()
        } catch (error) {
          console.error('Failed to optimize storage:', error)
        }
      },

      // Enhanced Import/Export
      exportPreset: async (presetId) => {
        try {
          return await presetService.exportPreset(presetId)
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Failed to export preset')
        }
      },

      exportAllPresets: async () => {
        try {
          return await presetService.exportAllPresets()
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'Failed to export presets')
        }
      },

      importPreset: async (data) => {
        set({ lastError: null }, false, 'importPreset:start')
        
        try {
          const result = await presetService.importPreset(data)
          
          if (result.success) {
            const { presets } = get()
            set({ 
              presets: [...result.imported, ...presets]
            }, false, 'importPreset:success')
            return true
          } else {
            set({ 
              lastError: result.errors.join(', ') || 'Failed to import preset' 
            }, false, 'importPreset:error')
            return false
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import preset'
          set({ lastError: errorMessage }, false, 'importPreset:error')
          return false
        }
      },

      importPresets: async (data, replace = false) => {
        set({ lastError: null }, false, 'importPresets:start')
        
        try {
          const result = await presetService.importPresets(data, replace)
          
          if (result.success) {
            // Refresh all presets
            const { loadPresets } = get()
            await loadPresets()
            return true
          } else {
            set({ 
              lastError: result.errors.join(', ') || 'Failed to import presets' 
            }, false, 'importPresets:error')
            return false
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import presets'
          set({ lastError: errorMessage }, false, 'importPresets:error')
          return false
        }
      },

      // Search with enhanced options
      searchPresets: async (options) => {
        set({ isLoadingPresets: true, lastError: null }, false, 'searchPresets:start')
        
        try {
          const presets = await presetService.listPresets(options)
          set({ 
            presets, 
            isLoadingPresets: false 
          }, false, 'searchPresets:success')
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to search presets'
          set({ 
            isLoadingPresets: false, 
            lastError: errorMessage 
          }, false, 'searchPresets:error')
        }
      },

      clearError: () => set({ lastError: null }, false, 'clearError'),

      // Legacy compatibility methods (deprecated)
      addPreset: async (name, workflow, metadata) => {
        const { createPreset } = get()
        await createPreset({
          name,
          workflowData: workflow,
          metadata: {
            model: metadata.model,
            generation: metadata.generation,
            dimensions: {
              width: metadata.image.width,
              height: metadata.image.height,
              batchSize: metadata.image.batchSize,
            },
            prompts: metadata.prompts,
            timingEstimate: {
              estimatedSeconds: metadata.timing.duration,
            },
          },
          category: 'custom',
        })
      },

      setPresets: (legacyPresets) => {
        const convertedPresets = legacyPresets.map(convertLegacyPreset)
        set({ presets: convertedPresets }, false, 'setPresets:legacy')
      },

      clearPresets: async () => {
        try {
          // Clear all custom presets, but keep default ones
          const { presets } = get()
          const customPresets = presets.filter(p => p.category === 'custom')
          
          for (const preset of customPresets) {
            await presetService.deletePreset(preset.id)
          }
          
          const { loadPresets } = get()
          await loadPresets()
        } catch (error) {
          console.error('Failed to clear presets:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to clear presets'
          set({ lastError: errorMessage }, false, 'clearPresets:error')
        }
      },
    }),
    {
      name: 'ComfyUI Enhanced Preset Store',
    }
  )
)
