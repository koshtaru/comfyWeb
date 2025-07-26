// ============================================================================
// ComfyUI React - usePresets Hook Tests
// ============================================================================
// Comprehensive test suite for the usePresets custom hook

import { renderHook, act } from '@testing-library/react'
import { usePresets, usePresetSelection, usePresetCategories, usePresetStorage, usePresetImportExport } from '../usePresets'
import { usePresetStore } from '@/store/presetStore'
import type { IPreset, IPresetCreateInput } from '@/types'

import { vi } from 'vitest'

// Mock the preset store
vi.mock('@/store/presetStore')

const mockUsePresetStore = usePresetStore as ReturnType<typeof vi.mocked>

// Sample preset data
const samplePresets: IPreset[] = [
    {
      id: 'preset-1',
      name: 'Test Preset 1',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-02'),
      workflowData: { test: 'data1' },
      metadata: {
        model: { name: 'test-model', architecture: 'flux', hash: 'hash123' },
        generation: { steps: 20, cfg: 7.5, sampler: 'euler', scheduler: 'normal', seed: 12345 },
        dimensions: { width: 512, height: 512, batchSize: 1 },
        prompts: { positive: 'test prompt', negative: 'test negative' },
        timingEstimate: { estimatedSeconds: 30 }
      },
      compressed: false,
      size: 1024,
      tags: ['tag1', 'tag2'],
      category: 'custom',
      version: '1.0.0'
    },
    {
      id: 'preset-2',
      name: 'Test Preset 2',
      createdAt: new Date('2024-01-03'),
      lastModified: new Date('2024-01-04'),
      workflowData: { test: 'data2' },
      metadata: {
        model: { name: 'test-model-2', architecture: 'sdxl', hash: 'hash456' },
        generation: { steps: 30, cfg: 8.0, sampler: 'dpmpp_2m', scheduler: 'karras', seed: 67890 },
        dimensions: { width: 768, height: 768, batchSize: 1 },
        prompts: { positive: 'test prompt 2', negative: 'test negative 2' },
        timingEstimate: { estimatedSeconds: 45 }
      },
      compressed: false,
      size: 2048,
      tags: ['tag2', 'tag3'],
      category: 'quality',
      version: '1.0.0'
    }
  ]

describe('usePresets Hook', () => {
  // Mock store state and actions
  const mockStoreState = {
    presets: [],
    activePreset: null,
    selectedPresetId: null,
    isLoadingPresets: false,
    storageInfo: null,
    storageUsage: 0,
    lastError: null,
    loadPresets: vi.fn(),
    setActivePreset: vi.fn(),
    setSelectedPresetId: vi.fn(),
    createPreset: vi.fn(),
    createPresetOptimistic: vi.fn(),
    updatePreset: vi.fn(),
    updatePresetOptimistic: vi.fn(),
    deletePreset: vi.fn(),
    deletePresetOptimistic: vi.fn(),
    duplicatePreset: vi.fn(),
    getStorageInfo: vi.fn(),
    refreshStorageUsage: vi.fn(),
    cleanupOldPresets: vi.fn(),
    optimizeStorage: vi.fn(),
    exportPreset: vi.fn(),
    exportAllPresets: vi.fn(),
    exportSelectedPresets: vi.fn(),
    importPreset: vi.fn(),
    importPresets: vi.fn(),
    bulkImportPresets: vi.fn(),
    searchPresets: vi.fn(),
    debouncedSearch: vi.fn(),
    clearError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePresetStore.mockReturnValue({
      ...mockStoreState,
      presets: samplePresets
    })
  })

  describe('Basic Hook Functionality', () => {
    it('should provide all required properties', () => {
      const { result } = renderHook(() => usePresets())

      expect(result.current).toHaveProperty('presets')
      expect(result.current).toHaveProperty('activePreset')
      expect(result.current).toHaveProperty('selectedPresetId')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('storageInfo')
      expect(result.current).toHaveProperty('storageUsage')
      expect(result.current).toHaveProperty('lastError')
      expect(result.current).toHaveProperty('hasError')
    })

    it('should provide all CRUD operations', () => {
      const { result } = renderHook(() => usePresets())

      expect(result.current).toHaveProperty('create')
      expect(result.current).toHaveProperty('createOptimistic')
      expect(result.current).toHaveProperty('update')
      expect(result.current).toHaveProperty('updateOptimistic')
      expect(result.current).toHaveProperty('delete')
      expect(result.current).toHaveProperty('deleteOptimistic')
      expect(result.current).toHaveProperty('duplicate')
    })

    it('should provide utility functions', () => {
      const { result } = renderHook(() => usePresets())

      expect(result.current).toHaveProperty('getById')
      expect(result.current).toHaveProperty('getByName')
      expect(result.current).toHaveProperty('findByTag')
      expect(result.current).toHaveProperty('findByCategory')
      expect(result.current).toHaveProperty('getRecent')
    })
  })

  describe('CRUD Operations', () => {
    it('should create a preset', async () => {
      mockStoreState.createPreset.mockResolvedValue(true)
      const { result } = renderHook(() => usePresets())

      const input: IPresetCreateInput = {
        name: 'New Preset',
        workflowData: { test: 'new' },
        metadata: {
          model: { name: 'new-model', architecture: 'flux', hash: 'newhash' },
          generation: { steps: 25, cfg: 7.0, sampler: 'euler', scheduler: 'normal', seed: 54321 },
          dimensions: { width: 512, height: 512, batchSize: 1 },
          prompts: { positive: 'new prompt', negative: 'new negative' },
          timingEstimate: { estimatedSeconds: 35 }
        },
        tags: ['new'],
        category: 'custom'
      }

      await act(async () => {
        const success = await result.current.create(input)
        expect(success).toBe(true)
      })

      expect(mockStoreState.createPreset).toHaveBeenCalledWith(input)
    })

    it('should create a preset optimistically', async () => {
      mockStoreState.createPresetOptimistic.mockResolvedValue(true)
      const { result } = renderHook(() => usePresets())

      const input: IPresetCreateInput = {
        name: 'Optimistic Preset',
        workflowData: { test: 'optimistic' },
        metadata: {
          model: { name: 'opt-model', architecture: 'sdxl', hash: 'opthash' },
          generation: { steps: 20, cfg: 6.5, sampler: 'dpmpp_2m', scheduler: 'karras', seed: 98765 },
          dimensions: { width: 768, height: 768, batchSize: 1 },
          prompts: { positive: 'opt prompt', negative: 'opt negative' },
          timingEstimate: { estimatedSeconds: 40 }
        },
        tags: ['optimistic'],
        category: 'custom'
      }

      await act(async () => {
        const success = await result.current.createOptimistic(input)
        expect(success).toBe(true)
      })

      expect(mockStoreState.createPresetOptimistic).toHaveBeenCalledWith(input)
    })

    it('should update a preset', async () => {
      mockStoreState.updatePreset.mockResolvedValue(true)
      const { result } = renderHook(() => usePresets())

      const updates = { name: 'Updated Name', tags: ['updated'] }

      await act(async () => {
        const success = await result.current.update('preset-1', updates)
        expect(success).toBe(true)
      })

      expect(mockStoreState.updatePreset).toHaveBeenCalledWith('preset-1', updates)
    })

    it('should delete a preset', async () => {
      mockStoreState.deletePreset.mockResolvedValue(true)
      const { result } = renderHook(() => usePresets())

      await act(async () => {
        const success = await result.current.delete('preset-1')
        expect(success).toBe(true)
      })

      expect(mockStoreState.deletePreset).toHaveBeenCalledWith('preset-1')
    })

    it('should duplicate a preset', async () => {
      mockStoreState.duplicatePreset.mockResolvedValue(true)
      const { result } = renderHook(() => usePresets())

      await act(async () => {
        const success = await result.current.duplicate('preset-1', 'Duplicate Name')
        expect(success).toBe(true)
      })

      expect(mockStoreState.duplicatePreset).toHaveBeenCalledWith('preset-1', 'Duplicate Name')
    })
  })

  describe('Utility Functions', () => {
    it('should get preset by ID', () => {
      const { result } = renderHook(() => usePresets())

      const preset = result.current.getById('preset-1')
      expect(preset).toEqual(samplePresets[0])

      const nonExistent = result.current.getById('non-existent')
      expect(nonExistent).toBeNull()
    })

    it('should get preset by name', () => {
      const { result } = renderHook(() => usePresets())

      const preset = result.current.getByName('Test Preset 1')
      expect(preset).toEqual(samplePresets[0])

      const caseInsensitive = result.current.getByName('test preset 1')
      expect(caseInsensitive).toEqual(samplePresets[0])

      const nonExistent = result.current.getByName('Non Existent')
      expect(nonExistent).toBeNull()
    })

    it('should find presets by tag', () => {
      const { result } = renderHook(() => usePresets())

      const tag1Presets = result.current.findByTag('tag1')
      expect(tag1Presets).toHaveLength(1)
      expect(tag1Presets[0]).toEqual(samplePresets[0])

      const tag2Presets = result.current.findByTag('tag2')
      expect(tag2Presets).toHaveLength(2)

      const nonExistentTag = result.current.findByTag('non-existent')
      expect(nonExistentTag).toHaveLength(0)
    })

    it('should find presets by category', () => {
      const { result } = renderHook(() => usePresets())

      const customPresets = result.current.findByCategory('custom')
      expect(customPresets).toHaveLength(1)
      expect(customPresets[0]).toEqual(samplePresets[0])

      const qualityPresets = result.current.findByCategory('quality')
      expect(qualityPresets).toHaveLength(1)
      expect(qualityPresets[0]).toEqual(samplePresets[1])
    })

    it('should get recent presets', () => {
      const { result } = renderHook(() => usePresets())

      const recent = result.current.getRecent(1)
      expect(recent).toHaveLength(1)
      expect(recent[0]).toEqual(samplePresets[1]) // Most recently modified

      const allRecent = result.current.getRecent()
      expect(allRecent).toHaveLength(2)
    })
  })

  describe('Computed Properties', () => {
    it('should calculate total count', () => {
      const { result } = renderHook(() => usePresets())
      expect(result.current.totalCount).toBe(2)
    })

    it('should calculate custom count', () => {
      const { result } = renderHook(() => usePresets())
      expect(result.current.customCount).toBe(1)
    })

    it('should calculate default count', () => {
      const { result } = renderHook(() => usePresets())
      expect(result.current.defaultCount).toBe(1)
    })

    it('should get categories', () => {
      const { result } = renderHook(() => usePresets())
      expect(result.current.categories).toEqual(['custom', 'quality'])
    })

    it('should get all tags', () => {
      const { result } = renderHook(() => usePresets())
      expect(result.current.allTags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should detect empty state', () => {
      mockUsePresetStore.mockReturnValue({
        ...mockStoreState,
        presets: []
      })

      const { result } = renderHook(() => usePresets())
      expect(result.current.isEmpty).toBe(true)
    })

    it('should detect storage full state', () => {
      mockUsePresetStore.mockReturnValue({
        ...mockStoreState,
        storageUsage: 95
      })

      const { result } = renderHook(() => usePresets())
      expect(result.current.isStorageFull).toBe(true)
    })
  })

  describe('Batch Operations', () => {
    it('should batch delete presets', async () => {
      mockStoreState.deletePreset.mockResolvedValue(true)
      const { result } = renderHook(() => usePresets())

      await act(async () => {
        const deletedCount = await result.current.batchDelete(['preset-1', 'preset-2'])
        expect(deletedCount).toBe(2)
      })

      expect(mockStoreState.deletePreset).toHaveBeenCalledTimes(2)
    })

    it('should batch update presets', async () => {
      mockStoreState.updatePreset.mockResolvedValue(true)
      const { result } = renderHook(() => usePresets())

      const updates = [
        { id: 'preset-1', updates: { name: 'Updated 1' } },
        { id: 'preset-2', updates: { name: 'Updated 2' } }
      ]

      await act(async () => {
        const updatedCount = await result.current.batchUpdate(updates)
        expect(updatedCount).toBe(2)
      })

      expect(mockStoreState.updatePreset).toHaveBeenCalledTimes(2)
    })

    it('should batch export presets', async () => {
      mockStoreState.exportSelectedPresets.mockResolvedValue('exported-data')
      const { result } = renderHook(() => usePresets())

      await act(async () => {
        const data = await result.current.batchExport(['preset-1', 'preset-2'])
        expect(data).toBe('exported-data')
      })

      expect(mockStoreState.exportSelectedPresets).toHaveBeenCalledWith(['preset-1', 'preset-2'])
    })
  })

  describe('Advanced Filtering', () => {
    it('should filter by date range', () => {
      const { result } = renderHook(() => usePresets())

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-03')

      const filtered = result.current.filterByDateRange(startDate, endDate)
      expect(filtered).toHaveLength(1)
      expect(filtered[0]).toEqual(samplePresets[0])
    })

    it('should filter by size', () => {
      const { result } = renderHook(() => usePresets())

      const filtered = result.current.filterBySize(1500, 3000)
      expect(filtered).toHaveLength(1)
      expect(filtered[0]).toEqual(samplePresets[1])
    })

    it('should sort presets', () => {
      const { result } = renderHook(() => usePresets())

      const sorted = result.current.sortBy('name', 'desc')
      expect(sorted).toHaveLength(2)
      expect(sorted[0].name).toBe('Test Preset 2')
      expect(sorted[1].name).toBe('Test Preset 1')
    })
  })

  describe('Error Handling', () => {
    it('should detect error state', () => {
      mockUsePresetStore.mockReturnValue({
        ...mockStoreState,
        lastError: 'Test error'
      })

      const { result } = renderHook(() => usePresets())
      expect(result.current.hasError).toBe(true)
      expect(result.current.lastError).toBe('Test error')
    })

    it('should clear errors', () => {
      const { result } = renderHook(() => usePresets())

      act(() => {
        result.current.clearError()
      })

      expect(mockStoreState.clearError).toHaveBeenCalled()
    })
  })
})

describe('Specialized Hooks', () => {
  const mockStoreState = {
    presets: samplePresets,
    activePreset: null,
    selectedPresetId: null,
    isLoadingPresets: false,
    storageInfo: null,
    storageUsage: 0,
    lastError: null,
    loadPresets: vi.fn(),
    setActivePreset: vi.fn(),
    setSelectedPresetId: vi.fn(),
    createPreset: vi.fn(),
    createPresetOptimistic: vi.fn(),
    updatePreset: vi.fn(),
    updatePresetOptimistic: vi.fn(),
    deletePreset: vi.fn(),
    deletePresetOptimistic: vi.fn(),
    duplicatePreset: vi.fn(),
    getStorageInfo: vi.fn(),
    refreshStorageUsage: vi.fn(),
    cleanupOldPresets: vi.fn(),
    optimizeStorage: vi.fn(),
    exportPreset: vi.fn(),
    exportAllPresets: vi.fn(),
    exportSelectedPresets: vi.fn(),
    importPreset: vi.fn(),
    importPresets: vi.fn(),
    bulkImportPresets: vi.fn(),
    searchPresets: vi.fn(),
    debouncedSearch: vi.fn(),
    clearError: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePresetStore.mockReturnValue(mockStoreState)
  })

  describe('usePresetSelection', () => {
    it('should provide selection functionality only', () => {
      const { result } = renderHook(() => usePresetSelection())

      expect(result.current).toHaveProperty('activePreset')
      expect(result.current).toHaveProperty('selectedPresetId')
      expect(result.current).toHaveProperty('setActive')
      expect(result.current).toHaveProperty('setSelected')
      expect(result.current).toHaveProperty('clearActive')
      expect(result.current).toHaveProperty('clearSelected')

      // Should not have CRUD operations
      expect(result.current).not.toHaveProperty('create')
      expect(result.current).not.toHaveProperty('delete')
    })
  })

  describe('usePresetCategories', () => {
    it('should provide category functionality only', () => {
      mockUsePresetStore.mockReturnValue({
        ...mockStoreState,
        presets: samplePresets
      })

      const { result } = renderHook(() => usePresetCategories())

      expect(result.current).toHaveProperty('categories')
      expect(result.current).toHaveProperty('allTags')
      expect(result.current).toHaveProperty('findByCategory')
      expect(result.current).toHaveProperty('findByTag')
      expect(result.current).toHaveProperty('sortBy')

      // Should not have CRUD operations
      expect(result.current).not.toHaveProperty('create')
      expect(result.current).not.toHaveProperty('delete')
    })
  })

  describe('usePresetStorage', () => {
    it('should provide storage functionality only', () => {
      const { result } = renderHook(() => usePresetStorage())

      expect(result.current).toHaveProperty('storageInfo')
      expect(result.current).toHaveProperty('storageUsage')
      expect(result.current).toHaveProperty('isStorageFull')
      expect(result.current).toHaveProperty('getStorageInfo')
      expect(result.current).toHaveProperty('refreshStorage')
      expect(result.current).toHaveProperty('cleanup')
      expect(result.current).toHaveProperty('optimize')

      // Should not have CRUD operations
      expect(result.current).not.toHaveProperty('create')
      expect(result.current).not.toHaveProperty('delete')
    })
  })

  describe('usePresetImportExport', () => {
    it('should provide import/export functionality only', () => {
      const { result } = renderHook(() => usePresetImportExport())

      expect(result.current).toHaveProperty('exportPreset')
      expect(result.current).toHaveProperty('exportAll')
      expect(result.current).toHaveProperty('exportSelected')
      expect(result.current).toHaveProperty('importPreset')
      expect(result.current).toHaveProperty('importPresets')
      expect(result.current).toHaveProperty('bulkImport')
      expect(result.current).toHaveProperty('batchExport')

      // Should not have other operations
      expect(result.current).not.toHaveProperty('create')
      expect(result.current).not.toHaveProperty('delete')
      expect(result.current).not.toHaveProperty('setActive')
    })
  })
})