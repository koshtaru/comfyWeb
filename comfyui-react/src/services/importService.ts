// ============================================================================
// ComfyUI React - Import Service
// ============================================================================

import type { IPreset, IPresetImportResult, IPresetsExportData, IPresetExportData } from '@/types/preset'
import type { ComfyUIWorkflow } from '@/types'
import { compressionService } from '@/utils/compression'
import { v4 as uuidv4 } from 'uuid'

export interface IImportOptions {
  validateWorkflows: boolean
  checkDuplicates: boolean
  autoMigrate: boolean
  mergeMetadata: boolean
  preserveIds: boolean
}

export interface IImportValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  format?: 'comfyui' | 'automatic1111' | 'invokeai' | 'raw-workflow' | 'unknown'
  version?: string
  presetCount?: number
}

export interface IImportConflict {
  importedPreset: IPreset
  existingPreset: IPreset
  differences: {
    field: string
    imported: any
    existing: any
  }[]
  resolution?: 'replace' | 'skip' | 'merge' | 'rename'
}

export interface IImportProgress {
  total: number
  processed: number
  succeeded: number
  failed: number
  skipped: number
  currentPreset?: string
  errors: Array<{ preset: string; error: string }>
}

export type ImportProgressCallback = (progress: IImportProgress) => void

export class ImportService {
  private progressCallback?: ImportProgressCallback
  private readonly SUPPORTED_VERSIONS = ['1.0.0', '2.0.0']

  /**
   * Import presets from JSON data with validation
   */
  async importPresets(
    data: string | File,
    existingPresets: IPreset[],
    options: IImportOptions = {
      validateWorkflows: true,
      checkDuplicates: true,
      autoMigrate: true,
      mergeMetadata: false,
      preserveIds: false
    },
    progressCallback?: ImportProgressCallback
  ): Promise<IPresetImportResult> {
    this.progressCallback = progressCallback

    try {
      // Parse input data
      const jsonData = await this.parseInputData(data)
      
      // Validate import data
      const validation = await this.validateImportData(jsonData)
      if (!validation.isValid) {
        return {
          success: false,
          imported: [],
          skipped: 0,
          errors: validation.errors,
          warnings: validation.warnings
        }
      }

      // Extract presets based on format
      const extractedPresets = await this.extractPresets(jsonData, validation.format!)
      
      // Process each preset
      const result = await this.processPresets(
        extractedPresets,
        existingPresets,
        options
      )

      return result
    } catch (error) {
      return {
        success: false,
        imported: [],
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Import failed'],
        warnings: []
      }
    }
  }

  /**
   * Parse input data from string or file
   */
  private async parseInputData(data: string | File): Promise<any> {
    let jsonString: string

    if (data instanceof File) {
      jsonString = await this.readFile(data)
    } else {
      jsonString = data
    }

    // Check if data is compressed
    try {
      const parsed = JSON.parse(jsonString)
      
      if (parsed.compressed && parsed.algorithm && parsed.data) {
        // Decompress the data
        const decompressed = await compressionService.decompressWorkflow(
          parsed.data,
          parsed.algorithm
        )
        return decompressed
      }
      
      return parsed
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }

  /**
   * Read file content
   */
  private readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  /**
   * Validate import data structure
   */
  private async validateImportData(data: any): Promise<IImportValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    let format: 'comfyui' | 'automatic1111' | 'invokeai' | 'raw-workflow' | 'unknown' = 'unknown'
    let version: string | undefined
    let presetCount = 0

    // Detect format
    if (data.version && (data.presets || data.preset)) {
      // ComfyUI preset export format
      format = 'comfyui'
      version = data.version
      
      if (!this.SUPPORTED_VERSIONS.includes(version)) {
        warnings.push(`Import file version ${version} may require migration`)
      }
      
      if (data.presets && Array.isArray(data.presets)) {
        presetCount = data.presets.length
      } else if (data.preset) {
        presetCount = 1
      }
      
      // Validate checksum if present
      if (data.checksum) {
        const { checksum, ...dataWithoutChecksum } = data
        const calculatedChecksum = this.generateChecksum(JSON.stringify(dataWithoutChecksum, null, 2))
        
        if (checksum !== calculatedChecksum) {
          warnings.push('Checksum mismatch - data may be corrupted')
        }
      }
    } else if (this.isRawComfyUIWorkflow(data)) {
      // Raw ComfyUI workflow format
      format = 'raw-workflow'
      version = data.version?.toString() || '0.4'
      presetCount = 1
      warnings.push('Raw ComfyUI workflow detected - will be converted to preset format')
    } else if (Array.isArray(data) && data.length > 0) {
      // Check for Automatic1111 format
      if (data[0].prompt !== undefined && data[0].negative_prompt !== undefined) {
        format = 'automatic1111'
        presetCount = data.length
      }
    } else if (data.meta && data.presets) {
      // InvokeAI format
      format = 'invokeai'
      version = data.meta.version
      presetCount = data.presets.length
    }

    // Validate based on format
    switch (format) {
      case 'comfyui':
        if (!data.exportedAt) {
          warnings.push('Missing export timestamp')
        }
        break
      
      case 'raw-workflow':
        // No additional validation needed for raw workflows
        break
      
      case 'automatic1111':
        warnings.push('Automatic1111 format detected - conversion will be applied')
        break
      
      case 'invokeai':
        warnings.push('InvokeAI format detected - conversion will be applied')
        break
      
      default:
        errors.push('Unrecognized import format - supported: ComfyUI presets, raw workflows, Automatic1111, InvokeAI')
    }

    // Additional validation
    if (presetCount === 0) {
      errors.push('No presets found in import data')
    }

    if (presetCount > 1000) {
      warnings.push(`Large import detected (${presetCount} presets) - this may take some time`)
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      format,
      version,
      presetCount
    }
  }

  /**
   * Extract presets from import data based on format
   */
  private async extractPresets(data: any, format: string): Promise<IPreset[]> {
    switch (format) {
      case 'comfyui':
        return this.extractComfyUIPresets(data)
      
      case 'raw-workflow':
        return this.convertFromRawWorkflow(data)
      
      case 'automatic1111':
        return this.convertFromAutomatic1111(data)
      
      case 'invokeai':
        return this.convertFromInvokeAI(data.presets)
      
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  /**
   * Extract ComfyUI format presets
   */
  private extractComfyUIPresets(data: any): IPreset[] {
    if (data.presets && Array.isArray(data.presets)) {
      return data.presets
    } else if (data.preset) {
      return [data.preset]
    }
    return []
  }

  /**
   * Convert from Automatic1111 format
   */
  private convertFromAutomatic1111(data: any[]): IPreset[] {
    return data.map(a1111Preset => {
      const preset: IPreset = {
        id: uuidv4(),
        name: a1111Preset.name || 'Imported A1111 Preset',
        createdAt: new Date(),
        lastModified: new Date(),
        workflowData: this.createWorkflowFromA1111(a1111Preset),
        metadata: {
          model: {
            name: a1111Preset.model || 'Unknown',
            architecture: 'SD1.5', // Assume SD1.5 for A1111
            hash: undefined
          },
          generation: {
            steps: a1111Preset.steps || 20,
            cfg: a1111Preset.cfg_scale || 7,
            sampler: this.mapA1111Sampler(a1111Preset.sampler_name || 'Euler'),
            scheduler: 'normal',
            seed: a1111Preset.seed || -1
          },
          dimensions: {
            width: a1111Preset.width || 512,
            height: a1111Preset.height || 512,
            batchSize: a1111Preset.batch_size || 1
          },
          prompts: {
            positive: a1111Preset.prompt || '',
            negative: a1111Preset.negative_prompt || ''
          }
        },
        compressed: false,
        size: 0, // Will be calculated later
        tags: ['imported', 'automatic1111'],
        category: 'imported',
        version: '1.0.0'
      }

      // Calculate size
      preset.size = new Blob([JSON.stringify(preset.workflowData)]).size

      return preset
    })
  }

  /**
   * Convert from InvokeAI format
   */
  private convertFromInvokeAI(data: any[]): IPreset[] {
    return data.map(invokePreset => {
      const preset: IPreset = {
        id: uuidv4(),
        name: invokePreset.name || 'Imported InvokeAI Preset',
        description: invokePreset.description,
        createdAt: new Date(),
        lastModified: new Date(),
        workflowData: this.createWorkflowFromInvokeAI(invokePreset),
        metadata: {
          model: {
            name: invokePreset.model || 'Unknown',
            architecture: 'SD1.5',
            hash: undefined
          },
          generation: {
            steps: invokePreset.steps || 20,
            cfg: invokePreset.cfg_scale || 7,
            sampler: invokePreset.sampler || 'euler',
            scheduler: 'normal',
            seed: invokePreset.seed || -1
          },
          dimensions: {
            width: invokePreset.width || 512,
            height: invokePreset.height || 512,
            batchSize: 1
          },
          prompts: {
            positive: invokePreset.positive_prompt || '',
            negative: invokePreset.negative_prompt || ''
          }
        },
        compressed: false,
        size: 0,
        tags: ['imported', 'invokeai'],
        category: 'imported',
        version: '1.0.0'
      }

      preset.size = new Blob([JSON.stringify(preset.workflowData)]).size
      return preset
    })
  }

  /**
   * Create ComfyUI workflow from A1111 preset
   */
  private createWorkflowFromA1111(a1111Preset: any): ComfyUIWorkflow {
    // This is a simplified example - in reality, you'd create a full workflow
    return {
      nodes: {
        '1': {
          class_type: 'CheckpointLoaderSimple',
          inputs: {
            ckpt_name: a1111Preset.model || 'model.safetensors'
          }
        },
        '2': {
          class_type: 'CLIPTextEncode',
          inputs: {
            text: a1111Preset.prompt || '',
            clip: ['1', 1]
          }
        },
        '3': {
          class_type: 'CLIPTextEncode',
          inputs: {
            text: a1111Preset.negative_prompt || '',
            clip: ['1', 1]
          }
        },
        '4': {
          class_type: 'KSampler',
          inputs: {
            seed: a1111Preset.seed || -1,
            steps: a1111Preset.steps || 20,
            cfg: a1111Preset.cfg_scale || 7,
            sampler_name: this.mapA1111Sampler(a1111Preset.sampler_name || 'Euler'),
            scheduler: 'normal',
            denoise: 1,
            model: ['1', 0],
            positive: ['2', 0],
            negative: ['3', 0],
            latent_image: ['5', 0]
          }
        },
        '5': {
          class_type: 'EmptyLatentImage',
          inputs: {
            width: a1111Preset.width || 512,
            height: a1111Preset.height || 512,
            batch_size: a1111Preset.batch_size || 1
          }
        }
      },
      links: [],
      groups: [],
      config: {},
      extra: {},
      version: 0.4
    }
  }

  /**
   * Create ComfyUI workflow from InvokeAI preset
   */
  private createWorkflowFromInvokeAI(invokePreset: any): ComfyUIWorkflow {
    // Similar to A1111 conversion
    return this.createWorkflowFromA1111(invokePreset)
  }

  /**
   * Map A1111 sampler names to ComfyUI format
   */
  private mapA1111Sampler(sampler: string): string {
    const samplerMap: Record<string, string> = {
      'Euler': 'euler',
      'Euler a': 'euler_ancestral',
      'Heun': 'heun',
      'DPM2': 'dpm_2',
      'DPM2 a': 'dpm_2_ancestral',
      'LMS': 'lms',
      'DPM fast': 'dpm_fast',
      'DPM adaptive': 'dpm_adaptive',
      'DPM++ 2S a': 'dpmpp_2s_ancestral',
      'DPM++ SDE': 'dpmpp_sde',
      'DPM++ 2M': 'dpmpp_2m',
      'DPM++ 2M SDE': 'dpmpp_2m_sde',
      'DPM++ 3M SDE': 'dpmpp_3m_sde',
      'DDIM': 'ddim',
      'PLMS': 'plms',
      'UniPC': 'uni_pc',
      'UniPC BH2': 'uni_pc_bh2'
    }
    
    return samplerMap[sampler] || sampler.toLowerCase()
  }

  /**
   * Process presets with conflict detection and resolution
   */
  private async processPresets(
    importedPresets: IPreset[],
    existingPresets: IPreset[],
    options: IImportOptions
  ): Promise<IPresetImportResult> {
    const result: IPresetImportResult = {
      success: false,
      imported: [],
      skipped: 0,
      errors: [],
      warnings: []
    }

    const progress: IImportProgress = {
      total: importedPresets.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      errors: []
    }

    for (const importedPreset of importedPresets) {
      progress.currentPreset = importedPreset.name
      
      try {
        // Validate workflow if requested
        if (options.validateWorkflows) {
          const workflowValidation = await this.validateWorkflow(importedPreset.workflowData)
          if (!workflowValidation.isValid) {
            progress.failed++
            progress.errors.push({
              preset: importedPreset.name,
              error: workflowValidation.error || 'Invalid workflow'
            })
            result.errors.push(`${importedPreset.name}: ${workflowValidation.error}`)
            continue
          }
        }

        // Check for duplicates
        if (options.checkDuplicates) {
          const conflict = this.detectConflict(importedPreset, existingPresets)
          
          if (conflict) {
            // For now, skip duplicates
            // In the full implementation, this would trigger the conflict resolution UI
            progress.skipped++
            result.skipped++
            result.warnings.push(`Skipped duplicate preset: ${importedPreset.name}`)
            continue
          }
        }

        // Migrate if needed
        if (options.autoMigrate && importedPreset.version !== '2.0.0') {
          const migrated = await this.migratePreset(importedPreset)
          Object.assign(importedPreset, migrated)
        }

        // Generate new ID unless preserving
        if (!options.preserveIds) {
          importedPreset.id = uuidv4()
        }

        // Update timestamps
        importedPreset.createdAt = new Date()
        importedPreset.lastModified = new Date()

        result.imported.push(importedPreset)
        progress.succeeded++
      } catch (error) {
        progress.failed++
        progress.errors.push({
          preset: importedPreset.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        result.errors.push(`${importedPreset.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }

      progress.processed++
      
      // Report progress
      if (this.progressCallback) {
        this.progressCallback({ ...progress })
      }
    }

    result.success = result.imported.length > 0

    return result
  }

  /**
   * Validate ComfyUI workflow structure
   */
  private async validateWorkflow(workflow: ComfyUIWorkflow): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Basic structure validation
      if (!workflow.nodes || typeof workflow.nodes !== 'object') {
        return { isValid: false, error: 'Missing or invalid nodes' }
      }

      // Check for required node types
      const nodeTypes = Object.values(workflow.nodes).map(node => node.class_type)
      const hasLoader = nodeTypes.some(type => 
        type.includes('Loader') || type.includes('LoadImage')
      )
      
      if (!hasLoader) {
        return { isValid: false, error: 'Workflow missing loader node' }
      }

      // Validate node connections
      for (const [nodeId, node] of Object.entries(workflow.nodes)) {
        if (node.inputs) {
          for (const [inputName, inputValue] of Object.entries(node.inputs)) {
            if (Array.isArray(inputValue) && inputValue.length === 2) {
              const [sourceNodeId] = inputValue
              if (!workflow.nodes[sourceNodeId]) {
                return { 
                  isValid: false, 
                  error: `Node ${nodeId} references non-existent node ${sourceNodeId}` 
                }
              }
            }
          }
        }
      }

      return { isValid: true }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Workflow validation failed' 
      }
    }
  }

  /**
   * Detect conflicts with existing presets
   */
  private detectConflict(
    importedPreset: IPreset,
    existingPresets: IPreset[]
  ): IImportConflict | null {
    // Check by name
    const nameMatch = existingPresets.find(p => p.name === importedPreset.name)
    if (nameMatch) {
      return {
        importedPreset,
        existingPreset: nameMatch,
        differences: this.comparePresets(importedPreset, nameMatch)
      }
    }

    // Check by workflow similarity (simplified)
    const workflowString = JSON.stringify(importedPreset.workflowData)
    const similarWorkflow = existingPresets.find(p => 
      JSON.stringify(p.workflowData) === workflowString
    )
    
    if (similarWorkflow) {
      return {
        importedPreset,
        existingPreset: similarWorkflow,
        differences: this.comparePresets(importedPreset, similarWorkflow)
      }
    }

    return null
  }

  /**
   * Compare two presets and find differences
   */
  private comparePresets(preset1: IPreset, preset2: IPreset): Array<{
    field: string
    imported: any
    existing: any
  }> {
    const differences: Array<{ field: string; imported: any; existing: any }> = []
    
    // Compare basic fields
    const fieldsToCompare = ['name', 'description', 'category', 'compressed']
    
    for (const field of fieldsToCompare) {
      if ((preset1 as any)[field] !== (preset2 as any)[field]) {
        differences.push({
          field,
          imported: (preset1 as any)[field],
          existing: (preset2 as any)[field]
        })
      }
    }

    // Compare tags
    const tags1 = preset1.tags?.sort().join(',') || ''
    const tags2 = preset2.tags?.sort().join(',') || ''
    if (tags1 !== tags2) {
      differences.push({
        field: 'tags',
        imported: preset1.tags,
        existing: preset2.tags
      })
    }

    // Compare metadata
    if (JSON.stringify(preset1.metadata) !== JSON.stringify(preset2.metadata)) {
      differences.push({
        field: 'metadata',
        imported: preset1.metadata,
        existing: preset2.metadata
      })
    }

    return differences
  }

  /**
   * Migrate preset to current version
   */
  private async migratePreset(preset: IPreset): Promise<Partial<IPreset>> {
    const updates: Partial<IPreset> = {
      version: '2.0.0'
    }

    // Version-specific migrations
    if (!preset.version || preset.version === '1.0.0') {
      // Migrate from 1.0.0 to 2.0.0
      if (!preset.metadata) {
        updates.metadata = {
          model: { name: 'Unknown', architecture: 'SD1.5' },
          generation: { steps: 20, cfg: 7, sampler: 'euler', scheduler: 'normal', seed: -1 },
          dimensions: { width: 512, height: 512, batchSize: 1 },
          prompts: { positive: '', negative: '' }
        }
      }

      if (!preset.tags) {
        updates.tags = ['migrated']
      }

      if (!preset.category) {
        updates.category = 'custom'
      }
    }

    return updates
  }

  /**
   * Check if data is a raw ComfyUI workflow
   */
  private isRawComfyUIWorkflow(data: any): boolean {
    if (!data || typeof data !== 'object') return false
    
    // Check for typical ComfyUI workflow structure
    // Look for numeric node IDs and class_type properties
    const hasNumericKeys = Object.keys(data).some(key => /^\d+$/.test(key))
    
    if (hasNumericKeys) {
      // Check if the numeric keys contain ComfyUI node structure
      const numericEntries = Object.entries(data).filter(([key]) => /^\d+$/.test(key))
      
      if (numericEntries.length > 0) {
        const [, firstNode] = numericEntries[0] as [string, any]
        
        // Check if it has ComfyUI node structure
        return firstNode && 
               typeof firstNode === 'object' && 
               (firstNode.class_type || firstNode.inputs)
      }
    }
    
    // Alternative check: look for ComfyUI workflow structure with nodes object
    return !!(data.nodes && typeof data.nodes === 'object' && 
             Object.keys(data.nodes).length > 0 &&
             Object.values(data.nodes).some((node: any) => 
               node && typeof node === 'object' && node.class_type
             ))
  }

  /**
   * Convert raw ComfyUI workflow to preset format
   */
  private convertFromRawWorkflow(workflowData: any): IPreset[] {
    // Convert raw workflow to proper ComfyUI format with nodes wrapper
    const properWorkflowData = {
      nodes: workflowData,
      links: [],
      groups: [],
      config: {},
      extra: {},
      version: 0.4
    }

    const preset: IPreset = {
      id: uuidv4(),
      name: `Imported Workflow ${new Date().toLocaleDateString()}`,
      description: 'Imported from raw ComfyUI workflow file',
      createdAt: new Date(),
      lastModified: new Date(),
      workflowData: properWorkflowData,
      metadata: this.extractMetadataFromWorkflow(workflowData), // Still extract from raw data
      compressed: false,
      size: new Blob([JSON.stringify(properWorkflowData)]).size,
      tags: ['imported', 'raw-workflow'],
      category: 'imported',
      version: '2.0.0'
    }

    return [preset]
  }

  /**
   * Extract metadata from raw ComfyUI workflow
   */
  private extractMetadataFromWorkflow(workflow: any): any {
    const metadata = {
      model: { name: 'Unknown Model', architecture: 'SD1.5', hash: undefined },
      generation: { steps: 20, cfg: 7, sampler: 'euler', scheduler: 'normal', seed: -1 },
      dimensions: { width: 512, height: 512, batchSize: 1 },
      prompts: { positive: '', negative: '' },
      compatibility: {
        requiredNodes: [],
        customNodes: []
      }
    }

    try {
      // Extract information from workflow nodes
      const nodes = workflow.nodes || workflow
      const nodeEntries = Object.entries(nodes)

      // Find key nodes and extract information
      for (const [nodeId, node] of nodeEntries) {
        if (!node || typeof node !== 'object') continue
        
        const nodeData = node as any

        // Extract model information
        if (nodeData.class_type === 'CheckpointLoaderSimple' && nodeData.inputs?.ckpt_name) {
          metadata.model.name = nodeData.inputs.ckpt_name
        }

        // Extract sampling parameters
        if (nodeData.class_type === 'KSampler' && nodeData.inputs) {
          const inputs = nodeData.inputs
          if (inputs.steps) metadata.generation.steps = inputs.steps
          if (inputs.cfg) metadata.generation.cfg = inputs.cfg
          if (inputs.sampler_name) metadata.generation.sampler = inputs.sampler_name
          if (inputs.scheduler) metadata.generation.scheduler = inputs.scheduler
          if (inputs.seed) metadata.generation.seed = inputs.seed
        }

        // Extract dimensions
        if (nodeData.class_type === 'EmptyLatentImage' && nodeData.inputs) {
          const inputs = nodeData.inputs
          if (inputs.width) metadata.dimensions.width = inputs.width
          if (inputs.height) metadata.dimensions.height = inputs.height
          if (inputs.batch_size) metadata.dimensions.batchSize = inputs.batch_size
        }

        // Extract prompts
        if (nodeData.class_type === 'CLIPTextEncode' && nodeData.inputs?.text) {
          // Simple heuristic: first text encode is positive, second is negative
          if (!metadata.prompts.positive) {
            metadata.prompts.positive = nodeData.inputs.text
          } else if (!metadata.prompts.negative) {
            metadata.prompts.negative = nodeData.inputs.text
          }
        }

        // Collect required nodes
        if (nodeData.class_type && !metadata.compatibility.requiredNodes.includes(nodeData.class_type)) {
          metadata.compatibility.requiredNodes.push(nodeData.class_type)
        }
      }

      // Detect architecture based on dimensions
      const resolution = metadata.dimensions.width * metadata.dimensions.height
      if (resolution <= 512 * 768) {
        metadata.model.architecture = 'SD1.5'
      } else if (resolution <= 1024 * 1024) {
        metadata.model.architecture = 'SDXL'
      } else {
        metadata.model.architecture = 'SD3'
      }

    } catch (error) {
      console.warn('Failed to extract metadata from workflow:', error)
    }

    return metadata
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }
}

// Export singleton instance
export const importService = new ImportService()