// ============================================================================
// ComfyUI React - Storage Monitor Service Tests
// ============================================================================

import { StorageMonitorService } from '../storageMonitor'
import type { IPreset } from '@/types/preset'

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}

// Mock navigator.storage
const mockStorageEstimate = {
  quota: 1000000000, // 1GB
  usage: 500000000,  // 500MB
  usageDetails: {
    localStorage: 100000000 // 100MB
  }
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: jest.fn().mockResolvedValue(mockStorageEstimate)
  },
  writable: true
})

describe('StorageMonitorService', () => {
  let storageMonitor: StorageMonitorService
  const mockPresets: IPreset[] = [
    {
      id: 'preset1',
      name: 'Test Preset 1',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-15'),
      workflowData: { nodes: {}, links: [], groups: [], config: {}, extra: {}, version: 0.4 },
      metadata: {
        model: { name: 'test-model', architecture: 'SD1.5' },
        generation: { steps: 20, cfg: 7, sampler: 'euler', scheduler: 'normal', seed: 123 },
        dimensions: { width: 512, height: 512, batchSize: 1 },
        prompts: { positive: 'test', negative: '' }
      },
      compressed: true,
      size: 50000, // 50KB
      tags: ['test'],
      category: 'custom',
      version: '1.0.0'
    },
    {
      id: 'preset2', 
      name: 'Large Preset',
      createdAt: new Date('2024-01-01'),
      lastModified: new Date('2024-01-01'), // Not modified recently
      workflowData: { nodes: {}, links: [], groups: [], config: {}, extra: {}, version: 0.4 },
      metadata: {
        model: { name: 'large-model', architecture: 'SDXL' },
        generation: { steps: 30, cfg: 8, sampler: 'dpmpp_2m', scheduler: 'karras', seed: 456 },
        dimensions: { width: 1024, height: 1024, batchSize: 1 },
        prompts: { positive: 'large test', negative: 'bad' }
      },
      compressed: false,
      size: 200000, // 200KB
      tags: ['large'],
      category: 'quality',
      version: '1.0.0'
    }
  ]

  beforeEach(() => {
    storageMonitor = new StorageMonitorService()
    jest.clearAllMocks()
    
    // Mock usage tracker data
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key.includes('usage-tracker')) {
        return JSON.stringify({
          preset1: { useCount: 10, lastUsed: new Date().toISOString(), firstUsed: new Date('2024-01-01').toISOString() },
          preset2: { useCount: 2, lastUsed: new Date('2024-01-01').toISOString(), firstUsed: new Date('2024-01-01').toISOString() }
        })
      }
      return null
    })
  })

  describe('getStorageMetrics', () => {
    it('should return storage metrics when navigator.storage is available', async () => {
      const metrics = await storageMonitor.getStorageMetrics()
      
      expect(metrics).toMatchObject({
        quota: 1000000000,
        usage: 500000000,
        usagePercent: 50,
        available: 500000000,
        localStorageUsage: 100000000
      })
    })

    it('should return fallback metrics when navigator.storage is unavailable', async () => {
      // Temporarily remove navigator.storage
      const originalStorage = navigator.storage
      delete (navigator as any).storage
      
      const metrics = await storageMonitor.getStorageMetrics()
      
      expect(metrics.quota).toBe(50 * 1024 * 1024) // 50MB fallback
      expect(metrics.usagePercent).toBe(0)
      
      // Restore navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: originalStorage,
        writable: true
      })
    })

    it('should handle storage estimate errors gracefully', async () => {
      const mockError = new Error('Storage API error')
      ;(navigator.storage.estimate as jest.Mock).mockRejectedValueOnce(mockError)
      
      const metrics = await storageMonitor.getStorageMetrics()
      
      expect(metrics.quota).toBe(50 * 1024 * 1024) // Should use fallback
    })
  })

  describe('analyzePresetStorage', () => {
    it('should analyze preset storage correctly', async () => {
      const analysis = await storageMonitor.analyzePresetStorage(mockPresets)
      
      expect(analysis.totalSize).toBe(250000) // 50KB + 200KB
      expect(analysis.presetCount).toBe(2)
      expect(analysis.compressionRatio).toBeCloseTo(0.5) // 50% compression
      expect(analysis.quotaUsagePercent).toBe(50) // Based on mock storage
      expect(analysis.needsCleanup).toBe(false) // Under 75% threshold
    })

    it('should identify when cleanup is needed', async () => {
      // Mock high storage usage
      ;(navigator.storage.estimate as jest.Mock).mockResolvedValueOnce({
        quota: 1000000,
        usage: 900000, // 90% usage
        usageDetails: { localStorage: 800000 }
      })
      
      const analysis = await storageMonitor.analyzePresetStorage(mockPresets)
      
      expect(analysis.needsCleanup).toBe(true)
      expect(analysis.quotaUsagePercent).toBe(90)
    })

    it('should handle empty preset arrays', async () => {
      const analysis = await storageMonitor.analyzePresetStorage([])
      
      expect(analysis.totalSize).toBe(0)
      expect(analysis.presetCount).toBe(0)
      expect(analysis.compressionRatio).toBe(1)
    })
  })

  describe('generateStorageAnalysis', () => {
    it('should generate comprehensive storage analysis', async () => {
      const analysis = await storageMonitor.generateStorageAnalysis(mockPresets)
      
      expect(analysis.storageMetrics).toBeDefined()
      expect(analysis.presetAnalysis).toBeDefined()
      expect(analysis.optimizationRecommendations).toBeInstanceOf(Array)
      expect(analysis.cleanupSuggestions).toBeInstanceOf(Array)
      expect(analysis.compressionOpportunities).toBeInstanceOf(Array)
      expect(analysis.largestPresets).toBeInstanceOf(Array)
    })

    it('should identify compression opportunities', async () => {
      const analysis = await storageMonitor.generateStorageAnalysis(mockPresets)
      
      // preset2 is uncompressed and large, should be flagged
      const opportunities = analysis.compressionOpportunities
      expect(opportunities.length).toBeGreaterThan(0)
      
      const largePresetOpportunity = opportunities.find(op => op.id === 'preset2')
      expect(largePresetOpportunity).toBeDefined()
      expect(largePresetOpportunity?.potentialSavings).toBeGreaterThan(0)
    })

    it('should suggest cleanup for unused presets', async () => {
      const analysis = await storageMonitor.generateStorageAnalysis(mockPresets)
      
      const cleanupSuggestions = analysis.cleanupSuggestions
      
      // preset2 has low usage and old modification date
      const unusedPreset = cleanupSuggestions.find(s => s.id === 'preset2')
      expect(unusedPreset?.priority).toBe('medium')
      expect(unusedPreset?.reason).toContain('low usage')
    })

    it('should provide optimization recommendations', async () => {
      // Mock high storage usage to trigger recommendations
      ;(navigator.storage.estimate as jest.Mock).mockResolvedValueOnce({
        quota: 1000000,
        usage: 850000, // 85% usage
        usageDetails: { localStorage: 800000 }
      })
      
      const analysis = await storageMonitor.generateStorageAnalysis(mockPresets)
      
      expect(analysis.optimizationRecommendations.length).toBeGreaterThan(0)
      expect(analysis.optimizationRecommendations.some(r => 
        r.includes('storage usage is high')
      )).toBe(true)
    })
  })

  describe('usage tracking', () => {
    it('should record preset usage', () => {
      storageMonitor.recordPresetUsage('preset1')
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled()
      const setItemCall = mockLocalStorage.setItem.mock.calls.find(call => 
        call[0].includes('usage-tracker')
      )
      expect(setItemCall).toBeDefined()
    })

    it('should export usage analytics', () => {
      const analytics = storageMonitor.exportUsageAnalytics()
      
      expect(analytics).toMatchObject({
        totalTrackedPresets: expect.any(Number),
        usageStatistics: {
          totalUses: expect.any(Number),
          averageUseCount: expect.any(Number),
          activePresets: expect.any(Number)
        },
        mostUsedPresets: expect.any(Array),
        leastUsedPresets: expect.any(Array),
        usageByPeriod: expect.any(Object)
      })
    })

    it('should identify active presets within 30 days', () => {
      const analytics = storageMonitor.exportUsageAnalytics()
      
      // preset1 was used recently, preset2 was not
      expect(analytics.usageStatistics.activePresets).toBe(1)
    })

    it('should sort presets by usage correctly', () => {
      const analytics = storageMonitor.exportUsageAnalytics()
      
      expect(analytics.mostUsedPresets[0]?.presetId).toBe('preset1') // Higher usage
      expect(analytics.leastUsedPresets[0]?.presetId).toBe('preset2') // Lower usage
    })
  })

  describe('cleanup management', () => {
    it('should suggest cleanup based on storage pressure', async () => {
      // Mock critical storage usage
      ;(navigator.storage.estimate as jest.Mock).mockResolvedValueOnce({
        quota: 1000000,
        usage: 950000, // 95% usage - critical
        usageDetails: { localStorage: 900000 }
      })
      
      const analysis = await storageMonitor.generateStorageAnalysis(mockPresets)
      const suggestions = analysis.cleanupSuggestions
      
      // Should suggest more aggressive cleanup under storage pressure
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.priority === 'high')).toBe(true)
    })

    it('should calculate potential savings correctly', async () => {
      const analysis = await storageMonitor.generateStorageAnalysis(mockPresets)
      
      analysis.cleanupSuggestions.forEach(suggestion => {
        expect(suggestion.potentialSavings).toBeGreaterThan(0)
        expect(typeof suggestion.potentialSavings).toBe('number')
      })
    })
  })

  describe('error handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('LocalStorage error')
      })
      
      expect(() => storageMonitor.exportUsageAnalytics()).not.toThrow()
    })

    it('should handle invalid usage tracker data', () => {
      mockLocalStorage.getItem.mockReturnValueOnce('invalid json')
      
      const analytics = storageMonitor.exportUsageAnalytics()
      expect(analytics.totalTrackedPresets).toBe(0)
    })

    it('should handle storage API failures', async () => {
      ;(navigator.storage.estimate as jest.Mock).mockRejectedValue(new Error('API failure'))
      
      const metrics = await storageMonitor.getStorageMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.quota).toBe(50 * 1024 * 1024) // Fallback value
    })
  })

  describe('performance', () => {
    it('should analyze large preset collections efficiently', async () => {
      const largePresetCollection = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPresets[0],
        id: `preset_${i}`,
        name: `Preset ${i}`,
        size: Math.floor(Math.random() * 100000) + 10000
      }))
      
      const start = Date.now()
      const analysis = await storageMonitor.generateStorageAnalysis(largePresetCollection)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(analysis.presetAnalysis.presetCount).toBe(1000)
    })

    it('should limit cleanup suggestions to prevent UI overload', async () => {
      const manyPresets = Array.from({ length: 500 }, (_, i) => ({
        ...mockPresets[1], // Use the less-used preset as template
        id: `unused_preset_${i}`,
        name: `Unused Preset ${i}`
      }))
      
      const analysis = await storageMonitor.generateStorageAnalysis(manyPresets)
      
      // Should limit suggestions to reasonable number
      expect(analysis.cleanupSuggestions.length).toBeLessThanOrEqual(50)
    })
  })
})