import React from 'react'
import { ParameterInput } from './ParameterInput'
import type { ParameterInputProps } from './ParameterInput'
import { useParameterPresets } from './hooks/useParameterPresets'
import type { PresetOption } from './hooks/useParameterPresets'

interface CFGScaleControlProps extends Omit<ParameterInputProps, 'label' | 'min' | 'max' | 'step'> {
  label?: string
  showPresets?: boolean
}

// Common CFG Scale presets for quick selection
const CFG_PRESETS: PresetOption[] = [
  { label: 'Low', value: 3.5, description: 'Minimal guidance, more creative freedom' },
  { label: 'Default', value: 7.0, description: 'Balanced prompt adherence' },
  { label: 'High', value: 12.0, description: 'Strong prompt adherence' },
  { label: 'Max', value: 20.0, description: 'Maximum prompt adherence' }
]

export const CFGScaleControl: React.FC<CFGScaleControlProps> = ({
  label = 'CFG Scale',
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
  } = useParameterPresets(CFG_PRESETS, onChange)

  return (
    <div className={`cfg-scale-control ${className}`}>
      <ParameterInput
        label={label}
        value={value}
        min={1.0}
        max={30.0}
        step={0.1}
        onChange={onChange}
        disabled={disabled}
        className="cfg-parameter-input"
        debounceMs={50} // Fast debounce for responsive decimal precision
        aria-label="Classifier-free guidance scale for prompt adherence"
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
          
          <div className="cfg-info">
            <div className="info-item">
              <span className="info-label">Prompt Adherence:</span>
              <span className={`info-value ${getAdherenceClass(value)}`}>
                {getAdherenceLabel(value)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Creativity:</span>
              <span className={`info-value ${getCreativityClass(value)}`}>
                {getCreativityLabel(value)}
              </span>
            </div>
          </div>
          
          <div className="cfg-guidance">
            <div className="guidance-text">
              {getGuidanceText(value)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions for CFG analysis
function getAdherenceClass(cfg: number): string {
  if (cfg < 5) return 'adherence-low'
  if (cfg < 10) return 'adherence-medium'
  if (cfg < 15) return 'adherence-high'
  return 'adherence-extreme'
}

function getAdherenceLabel(cfg: number): string {
  if (cfg < 5) return 'Low'
  if (cfg < 10) return 'Balanced'
  if (cfg < 15) return 'Strong'
  return 'Extreme'
}

function getCreativityClass(cfg: number): string {
  if (cfg < 5) return 'creativity-high'
  if (cfg < 10) return 'creativity-medium'
  if (cfg < 15) return 'creativity-low'
  return 'creativity-minimal'
}

function getCreativityLabel(cfg: number): string {
  if (cfg < 5) return 'High'
  if (cfg < 10) return 'Balanced'
  if (cfg < 15) return 'Limited'
  return 'Minimal'
}

function getGuidanceText(cfg: number): string {
  if (cfg < 3) {
    return "Very low guidance - High creativity but may ignore prompts"
  }
  if (cfg < 5) {
    return "Low guidance - Creative interpretation with loose prompt following"
  }
  if (cfg < 8) {
    return "Balanced guidance - Good mix of creativity and prompt adherence"
  }
  if (cfg < 12) {
    return "High guidance - Strong prompt adherence with less variation"
  }
  if (cfg < 20) {
    return "Very high guidance - Strict prompt following, minimal creativity"
  }
  return "Extreme guidance - May produce over-saturated or artifact-prone images"
}