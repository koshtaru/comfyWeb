// ============================================================================
// ComfyUI React - Preset Management Store
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { 
  WorkflowPreset, 
  ComfyUIWorkflow, 
  WorkflowMetadata,
  IPreset,
  IPresetCreateInput,
  IPresetSearchOptions,
  IPresetStorageInfo,
  IPresetImportResult
} from '@/types'
import { presetService } from '@/services/presetService'

// Debounce utility for optimizing updates
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

// Optimistic preset type for UI updates
type OptimisticPreset = IPreset & {
  isOptimistic?: boolean
  originalId?: string
}

interface PresetState {
  // Enhanced state with new service integration
  presets: IPreset[]
  activePreset: IPreset | null
  selectedPresetId: string | null
  isLoadingPresets: boolean
  storageInfo: IPresetStorageInfo | null
  storageUsage: number // percentage 0-100
  lastError: string | null
  optimisticOperations: Map<string, OptimisticPreset>

  // Enhanced actions using PresetService with optimistic updates
  loadPresets: (options?: IPresetSearchOptions) => Promise<void>
  setActivePreset: (preset: IPreset | null) => void
  setSelectedPresetId: (presetId: string | null) => void
  createPreset: (input: IPresetCreateInput) => Promise<boolean>
  createPresetOptimistic: (input: IPresetCreateInput) => Promise<boolean>
  deletePreset: (presetId: string) => Promise<boolean>
  deletePresetOptimistic: (presetId: string) => Promise<boolean>
  updatePreset: (presetId: string, updates: Partial<IPreset>) => Promise<boolean>
  updatePresetOptimistic: (presetId: string, updates: Partial<IPreset>) => Promise<boolean>
  duplicatePreset: (presetId: string, newName: string) => Promise<boolean>
  
  // Storage management
  getStorageInfo: () => Promise<void>
  refreshStorageUsage: () => Promise<void>
  cleanupOldPresets: (keepCount?: number) => Promise<number>
  optimizeStorage: () => Promise<void>
  
  // Import/Export with enhanced functionality
  exportPreset: (presetId: string) => Promise<string>
  exportAllPresets: () => Promise<string>
  exportSelectedPresets: (presetIds: string[]) => Promise<string>
  importPreset: (data: string) => Promise<boolean>
  importPresets: (data: string, replace?: boolean) => Promise<IPresetImportResult>
  bulkImportPresets: (data: string) => Promise<IPresetImportResult>
  
  // Search and filter with debouncing
  searchPresets: (options: IPresetSearchOptions) => Promise<void>
  debouncedSearch: (query: string) => void
  
  // Utility methods
  clearError: () => void
  rollbackOptimisticOperation: (operationId: string) => void
  commitOptimisticOperation: (operationId: string, realPreset: IPreset) => void
  
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

// Generate unique operation ID for optimistic updates
const generateOperationId = () => `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

export const usePresetStore = create<PresetState>()(
  devtools(
    persist(
      (set, get) => {
        // Create debounced search function
        const debouncedSearchImpl = debounce(async (query: string) => {
          const { searchPresets } = get()
          await searchPresets({ query })
        }, 300)

        return {
          // Enhanced initial state
          presets: [],
          activePreset: null,
          selectedPresetId: null,
          isLoadingPresets: false,
          storageInfo: null,
          storageUsage: 0,
          lastError: null,
          optimisticOperations: new Map(),

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

          setSelectedPresetId: (selectedPresetId) =>
            set({ selectedPresetId }, false, 'setSelectedPresetId'),

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

          // Optimistic update methods
          createPresetOptimistic: async (input) => {
            const operationId = generateOperationId()
            const optimisticId = `optimistic_${operationId}`
            
            // Create optimistic preset
            const optimisticPreset: OptimisticPreset = {
              id: optimisticId,
              name: input.name,
              createdAt: new Date(),
              lastModified: new Date(),
              workflowData: input.workflowData,
              metadata: input.metadata,
              compressed: false,
              size: JSON.stringify(input.workflowData).length,
              tags: input.tags || [],
              category: input.category || 'custom',
              version: '1.0.0',
              isOptimistic: true,
              originalId: operationId,
            }
            
            // Add optimistic preset to state
            set(state => ({
              presets: [optimisticPreset, ...state.presets],
              optimisticOperations: new Map(state.optimisticOperations).set(operationId, optimisticPreset)
            }), false, 'createPresetOptimistic:add')
            
            try {
              const result = await presetService.savePreset(input)
              
              if (result.success && result.preset) {
                // Replace optimistic with real preset
                const { commitOptimisticOperation } = get()
                commitOptimisticOperation(operationId, result.preset)
                return true
              } else {
                // Rollback optimistic update
                const { rollbackOptimisticOperation } = get()
                rollbackOptimisticOperation(operationId)
                set({ lastError: result.error || 'Failed to create preset' }, false, 'createPresetOptimistic:error')
                return false
              }
            } catch (error) {
              const { rollbackOptimisticOperation } = get()
              rollbackOptimisticOperation(operationId)
              const errorMessage = error instanceof Error ? error.message : 'Failed to create preset'
              set({ lastError: errorMessage }, false, 'createPresetOptimistic:error')
              return false
            }
          },

          deletePresetOptimistic: async (presetId) => {
            const operationId = generateOperationId()
            const { presets } = get()
            const presetToDelete = presets.find(p => p.id === presetId)
            
            if (!presetToDelete) {
              set({ lastError: 'Preset not found' }, false, 'deletePresetOptimistic:error')
              return false
            }
            
            // Store for potential rollback
            set(state => ({
              presets: state.presets.filter(p => p.id !== presetId),
              activePreset: state.activePreset?.id === presetId ? null : state.activePreset,
              selectedPresetId: state.selectedPresetId === presetId ? null : state.selectedPresetId,
              optimisticOperations: new Map(state.optimisticOperations).set(operationId, presetToDelete as OptimisticPreset)
            }), false, 'deletePresetOptimistic:remove')
            
            try {
              const success = await presetService.deletePreset(presetId)
              
              if (success) {
                // Remove from optimistic operations (success)
                set(state => {
                  const newOps = new Map(state.optimisticOperations)
                  newOps.delete(operationId)
                  return { optimisticOperations: newOps }
                }, false, 'deletePresetOptimistic:success')
                return true
              } else {
                // Rollback - restore the preset
                const { rollbackOptimisticOperation } = get()
                rollbackOptimisticOperation(operationId)
                set({ lastError: 'Failed to delete preset' }, false, 'deletePresetOptimistic:error')
                return false
              }
            } catch (error) {
              const { rollbackOptimisticOperation } = get()
              rollbackOptimisticOperation(operationId)
              const errorMessage = error instanceof Error ? error.message : 'Failed to delete preset'
              set({ lastError: errorMessage }, false, 'deletePresetOptimistic:error')
              return false
            }
          },

          updatePresetOptimistic: async (presetId, updates) => {
            const operationId = generateOperationId()
            const { presets } = get()
            const originalPreset = presets.find(p => p.id === presetId)
            
            if (!originalPreset) {
              set({ lastError: 'Preset not found' }, false, 'updatePresetOptimistic:error')
              return false
            }
            
            // Apply optimistic update
            const optimisticPreset = { ...originalPreset, ...updates, lastModified: new Date() }
            
            set(state => ({
              presets: state.presets.map(p => p.id === presetId ? optimisticPreset : p),
              activePreset: state.activePreset?.id === presetId ? optimisticPreset : state.activePreset,
              optimisticOperations: new Map(state.optimisticOperations).set(operationId, originalPreset as OptimisticPreset)
            }), false, 'updatePresetOptimistic:update')
            
            try {
              const result = await presetService.updatePresetMetadata(presetId, updates)
              
              if (result.success && result.preset) {
                // Replace with real updated preset
                const { commitOptimisticOperation } = get()
                commitOptimisticOperation(operationId, result.preset)
                return true
              } else {
                // Rollback optimistic update
                const { rollbackOptimisticOperation } = get()
                rollbackOptimisticOperation(operationId)
                set({ lastError: result.error || 'Failed to update preset' }, false, 'updatePresetOptimistic:error')
                return false
              }
            } catch (error) {
              const { rollbackOptimisticOperation } = get()
              rollbackOptimisticOperation(operationId)
              const errorMessage = error instanceof Error ? error.message : 'Failed to update preset'
              set({ lastError: errorMessage }, false, 'updatePresetOptimistic:error')
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
          const storageUsage = storageInfo.quotaUsagePercent
          set({ storageInfo, storageUsage }, false, 'getStorageInfo')
        } catch (error) {
          console.error('Failed to get storage info:', error)
        }
      },

          refreshStorageUsage: async () => {
            try {
              const storageInfo = await presetService.getStorageInfo()
              set({ storageUsage: storageInfo.quotaUsagePercent }, false, 'refreshStorageUsage')
            } catch (error) {
              console.error('Failed to refresh storage usage:', error)
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

          exportSelectedPresets: async (presetIds) => {
            try {
              const selectedPresets = get().presets.filter(p => presetIds.includes(p.id))
              const exportData = {
                version: '1.0.0',
                exportedAt: new Date().toISOString(),
                presets: selectedPresets,
                metadata: {
                  totalCount: selectedPresets.length,
                  totalSize: selectedPresets.reduce((sum, p) => sum + p.size, 0),
                  compressionUsed: selectedPresets.some(p => p.compressed),
                },
              }
              return JSON.stringify(exportData, null, 2)
            } catch (error) {
              throw new Error(error instanceof Error ? error.message : 'Failed to export selected presets')
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
            const { loadPresets, refreshStorageUsage } = get()
            await loadPresets()
            await refreshStorageUsage()
            return result
          } else {
            set({ 
              lastError: result.errors.join(', ') || 'Failed to import presets' 
            }, false, 'importPresets:error')
            return result
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to import presets'
          set({ lastError: errorMessage }, false, 'importPresets:error')
          return {
            success: false,
            imported: [],
            skipped: 0,
            errors: [errorMessage],
            warnings: []
          }
        }
      },

          bulkImportPresets: async (data) => {
            set({ lastError: null, isLoadingPresets: true }, false, 'bulkImportPresets:start')
            
            try {
              const result = await presetService.importPresets(data, false)
              
              if (result.success && result.imported.length > 0) {
                // Add imported presets to current state without full reload for better UX
                set(state => ({
                  presets: [...result.imported, ...state.presets],
                  isLoadingPresets: false
                }), false, 'bulkImportPresets:success')
                
                // Refresh storage usage
                const { refreshStorageUsage } = get()
                await refreshStorageUsage()
              } else {
                set({ 
                  lastError: result.errors.join(', ') || 'Failed to bulk import presets',
                  isLoadingPresets: false
                }, false, 'bulkImportPresets:error')
              }
              
              return result
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to bulk import presets'
              set({ 
                lastError: errorMessage, 
                isLoadingPresets: false 
              }, false, 'bulkImportPresets:error')
              return {
                success: false,
                imported: [],
                skipped: 0,
                errors: [errorMessage],
                warnings: []
              }
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

          // Debounced search
          debouncedSearch: (query) => {
            debouncedSearchImpl(query)
          },

          // Utility methods for optimistic updates
          rollbackOptimisticOperation: (operationId) => {
            set(state => {
              const optimisticPreset = state.optimisticOperations.get(operationId)
              if (!optimisticPreset) return state
              
              const newOps = new Map(state.optimisticOperations)
              newOps.delete(operationId)
              
              // Handle different rollback scenarios
              if (optimisticPreset.isOptimistic && optimisticPreset.id.startsWith('optimistic_')) {
                // Remove optimistic preset that was added
                return {
                  presets: state.presets.filter(p => p.id !== optimisticPreset.id),
                  optimisticOperations: newOps
                }
              } else {
                // Restore original preset that was modified/deleted
                const presetExists = state.presets.find(p => p.id === optimisticPreset.id)
                if (presetExists) {
                  // Restore original data
                  return {
                    presets: state.presets.map(p => p.id === optimisticPreset.id ? optimisticPreset : p),
                    optimisticOperations: newOps
                  }
                } else {
                  // Restore deleted preset
                  return {
                    presets: [optimisticPreset, ...state.presets],
                    optimisticOperations: newOps
                  }
                }
              }
            }, false, 'rollbackOptimisticOperation')
          },

          commitOptimisticOperation: (operationId, realPreset) => {
            set(state => {
              const optimisticPreset = state.optimisticOperations.get(operationId)
              if (!optimisticPreset) return state
              
              const newOps = new Map(state.optimisticOperations)
              newOps.delete(operationId)
              
              return {
                presets: state.presets.map(p => {
                  if (p.id === optimisticPreset.id) return realPreset
                  if (p.id.startsWith('optimistic_') && (p as OptimisticPreset).originalId === operationId) return realPreset
                  return p
                }),
                activePreset: state.activePreset?.id === optimisticPreset.id ? realPreset : state.activePreset,
                optimisticOperations: newOps
              }
            }, false, 'commitOptimisticOperation')
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
        }
      },
      {
        name: 'comfyui-enhanced-preset-store',
        partialize: (state) => ({
          selectedPresetId: state.selectedPresetId,
          // Don't persist optimistic operations or loading states
        }),
      }
    ),
    {
      name: 'ComfyUI Enhanced Preset Store',
    }
  )
)
