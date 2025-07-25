import React, { useState } from 'react'
import type { BaseComponentProps } from '../../types/component'
import { cn } from '../../utils/cn'
import { Card } from './Card'
import { Slider } from './Slider'
import { Input } from './Input'
import { Button } from './Button'

export interface GenerationSettingsProps extends BaseComponentProps {
  /** Current generation parameters */
  parameters?: {
    steps?: number
    cfgScale?: number
    seed?: string
    sampler?: string
    scheduler?: string
    width?: number
    height?: number
  }
  /** Callback when parameters change */
  onParameterChange?: (parameter: string, value: any) => void
  /** Whether settings are read-only */
  readOnly?: boolean
}

const GenerationSettings = React.forwardRef<HTMLDivElement, GenerationSettingsProps>(
  (
    {
      parameters = {},
      onParameterChange,
      readOnly = false,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const [localParams, setLocalParams] = useState({
      steps: 20,
      cfgScale: 1,
      seed: '5005',
      sampler: 'euler',
      scheduler: 'simple',
      width: 512,
      height: 512,
      ...parameters
    })

    const handleChange = (param: string, value: any) => {
      setLocalParams(prev => ({ ...prev, [param]: value }))
      onParameterChange?.(param, value)
    }

    const generateRandomSeed = () => {
      const randomSeed = Math.floor(Math.random() * 0xFFFFFFFF).toString()
      handleChange('seed', randomSeed)
    }

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text)
    }

    // Preset configurations
    const stepsPresets = [
      { label: 'Fast', value: 10, active: localParams.steps === 10 },
      { label: 'Default', value: 20, active: localParams.steps === 20 },
      { label: 'Quality', value: 30, active: localParams.steps === 30 },
      { label: 'Max Quality', value: 50, active: localParams.steps === 50 },
      { label: 'Ultra', value: 100, active: localParams.steps === 100 }
    ]

    const cfgPresets = [
      { label: 'Low', value: 3.5, active: Math.abs(localParams.cfgScale - 3.5) < 0.1 },
      { label: 'Default', value: 7, active: Math.abs(localParams.cfgScale - 7) < 0.1 },
      { label: 'High', value: 12, active: Math.abs(localParams.cfgScale - 12) < 0.1 },
      { label: 'Max', value: 20, active: Math.abs(localParams.cfgScale - 20) < 0.1 }
    ]

    const getQualityImpact = (steps: number) => {
      if (steps <= 15) return 'Low'
      if (steps <= 25) return 'Good'
      if (steps <= 40) return 'High'
      return 'Ultra'
    }

    const getEstimatedTime = (steps: number) => {
      if (steps <= 15) return '~10-20s'
      if (steps <= 25) return '~20-40s'
      if (steps <= 40) return '~40-80s'
      return '~1-2min'
    }

    const getPromptAdherence = (cfg: number) => {
      if (cfg <= 5) return 'Low'
      if (cfg <= 10) return 'Medium'
      if (cfg <= 15) return 'High'
      return 'Extreme'
    }

    const getCreativity = (cfg: number) => {
      if (cfg <= 5) return 'High'
      if (cfg <= 10) return 'Medium'
      if (cfg <= 15) return 'Low'
      return 'Minimal'
    }

    return (
      <div
        ref={ref}
        className={cn(
          'generation-settings w-full bg-comfy-bg-secondary border border-comfy-border rounded-lg overflow-hidden',
          className
        )}
        data-testid={testId}
        {...props}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-comfy-bg-tertiary border-b border-comfy-border">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-comfy-accent-orange rounded-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-comfy-text-primary">Generation Settings</h2>
          </div>
          <Button variant="ghost" size="sm" className="p-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </Button>
        </div>

        {/* Settings Grid */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {/* Steps Control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-comfy-text-secondary uppercase tracking-wide">
                  Steps
                  <button className="ml-1 text-comfy-text-secondary hover:text-comfy-text-primary">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.25,10.5 8.5,11.5 8.5,13V14H7V13C7,10.5 9.25,8.5 12,8.5C14.75,8.5 17,10.5 17,13C17,14.5 16,15.25 15,16C14.25,16.5 13.75,17 13.75,18H12.25C12.25,16.75 12.75,16 13.5,15.25C14.5,14.25 15.5,13.75 15.5,13C15.5,11.5 14.25,10.5 12,10.5Z" />
                    </svg>
                  </button>
                </label>
                <div className="text-xs text-comfy-text-secondary bg-comfy-bg-tertiary px-2 py-1 rounded">
                  {localParams.steps}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Slider
                  value={localParams.steps}
                  min={1}
                  max={150}
                  step={1}
                  onChange={(value) => handleChange('steps', value)}
                  className="flex-1"
                  disabled={readOnly}
                />
                <Input
                  type="number"
                  value={localParams.steps.toString()}
                  onChange={(value) => handleChange('steps', parseInt(value) || 20)}
                  min={1}
                  max={150}
                  className="w-16 text-center"
                  disabled={readOnly}
                />
              </div>

              {/* Steps Presets */}
              <div className="flex flex-wrap gap-1">
                {stepsPresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleChange('steps', preset.value)}
                    disabled={readOnly}
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded transition-all',
                      preset.active
                        ? 'bg-comfy-accent-orange text-white'
                        : 'bg-comfy-bg-tertiary text-comfy-text-secondary hover:bg-comfy-bg-primary hover:text-comfy-text-primary',
                      readOnly && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {preset.label}
                    <span className="ml-1 opacity-75">({preset.value})</span>
                  </button>
                ))}
              </div>

              {/* Steps Info Cards */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3 bg-comfy-bg-primary border-comfy-border">
                  <div className="text-xs text-comfy-text-secondary uppercase tracking-wide mb-1">
                    Quality Impact
                  </div>
                  <div className="text-sm font-semibold text-comfy-text-primary">
                    {getQualityImpact(localParams.steps)}
                  </div>
                </Card>
                <Card className="p-3 bg-comfy-bg-primary border-comfy-border">
                  <div className="text-xs text-comfy-text-secondary uppercase tracking-wide mb-1">
                    Est. Time
                  </div>
                  <div className="text-sm font-semibold text-comfy-text-primary">
                    {getEstimatedTime(localParams.steps)}
                  </div>
                </Card>
              </div>

              {/* Helpful hint */}
              <div className="bg-comfy-bg-primary border-l-4 border-comfy-accent-blue p-3 rounded-r">
                <div className="flex items-start gap-2">
                  <div className="text-comfy-accent-blue mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.25,10.5 8.5,11.5 8.5,13V14H7V13C7,10.5 9.25,8.5 12,8.5C14.75,8.5 17,10.5 17,13C17,14.5 16,15.25 15,16C14.25,16.5 13.75,17 13.75,18H12.25C12.25,16.75 12.75,16 13.5,15.25C14.5,14.25 15.5,13.75 15.5,13C15.5,11.5 14.25,10.5 12,10.5Z" />
                    </svg>
                  </div>
                  <div className="text-xs text-comfy-text-secondary leading-tight">
                    Optimal range for most use cases
                  </div>
                </div>
              </div>
            </div>

            {/* CFG Scale Control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-comfy-text-secondary uppercase tracking-wide">
                  CFG Scale
                  <button className="ml-1 text-comfy-text-secondary hover:text-comfy-text-primary">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.25,10.5 8.5,11.5 8.5,13V14H7V13C7,10.5 9.25,8.5 12,8.5C14.75,8.5 17,10.5 17,13C17,14.5 16,15.25 15,16C14.25,16.5 13.75,17 13.75,18H12.25C12.25,16.75 12.75,16 13.5,15.25C14.5,14.25 15.5,13.75 15.5,13C15.5,11.5 14.25,10.5 12,10.5Z" />
                    </svg>
                  </button>
                </label>
                <div className="text-xs text-comfy-text-secondary bg-comfy-bg-tertiary px-2 py-1 rounded">
                  {localParams.cfgScale}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Slider
                  value={localParams.cfgScale}
                  min={0.1}
                  max={30}
                  step={0.1}
                  onChange={(value) => handleChange('cfgScale', value)}
                  className="flex-1"
                  disabled={readOnly}
                />
                <Input
                  type="number"
                  value={localParams.cfgScale.toString()}
                  onChange={(value) => handleChange('cfgScale', parseFloat(value) || 1)}
                  min={0.1}
                  max={30}
                  step={0.1}
                  className="w-16 text-center"
                  disabled={readOnly}
                />
              </div>

              {/* CFG Presets */}
              <div className="flex flex-wrap gap-1">
                {cfgPresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handleChange('cfgScale', preset.value)}
                    disabled={readOnly}
                    className={cn(
                      'px-2 py-1 text-xs font-medium rounded transition-all',
                      preset.active
                        ? 'bg-comfy-accent-orange text-white'
                        : 'bg-comfy-bg-tertiary text-comfy-text-secondary hover:bg-comfy-bg-primary hover:text-comfy-text-primary',
                      readOnly && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {preset.label}
                    <span className="ml-1 opacity-75">({preset.value})</span>
                  </button>
                ))}
              </div>

              {/* CFG Info Cards */}
              <div className="grid grid-cols-2 gap-2">
                <Card className="p-3 bg-comfy-bg-primary border-comfy-border">
                  <div className="text-xs text-comfy-text-secondary uppercase tracking-wide mb-1">
                    Prompt Adherence
                  </div>
                  <div className="text-sm font-semibold text-comfy-text-primary">
                    {getPromptAdherence(localParams.cfgScale)}
                  </div>
                </Card>
                <Card className="p-3 bg-comfy-bg-primary border-comfy-border">
                  <div className="text-xs text-comfy-text-secondary uppercase tracking-wide mb-1">
                    Creativity
                  </div>
                  <div className="text-sm font-semibold text-comfy-text-primary">
                    {getCreativity(localParams.cfgScale)}
                  </div>
                </Card>
              </div>

              {/* Warning for very low CFG */}
              {localParams.cfgScale < 2 && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <div className="text-amber-400 mt-0.5">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
                      </svg>
                    </div>
                    <div className="text-xs text-amber-200">
                      Very low CFG may ignore your prompt
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seed Control */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-comfy-text-secondary uppercase tracking-wide">
                  Seed
                  <button className="ml-1 text-comfy-text-secondary hover:text-comfy-text-primary">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.25,10.5 8.5,11.5 8.5,13V14H7V13C7,10.5 9.25,8.5 12,8.5C14.75,8.5 17,10.5 17,13C17,14.5 16,15.25 15,16C14.25,16.5 13.75,17 13.75,18H12.25C12.25,16.75 12.75,16 13.5,15.25C14.5,14.25 15.5,13.75 15.5,13C15.5,11.5 14.25,10.5 12,10.5Z" />
                    </svg>
                  </button>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={localParams.seed}
                  onChange={(value) => handleChange('seed', value)}
                  className="flex-1 font-mono"
                  disabled={readOnly}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateRandomSeed}
                  disabled={readOnly}
                  className="px-2"
                  title="Generate random seed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2C7 1.45 7.45 1 8 1S9 1.45 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.45 17 2V4H18C19.11 4 20 4.89 20 6V8H4V6C4 4.89 4.89 4 6 4H7M18 10V20C18 21.11 17.11 22 16 22H8C6.89 22 6 21.11 6 20V10H18M8 12V18H10V12H8M12 12V18H14V12H12Z" />
                  </svg>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(localParams.seed)}
                  className="px-2"
                  title="Copy seed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </Button>
              </div>

              {/* Seed Info */}
              <div className="space-y-3">
                <Card className="p-3 bg-comfy-bg-primary border-comfy-border">
                  <div className="text-xs text-comfy-text-secondary uppercase tracking-wide mb-1">
                    Reproducibility
                  </div>
                  <div className="text-sm font-semibold text-comfy-text-primary">
                    Fixed
                  </div>
                </Card>

                <Card className="p-3 bg-comfy-bg-primary border-comfy-border">
                  <div className="text-xs text-comfy-text-secondary uppercase tracking-wide mb-1">
                    Hex
                  </div>
                  <div className="text-sm font-mono text-comfy-text-primary">
                    0x{parseInt(localParams.seed).toString(16).toUpperCase()}
                  </div>
                </Card>
              </div>

              {/* Seed Info */}
              <div className="bg-comfy-bg-primary border-l-4 border-comfy-accent-blue p-3 rounded-r">
                <div className="flex items-start gap-2">
                  <div className="text-comfy-accent-blue mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.25,10.5 8.5,11.5 8.5,13V14H7V13C7,10.5 9.25,8.5 12,8.5C14.75,8.5 17,10.5 17,13C17,14.5 16,15.25 15,16C14.25,16.5 13.75,17 13.75,18H12.25C12.25,16.75 12.75,16 13.5,15.25C14.5,14.25 15.5,13.75 15.5,13C15.5,11.5 14.25,10.5 12,10.5Z" />
                    </svg>
                  </div>
                  <div className="text-xs text-comfy-text-secondary leading-tight">
                    Use the same seed with identical settings to reproduce exact results
                  </div>
                </div>
              </div>
            </div>

            {/* Sampler & Scheduler */}
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium text-comfy-text-secondary uppercase tracking-wide">
                  Sampler
                </label>
                <select
                  value={localParams.sampler}
                  onChange={(e) => handleChange('sampler', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 bg-comfy-bg-tertiary border border-comfy-border rounded-lg text-comfy-text-primary focus:border-comfy-accent-orange focus:ring-2 focus:ring-comfy-accent-orange focus:ring-opacity-50 focus:outline-none"
                >
                  <option value="euler">Euler</option>
                  <option value="euler_ancestral">Euler Ancestral</option>
                  <option value="dpmpp_2m">DPM++ 2M</option>
                  <option value="dpmpp_2m_karras">DPM++ 2M Karras</option>
                  <option value="ddim">DDIM</option>
                  <option value="uni_pc">UniPC</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-comfy-text-secondary uppercase tracking-wide">
                  Scheduler
                </label>
                <select
                  value={localParams.scheduler}
                  onChange={(e) => handleChange('scheduler', e.target.value)}
                  disabled={readOnly}
                  className="w-full px-3 py-2 bg-comfy-bg-tertiary border border-comfy-border rounded-lg text-comfy-text-primary focus:border-comfy-accent-orange focus:ring-2 focus:ring-comfy-accent-orange focus:ring-opacity-50 focus:outline-none"
                >
                  <option value="simple">Simple</option>
                  <option value="normal">Normal</option>
                  <option value="karras">Karras</option>
                  <option value="exponential">Exponential</option>
                  <option value="sgm_uniform">SGM Uniform</option>
                </select>
              </div>
            </div>

            {/* Additional Settings Placeholder */}
            <div className="lg:col-span-2 xl:col-span-1 space-y-4">
              <label className="text-sm font-medium text-comfy-text-secondary uppercase tracking-wide">
                Advanced Settings
              </label>
              <div className="text-xs text-comfy-text-secondary">
                Additional generation parameters will appear here based on your workflow configuration.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)

GenerationSettings.displayName = 'GenerationSettings'

export { GenerationSettings }