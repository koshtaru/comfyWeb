import React from 'react'

interface DimensionPreset {
  label: string
  width: number
  height: number
  description: string
  category: 'square' | 'portrait' | 'landscape' | 'wide' | 'ultra-wide'
  aspectRatio: string
  vramUsage: 'low' | 'medium' | 'high' | 'very-high'
}

interface DimensionPresetsProps {
  currentWidth: number
  currentHeight: number
  onDimensionChange: (width: number, height: number) => void
  disabled?: boolean
  className?: string
  showLabels?: boolean
  compact?: boolean
}

// Common dimension presets
const DIMENSION_PRESETS: DimensionPreset[] = [
  // Square formats
  {
    label: '512²',
    width: 512,
    height: 512,
    description: 'Classic SD 1.5 square format',
    category: 'square',
    aspectRatio: '1:1',
    vramUsage: 'low'
  },
  {
    label: '768²',
    width: 768,
    height: 768,
    description: 'Medium resolution square',
    category: 'square',
    aspectRatio: '1:1',
    vramUsage: 'medium'
  },
  {
    label: '1024²',
    width: 1024,
    height: 1024,
    description: 'High resolution square (SDXL native)',
    category: 'square',
    aspectRatio: '1:1',
    vramUsage: 'high'
  },

  // Portrait formats
  {
    label: '512×768',
    width: 512,
    height: 768,
    description: 'Portrait 2:3 ratio',
    category: 'portrait',
    aspectRatio: '2:3',
    vramUsage: 'low'
  },
  {
    label: '768×1024',
    width: 768,
    height: 1024,
    description: 'Portrait 3:4 ratio',
    category: 'portrait',
    aspectRatio: '3:4',
    vramUsage: 'medium'
  },
  {
    label: '832×1216',
    width: 832,
    height: 1216,
    description: 'SDXL portrait format',
    category: 'portrait',
    aspectRatio: '13:19',
    vramUsage: 'high'
  },

  // Landscape formats
  {
    label: '768×512',
    width: 768,
    height: 512,
    description: 'Landscape 3:2 ratio',
    category: 'landscape',
    aspectRatio: '3:2',
    vramUsage: 'low'
  },
  {
    label: '1024×768',
    width: 1024,
    height: 768,
    description: 'Landscape 4:3 ratio',
    category: 'landscape',
    aspectRatio: '4:3',
    vramUsage: 'medium'
  },
  {
    label: '1216×832',
    width: 1216,
    height: 832,
    description: 'SDXL landscape format',
    category: 'landscape',
    aspectRatio: '19:13',
    vramUsage: 'high'
  },

  // Wide formats
  {
    label: '1152×768',
    width: 1152,
    height: 768,
    description: 'Wide landscape 3:2',
    category: 'wide',
    aspectRatio: '3:2',
    vramUsage: 'medium'
  },
  {
    label: '1344×768',
    width: 1344,
    height: 768,
    description: 'Cinematic wide format',
    category: 'wide',
    aspectRatio: '7:4',
    vramUsage: 'high'
  },

  // Ultra-wide formats
  {
    label: '1536×640',
    width: 1536,
    height: 640,
    description: 'Ultra-wide panoramic',
    category: 'ultra-wide',
    aspectRatio: '12:5',
    vramUsage: 'high'
  }
]

export const DimensionPresets: React.FC<DimensionPresetsProps> = ({
  currentWidth,
  currentHeight,
  onDimensionChange,
  disabled = false,
  className = '',
  showLabels = true,
  compact = false
}) => {
  const handlePresetClick = (preset: DimensionPreset) => {
    if (disabled) return
    onDimensionChange(preset.width, preset.height)
  }

  const isCurrentPreset = (preset: DimensionPreset): boolean => {
    return preset.width === currentWidth && preset.height === currentHeight
  }

  const getVramClass = (usage: DimensionPreset['vramUsage']): string => {
    return `vram-${usage}`
  }

  const getCategoryIcon = (category: DimensionPreset['category']): string => {
    switch (category) {
      case 'square': return '⬜'
      case 'portrait': return '📱'
      case 'landscape': return '🖥️'
      case 'wide': return '📺'
      case 'ultra-wide': return '🎬'
      default: return '📐'
    }
  }

  // Group presets by category
  const groupedPresets = DIMENSION_PRESETS.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = []
    }
    acc[preset.category].push(preset)
    return acc
  }, {} as Record<string, DimensionPreset[]>)

  if (compact) {
    // Show only the most common presets in compact mode
    const commonPresets = DIMENSION_PRESETS.slice(0, 6)
    
    return (
      <div className={`dimension-presets compact ${className}`}>
        <div className="preset-buttons-row">
          {commonPresets.map((preset) => (
            <button
              key={`${preset.width}x${preset.height}`}
              className={`dimension-preset-button ${isCurrentPreset(preset) ? 'active' : ''} ${getVramClass(preset.vramUsage)}`}
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              title={`${preset.description} (${preset.aspectRatio}, ${preset.vramUsage} VRAM)`}
            >
              <span className="preset-icon">{getCategoryIcon(preset.category)}</span>
              <span className="preset-label">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`dimension-presets ${className}`}>
      {showLabels && (
        <div className="presets-header">
          <h4>Quick Dimensions</h4>
          <div className="current-selection">
            Current: {currentWidth}×{currentHeight}
          </div>
        </div>
      )}

      <div className="preset-categories">
        {Object.entries(groupedPresets).map(([category, presets]) => (
          <div key={category} className="preset-category">
            <div className="category-header">
              <span className="category-icon">{getCategoryIcon(category as DimensionPreset['category'])}</span>
              <span className="category-title">{category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}</span>
            </div>
            
            <div className="preset-buttons">
              {presets.map((preset) => (
                <button
                  key={`${preset.width}x${preset.height}`}
                  className={`dimension-preset-button ${isCurrentPreset(preset) ? 'active' : ''} ${getVramClass(preset.vramUsage)}`}
                  onClick={() => handlePresetClick(preset)}
                  disabled={disabled}
                  title={preset.description}
                >
                  <div className="preset-main">
                    <span className="preset-label">{preset.label}</span>
                    <span className="preset-ratio">{preset.aspectRatio}</span>
                  </div>
                  
                  <div className="preset-meta">
                    <span className={`vram-indicator ${getVramClass(preset.vramUsage)}`}>
                      {preset.vramUsage}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="presets-legend">
        <div className="legend-item">
          <span className="vram-indicator vram-low"></span>
          <span>Low VRAM (&lt;4GB)</span>
        </div>
        <div className="legend-item">
          <span className="vram-indicator vram-medium"></span>
          <span>Medium VRAM (4-8GB)</span>
        </div>
        <div className="legend-item">
          <span className="vram-indicator vram-high"></span>
          <span>High VRAM (8-12GB)</span>
        </div>
        <div className="legend-item">
          <span className="vram-indicator vram-very-high"></span>
          <span>Very High VRAM (&gt;12GB)</span>
        </div>
      </div>
    </div>
  )
}