import React from 'react'
import { DIMENSION_PRESETS, type DimensionPreset } from '@/constants/dimensions'

interface DimensionPresetsProps {
  currentWidth: number
  currentHeight: number
  onDimensionChange: (width: number, height: number) => void
  disabled?: boolean
  className?: string
  showLabels?: boolean
  compact?: boolean
}

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