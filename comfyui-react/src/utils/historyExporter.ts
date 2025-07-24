// ============================================================================
// ComfyUI React - History Export/Import Utilities
// ============================================================================

import type { StoredGeneration, HistorySearchParams } from '@/services/historyManager'
import { historyManager } from '@/services/historyManager'

// Export formats
export type ExportFormat = 'json' | 'csv'

// Export options
export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  includeWorkflow?: boolean
  includeImages?: boolean
  searchParams?: HistorySearchParams
  filename?: string
}

// Import result
export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
  duplicates: number
}

// Export generations to file
export async function exportHistory(options: ExportOptions): Promise<void> {
  const {
    format,
    includeMetadata = true,
    includeWorkflow = false,
    includeImages = false,
    searchParams = {},
    filename
  } = options

  try {
    // Get generations based on search parameters
    const searchResult = await historyManager.searchGenerations({
      ...searchParams,
      limit: 10000, // Large limit to get all matching results
      offset: 0
    })

    const generations = searchResult.items

    if (generations.length === 0) {
      throw new Error('No generations found to export')
    }

    // Process data based on format
    let data: string
    let mimeType: string
    let fileExtension: string

    if (format === 'json') {
      data = await exportToJSON(generations, {
        includeMetadata,
        includeWorkflow,
        includeImages
      })
      mimeType = 'application/json'
      fileExtension = 'json'
    } else {
      data = await exportToCSV(generations, {
        includeMetadata,
        includeWorkflow
      })
      mimeType = 'text/csv'
      fileExtension = 'csv'
    }

    // Generate filename if not provided
    const exportFilename = filename || generateFilename(generations.length, fileExtension)

    // Download file
    downloadFile(data, exportFilename, mimeType)

  } catch (error) {
    console.error('Export failed:', error)
    throw error
  }
}

// Export to JSON format
async function exportToJSON(
  generations: StoredGeneration[],
  options: { includeMetadata: boolean; includeWorkflow: boolean; includeImages: boolean }
): Promise<string> {
  const { includeMetadata, includeWorkflow, includeImages } = options

  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    totalItems: generations.length,
    items: await Promise.all(generations.map(async (generation) => {
      const item: any = {
        id: generation.id,
        timestamp: generation.timestamp,
        status: generation.status,
        rating: generation.rating,
        tags: generation.tags,
        notes: generation.notes
      }

      // Add metadata if requested
      if (includeMetadata) {
        item.metadata = generation.metadata
      }

      // Add workflow if requested
      if (includeWorkflow) {
        item.workflow = generation.workflow
      }

      // Add images if requested (as base64 data URLs)
      if (includeImages && generation.images && generation.images.length > 0) {
        item.images = []
        
        // Try to get thumbnails from IndexedDB
        for (let i = 0; i < generation.images.length; i++) {
          try {
            const thumbnail = await historyManager.getThumbnail(generation.id, i)
            if (thumbnail) {
              const base64 = await blobToBase64(thumbnail)
              item.images.push(base64)
            }
          } catch (error) {
            console.warn(`Failed to export thumbnail ${i} for generation ${generation.id}:`, error)
          }
        }
      }

      return item
    }))
  }

  return JSON.stringify(exportData, null, 2)
}

// Export to CSV format
async function exportToCSV(
  generations: StoredGeneration[],
  options: { includeMetadata: boolean; includeWorkflow: boolean }
): Promise<string> {
  const { includeMetadata, includeWorkflow } = options

  // Define CSV headers
  const headers = [
    'ID',
    'Timestamp',
    'Status',
    'Rating',
    'Tags',
    'Notes',
    'Positive Prompt',
    'Negative Prompt'
  ]

  if (includeMetadata) {
    headers.push(
      'Model Name',
      'Sampler',
      'Scheduler',
      'Steps',
      'CFG Scale',
      'Width',
      'Height',
      'Seed',
      'Batch Size',
      'Generation Time (ms)'
    )
  }

  if (includeWorkflow) {
    headers.push('Workflow JSON')
  }

  // Build CSV rows
  const rows = [headers]

  generations.forEach(generation => {
    const row = [
      escapeCsvValue(generation.id),
      escapeCsvValue(generation.timestamp),
      escapeCsvValue(generation.status),
      generation.rating?.toString() || '',
      escapeCsvValue(generation.tags.join(', ')),
      escapeCsvValue(generation.notes || ''),
      escapeCsvValue(generation.metadata.prompts?.positive || ''),
      escapeCsvValue(generation.metadata.prompts?.negative || '')
    ]

    if (includeMetadata) {
      row.push(
        escapeCsvValue(generation.metadata.model?.name || ''),
        escapeCsvValue(generation.metadata.generation?.sampler || ''),
        escapeCsvValue(generation.metadata.generation?.scheduler || ''),
        generation.metadata.generation?.steps?.toString() || '',
        generation.metadata.generation?.cfg?.toString() || '',
        generation.metadata.image?.width?.toString() || '',
        generation.metadata.image?.height?.toString() || '',
        generation.metadata.generation?.seed?.toString() || '',
        generation.metadata.generation?.batchSize?.toString() || '',
        generation.metadata.timing?.duration?.toString() || ''
      )
    }

    if (includeWorkflow) {
      row.push(escapeCsvValue(JSON.stringify(generation.workflow)))
    }

    rows.push(row)
  })

  return rows.map(row => row.join(',')).join('\n')
}

// Import generations from file
export async function importHistory(file: File): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
    duplicates: 0
  }

  try {
    const content = await readFileAsText(file)
    
    // Determine format based on file extension or content
    const format = file.name.endsWith('.csv') ? 'csv' : 'json'
    
    if (format === 'json') {
      await importFromJSON(content, result)
    } else {
      await importFromCSV(content, result)
    }

  } catch (error) {
    result.errors.push(`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return result
}

// Import from JSON format
async function importFromJSON(content: string, result: ImportResult): Promise<void> {
  try {
    const data = JSON.parse(content)
    
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid JSON format: missing items array')
    }

    for (const item of data.items) {
      try {
        // Validate required fields
        if (!item.id || !item.timestamp) {
          result.errors.push(`Invalid item: missing required fields (id, timestamp)`)
          result.skipped++
          continue
        }

        // Check if generation already exists
        const existingGeneration = await historyManager.searchGenerations({
          query: item.id,
          limit: 1
        })

        if (existingGeneration.items.length > 0) {
          result.duplicates++
          result.skipped++
          continue
        }

        // Convert item to GenerationHistoryItem format
        const generation: StoredGeneration = {
          id: item.id,
          timestamp: item.timestamp,
          workflow: item.workflow || {},
          metadata: item.metadata || {},
          images: item.images || [],
          status: item.status || 'completed',
          searchableText: generateSearchableText(item),
          tags: item.tags || [],
          rating: item.rating,
          notes: item.notes
        }

        // Import thumbnails if available
        const thumbnails: Blob[] = []
        if (item.images && Array.isArray(item.images)) {
          for (const imageData of item.images) {
            try {
              if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                const blob = await base64ToBlob(imageData)
                thumbnails.push(blob)
              }
            } catch (error) {
              console.warn('Failed to process image data:', error)
            }
          }
        }

        // Add to history
        await historyManager.addGeneration(generation, thumbnails.length > 0 ? thumbnails : undefined)
        result.imported++

      } catch (error) {
        result.errors.push(`Failed to import item ${item.id || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        result.skipped++
      }
    }

  } catch (error) {
    throw new Error(`JSON parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Import from CSV format
async function importFromCSV(content: string, result: ImportResult): Promise<void> {
  try {
    const lines = content.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row')
    }

    const headers = parseCsvRow(lines[0])
    const requiredColumns = ['ID', 'Timestamp']
    
    // Validate headers
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCsvRow(lines[i])
        
        if (values.length !== headers.length) {
          result.errors.push(`Row ${i + 1}: Column count mismatch`)
          result.skipped++
          continue
        }

        // Create object from row data
        const item: any = {}
        headers.forEach((header, index) => {
          item[header.toLowerCase().replace(/\s+/g, '_')] = values[index]
        })

        // Convert to GenerationHistoryItem format
        const generation: StoredGeneration = {
          id: item.id,
          timestamp: item.timestamp,
          workflow: item.workflow_json ? JSON.parse(item.workflow_json) : {},
          metadata: {
            prompts: {
              positive: item.positive_prompt || '',
              negative: item.negative_prompt || ''
            },
            model: item.model_name ? { 
              name: item.model_name,
              architecture: 'unknown'
            } : {
              name: 'Unknown',
              architecture: 'unknown'
            },
            generation: {
              sampler: item.sampler || 'euler',
              scheduler: item.scheduler || 'normal',
              steps: item.steps ? parseInt(item.steps) : 20,
              cfg: item.cfg_scale ? parseFloat(item.cfg_scale) : 7,
              seed: item.seed ? parseInt(item.seed) : -1,
              width: item.width ? parseInt(item.width) : 512,
              height: item.height ? parseInt(item.height) : 512,
              batchSize: item.batch_size ? parseInt(item.batch_size) : 1
            },
            image: {
              width: item.width ? parseInt(item.width) : 512,
              height: item.height ? parseInt(item.height) : 512,
              batchSize: item.batch_size ? parseInt(item.batch_size) : 1
            },
            timing: {
              duration: item.generation_time_ms ? parseInt(item.generation_time_ms) : 0,
              startTime: '',
              endTime: ''
            }
          },
          images: [],
          status: item.status || 'completed',
          searchableText: generateSearchableText(item),
          tags: item.tags ? item.tags.split(', ').filter(Boolean) : [],
          rating: item.rating ? parseInt(item.rating) : undefined,
          notes: item.notes || undefined
        }

        // Check for duplicates
        const existingGeneration = await historyManager.searchGenerations({
          query: generation.id,
          limit: 1
        })

        if (existingGeneration.items.length > 0) {
          result.duplicates++
          result.skipped++
          continue
        }

        // Add to history
        await historyManager.addGeneration(generation)
        result.imported++

      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        result.skipped++
      }
    }

  } catch (error) {
    throw new Error(`CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Utility functions
function generateFilename(count: number, extension: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `comfyui_history_${date}_${count}_items.${extension}`
}

function generateSearchableText(item: any): string {
  return [
    item.positive_prompt || item.metadata?.prompts?.positive || '',
    item.negative_prompt || item.metadata?.prompts?.negative || '',
    item.model_name || item.metadata?.model?.name || '',
    item.sampler || item.metadata?.generation?.sampler || '',
    item.scheduler || item.metadata?.generation?.scheduler || ''
  ].join(' ').toLowerCase()
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  // Clean up
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    
    reader.onerror = () => reject(new Error('File reading failed'))
    reader.readAsText(file)
  })
}

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function parseCsvRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Add final field
  result.push(current.trim())
  
  return result
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.readAsDataURL(blob)
  })
}

async function base64ToBlob(base64: string): Promise<Blob> {
  const response = await fetch(base64)
  return response.blob()
}