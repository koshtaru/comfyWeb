// ============================================================================
// ComfyUI React - Data Format Conversion Utilities
// ============================================================================

/**
 * Convert data to YAML-like format for display
 */
export function convertToYaml(data: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent)
  
  if (data === null) return 'null'
  if (data === undefined) return 'undefined'
  if (typeof data === 'string') return `"${data}"`
  if (typeof data === 'number' || typeof data === 'boolean') return String(data)
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]'
    return data.map(item => `${spaces}- ${convertToYaml(item, indent + 1)}`).join('\n')
  }
  
  if (typeof data === 'object') {
    const entries = Object.entries(data)
    if (entries.length === 0) return '{}'
    
    return entries.map(([key, value]) => {
      const yamlValue = convertToYaml(value, indent + 1)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return `${spaces}${key}:\n${yamlValue}`
      } else {
        return `${spaces}${key}: ${yamlValue}`
      }
    }).join('\n')
  }
  
  return String(data)
}

/**
 * Convert data to CSV format
 */
export function convertToCsv(data: unknown): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return ''
    
    // If array of objects, create CSV with headers
    if (typeof data[0] === 'object' && data[0] !== null) {
      const headers = Object.keys(data[0])
      const csvHeaders = headers.join(',')
      const csvRows = data.map(item => 
        headers.map(header => {
          const value = (item as Record<string, unknown>)[header]
          return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value || '')
        }).join(',')
      )
      return [csvHeaders, ...csvRows].join('\n')
    }
    
    // If array of primitives, simple comma-separated
    return data.map(item => String(item)).join(',')
  }
  
  if (typeof data === 'object' && data !== null) {
    // Convert object to CSV with key-value pairs
    const entries = Object.entries(data)
    const headers = ['key', 'value']
    const rows = entries.map(([key, value]) => [key, String(value)])
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }
  
  return String(data)
}

/**
 * Convert data to formatted JSON string
 */
export function convertToJsonFormatted(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

/**
 * Convert data to compact JSON string
 */
export function convertToJsonCompact(data: unknown): string {
  return JSON.stringify(data)
}