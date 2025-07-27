// ============================================================================
// ComfyUI React - Chunk Management Service
// ============================================================================

import type { ChunkMetadata } from '@/types/compression'

export interface ChunkStorage {
  id: string
  presetId: string
  chunks: ChunkMetadata[]
  totalSize: number
  createdAt: Date
  lastAccessed: Date
  isComplete: boolean
}

export interface ChunkManagerStats {
  totalChunkedPresets: number
  totalChunks: number
  totalStorageUsed: number
  averageChunkSize: number
  largestChunkedPreset: {
    id: string
    size: number
    chunkCount: number
  } | null
  oldestChunkedPreset: {
    id: string
    createdAt: Date
    chunkCount: number
  } | null
}

/**
 * Manages chunked workflow storage and retrieval
 * Handles large workflows that are split into multiple chunks
 */
export class ChunkManager {
  private readonly CHUNK_STORAGE_KEY = 'comfyui-chunk-storage'
  private readonly MAX_CHUNK_AGE_DAYS = 30
  private chunkStorage: Map<string, ChunkStorage> = new Map()

  constructor() {
    this.loadChunkStorage()
    this.scheduleCleanup()
  }

  /**
   * Store chunks for a preset
   */
  async storeChunks(presetId: string, chunks: ChunkMetadata[]): Promise<void> {
    try {
      const totalSize = chunks.reduce((sum, chunk) => 
        sum + new Blob([chunk.data]).size, 0
      )

      const chunkStorage: ChunkStorage = {
        id: `chunks_${presetId}`,
        presetId,
        chunks: [...chunks], // Create a copy
        totalSize,
        createdAt: new Date(),
        lastAccessed: new Date(),
        isComplete: this.validateChunks(chunks),
      }

      // Validate chunks before storing
      if (!chunkStorage.isComplete) {
        throw new Error('Incomplete chunk set - cannot store')
      }

      this.chunkStorage.set(presetId, chunkStorage)
      await this.saveChunkStorage()

      console.log(`Stored ${chunks.length} chunks for preset ${presetId}`)
    } catch (error) {
      console.error('Failed to store chunks:', error)
      throw new Error(`Failed to store chunks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Retrieve chunks for a preset
   */
  async getChunks(presetId: string): Promise<ChunkMetadata[] | null> {
    try {
      const chunkStorage = this.chunkStorage.get(presetId)
      
      if (!chunkStorage) {
        return null
      }

      // Update last accessed time
      chunkStorage.lastAccessed = new Date()
      await this.saveChunkStorage()

      // Validate chunks are still complete
      if (!this.validateChunks(chunkStorage.chunks)) {
        console.warn(`Chunks for preset ${presetId} are corrupted, removing`)
        await this.removeChunks(presetId)
        return null
      }

      return [...chunkStorage.chunks] // Return a copy
    } catch (error) {
      console.error('Failed to retrieve chunks:', error)
      return null
    }
  }

  /**
   * Remove chunks for a preset
   */
  async removeChunks(presetId: string): Promise<boolean> {
    try {
      const existed = this.chunkStorage.has(presetId)
      this.chunkStorage.delete(presetId)
      
      if (existed) {
        await this.saveChunkStorage()
        console.log(`Removed chunks for preset ${presetId}`)
      }
      
      return existed
    } catch (error) {
      console.error('Failed to remove chunks:', error)
      return false
    }
  }

  /**
   * Check if chunks exist for a preset
   */
  hasChunks(presetId: string): boolean {
    return this.chunkStorage.has(presetId)
  }

  /**
   * Get storage statistics
   */
  getStats(): ChunkManagerStats {
    const storageEntries = Array.from(this.chunkStorage.values())
    
    if (storageEntries.length === 0) {
      return {
        totalChunkedPresets: 0,
        totalChunks: 0,
        totalStorageUsed: 0,
        averageChunkSize: 0,
        largestChunkedPreset: null,
        oldestChunkedPreset: null,
      }
    }

    const totalChunks = storageEntries.reduce((sum, storage) => sum + storage.chunks.length, 0)
    const totalStorageUsed = storageEntries.reduce((sum, storage) => sum + storage.totalSize, 0)
    const averageChunkSize = totalStorageUsed / Math.max(totalChunks, 1)

    // Find largest chunked preset
    const largestPreset = storageEntries.reduce((largest, current) => 
      (!largest || current.totalSize > largest.totalSize) ? current : largest
    )

    // Find oldest chunked preset
    const oldestPreset = storageEntries.reduce((oldest, current) => 
      (!oldest || current.createdAt < oldest.createdAt) ? current : oldest
    )

    return {
      totalChunkedPresets: storageEntries.length,
      totalChunks,
      totalStorageUsed,
      averageChunkSize,
      largestChunkedPreset: {
        id: largestPreset.presetId,
        size: largestPreset.totalSize,
        chunkCount: largestPreset.chunks.length,
      },
      oldestChunkedPreset: {
        id: oldestPreset.presetId,
        createdAt: oldestPreset.createdAt,
        chunkCount: oldestPreset.chunks.length,
      },
    }
  }

  /**
   * Clean up old chunks
   */
  async cleanupOldChunks(): Promise<{
    removedCount: number
    spaceFreed: number
    removedPresetIds: string[]
  }> {
    const now = new Date()
    const cutoffTime = new Date(now.getTime() - this.MAX_CHUNK_AGE_DAYS * 24 * 60 * 60 * 1000)
    
    const toRemove: string[] = []
    let spaceFreed = 0

    for (const [presetId, storage] of this.chunkStorage) {
      if (storage.lastAccessed < cutoffTime) {
        toRemove.push(presetId)
        spaceFreed += storage.totalSize
      }
    }

    // Remove old chunks
    for (const presetId of toRemove) {
      this.chunkStorage.delete(presetId)
    }

    if (toRemove.length > 0) {
      await this.saveChunkStorage()
      console.log(`Cleaned up ${toRemove.length} old chunk sets, freed ${this.formatBytes(spaceFreed)}`)
    }

    return {
      removedCount: toRemove.length,
      spaceFreed,
      removedPresetIds: toRemove,
    }
  }

  /**
   * Validate chunk integrity
   */
  private validateChunks(chunks: ChunkMetadata[]): boolean {
    if (chunks.length === 0) {
      return false
    }

    // Sort chunks by index
    const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex)
    
    // Check for complete sequence
    const expectedCount = sortedChunks[0].totalChunks
    if (sortedChunks.length !== expectedCount) {
      return false
    }

    // Check indices are sequential
    for (let i = 0; i < sortedChunks.length; i++) {
      if (sortedChunks[i].chunkIndex !== i) {
        return false
      }
    }

    // Check all chunks belong to same preset
    const presetId = sortedChunks[0].presetId
    if (!sortedChunks.every(chunk => chunk.presetId === presetId)) {
      return false
    }

    // Check total chunk counts match
    if (!sortedChunks.every(chunk => chunk.totalChunks === expectedCount)) {
      return false
    }

    return true
  }

  /**
   * Load chunk storage from localStorage
   */
  private loadChunkStorage(): void {
    try {
      const stored = localStorage.getItem(this.CHUNK_STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as Record<string, any>
        
        // Convert plain objects back to ChunkStorage objects
        for (const [presetId, storageData] of Object.entries(data)) {
          const chunkStorage: ChunkStorage = {
            ...storageData,
            createdAt: new Date(storageData.createdAt),
            lastAccessed: new Date(storageData.lastAccessed),
          }
          this.chunkStorage.set(presetId, chunkStorage)
        }

        console.log(`Loaded ${this.chunkStorage.size} chunk storage entries`)
      }
    } catch (error) {
      console.error('Failed to load chunk storage:', error)
      this.chunkStorage.clear()
    }
  }

  /**
   * Save chunk storage to localStorage
   */
  private async saveChunkStorage(): Promise<void> {
    try {
      const data: Record<string, any> = {}
      
      for (const [presetId, storage] of this.chunkStorage) {
        data[presetId] = {
          ...storage,
          createdAt: storage.createdAt.toISOString(),
          lastAccessed: storage.lastAccessed.toISOString()
        }
      }

      localStorage.setItem(this.CHUNK_STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save chunk storage:', error)
      
      // If storage is full, try to clean up and retry once
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        const cleanup = await this.cleanupOldChunks()
        if (cleanup.removedCount > 0) {
          try {
            const data: Record<string, any> = {}
            for (const [presetId, storage] of this.chunkStorage) {
              data[presetId] = {
                ...storage,
                createdAt: storage.createdAt.toISOString(),
                lastAccessed: storage.lastAccessed.toISOString()
              }
            }
            localStorage.setItem(this.CHUNK_STORAGE_KEY, JSON.stringify(data))
          } catch (retryError) {
            console.error('Failed to save chunk storage after cleanup:', retryError)
          }
        }
      }
    }
  }

  /**
   * Schedule periodic cleanup
   */
  private scheduleCleanup(): void {
    // Clean up on initialization
    setTimeout(() => {
      this.cleanupOldChunks()
    }, 1000)

    // Schedule cleanup every hour
    setInterval(() => {
      this.cleanupOldChunks()
    }, 60 * 60 * 1000)
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get detailed information about a specific chunked preset
   */
  getChunkDetails(presetId: string): {
    exists: boolean
    chunkCount: number
    totalSize: number
    createdAt: Date | null
    lastAccessed: Date | null
    isComplete: boolean
    chunkSizes: number[]
  } {
    const storage = this.chunkStorage.get(presetId)
    
    if (!storage) {
      return {
        exists: false,
        chunkCount: 0,
        totalSize: 0,
        createdAt: null,
        lastAccessed: null,
        isComplete: false,
        chunkSizes: [],
      }
    }

    const chunkSizes = storage.chunks.map(chunk => new Blob([chunk.data]).size)

    return {
      exists: true,
      chunkCount: storage.chunks.length,
      totalSize: storage.totalSize,
      createdAt: storage.createdAt,
      lastAccessed: storage.lastAccessed,
      isComplete: storage.isComplete,
      chunkSizes,
    }
  }

  /**
   * Clear all chunk storage (for development/testing)
   */
  clearAll(): void {
    this.chunkStorage.clear()
    localStorage.removeItem(this.CHUNK_STORAGE_KEY)
    console.log('Cleared all chunk storage')
  }

  /**
   * Export chunk storage for backup
   */
  exportChunkStorage(): string {
    const data = Object.fromEntries(this.chunkStorage)
    return JSON.stringify(data, null, 2)
  }

  /**
   * Import chunk storage from backup
   */
  importChunkStorage(jsonData: string): {
    success: boolean
    importedCount: number
    errors: string[]
  } {
    const errors: string[] = []
    let importedCount = 0

    try {
      const data = JSON.parse(jsonData) as Record<string, any>
      
      for (const [presetId, storageData] of Object.entries(data)) {
        try {
          const chunkStorage: ChunkStorage = {
            ...storageData,
            createdAt: new Date(storageData.createdAt),
            lastAccessed: new Date(storageData.lastAccessed),
          }

          // Validate chunks
          if (this.validateChunks(chunkStorage.chunks)) {
            this.chunkStorage.set(presetId, chunkStorage)
            importedCount++
          } else {
            errors.push(`Invalid chunks for preset ${presetId}`)
          }
        } catch (error) {
          errors.push(`Failed to import preset ${presetId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (importedCount > 0) {
        this.saveChunkStorage()
      }

      return {
        success: errors.length === 0,
        importedCount,
        errors,
      }
    } catch (error) {
      return {
        success: false,
        importedCount: 0,
        errors: [`Failed to parse chunk storage data: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }
}

// Default instance
export const chunkManager = new ChunkManager()

// Utility functions
export const storeChunks = (presetId: string, chunks: ChunkMetadata[]) =>
  chunkManager.storeChunks(presetId, chunks)

export const getChunks = (presetId: string) =>
  chunkManager.getChunks(presetId)

export const removeChunks = (presetId: string) =>
  chunkManager.removeChunks(presetId)

export const hasChunks = (presetId: string) =>
  chunkManager.hasChunks(presetId)

export const getChunkManagerStats = () =>
  chunkManager.getStats()

export const cleanupOldChunks = () =>
  chunkManager.cleanupOldChunks()