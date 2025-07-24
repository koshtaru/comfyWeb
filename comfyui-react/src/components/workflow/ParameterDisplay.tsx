import React, { useState, useEffect } from 'react'
import type { ExtractedParameters } from '@/utils/parameterExtractor'
import { 
  StepsControl, 
  CFGScaleControl, 
  DimensionsControl, 
  SeedControl, 
  BatchControl,
  DimensionPresets,
  PresetManager
} from '@/components/parameters'
import { 
  extractedParametersToParameterSet, 
  applyParameterSet 
} from '@/utils/parameterConversion'
import '@/components/parameters/Parameters.css'

interface ParameterDisplayProps {
  parameters: ExtractedParameters
  onParameterChange?: (nodeId: string, parameter: string, value: any) => void
  readOnly?: boolean
}

export const ParameterDisplay: React.FC<ParameterDisplayProps> = ({
  parameters,
  onParameterChange,
  readOnly = false
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['preset-management', 'generation']))
  
  // Log parameter changes
  useEffect(() => {
    console.log('🏗️ [ParameterDisplay] Parameters updated:', {
      steps: parameters.generation.steps,
      cfg: parameters.generation.cfg,
      seed: parameters.generation.seed,
      width: parameters.image.width,
      height: parameters.image.height
    })
  }, [parameters])

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleChange = (nodeId: string, parameter: string, value: any) => {
    console.log('📊 [ParameterDisplay] handleChange called:', { 
      nodeId, 
      parameter, 
      value,
      readOnly,
      hasCallback: !!onParameterChange 
    })
    
    if (!readOnly && onParameterChange) {
      onParameterChange(nodeId, parameter, value)
    }
  }

  // Preset handling
  const handleApplyPreset = (parameterSet: any) => {
    if (!onParameterChange || readOnly) return
    
    console.log('🎯 [ParameterDisplay] Applying preset:', parameterSet)
    applyParameterSet(parameterSet, parameters, onParameterChange)
  }


  const getCurrentParameterSet = () => {
    return extractedParametersToParameterSet(parameters)
  }

  return (
    <div className="parameter-display">
      {/* Preset Management - Only show if not read-only */}
      {!readOnly && (
        <ParameterSection
          title="Presets"
          icon="🎛️"
          isExpanded={expandedSections.has('preset-management')}
          onToggle={() => toggleSection('preset-management')}
        >
          <PresetManager
            currentParameters={getCurrentParameterSet()}
            onApplyPreset={handleApplyPreset}
            className="preset-manager-integrated"
          />
        </ParameterSection>
      )}

      {/* Generation Parameters */}
      <ParameterSection
        title="Generation Settings"
        icon="⚙️"
        isExpanded={expandedSections.has('generation')}
        onToggle={() => toggleSection('generation')}
      >
        <div className="parameter-grid">
          {parameters.generation.steps && (
            <StepsControl
              value={parameters.generation.steps}
              onChange={(value) => handleChange(parameters.generation.nodeId || '', 'steps', value)}
              disabled={readOnly}
              showPresets={!readOnly}
            />
          )}
          {parameters.generation.cfg && (
            <CFGScaleControl
              value={parameters.generation.cfg}
              onChange={(value) => handleChange(parameters.generation.nodeId || '', 'cfg', value)}
              disabled={readOnly}
              showPresets={!readOnly}
            />
          )}
          {parameters.generation.seed !== undefined && (
            <SeedControl
              value={parameters.generation.seed}
              onChange={(value) => handleChange(parameters.generation.nodeId || '', 'seed', value)}
              disabled={readOnly}
              showCopy={true}
            />
          )}
          {parameters.generation.sampler && (
            <ParameterField
              label="Sampler"
              value={parameters.generation.sampler}
              type="text"
              readOnly={true}
            />
          )}
          {parameters.generation.scheduler && (
            <ParameterField
              label="Scheduler"
              value={parameters.generation.scheduler}
              type="text"
              readOnly={true}
            />
          )}
        </div>
      </ParameterSection>

      {/* Model Parameters */}
      <ParameterSection
        title="Model Configuration"
        icon="🧠"
        isExpanded={expandedSections.has('model')}
        onToggle={() => toggleSection('model')}
      >
        <div className="parameter-grid">
          {parameters.model.checkpoint && (
            <ParameterField
              label="Checkpoint"
              value={parameters.model.checkpoint}
              type="text"
              readOnly={true}
            />
          )}
          {parameters.model.architecture && (
            <ParameterField
              label="Architecture"
              value={parameters.model.architecture}
              type="text"
              readOnly={true}
            />
          )}
          {parameters.model.vae && (
            <ParameterField
              label="VAE"
              value={parameters.model.vae}
              type="text"
              readOnly={true}
            />
          )}
        </div>
        
        {parameters.model.loras.length > 0 && (
          <div className="parameter-subsection">
            <h4 className="subsection-title">LoRAs ({parameters.model.loras.length})</h4>
            <div className="lora-list">
              {parameters.model.loras.map((lora, index) => (
                <div key={index} className="lora-item">
                  <span className="lora-name">{lora.name}</span>
                  <div className="lora-strengths">
                    <span className="strength-label">Model: {lora.modelStrength}</span>
                    <span className="strength-label">CLIP: {lora.clipStrength}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {parameters.model.controlnets.length > 0 && (
          <div className="parameter-subsection">
            <h4 className="subsection-title">ControlNets ({parameters.model.controlnets.length})</h4>
            <div className="controlnet-list">
              {parameters.model.controlnets.map((cn, index) => (
                <div key={index} className="controlnet-item">
                  <span className="controlnet-name">{cn.name}</span>
                  <span className="controlnet-strength">Strength: {cn.strength}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </ParameterSection>

      {/* Image Parameters */}
      <ParameterSection
        title="Image Settings"
        icon="🖼️"
        isExpanded={expandedSections.has('image')}
        onToggle={() => toggleSection('image')}
      >
        <div className="parameter-grid">
          {(parameters.image.width && parameters.image.height) ? (
            <DimensionsControl
              width={parameters.image.width}
              height={parameters.image.height}
              onWidthChange={(value) => handleChange(parameters.image.nodeId || '', 'width', value)}
              onHeightChange={(value) => handleChange(parameters.image.nodeId || '', 'height', value)}
              disabled={readOnly}
              showPresets={!readOnly}
              showAspectRatio={!readOnly}
            />
          ) : (
            <>
              {parameters.image.width && (
                <ParameterField
                  label="Width"
                  value={parameters.image.width}
                  type="number"
                  min={64}
                  max={4096}
                  step={8}
                  onChange={(value) => handleChange(parameters.image.nodeId || '', 'width', value)}
                  readOnly={readOnly}
                />
              )}
              {parameters.image.height && (
                <ParameterField
                  label="Height"
                  value={parameters.image.height}
                  type="number"
                  min={64}
                  max={4096}
                  step={8}
                  onChange={(value) => handleChange(parameters.image.nodeId || '', 'height', value)}
                  readOnly={readOnly}
                />
              )}
            </>
          )}
          {parameters.image.batchSize && (
            <BatchControl
              batchSize={parameters.image.batchSize}
              batchCount={1} // Default to 1 since we don't have batch count in extracted parameters
              onBatchSizeChange={(value) => handleChange(parameters.image.nodeId || '', 'batch_size', value)}
              onBatchCountChange={() => {}} // No-op since we don't have batch count parameter
              disabled={readOnly}
              showWarnings={!readOnly}
            />
          )}
        </div>

        {/* Quick Dimension Presets - Only show if not read-only and we have width/height */}
        {!readOnly && parameters.image.width && parameters.image.height && (
          <div className="dimension-presets-section">
            <DimensionPresets
              currentWidth={parameters.image.width}
              currentHeight={parameters.image.height}
              onDimensionChange={(width, height) => {
                handleChange(parameters.image.nodeId || '', 'width', width)
                handleChange(parameters.image.nodeId || '', 'height', height)
              }}
              disabled={readOnly}
              compact={true}
              showLabels={false}
            />
          </div>
        )}
      </ParameterSection>

      {/* Prompts */}
      <ParameterSection
        title="Prompts"
        icon="💭"
        isExpanded={expandedSections.has('prompts')}
        onToggle={() => toggleSection('prompts')}
      >
        {parameters.prompts.positive && (
          <div className="prompt-field">
            <label className="prompt-label">Positive Prompt</label>
            <textarea
              className="prompt-textarea"
              value={parameters.prompts.positive}
              onChange={(e) => handleChange(parameters.prompts.positiveNodeId || '', 'text', e.target.value)}
              readOnly={readOnly}
              rows={3}
            />
          </div>
        )}
        {parameters.prompts.negative && (
          <div className="prompt-field">
            <label className="prompt-label">Negative Prompt</label>
            <textarea
              className="prompt-textarea"
              value={parameters.prompts.negative}
              onChange={(e) => handleChange(parameters.prompts.negativeNodeId || '', 'text', e.target.value)}
              readOnly={readOnly}
              rows={2}
            />
          </div>
        )}
      </ParameterSection>

      {/* Metadata */}
      <ParameterSection
        title="Workflow Info"
        icon="📊"
        isExpanded={expandedSections.has('metadata')}
        onToggle={() => toggleSection('metadata')}
      >
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="metadata-label">Complexity</span>
            <span className={`metadata-value complexity-${parameters.metadata.complexity.toLowerCase()}`}>
              {parameters.metadata.complexity}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Total Nodes</span>
            <span className="metadata-value">{parameters.metadata.totalNodes}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Est. VRAM</span>
            <span className="metadata-value">{parameters.metadata.estimatedVRAM}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Architecture</span>
            <span className="metadata-value">{parameters.metadata.architecture}</span>
          </div>
        </div>

        <div className="feature-tags">
          {parameters.metadata.hasImg2Img && <span className="feature-tag">IMG2IMG</span>}
          {parameters.metadata.hasControlNet && <span className="feature-tag">CONTROLNET</span>}
          {parameters.metadata.hasLora && <span className="feature-tag">LORA</span>}
          {parameters.metadata.hasInpainting && <span className="feature-tag">INPAINTING</span>}
          {parameters.metadata.hasUpscaling && <span className="feature-tag">UPSCALING</span>}
        </div>
      </ParameterSection>

    </div>
  )
}

interface ParameterSectionProps {
  title: string
  icon: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

const ParameterSection: React.FC<ParameterSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children
}) => (
  <div className="parameter-section">
    <button className="section-header" onClick={onToggle}>
      <span className="section-icon">{icon}</span>
      <span className="section-title">{title}</span>
      <svg 
        className={`expand-icon ${isExpanded ? 'expanded' : ''}`}
        viewBox="0 0 24 24" 
        width="16" 
        height="16"
      >
        <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
      </svg>
    </button>
    {isExpanded && (
      <div className="section-content">
        {children}
      </div>
    )}
  </div>
)

interface ParameterFieldProps {
  label: string
  value: any
  type: 'text' | 'number'
  min?: number
  max?: number
  step?: number
  onChange?: (value: any) => void
  readOnly?: boolean
}

const ParameterField: React.FC<ParameterFieldProps> = ({
  label,
  value,
  type,
  min,
  max,
  step,
  onChange,
  readOnly = false
}) => (
  <div className="parameter-field">
    <label className="workflow-parameter-label">{label}</label>
    <input
      type={type}
      value={value || ''}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        if (onChange && !readOnly) {
          const newValue = type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
          onChange(newValue)
        }
      }}
      readOnly={readOnly}
      className={`workflow-parameter-input ${readOnly ? 'readonly' : ''}`}
    />
  </div>
)