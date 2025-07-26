// ============================================================================
// ComfyUI React - Enhanced Compression Service with LZ-string
// ============================================================================

import LZString from 'lz-string'
import type { ComfyUIWorkflow } from '@/types'
import type { ICompressionOptions } from '@/types/preset'
import { chunkManager } from './chunkManager'

// Compression levels based on data size
export enum CompressionLevel {
  NONE = 0,        // < 1KB - No compression, just base64
  BASIC = 1,       // 1KB-50KB - LZ-string standard compression
  ENHANCED = 2,    // 50KB-100KB - LZ-string UTF16 compression
  CHUNKED = 3      // > 100KB - Chunked compression
}

// Default compression configuration
const DEFAULT_COMPRESSION_OPTIONS: ICompressionOptions = {
  algorithm: 'lzstring',
  level: 6,
  threshold: 1024, // 1KB
  maxSize: 5 * 1024 * 1024, // 5MB
  chunkSize: 50 * 1024, // 50KB chunks for large data
}

// Chunk metadata for large workflows
export interface ChunkMetadata {
  id: string
  presetId: string
  chunkIndex: number
  totalChunks: number
  data: string
  checksum: string
  compressed: boolean
}

// Compression result with enhanced metadata
export interface CompressionResult {
  data: string | ChunkMetadata[]
  compressed: boolean
  compressionLevel: CompressionLevel
  originalSize: number
  compressedSize: number
  ratio: number
  isChunked: boolean
  chunkCount?: number
}

/**
 * Enhanced compression service with LZ-string and chunking support
 * Provides progressive compression levels based on data size
 */
export class CompressionService {
  private options: ICompressionOptions

  constructor(options: Partial<ICompressionOptions> = {}) {
    this.options = { ...DEFAULT_COMPRESSION_OPTIONS, ...options }
  }

  /**
   * Determine optimal compression level based on data size
   */
  private getCompressionLevel(size: number): CompressionLevel {
    if (size < this.options.threshold) return CompressionLevel.NONE
    if (size < 50 * 1024) return CompressionLevel.BASIC
    if (size < 100 * 1024) return CompressionLevel.ENHANCED
    return CompressionLevel.CHUNKED
  }

  /**
   * Calculate simple checksum for data integrity
   */
  private calculateChecksum(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Compress workflow data with progressive compression levels
   */
  async compressWorkflow(workflow: ComfyUIWorkflow): Promise<CompressionResult> {
    const jsonString = JSON.stringify(workflow)
    const originalSize = new Blob([jsonString]).size
    const compressionLevel = this.getCompressionLevel(originalSize)

    // Level 0: No compression for small data
    if (compressionLevel === CompressionLevel.NONE) {
      const encoded = btoa(jsonString)
      return {
        data: encoded,
        compressed: false,
        compressionLevel,
        originalSize,
        compressedSize: originalSize,
        ratio: 1.0,
        isChunked: false,
      }
    }

    try {
      let compressedData: string
      let compressedSize: number

      // Level 1: Basic LZ-string compression
      if (compressionLevel === CompressionLevel.BASIC) {
        compressedData = LZString.compressToBase64(jsonString)
        compressedSize = new Blob([compressedData]).size
        
        return {
          data: compressedData,
          compressed: true,
          compressionLevel,
          originalSize,
          compressedSize,
          ratio: compressedSize / originalSize,
          isChunked: false,
        }
      }

      // Level 2: Enhanced UTF16 compression for better ratio
      if (compressionLevel === CompressionLevel.ENHANCED) {
        compressedData = LZString.compressToUTF16(jsonString)
        // Convert to base64 for storage compatibility
        compressedData = btoa(unescape(encodeURIComponent(compressedData)))
        compressedSize = new Blob([compressedData]).size
        
        return {
          data: compressedData,
          compressed: true,
          compressionLevel,
          originalSize,
          compressedSize,
          ratio: compressedSize / originalSize,
          isChunked: false,
        }
      }

      // Level 3: Chunked compression for large workflows
      if (compressionLevel === CompressionLevel.CHUNKED) {
        const presetId = (workflow as unknown as { id?: string }).id || `temp_${Date.now()}`
        const chunks = await this.createChunks(jsonString, presetId)
        const totalCompressedSize = chunks.reduce((sum, chunk) => 
          sum + new Blob([chunk.data]).size, 0
        )
        
        // Store chunks in ChunkManager for persistence
        if ((workflow as unknown as { id?: string }).id) {
          try {
            await chunkManager.storeChunks(presetId, chunks)
          } catch (error) {
            console.warn('Failed to store chunks in ChunkManager:', error)
          }
        }
        
        return {
          data: chunks,
          compressed: true,
          compressionLevel,
          originalSize,
          compressedSize: totalCompressedSize,
          ratio: totalCompressedSize / originalSize,
          isChunked: true,
          chunkCount: chunks.length,
        }
      }

      // Fallback (should not reach here)
      throw new Error('Invalid compression level')
      
    } catch (error) {
      console.warn('Compression failed, using base64 encoding:', error)
      const encoded = btoa(jsonString)
      
      return {
        data: encoded,
        compressed: false,
        compressionLevel: CompressionLevel.NONE,
        originalSize,
        compressedSize: originalSize,
        ratio: 1.0,
        isChunked: false,
      }
    }
  }

  /**
   * Create chunks for large workflow data
   */
  private async createChunks(data: string, presetId: string): Promise<ChunkMetadata[]> {
    const compressed = LZString.compressToBase64(data)
    const chunkSize = this.options.chunkSize || 50 * 1024
    const chunks: ChunkMetadata[] = []
    
    for (let i = 0; i < compressed.length; i += chunkSize) {
      const chunkData = compressed.slice(i, i + chunkSize)
      const chunkId = `chunk_${presetId}_${chunks.length}`
      
      chunks.push({
        id: chunkId,
        presetId,
        chunkIndex: chunks.length,
        totalChunks: Math.ceil(compressed.length / chunkSize),
        data: chunkData,
        checksum: this.calculateChecksum(chunkData),
        compressed: true,
      })
    }
    
    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length
    })
    
    return chunks
  }

  /**
   * Reassemble chunks into original data
   */
  private async reassembleChunks(chunks: ChunkMetadata[]): Promise<string> {
    // Sort chunks by index
    const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)
    
    // Validate chunks
    if (sortedChunks.length === 0) {
      throw new Error('No chunks provided')
    }
    
    const expectedCount = sortedChunks[0].totalChunks
    if (sortedChunks.length !== expectedCount) {
      throw new Error(`Missing chunks: expected ${expectedCount}, got ${sortedChunks.length}`)
    }
    
    // Verify checksums
    for (const chunk of sortedChunks) {
      const calculatedChecksum = this.calculateChecksum(chunk.data)
      if (calculatedChecksum !== chunk.checksum) {
        throw new Error(`Chunk ${chunk.chunkIndex} checksum mismatch`)
      }
    }
    
    // Reassemble data
    const reassembled = sortedChunks.map(chunk => chunk.data).join('')
    return LZString.decompressFromBase64(reassembled) || ''
  }

  /**
   * Decompress workflow data with auto-detection of compression method
   */
  async decompressWorkflow(
    data: string | ChunkMetadata[],
    compressionLevel?: CompressionLevel,
    presetId?: string
  ): Promise<ComfyUIWorkflow> {
    try {
      // Handle chunked data
      if (Array.isArray(data)) {
        const decompressed = await this.reassembleChunks(data)
        return JSON.parse(decompressed)
      }

      // If presetId is provided and no data, try to get chunks from ChunkManager
      if (!data && presetId && chunkManager.hasChunks(presetId)) {
        const chunks = await chunkManager.getChunks(presetId)
        if (chunks) {
          const decompressed = await this.reassembleChunks(chunks)
          return JSON.parse(decompressed)
        }
      }

      if (typeof data !== 'string') {
        throw new Error('Invalid data type for workflow decompression')
      }

      // If compression level is specified, use it
      if (compressionLevel !== undefined) {
        return await this.decompressWithLevel(data, compressionLevel)
      }

      // Auto-detect compression method and decompress
      return await this.autoDecompress(data)
      
    } catch (error) {
      console.error('Failed to decompress workflow:', error)
      throw new Error('Invalid or corrupted workflow data')
    }
  }

  /**
   * Auto-detect compression method and decompress
   */
  private async autoDecompress(data: string): Promise<ComfyUIWorkflow> {
    // Try different decompression methods in order of likelihood
    
    // 1. Try LZ-string base64 decompression (most common)
    try {
      const decompressed = LZString.decompressFromBase64(data)
      if (decompressed) {
        return JSON.parse(decompressed)
      }
    } catch (error) {
      // Continue to next method
    }

    // 2. Try UTF16 decompression
    try {
      const utf16Data = decodeURIComponent(escape(atob(data)))
      const decompressed = LZString.decompressFromUTF16(utf16Data)
      if (decompressed) {
        return JSON.parse(decompressed)
      }
    } catch (error) {
      // Continue to next method
    }

    // 3. Try base64 decoding (uncompressed)
    try {
      const jsonString = atob(data)
      return JSON.parse(jsonString)
    } catch (error) {
      // Continue to next method
    }

    // 4. Try direct JSON parsing (if data is already JSON)
    try {
      return JSON.parse(data)
    } catch (error) {
      // All methods failed
    }

    throw new Error('Unable to decompress data with any known method')
  }

  /**
   * Decompress with specific compression level
   */
  private async decompressWithLevel(data: string, compressionLevel: CompressionLevel): Promise<ComfyUIWorkflow> {
    // Handle non-compressed data
    if (compressionLevel === CompressionLevel.NONE) {
      const jsonString = atob(data)
      return JSON.parse(jsonString)
    }

    // Handle LZ-string basic compression
    if (compressionLevel === CompressionLevel.BASIC) {
      const decompressed = LZString.decompressFromBase64(data)
      if (!decompressed) {
        throw new Error('Failed to decompress data')
      }
      return JSON.parse(decompressed)
    }

    // Handle UTF16 compression
    if (compressionLevel === CompressionLevel.ENHANCED) {
      // Decode from base64 first
      const utf16Data = decodeURIComponent(escape(atob(data)))
      const decompressed = LZString.decompressFromUTF16(utf16Data)
      if (!decompressed) {
        throw new Error('Failed to decompress UTF16 data')
      }
      return JSON.parse(decompressed)
    }

    throw new Error(`Unknown compression level: ${compressionLevel}`)
  }

  /**
   * Analyze compression efficiency for a dataset
   */
  analyzeCompressionEfficiency(workflows: ComfyUIWorkflow[]): {
    totalOriginalSize: number
    totalCompressedSize: number
    averageCompressionRatio: number
    bestCompressionRatio: number
    worstCompressionRatio: number
    recommendedThreshold: number
  } {
    const results = workflows.map(workflow => {
      const jsonString = JSON.stringify(workflow)
      const originalSize = new Blob([jsonString]).size
      const compressed = LZString.compressToBase64(jsonString)
      const compressedSize = new Blob([compressed]).size
      return {
        originalSize,
        compressedSize,
        ratio: compressedSize / originalSize
      }
    })

    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0)
    const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0)
    const ratios = results.map(r => r.ratio)
    
    return {
      totalOriginalSize,
      totalCompressedSize,
      averageCompressionRatio: totalCompressedSize / totalOriginalSize,
      bestCompressionRatio: Math.min(...ratios),
      worstCompressionRatio: Math.max(...ratios),
      recommendedThreshold: results.find(r => r.ratio < 0.9)?.originalSize || 1024
    }
  }

  /**
   * Estimate compression ratio for given data
   */
  estimateCompressionRatio(data: string): number {
    // Simple heuristic based on data characteristics
    const jsonString = typeof data === 'string' ? data : JSON.stringify(data)
    const hasRepeatedPatterns = /(.{10,})\1+/.test(jsonString)
    const hasLongStrings = /".{100,}"/.test(jsonString)
    
    if (hasRepeatedPatterns) return 0.3 // Good compression expected
    if (hasLongStrings) return 0.6 // Moderate compression
    return 0.8 // Minimal compression
  }

  /**
   * Check if data should be compressed based on size and content
   */
  shouldCompress(data: string): boolean {
    const size = new Blob([data]).size
    return size >= this.options.threshold
  }

  /**
   * Get compression statistics for a dataset
   */
  getCompressionStats(
    originalSizes: number[],
    compressedSizes: number[]
  ): {
    totalOriginal: number
    totalCompressed: number
    averageRatio: number
    spaceSaved: number
    spaceSavedPercent: number
  } {
    const totalOriginal = originalSizes.reduce((sum, size) => sum + size, 0)
    const totalCompressed = compressedSizes.reduce((sum, size) => sum + size, 0)
    const averageRatio = totalOriginal > 0 ? totalCompressed / totalOriginal : 1
    const spaceSaved = totalOriginal - totalCompressed
    const spaceSavedPercent = totalOriginal > 0 ? (spaceSaved / totalOriginal) * 100 : 0

    return {
      totalOriginal,
      totalCompressed,
      averageRatio,
      spaceSaved,
      spaceSavedPercent,
    }
  }
}

// Default instance with enhanced configuration
export const compressionService = new CompressionService({
  algorithm: 'lzstring',
  threshold: 1024, // 1KB
  chunkSize: 50 * 1024, // 50KB chunks
})

// Utility functions for direct use
export const compressWorkflow = (workflow: ComfyUIWorkflow) =>
  compressionService.compressWorkflow(workflow)

export const decompressWorkflow = (
  data: string | ChunkMetadata[], 
  compressionLevel?: CompressionLevel,
  presetId?: string
) => compressionService.decompressWorkflow(data, compressionLevel, presetId)

export const shouldCompress = (data: string) =>
  compressionService.shouldCompress(data)

export const analyzeCompressionEfficiency = (workflows: ComfyUIWorkflow[]) =>
  compressionService.analyzeCompressionEfficiency(workflows)