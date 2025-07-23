import React, { useState } from 'react'
import type { ExtractedParameters } from '@/utils/parameterExtractor'

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['generation']))

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
    if (!readOnly && onParameterChange) {
      onParameterChange(nodeId, parameter, value)
    }
  }

  return (
    <div className="parameter-display">
      {/* Generation Parameters */}
      <ParameterSection
        title="Generation Settings"
        icon="⚙️"
        isExpanded={expandedSections.has('generation')}
        onToggle={() => toggleSection('generation')}
      >
        <div className="parameter-grid">
          {parameters.generation.steps && (
            <ParameterField
              label="Steps"
              value={parameters.generation.steps}
              type="number"
              min={1}
              max={150}
              onChange={(value) => handleChange(parameters.generation.nodeId || '', 'steps', value)}
              readOnly={readOnly}
            />
          )}
          {parameters.generation.cfg && (
            <ParameterField
              label="CFG Scale"
              value={parameters.generation.cfg}
              type="number"
              min={1}
              max={30}
              step={0.1}
              onChange={(value) => handleChange(parameters.generation.nodeId || '', 'cfg', value)}
              readOnly={readOnly}
            />
          )}
          {parameters.generation.seed !== undefined && (
            <ParameterField
              label="Seed"
              value={parameters.generation.seed}
              type="number"
              min={0}
              onChange={(value) => handleChange(parameters.generation.nodeId || '', 'seed', value)}
              readOnly={readOnly}
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
          {parameters.image.batchSize && (
            <ParameterField
              label="Batch Size"
              value={parameters.image.batchSize}
              type="number"
              min={1}
              max={10}
              onChange={(value) => handleChange(parameters.image.nodeId || '', 'batch_size', value)}
              readOnly={readOnly}
            />
          )}
        </div>
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
    <label className="parameter-label">{label}</label>
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
      className={`parameter-input ${readOnly ? 'readonly' : ''}`}
    />
  </div>
)