// Copy Button Component for Metadata Copying
// Provides copy-to-clipboard functionality with multiple format support and visual feedback

import React, { useState, useCallback } from 'react'
import './CopyButton.css'

export interface CopyButtonProps {
  data: unknown
  format?: 'text' | 'json' | 'yaml' | 'csv'
  label?: string
  size?: 'small' | 'medium' | 'large'
  variant?: 'primary' | 'secondary' | 'ghost'
  showLabel?: boolean
  showTooltip?: boolean
  disabled?: boolean
  className?: string
  onCopy?: (data: unknown, format: string) => void
  onError?: (error: Error) => void
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  data,
  format = 'text',
  label,
  size = 'medium',
  variant = 'ghost',
  showLabel = false,
  showTooltip = true,
  disabled = false,
  className = '',
  onCopy,
  onError
}) => {
  const [isCopying, setIsCopying] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  // Format data based on requested format
  const formatData = useCallback((data: unknown, format: string): string => {
    try {
      switch (format) {
        case 'json':
          return JSON.stringify(data, null, 2)
        
        case 'yaml':
          // Simple YAML conversion - in production, use a proper YAML library
          return convertToYaml(data)
        
        case 'csv':
          return convertToCsv(data)
        
        case 'text':
        default:
          if (typeof data === 'string') {
            return data
          } else if (typeof data === 'number' || typeof data === 'boolean') {
            return String(data)
          } else if (data === null || data === undefined) {
            return ''
          } else {
            return JSON.stringify(data)
          }
      }
    } catch (error) {
      console.error('Error formatting data for copy:', error)
      return String(data)
    }
  }, [])

  // Handle copy operation
  const handleCopy = useCallback(async () => {
    if (disabled || isCopying || !data) return

    setIsCopying(true)
    setCopyError(null)

    try {
      const formattedData = formatData(data, format)
      
      // Use modern clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formattedData)
      } else {
        // Fallback for older browsers or non-HTTPS
        await fallbackCopyToClipboard(formattedData)
      }

      setCopySuccess(true)
      onCopy?.(data, format)

      // Reset success state after 2 seconds
      setTimeout(() => {
        setCopySuccess(false)
      }, 2000)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Copy failed'
      setCopyError(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))

      // Reset error state after 3 seconds
      setTimeout(() => {
        setCopyError(null)
      }, 3000)
    } finally {
      setIsCopying(false)
    }
  }, [data, format, disabled, isCopying, formatData, onCopy, onError])

  // Fallback copy method for older browsers
  const fallbackCopyToClipboard = async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        const result = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (result) {
          resolve()
        } else {
          reject(new Error('Failed to copy text'))
        }
      } catch (error) {
        document.body.removeChild(textArea)
        reject(error)
      }
    })
  }

  // Get button state classes
  const getStateClasses = () => {
    const classes = []
    if (isCopying) classes.push('copying')
    if (copySuccess) classes.push('success')
    if (copyError) classes.push('error')
    if (disabled) classes.push('disabled')
    return classes.join(' ')
  }

  // Get tooltip text
  const getTooltipText = () => {
    if (copyError) return `Copy failed: ${copyError}`
    if (copySuccess) return 'Copied!'
    if (isCopying) return 'Copying...'
    if (disabled) return 'Copy not available'
    
    const formatLabel = format === 'text' ? '' : ` as ${format.toUpperCase()}`
    return `Copy${formatLabel}`
  }

  // Get icon based on state
  const getIcon = () => {
    if (isCopying) {
      return (
        <svg className="copy-icon spinning" viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"
          />
        </svg>
      )
    }
    
    if (copySuccess) {
      return (
        <svg className="copy-icon" viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"
          />
        </svg>
      )
    }
    
    if (copyError) {
      return (
        <svg className="copy-icon" viewBox="0 0 24 24" width="16" height="16">
          <path
            fill="currentColor"
            d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"
          />
        </svg>
      )
    }
    
    return (
      <svg className="copy-icon" viewBox="0 0 24 24" width="16" height="16">
        <path
          fill="currentColor"
          d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"
        />
      </svg>
    )
  }

  // Get accessible label
  const getAccessibleLabel = () => {
    if (label) return label
    
    const dataType = Array.isArray(data) ? 'array' : typeof data
    const formatSuffix = format === 'text' ? '' : ` as ${format}`
    return `Copy ${dataType}${formatSuffix}`
  }

  return (
    <button
      type="button"
      className={`
        copy-button 
        ${size} 
        ${variant} 
        ${getStateClasses()}
        ${showLabel ? 'with-label' : 'icon-only'}
        ${className}
      `.trim()}
      onClick={handleCopy}
      disabled={disabled || isCopying}
      title={showTooltip ? getTooltipText() : undefined}
      aria-label={getAccessibleLabel()}
      data-testid="copy-button"
    >
      {getIcon()}
      {showLabel && (
        <span className="copy-label">
          {copySuccess ? 'Copied!' : copyError ? 'Error' : label || 'Copy'}
        </span>
      )}
    </button>
  )
}

// Utility function to convert data to YAML-like format
function convertToYaml(data: unknown, indent = 0): string {
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

// Utility function to convert data to CSV format
function convertToCsv(data: unknown): string {
  if (Array.isArray(data)) {
    if (data.length === 0) return ''
    
    // If array of objects, create CSV with headers
    if (typeof data[0] === 'object' && data[0] !== null) {
      const headers = Object.keys(data[0])
      const csvHeaders = headers.join(',')
      const csvRows = data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma or quote
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return String(value ?? '')
        }).join(',')
      )
      return [csvHeaders, ...csvRows].join('\n')
    } else {
      // Simple array
      return data.map(item => String(item)).join(',')
    }
  }
  
  if (typeof data === 'object' && data !== null) {
    // Convert object to key-value CSV
    return Object.entries(data)
      .map(([key, value]) => `${key},${String(value)}`)
      .join('\n')
  }
  
  return String(data)
}

// Multi-format copy button with dropdown
export interface MultiFormatCopyButtonProps extends Omit<CopyButtonProps, 'format'> {
  formats?: Array<{
    format: CopyButtonProps['format']
    label: string
    icon?: string
  }>
  defaultFormat?: CopyButtonProps['format']
}

export const MultiFormatCopyButton: React.FC<MultiFormatCopyButtonProps> = ({
  data,
  formats = [
    { format: 'text', label: 'Text', icon: '📝' },
    { format: 'json', label: 'JSON', icon: '🔧' },
    { format: 'yaml', label: 'YAML', icon: '📋' },
    { format: 'csv', label: 'CSV', icon: '📊' }
  ],
  defaultFormat = 'text',
  ...props
}) => {
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat)
  const [isOpen, setIsOpen] = useState(false)

  const handleFormatSelect = (format: CopyButtonProps['format']) => {
    if (format) {
      setSelectedFormat(format)
    }
    setIsOpen(false)
  }

  const selectedFormatConfig = formats.find(f => f.format === selectedFormat) || formats[0]

  return (
    <div className="multi-format-copy-button">
      <CopyButton
        {...props}
        data={data}
        format={selectedFormat}
        label={selectedFormatConfig.label}
      />
      
      <button
        type="button"
        className="format-selector"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select copy format"
        title="Select format"
      >
        <svg viewBox="0 0 24 24" width="12" height="12">
          <path
            fill="currentColor"
            d="M7,10L12,15L17,10H7Z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="format-dropdown">
          {formats.map(({ format, label, icon }) => (
            <button
              key={format}
              type="button"
              className={`format-option ${format === selectedFormat ? 'selected' : ''}`}
              onClick={() => handleFormatSelect(format)}
            >
              {icon && <span className="format-icon">{icon}</span>}
              <span className="format-label">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}