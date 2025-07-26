// ============================================================================
// ComfyUI React - Export Service
// ============================================================================

import type { IPreset, IPresetsExportData, IPresetExportData } from '@/types/preset'
import { compressionService } from '@/utils/compression'

export interface IExportOptions {
  format: 'json' | 'csv' | 'individual'
  includeMetadata: boolean
  useCompression: boolean
  includeChecksums: boolean
  dateFormat?: 'iso' | 'readable'
  csvDelimiter?: ',' | ';' | '\t'
}

export interface IExportResult {
  success: boolean
  filename: string
  data: string | Blob
  size: number
  format: string
  presetCount: number
  error?: string
}

export interface ICSVExportOptions extends IExportOptions {
  fields: Array<keyof IPreset | 'metadata.model' | 'metadata.generation' | 'metadata.dimensions'>
  includeHeaders: boolean
}

export class ExportService {
  private readonly EXPORT_VERSION = '2.0.0'

  /**
   * Export presets based on specified options
   */
  async exportPresets(
    presets: IPreset[],
    options: IExportOptions
  ): Promise<IExportResult> {
    try {
      switch (options.format) {
        case 'json':
          return await this.exportAsJSONBundle(presets, options)
        case 'csv':
          return await this.exportAsCSV(presets, options as ICSVExportOptions)
        case 'individual':
          return await this.exportAsIndividualFiles(presets, options)
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }
    } catch (error) {
      return {
        success: false,
        filename: '',
        data: '',
        size: 0,
        format: options.format,
        presetCount: 0,
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  /**
   * Export all presets as a single JSON bundle
   */
  private async exportAsJSONBundle(
    presets: IPreset[],
    options: IExportOptions
  ): Promise<IExportResult> {
    const exportData: IPresetsExportData = {
      version: this.EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      presets: options.includeMetadata ? presets : this.stripMetadata(presets),
      metadata: {
        totalCount: presets.length,
        totalSize: presets.reduce((sum, p) => sum + p.size, 0),
        compressionUsed: options.useCompression
      }
    }

    // Add checksum if requested
    if (options.includeChecksums) {
      const dataString = JSON.stringify(exportData, null, 2)
      exportData.checksum = this.generateChecksum(dataString)
    }

    let finalData = JSON.stringify(exportData, null, 2)
    let size = new Blob([finalData]).size

    // Apply compression if requested
    if (options.useCompression) {
      const compressed = await compressionService.compressWorkflow({
        exportData,
        version: this.EXPORT_VERSION
      } as any)
      
      if (compressed.compressed) {
        finalData = JSON.stringify({
          compressed: true,
          algorithm: 'lz-string', // Default compression algorithm used
          data: compressed.data,
          originalSize: size
        })
        size = new Blob([finalData]).size
      }
    }

    const timestamp = this.getTimestamp(options.dateFormat)
    const filename = `comfyui-presets-bundle-${timestamp}.json`

    return {
      success: true,
      filename,
      data: finalData,
      size,
      format: 'json',
      presetCount: presets.length
    }
  }

  /**
   * Export presets as CSV for analysis
   */
  private async exportAsCSV(
    presets: IPreset[],
    options: ICSVExportOptions
  ): Promise<IExportResult> {
    const delimiter = options.csvDelimiter || ','
    const fields = options.fields || [
      'id',
      'name',
      'category',
      'tags',
      'createdAt',
      'lastModified',
      'size',
      'compressed',
      'metadata.model',
      'metadata.generation',
      'metadata.dimensions'
    ]

    // Build CSV headers
    const headers = options.includeHeaders
      ? this.buildCSVHeaders(fields, delimiter)
      : ''

    // Build CSV rows
    const rows = presets.map(preset => 
      this.buildCSVRow(preset, fields, delimiter)
    ).join('\n')

    const csvContent = headers ? `${headers}\n${rows}` : rows
    const size = new Blob([csvContent]).size
    const timestamp = this.getTimestamp(options.dateFormat)
    const filename = `comfyui-presets-metadata-${timestamp}.csv`

    return {
      success: true,
      filename,
      data: csvContent,
      size,
      format: 'csv',
      presetCount: presets.length
    }
  }

  /**
   * Export each preset as an individual file
   */
  private async exportAsIndividualFiles(
    presets: IPreset[],
    options: IExportOptions
  ): Promise<IExportResult> {
    // For browser environment, we'll create a zip file
    // Note: This requires a zip library like JSZip
    const files: Array<{ name: string; content: string }> = []

    for (const preset of presets) {
      const exportData: IPresetExportData = {
        version: this.EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        preset: options.includeMetadata ? preset : this.stripMetadataFromPreset(preset)
      }

      if (options.includeChecksums) {
        const dataString = JSON.stringify(exportData, null, 2)
        exportData.checksum = this.generateChecksum(dataString)
      }

      let content = JSON.stringify(exportData, null, 2)

      if (options.useCompression) {
        const compressed = await compressionService.compressWorkflow({
          exportData,
          version: this.EXPORT_VERSION
        } as any)
        
        if (compressed.compressed) {
          content = JSON.stringify({
            compressed: true,
            algorithm: 'lz-string', // Default compression algorithm used
            data: compressed.data,
            originalSize: new Blob([content]).size
          })
        }
      }

      const safeFilename = preset.name.replace(/[^a-zA-Z0-9-_]/g, '_')
      files.push({
        name: `preset-${safeFilename}.json`,
        content
      })
    }

    // For now, return a JSON bundle of individual files
    // In a real implementation, you'd use JSZip to create a zip file
    const bundleContent = JSON.stringify(files, null, 2)
    const size = new Blob([bundleContent]).size
    const timestamp = this.getTimestamp(options.dateFormat)
    const filename = `comfyui-presets-individual-${timestamp}.json`

    return {
      success: true,
      filename,
      data: bundleContent,
      size,
      format: 'individual',
      presetCount: presets.length
    }
  }

  /**
   * Strip metadata from presets for smaller export size
   */
  private stripMetadata(presets: IPreset[]): IPreset[] {
    return presets.map(preset => this.stripMetadataFromPreset(preset))
  }

  /**
   * Strip metadata from a single preset
   */
  private stripMetadataFromPreset(preset: IPreset): IPreset {
    const { metadata, ...presetWithoutMetadata } = preset
    return presetWithoutMetadata as IPreset
  }

  /**
   * Build CSV headers
   */
  private buildCSVHeaders(fields: string[], delimiter: string): string {
    return fields.map(field => {
      // Convert nested paths to readable headers
      if (field.includes('.')) {
        const parts = field.split('.')
        return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
      }
      return field.charAt(0).toUpperCase() + field.slice(1)
    }).join(delimiter)
  }

  /**
   * Build CSV row for a preset
   */
  private buildCSVRow(preset: IPreset, fields: string[], delimiter: string): string {
    return fields.map(field => {
      const value = this.getNestedValue(preset, field)
      
      // Handle different value types
      if (value === null || value === undefined) {
        return ''
      }
      
      if (Array.isArray(value)) {
        // Join arrays with semicolon
        return value.join(';')
      }
      
      if (typeof value === 'object') {
        // Convert objects to JSON string
        return JSON.stringify(value).replace(/"/g, '""')
      }
      
      if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"') || value.includes('\n'))) {
        // Escape and quote strings containing special characters
        return `"${value.replace(/"/g, '""')}"`
      }
      
      if (value instanceof Date) {
        return value.toISOString()
      }
      
      return String(value)
    }).join(delimiter)
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.')
    let current = obj
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return null
      }
      current = current[part]
    }
    
    return current
  }

  /**
   * Generate checksum for data integrity
   */
  private generateChecksum(data: string): string {
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  /**
   * Get formatted timestamp
   */
  private getTimestamp(format?: 'iso' | 'readable'): string {
    const now = new Date()
    
    if (format === 'readable') {
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      return `${year}${month}${day}-${hours}${minutes}`
    }
    
    return now.toISOString().split('T')[0]
  }

  /**
   * Export presets for different platforms
   */
  async exportForPlatform(
    presets: IPreset[],
    platform: 'automatic1111' | 'invokeai' | 'comfyui'
  ): Promise<IExportResult> {
    switch (platform) {
      case 'automatic1111':
        return this.exportForAutomatic1111(presets)
      case 'invokeai':
        return this.exportForInvokeAI(presets)
      case 'comfyui':
        return this.exportAsJSONBundle(presets, {
          format: 'json',
          includeMetadata: true,
          useCompression: false,
          includeChecksums: true
        })
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Export presets in Automatic1111 format
   */
  private async exportForAutomatic1111(presets: IPreset[]): Promise<IExportResult> {
    const a1111Presets = presets.map(preset => ({
      name: preset.name,
      prompt: preset.metadata?.prompts?.positive || '',
      negative_prompt: preset.metadata?.prompts?.negative || '',
      steps: preset.metadata?.generation?.steps || 20,
      cfg_scale: preset.metadata?.generation?.cfg || 7,
      sampler_name: this.mapSamplerToA1111(preset.metadata?.generation?.sampler || 'euler'),
      seed: preset.metadata?.generation?.seed || -1,
      width: preset.metadata?.dimensions?.width || 512,
      height: preset.metadata?.dimensions?.height || 512,
      batch_size: preset.metadata?.dimensions?.batchSize || 1,
      model: preset.metadata?.model?.name || 'Unknown'
    }))

    const data = JSON.stringify(a1111Presets, null, 2)
    const timestamp = this.getTimestamp()
    const filename = `a1111-styles-${timestamp}.json`

    return {
      success: true,
      filename,
      data,
      size: new Blob([data]).size,
      format: 'automatic1111',
      presetCount: presets.length
    }
  }

  /**
   * Export presets in InvokeAI format
   */
  private async exportForInvokeAI(presets: IPreset[]): Promise<IExportResult> {
    const invokePresets = presets.map(preset => ({
      name: preset.name,
      description: preset.description,
      positive_prompt: preset.metadata?.prompts?.positive || '',
      negative_prompt: preset.metadata?.prompts?.negative || '',
      width: preset.metadata?.dimensions?.width || 512,
      height: preset.metadata?.dimensions?.height || 512,
      cfg_scale: preset.metadata?.generation?.cfg || 7,
      steps: preset.metadata?.generation?.steps || 20,
      sampler: preset.metadata?.generation?.sampler || 'euler',
      model: preset.metadata?.model?.name || 'Unknown',
      seed: preset.metadata?.generation?.seed || -1
    }))

    const data = JSON.stringify({
      meta: {
        version: '3.0.0',
        exported_at: new Date().toISOString()
      },
      presets: invokePresets
    }, null, 2)

    const timestamp = this.getTimestamp()
    const filename = `invokeai-presets-${timestamp}.json`

    return {
      success: true,
      filename,
      data,
      size: new Blob([data]).size,
      format: 'invokeai',
      presetCount: presets.length
    }
  }

  /**
   * Map ComfyUI sampler names to Automatic1111 format
   */
  private mapSamplerToA1111(sampler: string): string {
    const samplerMap: Record<string, string> = {
      'euler': 'Euler',
      'euler_ancestral': 'Euler a',
      'heun': 'Heun',
      'dpm_2': 'DPM2',
      'dpm_2_ancestral': 'DPM2 a',
      'lms': 'LMS',
      'dpm_fast': 'DPM fast',
      'dpm_adaptive': 'DPM adaptive',
      'dpmpp_2s_ancestral': 'DPM++ 2S a',
      'dpmpp_sde': 'DPM++ SDE',
      'dpmpp_2m': 'DPM++ 2M',
      'dpmpp_2m_sde': 'DPM++ 2M SDE',
      'dpmpp_3m_sde': 'DPM++ 3M SDE',
      'ddim': 'DDIM',
      'plms': 'PLMS',
      'uni_pc': 'UniPC',
      'uni_pc_bh2': 'UniPC BH2'
    }
    
    return samplerMap[sampler.toLowerCase()] || sampler
  }
}

// Export singleton instance
export const exportService = new ExportService()