// ============================================================================
// ComfyUI React - Preset Type Definitions
// ============================================================================

// Import ComfyUI workflow types from main types file
import type { ComfyUIWorkflow } from './index'

// Core preset interface
export interface IPreset {
  id: string
  name: string
  description?: string
  createdAt: Date
  lastModified: Date
  workflowData: ComfyUIWorkflow
  metadata: IPresetMetadata
  compressed: boolean
  size: number
  tags?: string[]
  category?: PresetCategory
  version?: string
}

// Comprehensive preset metadata
export interface IPresetMetadata {
  model: {
    name: string
    architecture: string
    hash?: string
  }
  generation: {
    steps: number
    cfg: number
    sampler: string
    scheduler: string
    seed: number
    denoise?: number
  }
  dimensions: {
    width: number
    height: number
    batchSize: number
  }
  prompts: {
    positive: string
    negative: string
  }
  timingEstimate?: {
    estimatedSeconds: number
    hardwareProfile?: string
  }
  compatibility?: {
    comfyuiVersion?: string
    requiredNodes?: string[]
    customNodes?: string[]
  }
}

// Preset categories for organization
export type PresetCategory = 'quality' | 'speed' | 'style' | 'custom' | 'imported' | 'dimension'

// Storage information interface
export interface IPresetStorageInfo {
  totalSize: number
  presetCount: number
  compressionRatio: number
  availableSpace: number
  quotaUsagePercent: number
  needsCleanup: boolean
}

// Preset creation input (omits auto-generated fields)
export interface IPresetCreateInput {
  name: string
  description?: string
  workflowData: ComfyUIWorkflow
  metadata: IPresetMetadata
  tags?: string[]
  category?: PresetCategory
}

// Preset update input (partial updates allowed)
export interface IPresetUpdateInput {
  name?: string
  metadata?: Partial<IPresetMetadata>
  tags?: string[]
  category?: PresetCategory
}

// Import/Export format
export interface IPresetExportData {
  version: string
  exportedAt: string
  preset: IPreset
  checksum?: string
}

export interface IPresetsExportData {
  version: string
  exportedAt: string
  presets: IPreset[]
  metadata: {
    totalCount: number
    totalSize: number
    compressionUsed: boolean
  }
  checksum?: string
}

// Service operation results
export interface IPresetOperationResult {
  success: boolean
  preset?: IPreset
  error?: string
  warnings?: string[]
}

export interface IPresetImportResult {
  success: boolean
  imported: IPreset[]
  skipped: number
  errors: string[]
  warnings: string[]
}

// Search and filter options
export interface IPresetSearchOptions {
  query?: string
  category?: PresetCategory
  tags?: string[]
  dateRange?: {
    from: Date
    to: Date
  }
  sortBy?: 'name' | 'createdAt' | 'lastModified' | 'size'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Validation result
export interface IPresetValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions?: string[]
}

// Compression options
export interface ICompressionOptions {
  algorithm: 'gzip' | 'deflate' | 'lzstring' | 'none'
  level?: number
  threshold: number
  maxSize: number
  chunkSize?: number
}

// Storage configuration
export interface IPresetStorageConfig {
  storageKey: string
  maxPresets: number
  maxTotalSize: number
  compressionThreshold: number
  autoCleanup: boolean
  backupCount: number
}

// Service configuration
export interface IPresetServiceConfig {
  storage: IPresetStorageConfig
  compression: ICompressionOptions
  validation: {
    strictMode: boolean
    requireMetadata: boolean
    allowDuplicateNames: boolean
  }
}