import React, { useState, useCallback, useEffect } from 'react'
import { ParameterInput } from './ParameterInput'
import type { PresetOption } from './hooks/useParameterPresets'
import { useParameterTooltips } from '@/hooks/useParameterTooltips'

interface DimensionsControlProps {
  width: number
  height: number
  onWidthChange: (value: number) => void
  onHeightChange: (value: number) => void
  disabled?: boolean
  className?: string
  showPresets?: boolean
  showAspectRatio?: boolean
}

// Common dimension presets
const DIMENSION_PRESETS: PresetOption[] = [
  { label: '512×512', value: 512512, description: 'Square SD 1.5 default' },
  { label: '768×768', value: 768768, description: 'High-res square' },
  { label: '512×768', value: 512768, description: 'Portrait 2:3' },
  { label: '768×512', value: 768512, description: 'Landscape 3:2' },
  { label: '1024×1024', value: 10241024, description: 'SDXL square default' },
  { label: '832×1216', value: 8321216, description: 'SDXL portrait' },
  { label: '1216×832', value: 12168322, description: 'SDXL landscape' },
  { label: '1024×768', value: 1024768, description: '4:3 aspect ratio' },
  { label: '1280×720', value: 1280720, description: '16:9 HD' },
  { label: '1920×1080', value: 19201080, description: '16:9 Full HD' }
]

export const DimensionsControl: React.FC<DimensionsControlProps> = ({
  width,
  height,
  onWidthChange,
  onHeightChange,
  disabled = false,
  className = '',
  showPresets = true,
  showAspectRatio = true
}) => {
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false)
  const [aspectRatio, setAspectRatio] = useState(width / height)
  
  const { getTooltipContent } = useParameterTooltips()

  // Update aspect ratio when dimensions change externally
  useEffect(() => {
    if (!aspectRatioLocked) {
      setAspectRatio(width / height)
    }
  }, [width, height, aspectRatioLocked])

  // Handle width change with aspect ratio locking
  const handleWidthChange = useCallback((newWidth: number) => {
    onWidthChange(newWidth)
    
    if (aspectRatioLocked) {
      const newHeight = Math.round(newWidth / aspectRatio / 8) * 8 // Round to nearest 8
      onHeightChange(Math.max(64, Math.min(4096, newHeight)))
    }
  }, [onWidthChange, onHeightChange, aspectRatioLocked, aspectRatio])

  // Handle height change with aspect ratio locking
  const handleHeightChange = useCallback((newHeight: number) => {
    onHeightChange(newHeight)
    
    if (aspectRatioLocked) {
      const newWidth = Math.round(newHeight * aspectRatio / 8) * 8 // Round to nearest 8
      onWidthChange(Math.max(64, Math.min(4096, newWidth)))
    }
  }, [onWidthChange, onHeightChange, aspectRatioLocked, aspectRatio])

  // Handle preset application
  const handlePresetApply = useCallback((preset: PresetOption) => {
    const presetValue = preset.value.toString()
    const presetWidth = parseInt(presetValue.slice(0, 4))
    const presetHeight = parseInt(presetValue.slice(4))
    
    onWidthChange(presetWidth)
    onHeightChange(presetHeight)
    
    if (aspectRatioLocked) {
      setAspectRatio(presetWidth / presetHeight)
    }
  }, [onWidthChange, onHeightChange, aspectRatioLocked])

  // Check if current dimensions match a preset (unused but kept for future use)
  // const getCurrentPreset = useCallback((): PresetOption | null => {
  //   const currentValue = parseInt(`${width}${height}`)
  //   return DIMENSION_PRESETS.find(preset => preset.value === currentValue) || null
  // }, [width, height])

  // Toggle aspect ratio lock
  const toggleAspectRatio = useCallback(() => {
    if (!aspectRatioLocked) {
      setAspectRatio(width / height)
    }
    setAspectRatioLocked(!aspectRatioLocked)
  }, [aspectRatioLocked, width, height])

  return (
    <div className={`dimensions-control ${className}`}>
      <div className="dimensions-dual-input">
        <ParameterInput
          label="Width"
          value={width}
          min={64}
          max={4096}
          step={8}
          onChange={handleWidthChange}
          disabled={disabled}
          className="width-input"
          aria-label="Image width in pixels"
          tooltip={getTooltipContent('width')}
          tooltipPlacement="top"
          parameterType="width"
          showValidation={true}
        />
        
        <ParameterInput
          label="Height"
          value={height}
          min={64}
          max={4096}
          step={8}
          onChange={handleHeightChange}
          disabled={disabled}
          className="height-input"
          aria-label="Image height in pixels"
          tooltip={getTooltipContent('height')}
          tooltipPlacement="top"
          parameterType="height"
          showValidation={true}
        />
      </div>

      {showAspectRatio && (
        <div className="dimensions-aspect-ratio">
          <input
            type="checkbox"
            id="aspect-ratio-lock"
            checked={aspectRatioLocked}
            onChange={toggleAspectRatio}
            disabled={disabled}
            className="aspect-ratio-checkbox"
          />
          <label htmlFor="aspect-ratio-lock" className="aspect-ratio-label">
            Lock aspect ratio ({(width / height).toFixed(2)}:1)
          </label>
        </div>
      )}

      {showPresets && (
        <div className="parameter-presets">
          <div className="dimensions-presets">
            {DIMENSION_PRESETS.map((preset) => {
              const presetValue = preset.value.toString()
              const presetWidth = parseInt(presetValue.slice(0, 4))
              const presetHeight = parseInt(presetValue.slice(4))
              const isActive = width === presetWidth && height === presetHeight
              
              return (
                <button
                  key={preset.label}
                  type="button"
                  className={`dimensions-preset-button ${isActive ? 'active' : ''}`}
                  onClick={() => handlePresetApply(preset)}
                  disabled={disabled}
                  title={preset.description}
                  aria-pressed={isActive}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
          
          <div className="dimensions-info">
            <div className="info-item">
              <span className="info-label">Total Pixels:</span>
              <span className="info-value">{(width * height / 1000000).toFixed(1)}MP</span>
            </div>
            <div className="info-item">
              <span className="info-label">Aspect Ratio:</span>
              <span className="info-value">{getAspectRatioLabel(width, height)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Est. VRAM:</span>
              <span className={`info-value ${getVRAMClass(width * height)}`}>
                {getVRAMEstimate(width * height)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions for dimension analysis
function getAspectRatioLabel(width: number, height: number): string {
  const ratio = width / height
  
  if (Math.abs(ratio - 1) < 0.1) return '1:1 (Square)'
  if (Math.abs(ratio - 4/3) < 0.1) return '4:3'
  if (Math.abs(ratio - 3/2) < 0.1) return '3:2'
  if (Math.abs(ratio - 16/9) < 0.1) return '16:9'
  if (Math.abs(ratio - 21/9) < 0.1) return '21:9 (Ultrawide)'
  if (ratio > 1) return `${ratio.toFixed(2)}:1 (Landscape)`
  return `1:${(1/ratio).toFixed(2)} (Portrait)`
}

function getVRAMClass(pixels: number): string {
  if (pixels < 500000) return 'vram-low'
  if (pixels < 1000000) return 'vram-medium'
  if (pixels < 2000000) return 'vram-high'
  return 'vram-extreme'
}

function getVRAMEstimate(pixels: number): string {
  // Rough VRAM estimates based on pixel count
  if (pixels < 500000) return '~4-6GB'
  if (pixels < 1000000) return '~6-8GB'
  if (pixels < 2000000) return '~8-12GB'
  return '~12GB+'
}