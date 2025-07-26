// ============================================================================
// ComfyUI React - Preset Management Hook
// ============================================================================
// Custom React hook that provides a comprehensive API for preset management
// Built on top of the enhanced Zustand presetStore with optimistic updates

import { useCallback, useMemo } from 'react'
import { usePresetStore } from '@/store/presetStore'
import type { 
  IPreset,
  IPresetCreateInput,
  IPresetSearchOptions,
  IPresetStorageInfo,
  IPresetImportResult
} from '@/types'

// Enhanced preset hook return interface
export interface UsePresetsReturn {
  // State properties
  presets: IPreset[]
  activePreset: IPreset | null
  selectedPresetId: string | null
  isLoading: boolean
  storageInfo: IPresetStorageInfo | null
  storageUsage: number
  lastError: string | null
  hasError: boolean
  
  // Core CRUD operations with optimistic updates
  create: (input: IPresetCreateInput) => Promise<boolean>
  createOptimistic: (input: IPresetCreateInput) => Promise<boolean>
  update: (presetId: string, updates: Partial<IPreset>) => Promise<boolean>
  updateOptimistic: (presetId: string, updates: Partial<IPreset>) => Promise<boolean>
  delete: (presetId: string) => Promise<boolean>
  deleteOptimistic: (presetId: string) => Promise<boolean>
  duplicate: (presetId: string, newName: string) => Promise<boolean>
  
  // Selection and state management
  setActive: (preset: IPreset | null) => void
  setSelected: (presetId: string | null) => void
  clearActive: () => void
  clearSelected: () => void
  
  // Search and filtering
  search: (options: IPresetSearchOptions) => Promise<void>
  searchDebounced: (query: string) => void
  reload: (options?: IPresetSearchOptions) => Promise<void>
  
  // Storage management
  getStorageInfo: () => Promise<void>
  refreshStorage: () => Promise<void>
  cleanup: (keepCount?: number) => Promise<number>
  optimize: () => Promise<void>
  
  // Import/Export operations
  exportPreset: (presetId: string) => Promise<string>
  exportAll: () => Promise<string>
  exportSelected: (presetIds: string[]) => Promise<string>
  importPreset: (data: string) => Promise<boolean>
  importPresets: (data: string, replace?: boolean) => Promise<IPresetImportResult>
  bulkImport: (data: string) => Promise<IPresetImportResult>
  
  // Utility functions and getters
  getById: (id: string) => IPreset | null
  getByName: (name: string) => IPreset | null
  findByTag: (tag: string) => IPreset[]
  findByCategory: (category: string) => IPreset[]
  getRecent: (count?: number) => IPreset[]
  
  // Computed properties
  totalCount: number
  customCount: number
  defaultCount: number
  categories: string[]
  allTags: string[]
  isEmpty: boolean
  isStorageFull: boolean
  
  // Batch operations
  batchDelete: (presetIds: string[]) => Promise<number>
  batchUpdate: (updates: Array<{ id: string; updates: Partial<IPreset> }>) => Promise<number>
  batchExport: (presetIds: string[]) => Promise<string>
  
  // Error handling
  clearError: () => void
  
  // Advanced filtering helpers
  filterByDateRange: (startDate: Date, endDate: Date) => IPreset[]
  filterBySize: (minSize?: number, maxSize?: number) => IPreset[]
  sortBy: (field: keyof IPreset, direction?: 'asc' | 'desc') => IPreset[]
}

/**
 * Comprehensive preset management hook
 * Provides full CRUD operations, optimistic updates, search, and storage management
 */
export const usePresets = (): UsePresetsReturn => {
  // Get all store state and actions
  const {
    presets,
    activePreset,
    selectedPresetId,
    isLoadingPresets,
    storageInfo,
    storageUsage,
    lastError,
    
    // Store actions
    loadPresets,
    setActivePreset,
    setSelectedPresetId,
    createPreset,
    createPresetOptimistic,
    updatePreset,
    updatePresetOptimistic,
    deletePreset,
    deletePresetOptimistic,
    duplicatePreset,
    getStorageInfo,
    refreshStorageUsage,
    cleanupOldPresets,
    optimizeStorage,
    exportPreset,
    exportAllPresets,
    exportSelectedPresets,
    importPreset,
    importPresets,
    bulkImportPresets,
    searchPresets,
    debouncedSearch,
    clearError
  } = usePresetStore()

  // Core CRUD operations
  const create = useCallback(async (input: IPresetCreateInput): Promise<boolean> => {
    return await createPreset(input)
  }, [createPreset])

  const createOptimistic = useCallback(async (input: IPresetCreateInput): Promise<boolean> => {
    return await createPresetOptimistic(input)
  }, [createPresetOptimistic])

  const update = useCallback(async (presetId: string, updates: Partial<IPreset>): Promise<boolean> => {
    return await updatePreset(presetId, updates)
  }, [updatePreset])

  const updateOptimistic = useCallback(async (presetId: string, updates: Partial<IPreset>): Promise<boolean> => {
    return await updatePresetOptimistic(presetId, updates)
  }, [updatePresetOptimistic])

  const deleteById = useCallback(async (presetId: string): Promise<boolean> => {
    return await deletePreset(presetId)
  }, [deletePreset])

  const deleteOptimistic = useCallback(async (presetId: string): Promise<boolean> => {
    return await deletePresetOptimistic(presetId)
  }, [deletePresetOptimistic])

  const duplicate = useCallback(async (presetId: string, newName: string): Promise<boolean> => {
    return await duplicatePreset(presetId, newName)
  }, [duplicatePreset])

  // Selection and state management
  const setActive = useCallback((preset: IPreset | null) => {
    setActivePreset(preset)
  }, [setActivePreset])

  const setSelected = useCallback((presetId: string | null) => {
    setSelectedPresetId(presetId)
  }, [setSelectedPresetId])

  const clearActive = useCallback(() => {
    setActivePreset(null)
  }, [setActivePreset])

  const clearSelected = useCallback(() => {
    setSelectedPresetId(null)
  }, [setSelectedPresetId])

  // Search and filtering
  const search = useCallback(async (options: IPresetSearchOptions): Promise<void> => {
    await searchPresets(options)
  }, [searchPresets])

  const searchDebounced = useCallback((query: string): void => {
    debouncedSearch(query)
  }, [debouncedSearch])

  const reload = useCallback(async (options?: IPresetSearchOptions): Promise<void> => {
    await loadPresets(options)
  }, [loadPresets])

  // Storage management
  const refreshStorage = useCallback(async (): Promise<void> => {
    await refreshStorageUsage()
  }, [refreshStorageUsage])

  const cleanup = useCallback(async (keepCount?: number): Promise<number> => {
    return await cleanupOldPresets(keepCount)
  }, [cleanupOldPresets])

  const optimize = useCallback(async (): Promise<void> => {
    await optimizeStorage()
  }, [optimizeStorage])

  // Import/Export operations
  const exportAll = useCallback(async (): Promise<string> => {
    return await exportAllPresets()
  }, [exportAllPresets])

  const exportSelected = useCallback(async (presetIds: string[]): Promise<string> => {
    return await exportSelectedPresets(presetIds)
  }, [exportSelectedPresets])

  const bulkImport = useCallback(async (data: string): Promise<IPresetImportResult> => {
    return await bulkImportPresets(data)
  }, [bulkImportPresets])

  // Utility functions and getters
  const getById = useCallback((id: string): IPreset | null => {
    return presets.find((p: IPreset) => p.id === id) || null
  }, [presets])

  const getByName = useCallback((name: string): IPreset | null => {
    return presets.find((p: IPreset) => p.name.toLowerCase() === name.toLowerCase()) || null
  }, [presets])

  const findByTag = useCallback((tag: string): IPreset[] => {
    return presets.filter((p: IPreset) => p.tags?.includes(tag))
  }, [presets])

  const findByCategory = useCallback((category: string): IPreset[] => {
    return presets.filter((p: IPreset) => p.category === category)
  }, [presets])

  const getRecent = useCallback((count: number = 10): IPreset[] => {
    return [...presets]
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, count)
  }, [presets])

  // Computed properties
  const totalCount = useMemo(() => presets.length, [presets.length])
  
  const customCount = useMemo(() => 
    presets.filter((p: IPreset) => p.category === 'custom').length, 
    [presets]
  )
  
  const defaultCount = useMemo(() => 
    presets.filter((p: IPreset) => p.category !== 'custom').length, 
    [presets]
  )
  
  const categories = useMemo(() => 
    Array.from(new Set(presets.map((p: IPreset) => p.category).filter(Boolean) as string[])).sort(), 
    [presets]
  )
  
  const allTags = useMemo(() => 
    Array.from(new Set(presets.flatMap((p: IPreset) => p.tags || []))).sort(), 
    [presets]
  )
  
  const isEmpty = useMemo(() => presets.length === 0, [presets.length])
  
  const isStorageFull = useMemo(() => storageUsage > 90, [storageUsage])

  // Batch operations
  const batchDelete = useCallback(async (presetIds: string[]): Promise<number> => {
    let deletedCount = 0
    for (const id of presetIds) {
      const success = await deletePreset(id)
      if (success) deletedCount++
    }
    return deletedCount
  }, [deletePreset])

  const batchUpdate = useCallback(async (
    updates: Array<{ id: string; updates: Partial<IPreset> }>
  ): Promise<number> => {
    let updatedCount = 0
    for (const { id, updates: presetUpdates } of updates) {
      const success = await updatePreset(id, presetUpdates)
      if (success) updatedCount++
    }
    return updatedCount
  }, [updatePreset])

  const batchExport = useCallback(async (presetIds: string[]): Promise<string> => {
    return await exportSelectedPresets(presetIds)
  }, [exportSelectedPresets])

  // Advanced filtering helpers
  const filterByDateRange = useCallback((startDate: Date, endDate: Date): IPreset[] => {
    return presets.filter((p: IPreset) => {
      const presetDate = new Date(p.lastModified)
      return presetDate >= startDate && presetDate <= endDate
    })
  }, [presets])

  const filterBySize = useCallback((minSize?: number, maxSize?: number): IPreset[] => {
    return presets.filter((p: IPreset) => {
      if (minSize !== undefined && p.size < minSize) return false
      if (maxSize !== undefined && p.size > maxSize) return false
      return true
    })
  }, [presets])

  const sortBy = useCallback((
    field: keyof IPreset, 
    direction: 'asc' | 'desc' = 'asc'
  ): IPreset[] => {
    return [...presets].sort((a, b) => {
      const aVal = a[field]
      const bVal = b[field]
      
      // Handle different data types
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const comparison = aVal.localeCompare(bVal)
        return direction === 'asc' ? comparison : -comparison
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }
      
      if (aVal instanceof Date && bVal instanceof Date) {
        const comparison = aVal.getTime() - bVal.getTime()
        return direction === 'asc' ? comparison : -comparison
      }
      
      // Fallback to string comparison
      const aStr = String(aVal)
      const bStr = String(bVal)
      const comparison = aStr.localeCompare(bStr)
      return direction === 'asc' ? comparison : -comparison
    })
  }, [presets])

  return {
    // State properties
    presets,
    activePreset,
    selectedPresetId,
    isLoading: isLoadingPresets,
    storageInfo,
    storageUsage,
    lastError,
    hasError: !!lastError,
    
    // Core CRUD operations
    create,
    createOptimistic,
    update,
    updateOptimistic,
    delete: deleteById,
    deleteOptimistic,
    duplicate,
    
    // Selection and state management
    setActive,
    setSelected,
    clearActive,
    clearSelected,
    
    // Search and filtering
    search,
    searchDebounced,
    reload,
    
    // Storage management
    getStorageInfo,
    refreshStorage,
    cleanup,
    optimize,
    
    // Import/Export operations
    exportPreset,
    exportAll,
    exportSelected,
    importPreset,
    importPresets,
    bulkImport,
    
    // Utility functions and getters
    getById,
    getByName,
    findByTag,
    findByCategory,
    getRecent,
    
    // Computed properties
    totalCount,
    customCount,
    defaultCount,
    categories,
    allTags,
    isEmpty,
    isStorageFull,
    
    // Batch operations
    batchDelete,
    batchUpdate,
    batchExport,
    
    // Error handling
    clearError,
    
    // Advanced filtering helpers
    filterByDateRange,
    filterBySize,
    sortBy
  }
}

// Specialized hooks for specific use cases

/**
 * Lightweight hook for preset selection only
 */
export const usePresetSelection = () => {
  const { activePreset, selectedPresetId, setActive, setSelected, clearActive, clearSelected } = usePresets()
  
  return {
    activePreset,
    selectedPresetId,
    setActive,
    setSelected,
    clearActive,
    clearSelected
  }
}

/**
 * Hook for preset categories and organization
 */
export const usePresetCategories = () => {
  const { categories, allTags, findByCategory, findByTag, sortBy } = usePresets()
  
  return {
    categories,
    allTags,
    findByCategory,
    findByTag,
    sortBy
  }
}

/**
 * Hook for storage management only
 */
export const usePresetStorage = () => {
  const {
    storageInfo,
    storageUsage,
    isStorageFull,
    getStorageInfo,
    refreshStorage,
    cleanup,
    optimize
  } = usePresets()
  
  return {
    storageInfo,
    storageUsage,
    isStorageFull,
    getStorageInfo,
    refreshStorage,
    cleanup,
    optimize
  }
}

/**
 * Hook for import/export operations
 */
export const usePresetImportExport = () => {
  const {
    exportPreset,
    exportAll,
    exportSelected,
    importPreset,
    importPresets,
    bulkImport,
    batchExport
  } = usePresets()
  
  return {
    exportPreset,
    exportAll,
    exportSelected,
    importPreset,
    importPresets,
    bulkImport,
    batchExport
  }
}