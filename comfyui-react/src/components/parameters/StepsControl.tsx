import React from 'react'
import { ParameterInput } from './ParameterInput'
import type { ParameterInputProps } from './ParameterInput'
import { useParameterPresets } from './hooks/useParameterPresets'
import type { PresetOption } from './hooks/useParameterPresets'
import { useParameterTooltips } from '@/hooks/useParameterTooltips'
import { getQualityClass, getQualityLabel, getTimeEstimate } from '@/utils/generation'

interface StepsControlProps extends Omit<ParameterInputProps, 'label' | 'min' | 'max' | 'step'> {
  label?: string
  showPresets?: boolean
}

// Common steps presets for quick selection
const STEPS_PRESETS: PresetOption[] = [
  { label: 'Fast', value: 10, description: 'Quick generation with lower quality' },
  { label: 'Default', value: 20, description: 'Balanced quality and speed' },
  { label: 'Quality', value: 30, description: 'Higher quality, slower generation' },
  { label: 'Max Quality', value: 50, description: 'Maximum quality, very slow' },
  { label: 'Ultra', value: 100, description: 'Extreme quality for final renders' }
]

export const StepsControl: React.FC<StepsControlProps> = ({
  label = 'Steps',
  value,
  onChange,
  showPresets = true,
  disabled = false,
  className = '',
  ...props
}) => {
  const {
    applyPreset,
    isPresetActive,
    availablePresets
  } = useParameterPresets(STEPS_PRESETS, onChange)

  const { getTooltipContent } = useParameterTooltips()

  return (
    <div className={`steps-control ${className}`}>
      <ParameterInput
        label={label}
        value={value}
        min={1}
        max={150}
        step={1}
        onChange={onChange}
        disabled={disabled}
        className="steps-parameter-input"
        aria-label="Number of sampling steps for generation"
        tooltip={getTooltipContent('steps')}
        tooltipPlacement="top"
        parameterType="steps"
        showValidation={true}
        {...props}
      />
      
      {showPresets && (
        <div className="parameter-presets">
          <div className="preset-buttons">
            {availablePresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={`preset-button ${isPresetActive(preset, value) ? 'active' : ''}`}
                onClick={() => applyPreset(preset)}
                disabled={disabled}
                title={preset.description}
                aria-pressed={isPresetActive(preset, value)}
              >
                {preset.label}
                <span className="preset-value">({preset.value})</span>
              </button>
            ))}
          </div>
          
          <div className="steps-info">
            <div className="info-item">
              <span className="info-label">Quality Impact:</span>
              <span className={`info-value ${getQualityClass(value)}`}>
                {getQualityLabel(value)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Est. Time:</span>
              <span className="info-value">{getTimeEstimate(value)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

