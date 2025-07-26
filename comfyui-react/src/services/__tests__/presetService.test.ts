// ============================================================================
// ComfyUI React - PresetService Unit Tests
// ============================================================================

import { PresetService } from '../presetService'
import type { ComfyUIWorkflow, IPresetCreateInput, IPresetServiceConfig } from '@/types'

// Mock localStorage
const mockLocalStorage = {
  storage: new Map<string, string>(),
  getItem: jest.fn((key: string) => mockLocalStorage.storage.get(key) || null),
  setItem: jest.fn((key: string, value: string) => {
    mockLocalStorage.storage.set(key, value)
  }),
  removeItem: jest.fn((key: string) => {
    mockLocalStorage.storage.delete(key)
  }),
  clear: jest.fn(() => {
    mockLocalStorage.storage.clear()
  }),
  key: jest.fn((index: number) => {
    const keys = Array.from(mockLocalStorage.storage.keys())
    return keys[index] || null
  }),
  get length() {
    return mockLocalStorage.storage.size
  },
}

// Mock compression service
jest.mock('@/utils/compression', () => ({
  compressionService: {
    compressWorkflow: jest.fn(async (workflow) => ({
      data: btoa(JSON.stringify(workflow)),
      compressed: false,
      originalSize: JSON.stringify(workflow).length,
      compressedSize: JSON.stringify(workflow).length,
      ratio: 1.0,
    })),
    decompressWorkflow: jest.fn(async (data, isCompressed) => {
      return JSON.parse(atob(data))
    }),
  },
}))

// Set up global mocks
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('PresetService', () => {
  let presetService: PresetService
  let mockWorkflow: ComfyUIWorkflow
  let mockPresetInput: IPresetCreateInput

  beforeEach(() => {
    // Clear localStorage mock
    mockLocalStorage.storage.clear()
    jest.clearAllMocks()

    // Create fresh service instance
    const config: Partial<IPresetServiceConfig> = {
      storage: {
        storageKey: 'test-presets',
        maxPresets: 10,
        maxTotalSize: 1024 * 1024, // 1MB
        compressionThreshold: 100,
        autoCleanup: false,
        backupCount: 3,
      },
    }
    presetService = new PresetService(config)

    // Mock workflow data
    mockWorkflow = {
      '1': {
        inputs: { ckpt_name: 'test_model.safetensors' },
        class_type: 'CheckpointLoaderSimple',
      },
      '2': {
        inputs: { text: 'test prompt', clip: ['1', 1] },
        class_type: 'CLIPTextEncode',
      },
    }

    // Mock preset input
    mockPresetInput = {
      name: 'Test Preset',
      workflowData: mockWorkflow,
      metadata: {
        model: {
          name: 'test_model',
          architecture: 'SD1.5',
        },
        generation: {
          steps: 20,
          cfg: 7.0,
          sampler: 'euler',
          scheduler: 'normal',
          seed: 12345,
          denoise: 1.0,
        },
        dimensions: {
          width: 512,
          height: 512,
          batchSize: 1,
        },
        prompts: {
          positive: 'test prompt',
          negative: 'bad quality',
        },
      },
      tags: ['test'],
      category: 'custom',
    }
  })

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await expect(presetService.initialize()).resolves.not.toThrow()
    })

    it('should not initialize twice', async () => {
      await presetService.initialize()
      await expect(presetService.initialize()).resolves.not.toThrow()
    })
  })

  describe('CRUD Operations', () => {
    beforeEach(async () => {
      await presetService.initialize()
    })

    describe('savePreset', () => {
      it('should save a valid preset successfully', async () => {
        const result = await presetService.savePreset(mockPresetInput)

        expect(result.success).toBe(true)
        expect(result.preset).toBeDefined()
        expect(result.preset!.name).toBe('Test Preset')
        expect(result.preset!.metadata.model.name).toBe('test_model')
      })

      it('should reject preset with empty name', async () => {
        const invalidInput = { ...mockPresetInput, name: '' }
        const result = await presetService.savePreset(invalidInput)

        expect(result.success).toBe(false)
        expect(result.error).toContain('name is required')
      })

      it('should reject preset with empty workflow', async () => {
        const invalidInput = { ...mockPresetInput, workflowData: {} }
        const result = await presetService.savePreset(invalidInput)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Workflow data is required')
      })

      it('should prevent duplicate names when configured', async () => {
        await presetService.savePreset(mockPresetInput)
        const duplicateInput = { ...mockPresetInput, name: 'Test Preset' }
        const result = await presetService.savePreset(duplicateInput)

        expect(result.success).toBe(false)
        expect(result.error).toContain('already exists')
      })
    })

    describe('loadPreset', () => {
      it('should load existing preset', async () => {
        const saveResult = await presetService.savePreset(mockPresetInput)
        const presetId = saveResult.preset!.id

        const loadedPreset = await presetService.loadPreset(presetId)

        expect(loadedPreset).toBeDefined()
        expect(loadedPreset!.name).toBe('Test Preset')
        expect(loadedPreset!.workflowData).toEqual(mockWorkflow)
      })

      it('should return null for non-existent preset', async () => {
        const result = await presetService.loadPreset('non-existent-id')
        expect(result).toBeNull()
      })

      it('should use cache for repeated loads', async () => {
        const saveResult = await presetService.savePreset(mockPresetInput)
        const presetId = saveResult.preset!.id

        // First load
        await presetService.loadPreset(presetId)
        
        // Second load should use cache
        const cachedResult = await presetService.loadPreset(presetId)
        
        expect(cachedResult).toBeDefined()
        expect(mockLocalStorage.getItem).toHaveBeenCalledTimes(1) // Only called once due to caching
      })
    })

    describe('deletePreset', () => {
      it('should delete existing preset', async () => {
        const saveResult = await presetService.savePreset(mockPresetInput)
        const presetId = saveResult.preset!.id

        const deleteResult = await presetService.deletePreset(presetId)
        expect(deleteResult).toBe(true)

        const loadResult = await presetService.loadPreset(presetId)
        expect(loadResult).toBeNull()
      })

      it('should handle deletion of non-existent preset gracefully', async () => {
        const result = await presetService.deletePreset('non-existent-id')
        expect(result).toBe(true) // Should not throw error
      })
    })

    describe('listPresets', () => {
      beforeEach(async () => {
        // Create multiple test presets
        await presetService.savePreset({
          ...mockPresetInput,
          name: 'Preset A',
          tags: ['quality', 'test'],
        })
        await presetService.savePreset({
          ...mockPresetInput,
          name: 'Preset B',
          tags: ['speed', 'test'],
          category: 'speed',
        })
        await presetService.savePreset({
          ...mockPresetInput,
          name: 'Preset C',
          tags: ['style'],
          category: 'style',
        })
      })

      it('should list all presets', async () => {
        const presets = await presetService.listPresets()
        expect(presets).toHaveLength(3)
      })

      it('should filter by category', async () => {
        const speedPresets = await presetService.listPresets({ category: 'speed' })
        expect(speedPresets).toHaveLength(1)
        expect(speedPresets[0].name).toBe('Preset B')
      })

      it('should filter by tags', async () => {
        const testPresets = await presetService.listPresets({ tags: ['test'] })
        expect(testPresets).toHaveLength(2)
      })

      it('should search by query', async () => {
        const searchResults = await presetService.listPresets({ query: 'Preset A' })
        expect(searchResults).toHaveLength(1)
        expect(searchResults[0].name).toBe('Preset A')
      })

      it('should sort presets', async () => {
        const presets = await presetService.listPresets({
          sortBy: 'name',
          sortOrder: 'asc',
        })
        expect(presets[0].name).toBe('Preset A')
        expect(presets[1].name).toBe('Preset B')
        expect(presets[2].name).toBe('Preset C')
      })

      it('should apply pagination', async () => {
        const firstPage = await presetService.listPresets({ limit: 2, offset: 0 })
        const secondPage = await presetService.listPresets({ limit: 2, offset: 2 })

        expect(firstPage).toHaveLength(2)
        expect(secondPage).toHaveLength(1)
      })
    })

    describe('updatePresetMetadata', () => {
      it('should update preset metadata', async () => {
        const saveResult = await presetService.savePreset(mockPresetInput)
        const presetId = saveResult.preset!.id

        const updateResult = await presetService.updatePresetMetadata(presetId, {
          name: 'Updated Preset',
          tags: ['updated'],
        })

        expect(updateResult.success).toBe(true)
        expect(updateResult.preset!.name).toBe('Updated Preset')
        expect(updateResult.preset!.tags).toEqual(['updated'])
      })

      it('should fail to update non-existent preset', async () => {
        const result = await presetService.updatePresetMetadata('non-existent-id', {
          name: 'Updated',
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('not found')
      })
    })
  })

  describe('Storage Management', () => {
    beforeEach(async () => {
      await presetService.initialize()
    })

    describe('getStorageInfo', () => {
      it('should return storage information', async () => {
        await presetService.savePreset(mockPresetInput)
        const storageInfo = await presetService.getStorageInfo()

        expect(storageInfo.presetCount).toBe(1)
        expect(storageInfo.totalSize).toBeGreaterThan(0)
        expect(storageInfo.compressionRatio).toBeDefined()
        expect(storageInfo.availableSpace).toBeDefined()
        expect(storageInfo.quotaUsagePercent).toBeDefined()
      })
    })

    describe('cleanupOldPresets', () => {
      it('should cleanup old presets', async () => {
        // Create multiple presets
        for (let i = 0; i < 5; i++) {
          await presetService.savePreset({
            ...mockPresetInput,
            name: `Preset ${i}`,
          })
          // Small delay to ensure different timestamps
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        const deletedCount = await presetService.cleanupOldPresets(3)
        expect(deletedCount).toBe(2)

        const remainingPresets = await presetService.listPresets()
        expect(remainingPresets).toHaveLength(3)
      })
    })
  })

  describe('Import/Export', () => {
    beforeEach(async () => {
      await presetService.initialize()
    })

    describe('exportPreset', () => {
      it('should export single preset', async () => {
        const saveResult = await presetService.savePreset(mockPresetInput)
        const presetId = saveResult.preset!.id

        const exportData = await presetService.exportPreset(presetId)
        const parsed = JSON.parse(exportData)

        expect(parsed.version).toBe('1.0.0')
        expect(parsed.preset).toBeDefined()
        expect(parsed.preset.name).toBe('Test Preset')
        expect(parsed.checksum).toBeDefined()
      })

      it('should fail to export non-existent preset', async () => {
        await expect(presetService.exportPreset('non-existent-id'))
          .rejects.toThrow('not found')
      })
    })

    describe('exportAllPresets', () => {
      it('should export all presets', async () => {
        await presetService.savePreset(mockPresetInput)
        await presetService.savePreset({
          ...mockPresetInput,
          name: 'Preset 2',
        })

        const exportData = await presetService.exportAllPresets()
        const parsed = JSON.parse(exportData)

        expect(parsed.version).toBe('1.0.0')
        expect(parsed.presets).toHaveLength(2)
        expect(parsed.metadata.totalCount).toBe(2)
      })
    })

    describe('importPreset', () => {
      it('should import valid preset', async () => {
        const saveResult = await presetService.savePreset(mockPresetInput)
        const exportData = await presetService.exportPreset(saveResult.preset!.id)

        // Clear presets and import
        await presetService.deletePreset(saveResult.preset!.id)
        const importResult = await presetService.importPreset(exportData)

        expect(importResult.success).toBe(true)
        expect(importResult.imported).toHaveLength(1)
        expect(importResult.imported[0].name).toContain('(Imported)')
      })

      it('should reject invalid import data', async () => {
        const result = await presetService.importPreset('invalid json')

        expect(result.success).toBe(false)
        expect(result.errors).toContain('Invalid import data')
      })
    })

    describe('importPresets', () => {
      it('should import multiple presets', async () => {
        await presetService.savePreset(mockPresetInput)
        await presetService.savePreset({ ...mockPresetInput, name: 'Preset 2' })

        const exportData = await presetService.exportAllPresets()
        
        // Clear and import
        const allPresets = await presetService.listPresets()
        for (const preset of allPresets) {
          await presetService.deletePreset(preset.id)
        }

        const importResult = await presetService.importPresets(exportData)

        expect(importResult.success).toBe(true)
        expect(importResult.imported).toHaveLength(2)

        const importedPresets = await presetService.listPresets()
        expect(importedPresets).toHaveLength(2)
      })

      it('should replace existing presets when requested', async () => {
        await presetService.savePreset(mockPresetInput)
        
        const exportData = await presetService.exportAllPresets()
        await presetService.savePreset({ ...mockPresetInput, name: 'New Preset' })

        const importResult = await presetService.importPresets(exportData, true)

        expect(importResult.success).toBe(true)
        
        const finalPresets = await presetService.listPresets()
        expect(finalPresets.some(p => p.name === 'New Preset')).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await presetService.initialize()
    })

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw error
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })

      const result = await presetService.savePreset(mockPresetInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle corrupted data gracefully', async () => {
      // Manually add corrupted data to storage
      mockLocalStorage.storage.set('test-presets_corrupt', 'invalid json')

      // Should not throw when loading presets
      await expect(presetService.listPresets()).resolves.not.toThrow()
    })
  })
})