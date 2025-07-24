// ============================================================================
// ComfyUI React - Generation History Manager with IndexedDB
// ============================================================================

import type { GenerationHistoryItem } from '@/types'

// Database configuration
const DB_NAME = 'ComfyUI_History'
const DB_VERSION = 1
const STORES = {
  GENERATIONS: 'generations',
  METADATA: 'metadata', 
  THUMBNAILS: 'thumbnails',
  STATS: 'stats'
} as const

// LocalStorage keys for fallback and migration
const STORAGE_KEYS = {
  GENERATIONS: 'comfyui_generations_history',
  METADATA: 'comfyui_history_metadata',
  MIGRATED: 'comfyui_history_migrated',
  LEGACY_HISTORY: 'generationHistory' // Legacy key from old system
} as const

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && indexedDB !== null
  } catch {
    return false
  }
}

// IndexedDB schemas
export interface StoredGeneration extends GenerationHistoryItem {
  searchableText: string // For full-text search
  tags: string[] // User-defined tags
  rating?: number // 1-5 star rating
  notes?: string // User notes
}

export interface StoredThumbnail {
  id: string
  generationId: string
  imageIndex: number
  thumbnail: Blob
  width: number
  height: number
  timestamp: string
}

export interface StoredStats {
  id: string
  date: string // YYYY-MM-DD format
  totalGenerations: number
  successfulGenerations: number
  failedGenerations: number
  averageTime: number
  topModels: Record<string, number>
  topDimensions: Record<string, number>
}

// Search and filter interfaces
export interface HistorySearchParams {
  query?: string
  dateFrom?: Date
  dateTo?: Date
  models?: string[]
  dimensions?: string[]
  status?: string[]
  rating?: number
  tags?: string[]
  sortBy?: 'timestamp' | 'rating' | 'duration'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface HistorySearchResult {
  items: StoredGeneration[]
  total: number
  hasMore: boolean
}

export interface HistoryStats {
  totalGenerations: number
  successRate: number
  averageGenerationTime: number
  totalStorageUsed: number
  oldestGeneration?: Date
  newestGeneration?: Date
  topModels: Array<{ name: string; count: number; percentage: number }>
  topDimensions: Array<{ dimensions: string; count: number; percentage: number }>
  generationsPerDay: Array<{ date: string; count: number }>
  successRateOverTime: Array<{ date: string; rate: number }>
}

export class HistoryManager {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null
  private useIndexedDB: boolean = false
  private isInitialized = false

  constructor() {
    this.useIndexedDB = isIndexedDBAvailable()
    this.initPromise = this.initialize()
  }

  // Initialize storage system (IndexedDB or localStorage fallback)
  private async initialize(): Promise<void> {
    try {
      if (this.useIndexedDB) {
        await this.initializeIndexedDB()
      }
      
      // Migrate legacy data if needed
      await this.migrateLegacyData()
      
      this.isInitialized = true
    } catch (error) {
      console.warn('IndexedDB initialization failed, falling back to localStorage:', error)
      this.useIndexedDB = false
      this.isInitialized = true
    }
  }

  // Initialize IndexedDB with proper schema
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(new Error(`IndexedDB error: ${request.error}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Generations store - main history data
        if (!db.objectStoreNames.contains(STORES.GENERATIONS)) {
          const generationsStore = db.createObjectStore(STORES.GENERATIONS, { keyPath: 'id' })
          generationsStore.createIndex('timestamp', 'timestamp', { unique: false })
          generationsStore.createIndex('status', 'status', { unique: false })
          generationsStore.createIndex('searchableText', 'searchableText', { unique: false })
          generationsStore.createIndex('rating', 'rating', { unique: false })
          generationsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true })
        }

        // Thumbnails store - lazy-loaded image thumbnails
        if (!db.objectStoreNames.contains(STORES.THUMBNAILS)) {
          const thumbnailsStore = db.createObjectStore(STORES.THUMBNAILS, { keyPath: 'id' })
          thumbnailsStore.createIndex('generationId', 'generationId', { unique: false })
        }

        // Metadata store - extracted workflow metadata for fast filtering
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          const metadataStore = db.createObjectStore(STORES.METADATA, { keyPath: 'id' })
          metadataStore.createIndex('modelName', 'model.name', { unique: false })
          metadataStore.createIndex('dimensions', 'image.dimensions', { unique: false })
        }

        // Stats store - aggregated statistics by date
        if (!db.objectStoreNames.contains(STORES.STATS)) {
          const statsStore = db.createObjectStore(STORES.STATS, { keyPath: 'id' })
          statsStore.createIndex('date', 'date', { unique: true })
        }
      }
    })
  }

  // Migrate legacy data from old storage systems
  private async migrateLegacyData(): Promise<void> {
    try {
      // Check if migration already completed
      const migrated = localStorage.getItem(STORAGE_KEYS.MIGRATED)
      if (migrated === 'true') {
        return
      }

      console.log('Starting legacy data migration...')

      // Migrate from legacy generationHistory key
      const legacyHistory = localStorage.getItem(STORAGE_KEYS.LEGACY_HISTORY)
      if (legacyHistory) {
        try {
          const legacyItems = JSON.parse(legacyHistory) as GenerationHistoryItem[]
          console.log(`Found ${legacyItems.length} legacy items to migrate`)

          for (const item of legacyItems) {
            await this.addGeneration(item)
          }

          // Remove legacy data after successful migration
          localStorage.removeItem(STORAGE_KEYS.LEGACY_HISTORY)
          console.log('Legacy data migration completed successfully')
        } catch (error) {
          console.error('Failed to migrate legacy data:', error)
        }
      }

      // Mark migration as completed
      localStorage.setItem(STORAGE_KEYS.MIGRATED, 'true')
    } catch (error) {
      console.error('Migration process failed:', error)
    }
  }

  // Ensure database is initialized
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise
    }
    if (!this.isInitialized) {
      throw new Error('Storage not initialized')
    }
    if (this.useIndexedDB && !this.db) {
      throw new Error('IndexedDB not initialized')
    }
  }

  // Add generation to history
  async addGeneration(item: GenerationHistoryItem, thumbnails?: Blob[]): Promise<void> {
    await this.ensureInitialized()

    if (!this.useIndexedDB) {
      return this.addGenerationToLocalStorage(item)
    }

    const transaction = this.db!.transaction([STORES.GENERATIONS, STORES.METADATA, STORES.THUMBNAILS, STORES.STATS], 'readwrite')

    try {
      // Prepare searchable text for full-text search
      const searchableText = [
        item.metadata.prompts.positive,
        item.metadata.prompts.negative,
        item.metadata.model?.name || '',
        item.metadata.generation?.sampler || '',
        item.metadata.generation?.scheduler || ''
      ].join(' ').toLowerCase()

      // Store generation with enhanced data
      const storedGeneration: StoredGeneration = {
        ...item,
        searchableText,
        tags: [],
        rating: undefined,
        notes: undefined
      }

      const generationsStore = transaction.objectStore(STORES.GENERATIONS)
      await this.promisifyRequest(generationsStore.add(storedGeneration))

      // Store metadata separately for fast filtering
      const metadataStore = transaction.objectStore(STORES.METADATA)
      await this.promisifyRequest(metadataStore.add({
        id: item.id,
        ...item.metadata
      }))

      // Store thumbnails if provided
      if (thumbnails && thumbnails.length > 0) {
        const thumbnailsStore = transaction.objectStore(STORES.THUMBNAILS)
        
        for (let i = 0; i < thumbnails.length; i++) {
          const thumbnail: StoredThumbnail = {
            id: `${item.id}_${i}`,
            generationId: item.id,
            imageIndex: i,
            thumbnail: thumbnails[i],
            width: item.metadata.image?.width || 512,
            height: item.metadata.image?.height || 512,
            timestamp: new Date().toISOString()
          }
          await this.promisifyRequest(thumbnailsStore.add(thumbnail))
        }
      }

      // Update daily statistics
      await this.updateDailyStats(item, transaction)

      await this.promisifyRequest(transaction)
    } catch (error) {
      transaction.abort()
      throw error
    }
  }

  // Search generations with advanced filtering
  async searchGenerations(params: HistorySearchParams = {}): Promise<HistorySearchResult> {
    await this.ensureInitialized()

    if (!this.useIndexedDB) {
      return this.searchGenerationsInLocalStorage(params)
    }

    const {
      query,
      status,
      rating,
      sortBy = 'timestamp',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = params

    const transaction = this.db!.transaction([STORES.GENERATIONS], 'readonly')
    const store = transaction.objectStore(STORES.GENERATIONS)
    
    let results: StoredGeneration[] = []

    // Use appropriate index for initial filtering
    let cursor: IDBRequest<IDBCursorWithValue | null>

    if (query) {
      // Full-text search
      cursor = store.index('searchableText').openCursor()
    } else if (status && status.length === 1) {
      // Filter by status
      cursor = store.index('status').openCursor(IDBKeyRange.only(status[0]))
    } else if (rating) {
      // Filter by rating
      cursor = store.index('rating').openCursor(IDBKeyRange.lowerBound(rating))
    } else {
      // Default timestamp-based listing
      const direction = sortOrder === 'desc' ? 'prev' : 'next'
      cursor = store.index('timestamp').openCursor(null, direction)
    }

    return new Promise((resolve, reject) => {
      cursor.onsuccess = () => {
        const cursorResult = cursor.result

        if (!cursorResult) {
          // Apply additional filters and sorting
          let filteredResults = this.applyClientSideFilters(results, params)
          
          // Apply sorting if not already sorted by index
          if (sortBy !== 'timestamp' || (query || status?.length !== 1)) {
            filteredResults = this.sortResults(filteredResults, sortBy, sortOrder)
          }

          // Apply pagination
          const total = filteredResults.length
          const paginatedResults = filteredResults.slice(offset, offset + limit)
          const hasMore = offset + limit < total

          resolve({
            items: paginatedResults,
            total,
            hasMore
          })
          return
        }

        const generation = cursorResult.value

        // Apply filters
        if (this.matchesFilters(generation, params)) {
          results.push(generation)
        }

        cursorResult.continue()
      }

      cursor.onerror = () => {
        reject(new Error(`Search failed: ${cursor.error}`))
      }
    })
  }

  // Get generation statistics
  async getStats(): Promise<HistoryStats> {
    await this.ensureInitialized()

    if (!this.useIndexedDB) {
      return this.getStatsFromLocalStorage()
    }

    const transaction = this.db!.transaction([STORES.GENERATIONS, STORES.STATS], 'readonly')
    const generationsStore = transaction.objectStore(STORES.GENERATIONS)
    const statsStore = transaction.objectStore(STORES.STATS)

    // Get all generations for analysis
    const allGenerations = await this.promisifyRequest(generationsStore.getAll()) as StoredGeneration[]
    
    if (allGenerations.length === 0) {
      return {
        totalGenerations: 0,
        successRate: 0,
        averageGenerationTime: 0,
        totalStorageUsed: 0,
        topModels: [],
        topDimensions: [],
        generationsPerDay: [],
        successRateOverTime: []
      }
    }

    // Calculate basic stats
    const totalGenerations = allGenerations.length
    const successfulGenerations = allGenerations.filter(g => g.status === 'completed').length
    const successRate = (successfulGenerations / totalGenerations) * 100

    // Calculate average generation time
    const generationsWithTiming = allGenerations.filter(g => 
      g.metadata.timing?.duration && g.metadata.timing.duration > 0
    )
    const averageGenerationTime = generationsWithTiming.length > 0
      ? generationsWithTiming.reduce((sum, g) => sum + (g.metadata.timing!.duration || 0), 0) / generationsWithTiming.length
      : 0

    // Find oldest and newest generations
    const timestamps = allGenerations.map(g => new Date(g.timestamp)).sort((a, b) => a.getTime() - b.getTime())
    const oldestGeneration = timestamps[0]
    const newestGeneration = timestamps[timestamps.length - 1]

    // Calculate top models
    const modelCounts = new Map<string, number>()
    allGenerations.forEach(g => {
      const modelName = g.metadata.model?.name || 'Unknown'
      modelCounts.set(modelName, (modelCounts.get(modelName) || 0) + 1)
    })

    const topModels = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalGenerations) * 100
      }))

    // Calculate top dimensions
    const dimensionCounts = new Map<string, number>()
    allGenerations.forEach(g => {
      const dimensions = `${g.metadata.image?.width || 512}x${g.metadata.image?.height || 512}`
      dimensionCounts.set(dimensions, (dimensionCounts.get(dimensions) || 0) + 1)
    })

    const topDimensions = Array.from(dimensionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dimensions, count]) => ({
        dimensions,
        count,
        percentage: (count / totalGenerations) * 100
      }))

    // Get daily stats from stats store
    const dailyStats = await this.promisifyRequest(statsStore.getAll()) as StoredStats[]
    
    const generationsPerDay = dailyStats.map(stat => ({
      date: stat.date,
      count: stat.totalGenerations
    })).sort((a, b) => a.date.localeCompare(b.date))

    const successRateOverTime = dailyStats.map(stat => ({
      date: stat.date,
      rate: stat.totalGenerations > 0 ? (stat.successfulGenerations / stat.totalGenerations) * 100 : 0
    })).sort((a, b) => a.date.localeCompare(b.date))

    // Estimate storage usage (this is approximate)
    const averageItemSize = JSON.stringify(allGenerations[0] || {}).length
    const totalStorageUsed = totalGenerations * averageItemSize

    return {
      totalGenerations,
      successRate,
      averageGenerationTime,
      totalStorageUsed,
      oldestGeneration,
      newestGeneration,
      topModels,
      topDimensions,
      generationsPerDay,
      successRateOverTime
    }
  }

  // Update generation (rating, tags, notes)
  async updateGeneration(id: string, updates: Partial<Pick<StoredGeneration, 'rating' | 'tags' | 'notes'>>): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction([STORES.GENERATIONS], 'readwrite')
    const store = transaction.objectStore(STORES.GENERATIONS)

    const generation = await this.promisifyRequest(store.get(id)) as StoredGeneration
    if (!generation) {
      throw new Error(`Generation ${id} not found`)
    }

    const updatedGeneration = { ...generation, ...updates }
    await this.promisifyRequest(store.put(updatedGeneration))
    await this.promisifyRequest(transaction)
  }

  // Delete generation
  async deleteGeneration(id: string): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction([STORES.GENERATIONS, STORES.METADATA, STORES.THUMBNAILS], 'readwrite')
    
    try {
      // Delete from all stores
      await this.promisifyRequest(transaction.objectStore(STORES.GENERATIONS).delete(id))
      await this.promisifyRequest(transaction.objectStore(STORES.METADATA).delete(id))
      
      // Delete all thumbnails for this generation
      const thumbnailsStore = transaction.objectStore(STORES.THUMBNAILS)
      const thumbnailCursor = thumbnailsStore.index('generationId').openCursor(IDBKeyRange.only(id))
      
      thumbnailCursor.onsuccess = () => {
        const cursor = thumbnailCursor.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        }
      }

      await this.promisifyRequest(transaction)
    } catch (error) {
      transaction.abort()
      throw error
    }
  }

  // Clear all history
  async clearHistory(): Promise<void> {
    await this.ensureInitialized()

    const transaction = this.db!.transaction([STORES.GENERATIONS, STORES.METADATA, STORES.THUMBNAILS, STORES.STATS], 'readwrite')
    
    try {
      await Promise.all([
        this.promisifyRequest(transaction.objectStore(STORES.GENERATIONS).clear()),
        this.promisifyRequest(transaction.objectStore(STORES.METADATA).clear()),
        this.promisifyRequest(transaction.objectStore(STORES.THUMBNAILS).clear()),
        this.promisifyRequest(transaction.objectStore(STORES.STATS).clear())
      ])

      await this.promisifyRequest(transaction)
    } catch (error) {
      transaction.abort()
      throw error
    }
  }

  // Get thumbnail for generation
  async getThumbnail(generationId: string, imageIndex: number = 0): Promise<Blob | null> {
    await this.ensureInitialized()

    if (!this.useIndexedDB) {
      // localStorage fallback - thumbnails not supported
      return null
    }

    const transaction = this.db!.transaction([STORES.THUMBNAILS], 'readonly')
    const store = transaction.objectStore(STORES.THUMBNAILS)

    const thumbnailId = `${generationId}_${imageIndex}`
    const thumbnail = await this.promisifyRequest(store.get(thumbnailId)) as StoredThumbnail | undefined

    return thumbnail?.thumbnail || null
  }

  // Helper methods
  private promisifyRequest<T = any>(request: IDBRequest<T> | IDBTransaction): Promise<T> {
    return new Promise((resolve, reject) => {
      if ('result' in request) {
        // IDBRequest
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      } else {
        // IDBTransaction
        request.oncomplete = () => resolve(undefined as T)
        request.onerror = () => reject(request.error)
        request.onabort = () => reject(new Error('Transaction aborted'))
      }
    })
  }

  private matchesFilters(generation: StoredGeneration, params: HistorySearchParams): boolean {
    const {
      query,
      dateFrom,
      dateTo,
      models,
      dimensions,
      status,
      rating,
      tags
    } = params

    // Text search
    if (query && !generation.searchableText.includes(query.toLowerCase())) {
      return false
    }

    // Date range
    const generationDate = new Date(generation.timestamp)
    if (dateFrom && generationDate < dateFrom) return false
    if (dateTo && generationDate > dateTo) return false

    // Model filter
    if (models && models.length > 0) {
      const modelName = generation.metadata.model?.name || 'Unknown'
      if (!models.includes(modelName)) return false
    }

    // Dimensions filter
    if (dimensions && dimensions.length > 0) {
      const genDimensions = `${generation.metadata.image?.width || 512}x${generation.metadata.image?.height || 512}`
      if (!dimensions.includes(genDimensions)) return false
    }

    // Status filter
    if (status && status.length > 0 && !status.includes(generation.status)) {
      return false
    }

    // Rating filter
    if (rating && (!generation.rating || generation.rating < rating)) {
      return false
    }

    // Tags filter
    if (tags && tags.length > 0) {
      const hasAllTags = tags.every(tag => generation.tags.includes(tag))
      if (!hasAllTags) return false
    }

    return true
  }

  private applyClientSideFilters(results: StoredGeneration[], params: HistorySearchParams): StoredGeneration[] {
    return results.filter(generation => this.matchesFilters(generation, params))
  }

  private sortResults(results: StoredGeneration[], sortBy: string, sortOrder: 'asc' | 'desc'): StoredGeneration[] {
    return results.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          break
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0)
          break
        case 'duration':
          const aDuration = a.metadata.timing?.duration || 0
          const bDuration = b.metadata.timing?.duration || 0
          comparison = aDuration - bDuration
          break
        default:
          comparison = 0
      }

      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  private async updateDailyStats(item: GenerationHistoryItem, transaction: IDBTransaction): Promise<void> {
    const statsStore = transaction.objectStore(STORES.STATS)
    const date = new Date(item.timestamp).toISOString().split('T')[0] // YYYY-MM-DD

    let dailyStats = await this.promisifyRequest(statsStore.get(date)) as StoredStats | undefined

    if (!dailyStats) {
      dailyStats = {
        id: date,
        date,
        totalGenerations: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        averageTime: 0,
        topModels: {},
        topDimensions: {}
      }
    }

    // Update counters
    dailyStats.totalGenerations++
    if (item.status === 'completed') {
      dailyStats.successfulGenerations++
    } else if (item.status === 'failed') {
      dailyStats.failedGenerations++
    }

    // Update model stats
    const modelName = item.metadata.model?.name || 'Unknown'
    dailyStats.topModels[modelName] = (dailyStats.topModels[modelName] || 0) + 1

    // Update dimension stats
    const dimensions = `${item.metadata.image?.width || 512}x${item.metadata.image?.height || 512}`
    dailyStats.topDimensions[dimensions] = (dailyStats.topDimensions[dimensions] || 0) + 1

    // Update average time if available
    if (item.metadata.timing?.duration) {
      const currentAvg = dailyStats.averageTime || 0
      const count = dailyStats.totalGenerations
      dailyStats.averageTime = ((currentAvg * (count - 1)) + item.metadata.timing.duration) / count
    }

    await this.promisifyRequest(statsStore.put(dailyStats))
  }

  // =========================================================================
  // LocalStorage Fallback Methods
  // =========================================================================

  private getFromLocalStorage<T>(key: string): T[] {
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error(`Failed to read from localStorage key ${key}:`, error)
      return []
    }
  }

  private setToLocalStorage<T>(key: string, data: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error(`Failed to write to localStorage key ${key}:`, error)
      // Try to clear some space and retry once
      this.cleanupLocalStorage()
      try {
        localStorage.setItem(key, JSON.stringify(data))
      } catch (retryError) {
        throw new Error(`LocalStorage quota exceeded: ${retryError}`)
      }
    }
  }

  private cleanupLocalStorage(): void {
    try {
      // Remove oldest items if storage is full
      const generations = this.getFromLocalStorage<StoredGeneration>(STORAGE_KEYS.GENERATIONS)
      if (generations.length > 1000) {
        // Keep only the 800 most recent items
        const sorted = generations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        const trimmed = sorted.slice(0, 800)
        this.setToLocalStorage(STORAGE_KEYS.GENERATIONS, trimmed)
        console.log(`Cleaned up localStorage: ${generations.length} -> ${trimmed.length} items`)
      }
    } catch (error) {
      console.error('Failed to cleanup localStorage:', error)
    }
  }

  private async addGenerationToLocalStorage(item: GenerationHistoryItem): Promise<void> {
    const generations = this.getFromLocalStorage<StoredGeneration>(STORAGE_KEYS.GENERATIONS)
    const searchableText = [
      item.metadata.prompts.positive,
      item.metadata.prompts.negative,
      item.metadata.model?.name || '',
      item.metadata.generation?.sampler || '',
      item.metadata.generation?.scheduler || ''
    ].join(' ').toLowerCase()

    const storedGeneration: StoredGeneration = {
      ...item,
      searchableText,
      tags: [],
      rating: undefined,
      notes: undefined
    }

    // Add to beginning (newest first)
    generations.unshift(storedGeneration)
    
    // Limit to prevent storage overflow (keep most recent 1000)
    if (generations.length > 1000) {
      generations.splice(1000)
    }

    this.setToLocalStorage(STORAGE_KEYS.GENERATIONS, generations)
  }

  private async searchGenerationsInLocalStorage(params: HistorySearchParams = {}): Promise<HistorySearchResult> {
    const generations = this.getFromLocalStorage<StoredGeneration>(STORAGE_KEYS.GENERATIONS)
    let filtered = this.applyClientSideFilters(generations, params)
    
    // Apply sorting
    const { sortBy = 'timestamp', sortOrder = 'desc' } = params
    filtered = this.sortResults(filtered, sortBy, sortOrder)

    // Apply pagination
    const { limit = 50, offset = 0 } = params
    const total = filtered.length
    const paginatedResults = filtered.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return {
      items: paginatedResults,
      total,
      hasMore
    }
  }

  private async getStatsFromLocalStorage(): Promise<HistoryStats> {
    const generations = this.getFromLocalStorage<StoredGeneration>(STORAGE_KEYS.GENERATIONS)
    
    if (generations.length === 0) {
      return {
        totalGenerations: 0,
        successRate: 0,
        averageGenerationTime: 0,
        totalStorageUsed: 0,
        topModels: [],
        topDimensions: [],
        generationsPerDay: [],
        successRateOverTime: []
      }
    }

    // Calculate basic stats (same logic as IndexedDB version)
    const totalGenerations = generations.length
    const successfulGenerations = generations.filter(g => g.status === 'completed').length
    const successRate = (successfulGenerations / totalGenerations) * 100

    const generationsWithTiming = generations.filter(g => 
      g.metadata.timing?.duration && g.metadata.timing.duration > 0
    )
    const averageGenerationTime = generationsWithTiming.length > 0
      ? generationsWithTiming.reduce((sum, g) => sum + (g.metadata.timing!.duration || 0), 0) / generationsWithTiming.length
      : 0

    const timestamps = generations.map(g => new Date(g.timestamp)).sort((a, b) => a.getTime() - b.getTime())
    const oldestGeneration = timestamps[0]
    const newestGeneration = timestamps[timestamps.length - 1]

    // Calculate top models
    const modelCounts = new Map<string, number>()
    generations.forEach(g => {
      const modelName = g.metadata.model?.name || 'Unknown'
      modelCounts.set(modelName, (modelCounts.get(modelName) || 0) + 1)
    })

    const topModels = Array.from(modelCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / totalGenerations) * 100
      }))

    // Calculate top dimensions
    const dimensionCounts = new Map<string, number>()
    generations.forEach(g => {
      const dimensions = `${g.metadata.image?.width || 512}x${g.metadata.image?.height || 512}`
      dimensionCounts.set(dimensions, (dimensionCounts.get(dimensions) || 0) + 1)
    })

    const topDimensions = Array.from(dimensionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([dimensions, count]) => ({
        dimensions,
        count,
        percentage: (count / totalGenerations) * 100
      }))

    // Calculate daily stats
    const dailyStats = new Map<string, { total: number; successful: number }>()
    generations.forEach(g => {
      const date = new Date(g.timestamp).toISOString().split('T')[0]
      if (!dailyStats.has(date)) {
        dailyStats.set(date, { total: 0, successful: 0 })
      }
      const stats = dailyStats.get(date)!
      stats.total++
      if (g.status === 'completed') {
        stats.successful++
      }
    })

    const generationsPerDay = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({ date, count: stats.total }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const successRateOverTime = Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        rate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Estimate storage usage
    const averageItemSize = JSON.stringify(generations[0] || {}).length
    const totalStorageUsed = totalGenerations * averageItemSize

    return {
      totalGenerations,
      successRate,
      averageGenerationTime,
      totalStorageUsed,
      oldestGeneration,
      newestGeneration,
      topModels,
      topDimensions,
      generationsPerDay,
      successRateOverTime
    }
  }
}

// Singleton instance
export const historyManager = new HistoryManager()