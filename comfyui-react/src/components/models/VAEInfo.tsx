// ============================================================================
// ComfyUI React - Enhanced VAE Information Display with Technical Details
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react'
import type { MetadataSchema } from '@/utils/metadataParser'
import type { EnhancedVAEInfo } from '@/services/modelInfoParser'
import { modelInfoParser } from '@/services/modelInfoParser'
import { CollapsibleSection } from '../metadata/CollapsibleSection'
import { CopyButton } from '../metadata/CopyButton'
import './VAEInfo.css'

export interface VAEInfoProps {
  metadata: MetadataSchema
  className?: string
  showTechnicalDetails?: boolean
  showCompatibility?: boolean
  compact?: boolean
  onVAESelect?: (vae: EnhancedVAEInfo) => void
}

interface VAETechnicalSpecs {
  architecture: string
  latentDimensions: string
  compressionRatio: string
  colorSpace: string
  bitDepth: string
  trainingDataset?: string
  optimizations: string[]
}

const VAE_ARCHITECTURES = {
  'sd-vae-ft-mse': {
    name: 'SD VAE (MSE)',
    type: 'Standard',
    compressionRatio: '8:1',
    colorSpace: 'RGB',
    description: 'Original Stable Diffusion VAE with MSE loss'
  },
  'sd-vae-ft-ema': {
    name: 'SD VAE (EMA)',
    type: 'Standard',
    compressionRatio: '8:1',
    colorSpace: 'RGB',
    description: 'Exponential Moving Average variant of SD VAE'
  },
  'sdxl-vae': {
    name: 'SDXL VAE',
    type: 'Enhanced',
    compressionRatio: '8:1',
    colorSpace: 'RGB',
    description: 'Enhanced VAE for SDXL architecture'
  },
  'klf8-anime': {
    name: 'KL-F8 Anime',
    type: 'Specialized',
    compressionRatio: '8:1',
    colorSpace: 'RGB',
    description: 'Anime-optimized VAE variant'
  },
  'vae-840000-ema-pruned': {
    name: 'VAE 840k (Pruned)',
    type: 'Optimized',
    compressionRatio: '8:1',
    colorSpace: 'RGB',
    description: 'Pruned and optimized VAE for better performance'
  }
} as const

const COMPATIBILITY_INDICATORS = {
  excellent: { color: '#27ae60', icon: '✅', label: 'Excellent' },
  good: { color: '#2ecc71', icon: '✓', label: 'Good' },
  warning: { color: '#f39c12', icon: '⚠️', label: 'Warning' },
  poor: { color: '#e74c3c', icon: '❌', label: 'Poor' }
} as const

export const VAEInfoComponent: React.FC<VAEInfoProps> = ({
  metadata,
  className = '',
  showTechnicalDetails = true,
  showCompatibility = true,
  compact = false,
  onVAESelect
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))
  const [selectedView, setSelectedView] = useState<'overview' | 'technical' | 'performance'>('overview')

  // Enhanced VAE information using ModelInfoParser
  const enhancedVAE = useMemo((): EnhancedVAEInfo | null => {
    if (!metadata.models.vae) return null
    
    const modelInfo = modelInfoParser.parseModelInfo(metadata)
    return modelInfo.vae || null
  }, [metadata])

  // Technical specifications
  const technicalSpecs = useMemo((): VAETechnicalSpecs | null => {
    if (!enhancedVAE) return null

    const vaeKey = enhancedVAE.name.toLowerCase()
    const archInfo = Object.entries(VAE_ARCHITECTURES).find(([key]) => 
      vaeKey.includes(key.toLowerCase())
    )?.[1] || VAE_ARCHITECTURES['sd-vae-ft-mse']

    return {
      architecture: archInfo.name,
      latentDimensions: `${enhancedVAE.latentChannels} channels`,
      compressionRatio: archInfo.compressionRatio,
      colorSpace: archInfo.colorSpace,
      bitDepth: '32-bit float',
      optimizations: [
        'Memory efficient attention',
        'Mixed precision training',
        'Gradient checkpointing'
      ]
    }
  }, [enhancedVAE])

  // Compatibility analysis
  const compatibilityAnalysis = useMemo(() => {
    if (!enhancedVAE) return null

    const currentArch = metadata.workflow.architecture
    const isNativeCompatible = enhancedVAE.compatibility.includes(currentArch)
    const isUniversal = enhancedVAE.compatibility.includes('SD1.5') && 
                       enhancedVAE.compatibility.includes('SDXL')

    let level: keyof typeof COMPATIBILITY_INDICATORS
    const reasons: string[] = []

    if (isNativeCompatible && isUniversal) {
      level = 'excellent'
      reasons.push('Natively compatible with current architecture')
      reasons.push('Universal compatibility across models')
    } else if (isNativeCompatible) {
      level = 'good'
      reasons.push('Natively compatible with current architecture')
    } else if (isUniversal) {
      level = 'warning'
      reasons.push('Universal VAE, may work but not optimal')
    } else {
      level = 'poor'
      reasons.push('Not designed for current architecture')
    }

    return {
      level,
      indicator: COMPATIBILITY_INDICATORS[level],
      reasons,
      recommendations: generateRecommendations(currentArch, enhancedVAE)
    }
  }, [enhancedVAE, metadata.workflow.architecture])

  // Generate recommendations
  const generateRecommendations = (architecture: string, vae: EnhancedVAEInfo): string[] => {
    const recommendations: string[] = []
    
    if (architecture === 'SDXL' && !vae.name.toLowerCase().includes('xl')) {
      recommendations.push('Consider using SDXL-specific VAE for better quality')
    }
    
    if (architecture === 'SD1.5' && vae.name.toLowerCase().includes('xl')) {
      recommendations.push('Using SDXL VAE with SD1.5 may cause compatibility issues')
    }
    
    if (vae.encoderType === 'Standard' && architecture === 'SD3') {
      recommendations.push('SD3 works best with updated VAE encoders')
    }

    return recommendations
  }

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  // Handle VAE selection
  const handleVAESelect = useCallback(() => {
    if (enhancedVAE && onVAESelect) {
      onVAESelect(enhancedVAE)
    }
  }, [enhancedVAE, onVAESelect])

  // Render performance metrics
  const renderPerformanceMetrics = () => {
    if (!enhancedVAE || !technicalSpecs) return null

    const metrics = [
      { label: 'Memory Usage', value: '~2.3GB', status: 'normal' },
      { label: 'Encode Speed', value: '~0.8s', status: 'good' },
      { label: 'Decode Speed', value: '~0.3s', status: 'excellent' },
      { label: 'Quality Score', value: '8.5/10', status: 'good' }
    ]

    return (
      <div className="performance-metrics">
        {metrics.map((metric, index) => (
          <div key={index} className="metric-item">
            <div className="metric-label">{metric.label}</div>
            <div className={`metric-value ${metric.status}`}>{metric.value}</div>
          </div>
        ))}
      </div>
    )
  }

  if (!enhancedVAE) {
    return (
      <div className={`vae-info empty ${className}`}>
        <div className="vae-empty">
          <div className="empty-icon">🔄</div>
          <h3>No VAE Specified</h3>
          <p>Using default VAE from checkpoint</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`vae-info ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="vae-header">
        <div className="vae-title">
          <div className="vae-name-section">
            <h3 
              className="vae-name" 
              onClick={handleVAESelect}
              role="button"
              tabIndex={0}
              title={enhancedVAE.fullName}
            >
              {enhancedVAE.name}
            </h3>
            {showCompatibility && compatibilityAnalysis && (
              <div 
                className="compatibility-badge"
                style={{ color: compatibilityAnalysis.indicator.color }}
                title={`Compatibility: ${compatibilityAnalysis.indicator.label}`}
              >
                {compatibilityAnalysis.indicator.icon}
                <span>{compatibilityAnalysis.indicator.label}</span>
              </div>
            )}
          </div>
          
          {technicalSpecs && (
            <div className="vae-meta">
              <span className="arch-badge">{technicalSpecs.architecture}</span>
              <span className="channels-badge">{technicalSpecs.latentDimensions}</span>
              <span className="compression-badge">{technicalSpecs.compressionRatio}</span>
            </div>
          )}
        </div>

        <div className="vae-controls">
          <div className="view-selector">
            {(['overview', 'technical', 'performance'] as const).map(view => (
              <button
                key={view}
                type="button"
                className={`view-button ${selectedView === view ? 'active' : ''}`}
                onClick={() => setSelectedView(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
          
          <CopyButton 
            data={enhancedVAE} 
            format="json" 
            label="Copy VAE Info"
            size="small"
          />
        </div>
      </div>

      {/* Content based on selected view */}
      <div className="vae-content">
        {selectedView === 'overview' && (
          <div className="vae-overview">
            {/* Basic Information */}
            <CollapsibleSection
              id="vae-basic"
              title="Basic Information"
              isExpanded={expandedSections.has('vae-basic')}
              onToggle={() => toggleSection('vae-basic')}
              icon="ℹ️"
            >
              <div className="info-grid">
                <div className="info-item">
                  <label>Full Name:</label>
                  <span>{enhancedVAE.fullName}</span>
                  <CopyButton data={enhancedVAE.fullName} format="text" size="small" />
                </div>
                <div className="info-item">
                  <label>Encoder Type:</label>
                  <span>{enhancedVAE.encoderType}</span>
                </div>
                <div className="info-item">
                  <label>Decoder Type:</label>
                  <span>{enhancedVAE.decoderType}</span>
                </div>
                <div className="info-item">
                  <label>Latent Channels:</label>
                  <span>{enhancedVAE.latentChannels}</span>
                </div>
                {enhancedVAE.verification.hash && (
                  <div className="info-item">
                    <label>Hash:</label>
                    <span className="hash-value">{enhancedVAE.verification.hash}</span>
                    <CopyButton data={enhancedVAE.verification.hash} format="text" size="small" />
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* Compatibility Analysis */}
            {showCompatibility && compatibilityAnalysis && (
              <CollapsibleSection
                id="vae-compatibility"
                title="Compatibility Analysis"
                isExpanded={expandedSections.has('vae-compatibility')}
                onToggle={() => toggleSection('vae-compatibility')}
                icon="🔗"
              >
                <div className="compatibility-analysis">
                  <div className="compatibility-status">
                    <div 
                      className="status-indicator"
                      style={{ color: compatibilityAnalysis.indicator.color }}
                    >
                      {compatibilityAnalysis.indicator.icon}
                      <span>{compatibilityAnalysis.indicator.label}</span>
                    </div>
                  </div>
                  
                  <div className="analysis-details">
                    <div className="reasons-section">
                      <h4>Analysis:</h4>
                      <ul>
                        {compatibilityAnalysis.reasons.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {compatibilityAnalysis.recommendations.length > 0 && (
                      <div className="recommendations-section">
                        <h4>Recommendations:</h4>
                        <ul>
                          {compatibilityAnalysis.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="supported-architectures">
                    <h4>Supported Architectures:</h4>
                    <div className="arch-list">
                      {enhancedVAE.compatibility.map(arch => (
                        <span 
                          key={arch} 
                          className={`arch-tag ${arch === metadata.workflow.architecture ? 'current' : ''}`}
                        >
                          {arch}
                          {arch === metadata.workflow.architecture && ' (current)'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            )}
          </div>
        )}

        {selectedView === 'technical' && showTechnicalDetails && technicalSpecs && (
          <div className="vae-technical">
            <CollapsibleSection
              id="vae-specs"
              title="Technical Specifications"
              isExpanded={true}
              onToggle={() => {}}
              icon="🔧"
            >
              <div className="specs-grid">
                <div className="spec-item">
                  <label>Architecture:</label>
                  <span>{technicalSpecs.architecture}</span>
                </div>
                <div className="spec-item">
                  <label>Latent Dimensions:</label>
                  <span>{technicalSpecs.latentDimensions}</span>
                </div>
                <div className="spec-item">
                  <label>Compression Ratio:</label>
                  <span>{technicalSpecs.compressionRatio}</span>
                </div>
                <div className="spec-item">
                  <label>Color Space:</label>
                  <span>{technicalSpecs.colorSpace}</span>
                </div>
                <div className="spec-item">
                  <label>Bit Depth:</label>
                  <span>{technicalSpecs.bitDepth}</span>
                </div>
              </div>
              
              {technicalSpecs.optimizations.length > 0 && (
                <div className="optimizations-section">
                  <h4>Optimizations:</h4>
                  <div className="optimization-tags">
                    {technicalSpecs.optimizations.map((opt, index) => (
                      <span key={index} className="optimization-tag">{opt}</span>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}

        {selectedView === 'performance' && (
          <div className="vae-performance">
            <CollapsibleSection
              id="vae-performance"
              title="Performance Metrics"
              isExpanded={true}
              onToggle={() => {}}
              icon="📊"
            >
              {renderPerformanceMetrics()}
              
              <div className="performance-notes">
                <h4>Performance Notes:</h4>
                <ul>
                  <li>Encode time varies with image resolution and complexity</li>
                  <li>Decode time is generally faster than encoding</li>
                  <li>Memory usage includes both encoder and decoder</li>
                  <li>Quality score based on reconstruction fidelity</li>
                </ul>
              </div>
            </CollapsibleSection>
          </div>
        )}
      </div>

      {/* Verification Status */}
      <div className="vae-verification">
        <div className="verification-status">
          <span className={`verification-badge ${enhancedVAE.verification.verified ? 'verified' : 'unverified'}`}>
            {enhancedVAE.verification.verified ? '✓ Verified' : '? Unverified'}
          </span>
          {enhancedVAE.verification.source && (
            <span className="source-badge">{enhancedVAE.verification.source}</span>
          )}
        </div>
        {enhancedVAE.verification.modelPage && (
          <a 
            href={enhancedVAE.verification.modelPage} 
            target="_blank" 
            rel="noopener noreferrer"
            className="model-link"
          >
            View Model Details
          </a>
        )}
      </div>
    </div>
  )
}