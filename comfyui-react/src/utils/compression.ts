// ============================================================================
// ComfyUI React - Compression Utilities
// ============================================================================

import type { ComfyUIWorkflow } from '@/types'
import type { ICompressionOptions } from '@/types/preset'

// Default compression configuration
const DEFAULT_COMPRESSION_OPTIONS: ICompressionOptions = {
  algorithm: 'gzip',
  level: 6,
  threshold: 1024, // 1KB
  maxSize: 5 * 1024 * 1024, // 5MB
}

/**
 * Simple base64 compression using pako or native compression
 * Fallback to JSON.stringify if compression is not available
 */
export class CompressionService {
  private options: ICompressionOptions

  constructor(options: Partial<ICompressionOptions> = {}) {
    this.options = { ...DEFAULT_COMPRESSION_OPTIONS, ...options }
  }

  /**
   * Compress workflow data to base64 string
   */
  async compressWorkflow(workflow: ComfyUIWorkflow): Promise<{
    data: string
    compressed: boolean
    originalSize: number
    compressedSize: number
    ratio: number
  }> {
    const jsonString = JSON.stringify(workflow)
    const originalSize = new Blob([jsonString]).size

    // Check if compression is needed
    if (originalSize < this.options.threshold) {
      return {
        data: btoa(jsonString),
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        ratio: 1.0,
      }
    }

    try {
      let compressedData: string

      if (this.options.algorithm === 'gzip' && typeof window !== 'undefined' && 'CompressionStream' in window) {
        compressedData = await this.compressWithStream(jsonString, 'gzip')
      } else if (this.options.algorithm === 'deflate' && typeof window !== 'undefined' && 'CompressionStream' in window) {
        compressedData = await this.compressWithStream(jsonString, 'deflate')
      } else {
        // Fallback to simple base64 encoding
        compressedData = btoa(jsonString)
      }

      const compressedSize = new Blob([compressedData]).size
      const ratio = originalSize / compressedSize

      return {
        data: compressedData,
        compressed: compressedSize < originalSize,
        originalSize,
        compressedSize,
        ratio,
      }
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error)
      
      return {
        data: btoa(jsonString),
        compressed: false,
        originalSize,
        compressedSize: originalSize,
        ratio: 1.0,
      }
    }
  }

  /**
   * Decompress workflow data from base64 string
   */
  async decompressWorkflow(
    data: string,
    isCompressed: boolean = false
  ): Promise<ComfyUIWorkflow> {
    try {
      if (!isCompressed) {
        // Simple base64 decode
        const jsonString = atob(data)
        return JSON.parse(jsonString)
      }

      let decompressedString: string

      if (this.options.algorithm === 'gzip' && typeof window !== 'undefined' && 'DecompressionStream' in window) {
        decompressedString = await this.decompressWithStream(data, 'gzip')
      } else if (this.options.algorithm === 'deflate' && typeof window !== 'undefined' && 'DecompressionStream' in window) {
        decompressedString = await this.decompressWithStream(data, 'deflate')
      } else {
        // Fallback to base64 decode
        decompressedString = atob(data)
      }

      return JSON.parse(decompressedString)
    } catch (error) {
      console.error('Failed to decompress workflow:', error)
      throw new Error('Invalid or corrupted workflow data')
    }
  }

  /**
   * Compress string using native CompressionStream
   */
  private async compressWithStream(
    data: string,
    format: 'gzip' | 'deflate'
  ): Promise<string> {
    const stream = new CompressionStream(format)
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    // Write data to compression stream
    const encoder = new TextEncoder()
    await writer.write(encoder.encode(data))
    await writer.close()

    // Read compressed data
    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        chunks.push(value)
      }
    }

    // Combine chunks and convert to base64
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    return btoa(String.fromCharCode(...combined))
  }

  /**
   * Decompress string using native DecompressionStream
   */
  private async decompressWithStream(
    data: string,
    format: 'gzip' | 'deflate'
  ): Promise<string> {
    // Convert base64 to Uint8Array
    const binaryString = atob(data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    const stream = new DecompressionStream(format)
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    // Write compressed data to decompression stream
    await writer.write(bytes)
    await writer.close()

    // Read decompressed data
    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) {
        chunks.push(value)
      }
    }

    // Combine chunks and decode as string
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    const decoder = new TextDecoder()
    return decoder.decode(combined)
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

// Default instance
export const compressionService = new CompressionService()

// Utility functions for direct use
export const compressWorkflow = (workflow: ComfyUIWorkflow) =>
  compressionService.compressWorkflow(workflow)

export const decompressWorkflow = (data: string, isCompressed: boolean = false) =>
  compressionService.decompressWorkflow(data, isCompressed)

export const shouldCompress = (data: string) =>
  compressionService.shouldCompress(data)