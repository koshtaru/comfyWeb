// ============================================================================
// ComfyUI React - Preset Service
// ============================================================================

import type { ComfyUIWorkflow } from '@/types'
import type {
  IPreset,
  IPresetMetadata,
  IPresetCreateInput,
  IPresetUpdateInput,
  IPresetStorageInfo,
  IPresetOperationResult,
  IPresetImportResult,
  IPresetSearchOptions,
  IPresetValidationResult,
  IPresetServiceConfig,
  IPresetExportData,
  IPresetsExportData,
} from '@/types/preset'
import { compressionService } from '@/utils/compression'

// Default service configuration
const DEFAULT_CONFIG: IPresetServiceConfig = {
  storage: {
    storageKey: 'comfyui-presets-v2',
    maxPresets: 1000,
    maxTotalSize: 10 * 1024 * 1024, // 10MB
    compressionThreshold: 1024, // 1KB
    autoCleanup: true,
    backupCount: 5,
  },
  compression: {
    algorithm: 'gzip',
    level: 6,
    threshold: 1024,
    maxSize: 5 * 1024 * 1024,
  },
  validation: {
    strictMode: false,
    requireMetadata: true,
    allowDuplicateNames: false,
  },
}

/**
 * Comprehensive preset management service
 * Handles CRUD operations, compression, storage monitoring, and import/export
 */
export class PresetService {
  private config: IPresetServiceConfig
  private cache: Map<string, IPreset> = new Map()
  private isInitialized = false

  constructor(config: Partial<IPresetServiceConfig> = {}) {
    this.config = this.mergeConfig(DEFAULT_CONFIG, config)
  }

  /**
   * Initialize the service and load existing presets
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await this.loadPresetsFromStorage()
      await this.performMaintenanceTasks()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize PresetService:', error)
      throw new Error('PresetService initialization failed')
    }
  }

  // ============================================================================
  // Core CRUD Operations
  // ============================================================================

  /**
   * Save a new preset
   */
  async savePreset(input: IPresetCreateInput): Promise<IPresetOperationResult> {
    try {
      // Validate input
      const validation = await this.validatePresetInput(input)
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        }
      }

      // Check for duplicate names if not allowed
      if (!this.config.validation.allowDuplicateNames) {
        const existing = Array.from(this.cache.values()).find(
          p => p.name.toLowerCase() === input.name.toLowerCase()
        )
        if (existing) {
          return {
            success: false,
            error: 'A preset with this name already exists',
          }
        }
      }

      // Compress workflow data
      const compressionResult = await compressionService.compressWorkflow(input.workflowData)

      // Create preset object
      const preset: IPreset = {
        id: this.generateId(),
        name: input.name.trim(),
        createdAt: new Date(),
        lastModified: new Date(),
        workflowData: input.workflowData,
        metadata: input.metadata,
        compressed: compressionResult.compressed,
        size: compressionResult.compressedSize,
        tags: input.tags || [],
        category: input.category || 'custom',
        version: '1.0.0',
      }

      // Store compressed data
      await this.storePreset(preset, compressionResult.data)

      // Add to cache
      this.cache.set(preset.id, preset)

      return {
        success: true,
        preset,
        warnings: validation.warnings,
      }
    } catch (error) {
      console.error('Failed to save preset:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * Load a preset by ID
   */
  async loadPreset(id: string): Promise<IPreset | null> {
    try {
      // Check cache first
      if (this.cache.has(id)) {
        return this.cache.get(id)!
      }

      // Load from storage
      const stored = await this.getStoredPreset(id)
      if (!stored) return null

      // Add to cache
      this.cache.set(id, stored)
      return stored
    } catch (error) {
      console.error('Failed to load preset:', error)
      return null
    }
  }

  /**
   * Delete a preset
   */
  async deletePreset(id: string): Promise<boolean> {
    try {
      // Remove from storage
      await this.removeStoredPreset(id)

      // Remove from cache
      this.cache.delete(id)

      return true
    } catch (error) {
      console.error('Failed to delete preset:', error)
      return false
    }
  }

  /**
   * List all presets with optional search/filter
   */
  async listPresets(options: IPresetSearchOptions = {}): Promise<IPreset[]> {
    try {
      // Ensure all presets are loaded
      await this.loadAllPresets()

      let presets = Array.from(this.cache.values())

      // Apply filters
      if (options.category) {
        presets = presets.filter(p => p.category === options.category)
      }

      if (options.tags && options.tags.length > 0) {
        presets = presets.filter(p =>
          options.tags!.some(tag => p.tags?.includes(tag))
        )
      }

      if (options.query) {
        const query = options.query.toLowerCase()
        presets = presets.filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.metadata.prompts.positive.toLowerCase().includes(query) ||
          p.metadata.prompts.negative.toLowerCase().includes(query) ||
          p.tags?.some(tag => tag.toLowerCase().includes(query))
        )
      }

      if (options.dateRange) {
        presets = presets.filter(p => {
          const createdAt = new Date(p.createdAt)
          return createdAt >= options.dateRange!.from && createdAt <= options.dateRange!.to
        })
      }

      // Apply sorting
      const sortBy = options.sortBy || 'lastModified'
      const sortOrder = options.sortOrder || 'desc'

      presets.sort((a, b) => {
        let comparison = 0

        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name)
            break
          case 'createdAt':
            comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            break
          case 'lastModified':
            comparison = new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
            break
          case 'size':
            comparison = a.size - b.size
            break
        }

        return sortOrder === 'asc' ? comparison : -comparison
      })

      // Apply pagination
      if (options.limit || options.offset) {
        const offset = options.offset || 0
        const limit = options.limit || presets.length
        presets = presets.slice(offset, offset + limit)
      }

      return presets
    } catch (error) {
      console.error('Failed to list presets:', error)
      return []
    }
  }

  /**
   * Get preset by ID (alias for loadPreset)
   */
  async getPresetById(id: string): Promise<IPreset | null> {
    return this.loadPreset(id)
  }

  /**
   * Update preset metadata
   */
  async updatePresetMetadata(
    id: string,
    updates: IPresetUpdateInput
  ): Promise<IPresetOperationResult> {
    try {
      const preset = await this.loadPreset(id)
      if (!preset) {
        return {
          success: false,
          error: 'Preset not found',
        }
      }

      // Create updated preset
      const updatedPreset: IPreset = {
        ...preset,
        ...updates,
        lastModified: new Date(),
        metadata: updates.metadata ? { ...preset.metadata, ...updates.metadata } : preset.metadata,
      }

      // Validate updates
      const validation = await this.validatePresetInput({
        name: updatedPreset.name,
        workflowData: updatedPreset.workflowData,
        metadata: updatedPreset.metadata,
        tags: updatedPreset.tags,
        category: updatedPreset.category,
      })

      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        }
      }

      // Re-compress if workflow changed
      let compressionData: string
      if (updates.metadata || JSON.stringify(preset.workflowData) !== JSON.stringify(updatedPreset.workflowData)) {
        const compressionResult = await compressionService.compressWorkflow(updatedPreset.workflowData)
        compressionData = compressionResult.data
        updatedPreset.compressed = compressionResult.compressed
        updatedPreset.size = compressionResult.compressedSize
      } else {
        compressionData = await this.getStoredPresetData(id)
      }

      // Store updated preset
      await this.storePreset(updatedPreset, compressionData)

      // Update cache
      this.cache.set(id, updatedPreset)

      return {
        success: true,
        preset: updatedPreset,
        warnings: validation.warnings,
      }
    } catch (error) {
      console.error('Failed to update preset:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  // ============================================================================
  // Storage Management
  // ============================================================================

  /**
   * Get storage information and statistics
   */
  async getStorageInfo(): Promise<IPresetStorageInfo> {
    try {
      await this.loadAllPresets()

      const presets = Array.from(this.cache.values())
      const totalSize = presets.reduce((sum, preset) => sum + preset.size, 0)
      const compressedPresets = presets.filter(p => p.compressed)
      const uncompressedSize = await this.calculateUncompressedSize(presets)

      const compressionRatio = uncompressedSize > 0 ? totalSize / uncompressedSize : 1
      const quotaUsagePercent = (totalSize / this.config.storage.maxTotalSize) * 100
      const needsCleanup = quotaUsagePercent > 80 || presets.length > this.config.storage.maxPresets * 0.9

      return {
        totalSize,
        presetCount: presets.length,
        compressionRatio,
        availableSpace: Math.max(0, this.config.storage.maxTotalSize - totalSize),
        quotaUsagePercent,
        needsCleanup,
      }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return {
        totalSize: 0,
        presetCount: 0,
        compressionRatio: 1,
        availableSpace: this.config.storage.maxTotalSize,
        quotaUsagePercent: 0,
        needsCleanup: false,
      }
    }
  }

  /**
   * Clean up old presets to free space
   */
  async cleanupOldPresets(keepCount: number = 100): Promise<number> {
    try {
      const presets = await this.listPresets({
        sortBy: 'lastModified',
        sortOrder: 'asc',
      })

      const presetsToDelete = presets.slice(0, Math.max(0, presets.length - keepCount))
      let deletedCount = 0

      for (const preset of presetsToDelete) {
        const success = await this.deletePreset(preset.id)
        if (success) deletedCount++
      }

      return deletedCount
    } catch (error) {
      console.error('Failed to cleanup presets:', error)
      return 0
    }
  }

  /**
   * Optimize storage by recompressing presets
   */
  async optimizeStorage(): Promise<void> {
    try {
      const presets = Array.from(this.cache.values())

      for (const preset of presets) {
        if (!preset.compressed) {
          const compressionResult = await compressionService.compressWorkflow(preset.workflowData)
          
          if (compressionResult.compressed && compressionResult.compressedSize < preset.size) {
            const optimizedPreset: IPreset = {
              ...preset,
              compressed: true,
              size: compressionResult.compressedSize,
              lastModified: new Date(),
            }

            await this.storePreset(optimizedPreset, compressionResult.data)
            this.cache.set(preset.id, optimizedPreset)
          }
        }
      }
    } catch (error) {
      console.error('Failed to optimize storage:', error)
    }
  }

  // ============================================================================
  // Import/Export
  // ============================================================================

  /**
   * Export a single preset
   */
  async exportPreset(id: string): Promise<string> {
    const preset = await this.loadPreset(id)
    if (!preset) {
      throw new Error('Preset not found')
    }

    const exportData: IPresetExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      preset,
      checksum: this.generateChecksum(preset),
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Export all presets
   */
  async exportAllPresets(): Promise<string> {
    const presets = await this.listPresets()
    const totalSize = presets.reduce((sum, p) => sum + p.size, 0)

    const exportData: IPresetsExportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      presets,
      metadata: {
        totalCount: presets.length,
        totalSize,
        compressionUsed: presets.some(p => p.compressed),
      },
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import a single preset
   */
  async importPreset(data: string): Promise<IPresetImportResult> {
    try {
      const importData: IPresetExportData = JSON.parse(data)

      if (!importData.preset) {
        return {
          success: false,
          imported: [],
          skipped: 0,
          errors: ['Invalid preset data format'],
          warnings: [],
        }
      }

      // Validate checksum if present
      if (importData.checksum) {
        const calculatedChecksum = this.generateChecksum(importData.preset)
        if (calculatedChecksum !== importData.checksum) {
          return {
            success: false,
            imported: [],
            skipped: 0,
            errors: ['Preset data integrity check failed'],
            warnings: [],
          }
        }
      }

      // Import the preset with a new ID
      const result = await this.savePreset({
        name: `${importData.preset.name} (Imported)`,
        workflowData: importData.preset.workflowData,
        metadata: importData.preset.metadata,
        tags: [...(importData.preset.tags || []), 'imported'],
        category: 'imported',
      })

      if (result.success) {
        return {
          success: true,
          imported: [result.preset!],
          skipped: 0,
          errors: [],
          warnings: result.warnings || [],
        }
      } else {
        return {
          success: false,
          imported: [],
          skipped: 1,
          errors: [result.error || 'Unknown import error'],
          warnings: [],
        }
      }
    } catch (error) {
      return {
        success: false,
        imported: [],
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Invalid import data'],
        warnings: [],
      }
    }
  }

  /**
   * Import multiple presets
   */
  async importPresets(data: string, replace: boolean = false): Promise<IPresetImportResult> {
    try {
      const importData: IPresetsExportData = JSON.parse(data)

      if (!importData.presets || !Array.isArray(importData.presets)) {
        return {
          success: false,
          imported: [],
          skipped: 0,
          errors: ['Invalid presets data format'],
          warnings: [],
        }
      }

      // Clear existing presets if replace is true
      if (replace) {
        const existingPresets = await this.listPresets()
        for (const preset of existingPresets) {
          if (preset.category !== 'custom') continue // Keep non-custom presets
          await this.deletePreset(preset.id)
        }
      }

      const imported: IPreset[] = []
      const errors: string[] = []
      const warnings: string[] = []
      let skipped = 0

      // Import each preset
      for (const presetData of importData.presets) {
        try {
          const result = await this.savePreset({
            name: replace ? presetData.name : `${presetData.name} (Imported)`,
            workflowData: presetData.workflowData,
            metadata: presetData.metadata,
            tags: [...(presetData.tags || []), 'imported'],
            category: 'imported',
          })

          if (result.success) {
            imported.push(result.preset!)
            if (result.warnings) {
              warnings.push(...result.warnings)
            }
          } else {
            errors.push(`Failed to import "${presetData.name}": ${result.error}`)
            skipped++
          }
        } catch (error) {
          errors.push(`Failed to import "${presetData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`)
          skipped++
        }
      }

      return {
        success: imported.length > 0,
        imported,
        skipped,
        errors,
        warnings,
      }
    } catch (error) {
      return {
        success: false,
        imported: [],
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Invalid import data'],
        warnings: [],
      }
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generateId(): string {
    return `preset_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private generateChecksum(preset: IPreset): string {
    const data = JSON.stringify(preset.workflowData) + preset.name + preset.metadata.prompts.positive
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private mergeConfig(
    defaultConfig: IPresetServiceConfig,
    userConfig: Partial<IPresetServiceConfig>
  ): IPresetServiceConfig {
    return {
      storage: { ...defaultConfig.storage, ...userConfig.storage },
      compression: { ...defaultConfig.compression, ...userConfig.compression },
      validation: { ...defaultConfig.validation, ...userConfig.validation },
    }
  }

  private async validatePresetInput(input: IPresetCreateInput): Promise<IPresetValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // Required fields validation
    if (!input.name?.trim()) {
      errors.push('Preset name is required')
    }

    if (!input.workflowData || Object.keys(input.workflowData).length === 0) {
      errors.push('Workflow data is required')
    }

    if (this.config.validation.requireMetadata && !input.metadata) {
      errors.push('Metadata is required')
    }

    // Name validation
    if (input.name && input.name.length > 100) {
      warnings.push('Preset name is very long, consider shortening it')
    }

    // Workflow size validation
    const workflowSize = new Blob([JSON.stringify(input.workflowData)]).size
    if (workflowSize > this.config.compression.maxSize) {
      errors.push(`Workflow is too large (${Math.round(workflowSize / 1024)}KB > ${Math.round(this.config.compression.maxSize / 1024)}KB)`)
    }

    // Metadata validation
    if (input.metadata) {
      if (input.metadata.generation.steps < 1 || input.metadata.generation.steps > 1000) {
        warnings.push('Steps value seems unusual (typical range: 10-50)')
      }

      if (input.metadata.generation.cfg < 1 || input.metadata.generation.cfg > 30) {
        warnings.push('CFG value seems unusual (typical range: 5-15)')
      }

      if (!input.metadata.prompts.positive?.trim()) {
        warnings.push('No positive prompt found in metadata')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    }
  }

  private async loadPresetsFromStorage(): Promise<void> {
    try {
      const keys = this.getStorageKeys()
      
      for (const key of keys) {
        const data = localStorage.getItem(key)
        if (data) {
          const preset = await this.parseStoredPreset(data)
          if (preset) {
            this.cache.set(preset.id, preset)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load presets from storage:', error)
    }
  }

  private async loadAllPresets(): Promise<void> {
    if (this.cache.size === 0) {
      await this.loadPresetsFromStorage()
    }
  }

  private getStorageKeys(): string[] {
    const keys: string[] = []
    const prefix = `${this.config.storage.storageKey}_`

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keys.push(key)
      }
    }

    return keys
  }

  private getPresetStorageKey(id: string): string {
    return `${this.config.storage.storageKey}_${id}`
  }

  private async storePreset(preset: IPreset, compressedData: string): Promise<void> {
    const key = this.getPresetStorageKey(preset.id)
    const storageData = {
      preset: {
        ...preset,
        workflowData: undefined, // Don't store workflow in metadata
      },
      workflowData: compressedData,
      compressed: preset.compressed,
    }

    localStorage.setItem(key, JSON.stringify(storageData))
  }

  private async getStoredPreset(id: string): Promise<IPreset | null> {
    const key = this.getPresetStorageKey(id)
    const data = localStorage.getItem(key)
    
    if (!data) return null

    return this.parseStoredPreset(data)
  }

  private async getStoredPresetData(id: string): Promise<string> {
    const key = this.getPresetStorageKey(id)
    const data = localStorage.getItem(key)
    
    if (!data) throw new Error('Preset not found')

    const parsed = JSON.parse(data)
    return parsed.workflowData
  }

  private async parseStoredPreset(data: string): Promise<IPreset | null> {
    try {
      const parsed = JSON.parse(data)
      const { preset, workflowData, compressed } = parsed

      // Decompress workflow data
      const workflow = await compressionService.decompressWorkflow(workflowData, compressed)

      return {
        ...preset,
        workflowData: workflow,
        createdAt: new Date(preset.createdAt),
        lastModified: new Date(preset.lastModified),
      }
    } catch (error) {
      console.error('Failed to parse stored preset:', error)
      return null
    }
  }

  private async removeStoredPreset(id: string): Promise<void> {
    const key = this.getPresetStorageKey(id)
    localStorage.removeItem(key)
  }

  private async calculateUncompressedSize(presets: IPreset[]): Promise<number> {
    let totalSize = 0

    for (const preset of presets) {
      if (preset.compressed) {
        // Estimate uncompressed size based on workflow
        const workflowSize = new Blob([JSON.stringify(preset.workflowData)]).size
        totalSize += workflowSize
      } else {
        totalSize += preset.size
      }
    }

    return totalSize
  }

  private async performMaintenanceTasks(): Promise<void> {
    if (!this.config.storage.autoCleanup) return

    try {
      const storageInfo = await this.getStorageInfo()

      // Clean up if needed
      if (storageInfo.needsCleanup) {
        await this.cleanupOldPresets(Math.floor(this.config.storage.maxPresets * 0.8))
      }

      // Optimize storage periodically
      if (Math.random() < 0.1) { // 10% chance
        await this.optimizeStorage()
      }
    } catch (error) {
      console.error('Maintenance tasks failed:', error)
    }
  }
}

// Default service instance
export const presetService = new PresetService()

// Initialize on first import
presetService.initialize().catch(console.error)