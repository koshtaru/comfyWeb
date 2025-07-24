import React from 'react'

export interface ParameterTooltipContent {
  title: string
  description: string
  qualityImpact?: 'low' | 'medium' | 'high'
  speedImpact?: 'low' | 'medium' | 'high'
  recommendations?: string[]
  range?: {
    min: number
    max: number
    recommended?: number | [number, number]
  }
}

export const useParameterTooltips = () => {
  const tooltips: Record<string, ParameterTooltipContent> = {
    steps: {
      title: 'Sampling Steps',
      description: 'Number of denoising steps the AI model performs. More steps generally improve quality but increase generation time.',
      qualityImpact: 'high',
      speedImpact: 'high',
      range: {
        min: 1,
        max: 150,
        recommended: [20, 50]
      },
      recommendations: [
        'Start with 20-30 steps for most images',
        'Use 40-50+ steps for high detail work',
        'Diminishing returns beyond 50 steps'
      ]
    },

    cfg: {
      title: 'CFG Scale (Classifier Free Guidance)',
      description: 'Controls how closely the AI follows your prompt. Higher values stick closer to the prompt but may reduce creativity.',
      qualityImpact: 'high',
      speedImpact: 'low',
      range: {
        min: 1,
        max: 30,
        recommended: [7, 12]
      },
      recommendations: [
        'Use 7-8 for creative, artistic results',
        'Use 10-12 for precise prompt following',
        'Values above 15 may cause artifacts'
      ]
    },

    width: {
      title: 'Image Width',
      description: 'Width of the generated image in pixels. Must be divisible by 8. Larger sizes require more VRAM and time.',
      qualityImpact: 'medium',
      speedImpact: 'high',
      range: {
        min: 64,
        max: 4096,
        recommended: 512
      },
      recommendations: [
        'Standard: 512×512 or 768×768',
        'Portrait: 512×768 or 768×1024',
        'Landscape: 768×512 or 1024×768'
      ]
    },

    height: {
      title: 'Image Height',
      description: 'Height of the generated image in pixels. Must be divisible by 8. Larger sizes require more VRAM and time.',
      qualityImpact: 'medium',
      speedImpact: 'high',
      range: {
        min: 64,
        max: 4096,
        recommended: 512
      },
      recommendations: [
        'Standard: 512×512 or 768×768',
        'Portrait: 512×768 or 768×1024',
        'Landscape: 768×512 or 1024×768'
      ]
    },

    seed: {
      title: 'Random Seed',
      description: 'Controls the randomness of generation. Same seed with identical settings produces identical results.',
      qualityImpact: 'low',
      speedImpact: 'low',
      recommendations: [
        'Use -1 for random seed each time',
        'Save specific seeds for variations',
        'Seeds are model and setting dependent'
      ]
    },

    batchSize: {
      title: 'Batch Size',
      description: 'Number of images generated simultaneously. Higher values are more VRAM efficient but use more memory.',
      qualityImpact: 'low',
      speedImpact: 'medium',
      range: {
        min: 1,
        max: 16,
        recommended: [1, 4]
      },
      recommendations: [
        'Use 1 for single high-quality images',
        'Use 2-4 for variations and comparisons',
        'Higher values require more VRAM'
      ]
    },

    batchCount: {
      title: 'Batch Count',
      description: 'Number of batches to generate sequentially. Total images = Batch Size × Batch Count.',
      qualityImpact: 'low',
      speedImpact: 'high',
      range: {
        min: 1,
        max: 100,
        recommended: 1
      },
      recommendations: [
        'Use 1 for most cases',
        'Increase for bulk generation',
        'Each batch processes independently'
      ]
    }
  }

  const getTooltipContent = (parameterName: string): React.ReactNode => {
    const tooltip = tooltips[parameterName]
    if (!tooltip) return null

    const getImpactColor = (impact?: string) => {
      switch (impact) {
        case 'high': return '#ef4444' // red
        case 'medium': return '#f59e0b' // amber
        case 'low': return '#10b981' // emerald
        default: return '#6b7280' // gray
      }
    }

    const formatRange = (range?: ParameterTooltipContent['range']) => {
      if (!range) return null
      
      const recommended = Array.isArray(range.recommended) 
        ? `${range.recommended[0]}-${range.recommended[1]}`
        : range.recommended

      return (
        <div style={{ fontSize: '0.8125rem', marginTop: '0.5rem', opacity: 0.8 }}>
          <strong>Range:</strong> {range.min} - {range.max}
          {recommended && (
            <span style={{ marginLeft: '0.5rem' }}>
              <strong>Recommended:</strong> {recommended}
            </span>
          )}
        </div>
      )
    }

    return (
      <div>
        <div style={{ marginBottom: '0.5rem' }}>
          <strong style={{ color: 'var(--color-accent-orange)' }}>
            {tooltip.title}
          </strong>
        </div>
        
        <p style={{ margin: '0 0 0.75rem 0' }}>
          {tooltip.description}
        </p>

        {(tooltip.qualityImpact || tooltip.speedImpact) && (
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '0.75rem',
            fontSize: '0.8125rem'
          }}>
            {tooltip.qualityImpact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>Quality Impact:</span>
                <span style={{ 
                  color: getImpactColor(tooltip.qualityImpact),
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}>
                  {tooltip.qualityImpact}
                </span>
              </div>
            )}
            {tooltip.speedImpact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span>Speed Impact:</span>
                <span style={{ 
                  color: getImpactColor(tooltip.speedImpact),
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}>
                  {tooltip.speedImpact}
                </span>
              </div>
            )}
          </div>
        )}

        {formatRange(tooltip.range)}

        {tooltip.recommendations && tooltip.recommendations.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <strong style={{ fontSize: '0.8125rem' }}>Tips:</strong>
            <ul style={{ 
              margin: '0.25rem 0 0 0', 
              paddingLeft: '1rem',
              fontSize: '0.8125rem'
            }}>
              {tooltip.recommendations.map((tip, index) => (
                <li key={index} style={{ margin: '0.125rem 0' }}>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return {
    getTooltipContent,
    hasTooltip: (parameterName: string) => parameterName in tooltips
  }
}

export default useParameterTooltips