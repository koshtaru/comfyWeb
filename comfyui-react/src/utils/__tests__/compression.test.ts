// ============================================================================
// ComfyUI React - Compression Service Tests
// ============================================================================

import { compressionService, CompressionLevel } from '../compression'
import type { ComfyUIWorkflow } from '@/types'

// Mock LZ-string
jest.mock('lz-string', () => ({
  compress: jest.fn((str: string) => `compressed_${str.slice(0, 10)}`),
  decompress: jest.fn((str: string) => str.replace('compressed_', '')),
  compressToUTF16: jest.fn((str: string) => `utf16_${str.slice(0, 10)}`),
  decompressFromUTF16: jest.fn((str: string) => str.replace('utf16_', '')),
}))

describe('CompressionService', () => {
  const mockWorkflow: ComfyUIWorkflow = {
    nodes: {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {
          ckpt_name: 'model.safetensors'
        }
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'beautiful landscape',
          clip: ['1', 1]
        }
      }
    },
    links: [],
    groups: [],
    config: {},
    extra: {},
    version: 0.4
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('compressWorkflow', () => {
    it('should compress small workflows with NONE level', async () => {
      const smallWorkflow = { ...mockWorkflow }
      const result = await compressionService.compressWorkflow(smallWorkflow)

      expect(result.level).toBe(CompressionLevel.NONE)
      expect(result.algorithm).toBe('base64')
      expect(result.compressed).toBeTruthy()
      expect(result.originalSize).toBeGreaterThan(0)
      expect(result.compressedSize).toBeGreaterThan(0)
    })

    it('should use BASIC compression for medium workflows', async () => {
      // Create a larger workflow to trigger BASIC compression
      const largeWorkflow = { 
        ...mockWorkflow,
        nodes: {
          ...mockWorkflow.nodes,
          // Add many nodes to increase size
          ...Array.from({ length: 50 }, (_, i) => ({
            [`node_${i}`]: {
              class_type: 'TestNode',
              inputs: {
                value: `test_value_${i}`.repeat(20)
              }
            }
          })).reduce((acc, obj) => ({ ...acc, ...obj }), {})
        }
      }

      const result = await compressionService.compressWorkflow(largeWorkflow)
      
      expect(result.level).toBe(CompressionLevel.BASIC)
      expect(result.algorithm).toBe('lzstring')
      expect(result.compressed).toBeTruthy()
    })

    it('should handle compression errors gracefully', async () => {
      const LZString = require('lz-string')
      LZString.compress.mockImplementationOnce(() => {
        throw new Error('Compression failed')
      })

      const result = await compressionService.compressWorkflow(mockWorkflow)
      
      // Should fallback to base64
      expect(result.level).toBe(CompressionLevel.NONE)
      expect(result.algorithm).toBe('base64')
    })

    it('should calculate compression ratio correctly', async () => {
      const result = await compressionService.compressWorkflow(mockWorkflow)
      
      expect(result.ratio).toBeGreaterThan(0)
      expect(result.ratio).toBeLessThanOrEqual(1)
      expect(result.ratio).toBe(result.compressedSize / result.originalSize)
    })
  })

  describe('decompressWorkflow', () => {
    it('should decompress base64 compressed data', async () => {
      const compressed = await compressionService.compressWorkflow(mockWorkflow)
      const decompressed = await compressionService.decompressWorkflow(compressed.compressed, compressed.algorithm)
      
      expect(decompressed).toEqual(mockWorkflow)
    })

    it('should decompress LZ-string compressed data', async () => {
      const LZString = require('lz-string')
      const compressedData = 'compressed_test_data'
      
      const result = await compressionService.decompressWorkflow(compressedData, 'lzstring')
      
      expect(LZString.decompress).toHaveBeenCalledWith(compressedData)
      expect(result).toBeDefined()
    })

    it('should handle decompression errors', async () => {
      const LZString = require('lz-string')
      LZString.decompress.mockImplementationOnce(() => null)

      await expect(
        compressionService.decompressWorkflow('invalid_data', 'lzstring')
      ).rejects.toThrow('Decompression failed')
    })

    it('should handle invalid JSON after decompression', async () => {
      const LZString = require('lz-string')
      LZString.decompress.mockImplementationOnce(() => 'invalid json')

      await expect(
        compressionService.decompressWorkflow('compressed_invalid', 'lzstring')
      ).rejects.toThrow('Invalid workflow data')
    })
  })

  describe('analyzeWorkflow', () => {
    it('should analyze workflow size correctly', () => {
      const analysis = compressionService.analyzeWorkflow(mockWorkflow)
      
      expect(analysis.sizeBytes).toBeGreaterThan(0)
      expect(analysis.complexity.nodeCount).toBe(2)
      expect(analysis.complexity.connectionCount).toBe(0)
      expect(analysis.recommendedLevel).toBeDefined()
    })

    it('should recommend appropriate compression levels', () => {
      // Small workflow
      const smallAnalysis = compressionService.analyzeWorkflow(mockWorkflow)
      expect(smallAnalysis.recommendedLevel).toBe(CompressionLevel.NONE)

      // Large workflow
      const largeWorkflow = {
        ...mockWorkflow,
        nodes: Array.from({ length: 100 }, (_, i) => ({
          [`node_${i}`]: {
            class_type: 'TestNode',
            inputs: { value: 'test'.repeat(100) }
          }
        })).reduce((acc, obj) => ({ ...acc, ...obj }), {})
      }
      
      const largeAnalysis = compressionService.analyzeWorkflow(largeWorkflow)
      expect(largeAnalysis.recommendedLevel).toBeGreaterThan(CompressionLevel.NONE)
    })

    it('should calculate complexity metrics', () => {
      const analysis = compressionService.analyzeWorkflow(mockWorkflow)
      
      expect(analysis.complexity).toMatchObject({
        nodeCount: expect.any(Number),
        connectionCount: expect.any(Number),
        averageInputsPerNode: expect.any(Number),
        maxDepth: expect.any(Number)
      })
    })
  })

  describe('getCompressionStats', () => {
    it('should return current compression statistics', () => {
      const stats = compressionService.getCompressionStats()
      
      expect(stats).toMatchObject({
        totalOperations: expect.any(Number),
        totalOriginalSize: expect.any(Number),
        totalCompressedSize: expect.any(Number),
        averageRatio: expect.any(Number),
        algorithmUsage: expect.any(Object)
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty workflows', async () => {
      const emptyWorkflow = { nodes: {}, links: [], groups: [], config: {}, extra: {}, version: 0.4 }
      const result = await compressionService.compressWorkflow(emptyWorkflow)
      
      expect(result.compressed).toBeTruthy()
      expect(result.level).toBe(CompressionLevel.NONE)
    })

    it('should handle workflows with circular references safely', async () => {
      const circularWorkflow: any = { ...mockWorkflow }
      circularWorkflow.self = circularWorkflow // Create circular reference
      
      // Should not throw due to JSON serialization handling
      const result = await compressionService.compressWorkflow(circularWorkflow)
      expect(result).toBeDefined()
    })

    it('should handle very large workflows with chunking', async () => {
      // Create a workflow that exceeds 100KB to trigger chunking
      const hugeWorkflow = {
        ...mockWorkflow,
        nodes: Array.from({ length: 1000 }, (_, i) => ({
          [`node_${i}`]: {
            class_type: 'TestNode',
            inputs: {
              large_data: 'x'.repeat(200) // 200 chars per node = ~200KB total
            }
          }
        })).reduce((acc, obj) => ({ ...acc, ...obj }), {})
      }

      const result = await compressionService.compressWorkflow(hugeWorkflow)
      expect(result.level).toBe(CompressionLevel.CHUNKED)
      expect(result.chunks).toBeGreaterThan(1)
    })
  })

  describe('performance', () => {
    it('should compress workflows within reasonable time', async () => {
      const start = Date.now()
      await compressionService.compressWorkflow(mockWorkflow)
      const duration = Date.now() - start
      
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should maintain compression ratio consistency', async () => {
      const results = []
      
      // Run compression multiple times
      for (let i = 0; i < 5; i++) {
        const result = await compressionService.compressWorkflow(mockWorkflow)
        results.push(result.ratio)
      }
      
      // All ratios should be identical for same input
      const firstRatio = results[0]
      results.forEach(ratio => {
        expect(ratio).toBe(firstRatio)
      })
    })
  })
})