// ============================================================================
// ComfyUI React - Model Tooltips with Technical Parameter Explanations
// ============================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './ModelTooltips.css'

export interface ModelTooltipsProps {
  children: React.ReactNode
  parameter: string
  category?: 'generation' | 'model' | 'lora' | 'vae' | 'sampling' | 'general'
  value?: any
  className?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
  showDelay?: number
  hideDelay?: number
  interactive?: boolean
  maxWidth?: number
}

interface TooltipInfo {
  title: string
  description: string
  technicalDetails: string[]
  optimalRange?: string
  commonValues?: string[]
  tips?: string[]
  warnings?: string[]
  learnMore?: string
  relatedParameters?: string[]
}

// Comprehensive parameter database
const PARAMETER_INFO: Record<string, TooltipInfo> = {
  // Generation Parameters
  'steps': {
    title: 'Sampling Steps',
    description: 'Number of denoising steps the AI model performs to generate the image.',
    technicalDetails: [
      'Each step refines the image by removing noise',
      'More steps generally improve quality up to a point',
      'Diminishing returns after optimal range'
    ],
    optimalRange: '20-30 steps',
    commonValues: ['20', '25', '30', '50'],
    tips: [
      'Start with 20-25 steps for most use cases',
      'Increase to 30-50 for higher quality',
      'SDXL often needs fewer steps than SD1.5'
    ],
    warnings: ['Very high step counts (>100) waste time with minimal quality gain'],
    relatedParameters: ['cfg', 'sampler', 'scheduler']
  },
  
  'cfg': {
    title: 'CFG Scale (Classifier-Free Guidance)',
    description: 'Controls how closely the AI follows your prompt versus generating freely.',
    technicalDetails: [
      'Higher values = stricter prompt adherence',
      'Lower values = more creative interpretation',
      'Balances conditioning vs unconditioning'
    ],
    optimalRange: '7-12 for SD1.5, 3-8 for SDXL',
    commonValues: ['7', '7.5', '10', '12'],
    tips: [
      'Use 7-10 for most prompts',
      'Lower CFG (3-6) for artistic/abstract images',
      'SDXL performs better with lower CFG scales'
    ],
    warnings: [
      'Very high CFG (>15) can cause over-saturation',
      'Very low CFG (<3) may ignore your prompt'
    ],
    relatedParameters: ['steps', 'sampler', 'negative_prompt']
  },

  'seed': {
    title: 'Random Seed',
    description: 'Starting point for the random number generator that controls image generation.',
    technicalDetails: [
      'Same seed + settings = identical image',
      'Different seeds produce variations',
      'Range: -2147483648 to 2147483647'
    ],
    commonValues: ['Random', '42', '123456789', '-1'],
    tips: [
      'Use specific seeds to reproduce results',
      'Use -1 or "Random" for variety',
      'Save good seeds for later use'
    ],
    relatedParameters: ['subseed', 'seed_resize_from']
  },

  // Sampling Parameters
  'sampler': {
    title: 'Sampling Method',
    description: 'Algorithm used to denoise the image during generation.',
    technicalDetails: [
      'Different mathematical approaches to denoising',
      'Affects quality, speed, and style',
      'Some samplers converge faster than others'
    ],
    commonValues: ['Euler a', 'DPM++ 2M Karras', 'DPM++ SDE Karras', 'DDIM'],
    tips: [
      'Euler a: Fast, good for most cases',
      'DPM++ 2M Karras: High quality, efficient',
      'DPM++ SDE: Slower but often better quality'
    ],
    relatedParameters: ['scheduler', 'steps', 'cfg']
  },

  'scheduler': {
    title: 'Noise Schedule',
    description: 'Controls how noise is removed at each step during generation.',
    technicalDetails: [
      'Defines noise levels across generation steps',
      'Affects convergence speed and quality',
      'Works with sampler to control denoising'
    ],
    commonValues: ['Normal', 'Karras', 'Exponential', 'Polyexponential'],
    tips: [
      'Karras: Often produces better quality',
      'Normal: Standard, reliable choice',
      'Exponential: Good for certain samplers'
    ],
    relatedParameters: ['sampler', 'steps', 'cfg']
  },

  // LoRA Parameters
  'lora_strength': {
    title: 'LoRA Strength',
    description: 'Controls how strongly the LoRA model affects the base model.',
    technicalDetails: [
      'Multiplier applied to LoRA weights',
      'Separate control for model and CLIP portions',
      'Range typically 0.0 to 2.0'
    ],
    optimalRange: '0.5-1.2 for most LoRAs',
    commonValues: ['0.7', '0.8', '1.0', '1.2'],
    tips: [
      'Start with 0.8-1.0 for most LoRAs',
      'Lower values for subtle effects',
      'Higher values for stronger influence'
    ],
    warnings: [
      'Very high values (>1.5) can cause artifacts',
      'Some LoRAs are trained for specific strength ranges'
    ],
    relatedParameters: ['clip_strength', 'model_strength']
  },

  'model_strength': {
    title: 'Model Strength',
    description: 'Controls LoRA influence on the UNet (image generation) portion of the model.',
    technicalDetails: [
      'Affects visual style and composition',
      'Separate from CLIP (text understanding)',
      'Directly impacts generated image appearance'
    ],
    optimalRange: '0.5-1.2',
    tips: [
      'Primary control for LoRA visual effect',
      'Adjust based on desired intensity',
      'Monitor for overfitting at high values'
    ],
    relatedParameters: ['clip_strength', 'lora_strength']
  },

  'clip_strength': {
    title: 'CLIP Strength',
    description: 'Controls LoRA influence on text understanding and prompt adherence.',
    technicalDetails: [
      'Affects how prompts are interpreted',
      'Separate from UNet (visual) influence',
      'Can change prompt keyword meanings'
    ],
    optimalRange: '0.5-1.2',
    tips: [
      'Usually similar to model strength',
      'Lower values preserve original prompt meanings',
      'Higher values for stronger concept influence'
    ],
    relatedParameters: ['model_strength', 'lora_strength']
  },

  // VAE Parameters
  'vae': {
    title: 'Variational Autoencoder',
    description: 'Converts between pixel images and latent space representations.',
    technicalDetails: [
      'Encoder compresses images to latent space',
      'Decoder reconstructs images from latents',
      'Affects final image quality and color'
    ],
    tips: [
      'Different VAEs can change color tone',
      'Some VAEs are optimized for specific models',
      'SDXL has its own optimized VAE'
    ],
    relatedParameters: ['model', 'architecture']
  },

  // Model Parameters
  'model': {
    title: 'Base Model/Checkpoint',
    description: 'The main AI model that generates images from your prompts.',
    technicalDetails: [
      'Contains learned artistic styles and concepts',
      'Determines image quality and capabilities',
      'Different architectures (SD1.5, SDXL, etc.)'
    ],
    tips: [
      'Choose models based on desired style',
      'Realistic models for photos, anime models for illustrations',
      'Check model compatibility with your VAE and LoRAs'
    ],
    relatedParameters: ['vae', 'lora', 'architecture']
  },

  'architecture': {
    title: 'Model Architecture',
    description: 'The underlying structure and version of the AI model.',
    technicalDetails: [
      'SD1.5: Original, 512x512 native resolution',
      'SDXL: Enhanced, 1024x1024 native resolution',
      'SD3: Latest, improved text understanding'
    ],
    tips: [
      'SDXL generally produces higher quality',
      'SD1.5 has more available LoRAs',
      'Choose architecture based on your needs'
    ],
    relatedParameters: ['model', 'resolution', 'vae']
  },

  'clip_skip': {
    title: 'CLIP Skip',
    description: 'Uses an earlier layer of CLIP for text processing, affecting style.',
    technicalDetails: [
      'CLIP has multiple layers for text understanding',
      'Later layers = more refined understanding',
      'Earlier layers = more artistic interpretation'
    ],
    optimalRange: '1-2 for most models',
    commonValues: ['1', '2'],
    tips: [
      'CLIP Skip 1: Standard, follows prompts closely',
      'CLIP Skip 2: Often used for anime/artistic styles',
      'Higher values rarely beneficial'
    ],
    warnings: ['SDXL models typically use CLIP Skip 1'],
    relatedParameters: ['model', 'architecture']
  },

  // Resolution Parameters
  'width': {
    title: 'Image Width',
    description: 'Horizontal resolution of the generated image in pixels.',
    technicalDetails: [
      'Must be multiple of 8 (latent space requirement)',
      'Higher resolution = more detail, more VRAM',
      'Aspect ratio affects composition'
    ],
    commonValues: ['512', '768', '1024', '1536'],
    tips: [
      'SD1.5: 512-768 optimal',
      'SDXL: 1024+ recommended',
      'Consider VRAM limitations'
    ],
    relatedParameters: ['height', 'architecture', 'vram']
  },

  'height': {
    title: 'Image Height',
    description: 'Vertical resolution of the generated image in pixels.',
    technicalDetails: [
      'Must be multiple of 8 (latent space requirement)',
      'Portrait vs landscape affects generation',
      'Some models trained on specific ratios'
    ],
    commonValues: ['512', '768', '1024', '1536'],
    tips: [
      'Match aspect ratio to intended use',
      'Square ratios often work best',
      'Consider training resolution of your model'
    ],
    relatedParameters: ['width', 'architecture', 'aspect_ratio']
  },

  // Advanced Parameters
  'denoise': {
    title: 'Denoising Strength',
    description: 'How much the AI modifies the input image (for img2img).',
    technicalDetails: [
      '0.0 = no change to input image',
      '1.0 = completely new image',
      'Controls balance between input and generation'
    ],
    optimalRange: '0.3-0.8 for most img2img',
    tips: [
      'Higher values for major changes',
      'Lower values to preserve input structure',
      'Adjust based on desired transformation level'
    ],
    relatedParameters: ['img2img', 'strength']
  },

  'batch_size': {
    title: 'Batch Size',
    description: 'Number of images generated simultaneously.',
    technicalDetails: [
      'Higher batch size = more VRAM usage',
      'Generates multiple variations at once',
      'May affect generation speed per image'
    ],
    commonValues: ['1', '2', '4', '8'],
    tips: [
      'Start with 1 for testing',
      'Increase based on available VRAM',
      'Consider queue vs batch for many images'
    ],
    warnings: ['High batch sizes can cause out-of-memory errors'],
    relatedParameters: ['vram', 'memory']
  }
}

export const ModelTooltips: React.FC<ModelTooltipsProps> = ({
  children,
  parameter,
  category = 'general',
  value,
  className = '',
  placement = 'auto',
  showDelay = 500,
  hideDelay = 100,
  interactive = false,
  maxWidth = 400
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [actualPlacement, setActualPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('top')
  
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const hideTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Get tooltip information
  const tooltipInfo = PARAMETER_INFO[parameter.toLowerCase()] || {
    title: parameter,
    description: `Information about ${parameter} parameter.`,
    technicalDetails: ['No detailed information available for this parameter.'],
    tips: ['Check documentation for more details.']
  }

  // Calculate optimal placement
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const trigger = triggerRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    const tooltipWidth = maxWidth
    const tooltipHeight = 300 // Estimated height
    const gap = 8

    let x = 0
    let y = 0
    let finalPlacement: 'top' | 'bottom' | 'left' | 'right' = 'top'

    if (placement === 'auto') {
      // Determine best placement based on available space
      const spaceTop = trigger.top
      const spaceBottom = viewport.height - trigger.bottom
      const spaceLeft = trigger.left
      const spaceRight = viewport.width - trigger.right

      if (spaceBottom >= tooltipHeight) {
        finalPlacement = 'bottom'
      } else if (spaceTop >= tooltipHeight) {
        finalPlacement = 'top'
      } else if (spaceRight >= tooltipWidth) {
        finalPlacement = 'right'
      } else if (spaceLeft >= tooltipWidth) {
        finalPlacement = 'left'
      } else {
        finalPlacement = 'bottom' // Fallback
      }
    } else {
      finalPlacement = placement
    }

    // Calculate position based on placement
    switch (finalPlacement) {
      case 'top':
        x = trigger.left + trigger.width / 2 - tooltipWidth / 2
        y = trigger.top - tooltipHeight - gap
        break
      case 'bottom':
        x = trigger.left + trigger.width / 2 - tooltipWidth / 2
        y = trigger.bottom + gap
        break
      case 'left':
        x = trigger.left - tooltipWidth - gap
        y = trigger.top + trigger.height / 2 - tooltipHeight / 2
        break
      case 'right':
        x = trigger.right + gap
        y = trigger.top + trigger.height / 2 - tooltipHeight / 2
        break
    }

    // Keep tooltip within viewport
    x = Math.max(gap, Math.min(x, viewport.width - tooltipWidth - gap))
    y = Math.max(gap, Math.min(y, viewport.height - tooltipHeight - gap))

    setPosition({ x, y })
    setActualPlacement(finalPlacement)
  }, [maxWidth, placement])

  // Show tooltip
  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = undefined
    }

    showTimeoutRef.current = setTimeout(() => {
      calculatePosition()
      setIsVisible(true)
    }, showDelay) as NodeJS.Timeout
  }, [calculatePosition, showDelay])

  // Hide tooltip
  const hideTooltip = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current)
      showTimeoutRef.current = undefined
    }

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false)
    }, hideDelay) as NodeJS.Timeout
  }, [hideDelay])

  // Handle mouse events
  const handleMouseEnter = useCallback(() => {
    showTooltip()
  }, [showTooltip])

  const handleMouseLeave = useCallback(() => {
    if (!interactive) {
      hideTooltip()
    }
  }, [hideTooltip, interactive])

  // Handle tooltip mouse events (for interactive tooltips)
  const handleTooltipMouseEnter = useCallback(() => {
    if (interactive && hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = undefined
    }
  }, [interactive])

  const handleTooltipMouseLeave = useCallback(() => {
    if (interactive) {
      hideTooltip()
    }
  }, [hideTooltip, interactive])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (!isVisible) return

    const handlePositionUpdate = () => calculatePosition()
    
    window.addEventListener('scroll', handlePositionUpdate, true)
    window.addEventListener('resize', handlePositionUpdate)

    return () => {
      window.removeEventListener('scroll', handlePositionUpdate, true)
      window.removeEventListener('resize', handlePositionUpdate)
    }
  }, [isVisible, calculatePosition])

  // Format value for display
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'Not set'
    if (typeof val === 'number') return val.toString()
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (Array.isArray(val)) return val.join(', ')
    return String(val)
  }

  // Get category color
  const getCategoryColor = (cat: string): string => {
    const colors = {
      generation: '#3498db',
      model: '#9b59b6',
      lora: '#e74c3c',
      vae: '#f39c12',
      sampling: '#2ecc71',
      general: '#95a5a6'
    }
    return colors[cat as keyof typeof colors] || colors.general
  }

  const categoryColor = getCategoryColor(category)

  return (
    <>
      <div
        ref={triggerRef}
        className={`model-tooltip-trigger ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="button"
        tabIndex={0}
        aria-describedby={isVisible ? `tooltip-${parameter}` : undefined}
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          id={`tooltip-${parameter}`}
          className={`model-tooltip ${actualPlacement}`}
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            maxWidth: maxWidth,
            zIndex: 10000
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          role="tooltip"
        >
          <div 
            className="tooltip-header"
            style={{ borderLeftColor: categoryColor }}
          >
            <div className="tooltip-title">
              <h4>{tooltipInfo.title}</h4>
              <span 
                className="tooltip-category"
                style={{ backgroundColor: categoryColor }}
              >
                {category}
              </span>
            </div>
            {value !== undefined && (
              <div className="tooltip-value">
                Current: <strong>{formatValue(value)}</strong>
              </div>
            )}
          </div>

          <div className="tooltip-content">
            <p className="tooltip-description">{tooltipInfo.description}</p>

            {tooltipInfo.technicalDetails && (
              <div className="tooltip-section">
                <h5>Technical Details</h5>
                <ul>
                  {tooltipInfo.technicalDetails.map((detail, index) => (
                    <li key={index}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}

            {tooltipInfo.optimalRange && (
              <div className="tooltip-section">
                <h5>Optimal Range</h5>
                <div className="optimal-range">{tooltipInfo.optimalRange}</div>
              </div>
            )}

            {tooltipInfo.commonValues && (
              <div className="tooltip-section">
                <h5>Common Values</h5>
                <div className="common-values">
                  {tooltipInfo.commonValues.map((val, index) => (
                    <span key={index} className="value-tag">{val}</span>
                  ))}
                </div>
              </div>
            )}

            {tooltipInfo.tips && (
              <div className="tooltip-section">
                <h5>💡 Tips</h5>
                <ul className="tips-list">
                  {tooltipInfo.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}

            {tooltipInfo.warnings && (
              <div className="tooltip-section warnings">
                <h5>⚠️ Warnings</h5>
                <ul className="warnings-list">
                  {tooltipInfo.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {tooltipInfo.relatedParameters && (
              <div className="tooltip-section">
                <h5>Related Parameters</h5>
                <div className="related-params">
                  {tooltipInfo.relatedParameters.map((param, index) => (
                    <span key={index} className="param-tag">{param}</span>
                  ))}
                </div>
              </div>
            )}

            {tooltipInfo.learnMore && (
              <div className="tooltip-footer">
                <a 
                  href={tooltipInfo.learnMore} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="learn-more-link"
                >
                  Learn More
                </a>
              </div>
            )}
          </div>

          <div className={`tooltip-arrow ${actualPlacement}`} />
        </div>,
        document.body
      )}
    </>
  )
}

// Convenience wrapper for common use cases
export const ParameterTooltip: React.FC<{
  parameter: string
  children: React.ReactNode
  value?: any
  category?: ModelTooltipsProps['category']
}> = ({ parameter, children, value, category }) => {
  return (
    <ModelTooltips
      parameter={parameter}
      value={value}
      category={category}
      interactive={true}
      showDelay={300}
    >
      {children}
    </ModelTooltips>
  )
}

// Export parameter info for use in other components
export { PARAMETER_INFO }