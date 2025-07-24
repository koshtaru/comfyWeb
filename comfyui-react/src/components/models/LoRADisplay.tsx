// ============================================================================
// ComfyUI React - Enhanced LoRA Stack Display with Compatibility Analysis
// ============================================================================

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import type { MetadataSchema } from '@/utils/metadataParser'
import type { EnhancedLoRAInfo } from '@/services/modelInfoParser'
import { modelInfoParser } from '@/services/modelInfoParser'
import { CollapsibleSection } from '../metadata/CollapsibleSection'
import { CopyButton } from '../metadata/CopyButton'
import './LoRADisplay.css'

export interface LoRADisplayProps {
  metadata: MetadataSchema
  className?: string
  showCompatibility?: boolean
  showOptimalSettings?: boolean
  showTriggerWords?: boolean
  compact?: boolean
  onLoRASelect?: (lora: EnhancedLoRAInfo) => void
  onOptimizeStack?: (optimizations: LoRAOptimization[]) => void
}

export interface LoRAOptimization {
  loraId: string
  currentStrength: number
  recommendedStrength: number
  reason: string
  impact: 'quality' | 'performance' | 'compatibility'
}

interface LoRAStackVisualization {
  totalWeight: number
  clipWeight: number
  modelWeight: number
  effectiveStrength: number
  stackConflicts: string[]
}

const LORA_CATEGORIES = {
  character: { icon: '👤', color: '#ff6b6b' },
  style: { icon: '🎨', color: '#4ecdc4' },
  concept: { icon: '💡', color: '#ffe66d' },
  clothing: { icon: '👕', color: '#95a5a6' },
  pose: { icon: '🤸', color: '#9b59b6' },
  lighting: { icon: '💡', color: '#f39c12' },
  background: { icon: '🌄', color: '#27ae60' },
  general: { icon: '⚙️', color: '#bdc3c7' }
} as const

const COMPATIBILITY_LEVELS = {
  excellent: { color: '#27ae60', icon: '✅', label: 'Excellent' },
  good: { color: '#2ecc71', icon: '✓', label: 'Good' },
  warning: { color: '#f39c12', icon: '⚠️', label: 'Warning' },
  error: { color: '#e74c3c', icon: '❌', label: 'Error' }
} as const

export const LoRADisplay: React.FC<LoRADisplayProps> = ({
  metadata,
  className = '',
  showCompatibility = true,
  showOptimalSettings = true,
  showTriggerWords = true,
  compact = false,
  onLoRASelect,
  onOptimizeStack
}) => {
  const [expandedLoras, setExpandedLoras] = useState<Set<string>>(new Set())
  const [selectedLora, setSelectedLora] = useState<string | null>(null)
  const [showStackAnalysis, setShowStackAnalysis] = useState(false)
  const [optimizations, setOptimizations] = useState<LoRAOptimization[]>([])
  
  // Refs for DOM manipulation
  const stackRef = useRef<HTMLDivElement>(null)
  const analysisRef = useRef<HTMLDivElement>(null)

  // Enhanced LoRA information using ModelInfoParser
  const enhancedLoras = useMemo(() => {
    const modelInfo = modelInfoParser.parseModelInfo(metadata)
    return modelInfo.loras
  }, [metadata])


  // Stack visualization data
  const stackVisualization = useMemo((): LoRAStackVisualization => {
    const totalModelWeight = enhancedLoras.reduce((sum, lora) => sum + lora.modelStrength, 0)
    const totalClipWeight = enhancedLoras.reduce((sum, lora) => sum + lora.clipStrength, 0)
    const effectiveStrength = Math.min(totalModelWeight, 2.0) // Cap at 2.0 for stability
    
    // Detect stack conflicts
    const conflicts: string[] = []
    if (totalModelWeight > 1.5) {
      conflicts.push('High total model strength may cause overfitting')
    }
    if (totalClipWeight > 1.5) {
      conflicts.push('High total CLIP strength may degrade prompt adherence')
    }
    
    // Check for conflicting LoRAs
    const categories = enhancedLoras.map(lora => lora.category.toLowerCase())
    const categoryCount = categories.reduce((acc, cat) => {
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > 2 && category === 'style') {
        conflicts.push('Multiple style LoRAs may conflict')
      }
    })

    return {
      totalWeight: totalModelWeight + totalClipWeight,
      clipWeight: totalClipWeight,
      modelWeight: totalModelWeight,
      effectiveStrength,
      stackConflicts: conflicts
    }
  }, [enhancedLoras])

  // Generate optimization suggestions
  const generateOptimizations = useCallback((): LoRAOptimization[] => {
    const optimizations: LoRAOptimization[] = []
    
    enhancedLoras.forEach(lora => {
      // Check if strength is outside optimal range
      if (lora.modelStrength > lora.optimal.modelStrength.max) {
        optimizations.push({
          loraId: lora.nodeId,
          currentStrength: lora.modelStrength,
          recommendedStrength: lora.optimal.modelStrength.recommended,
          reason: `Model strength ${lora.modelStrength} exceeds recommended maximum of ${lora.optimal.modelStrength.max}`,
          impact: 'quality'
        })
      }
      
      if (lora.clipStrength > lora.optimal.clipStrength.max) {
        optimizations.push({
          loraId: lora.nodeId,
          currentStrength: lora.clipStrength,
          recommendedStrength: lora.optimal.clipStrength.recommended,
          reason: `CLIP strength ${lora.clipStrength} exceeds recommended maximum of ${lora.optimal.clipStrength.max}`,
          impact: 'compatibility'
        })
      }
      
      // Check for base model compatibility
      if (lora.baseModel !== metadata.workflow.architecture && lora.baseModel !== 'Unknown') {
        optimizations.push({
          loraId: lora.nodeId,
          currentStrength: lora.modelStrength,
          recommendedStrength: lora.optimal.modelStrength.recommended * 0.8,
          reason: `LoRA trained for ${lora.baseModel} but used with ${metadata.workflow.architecture}`,
          impact: 'compatibility'
        })
      }
    })
    
    return optimizations
  }, [enhancedLoras, metadata.workflow.architecture])

  // Update optimizations when LoRAs change
  useEffect(() => {
    const newOptimizations = generateOptimizations()
    setOptimizations(newOptimizations)
  }, [generateOptimizations])

  // Toggle LoRA expansion
  const toggleLoRA = useCallback((loraId: string) => {
    setExpandedLoras(prev => {
      const newSet = new Set(prev)
      if (newSet.has(loraId)) {
        newSet.delete(loraId)
      } else {
        newSet.add(loraId)
      }
      return newSet
    })
  }, [])

  // Handle LoRA selection
  const handleLoRASelect = useCallback((lora: EnhancedLoRAInfo) => {
    setSelectedLora(lora.nodeId)
    onLoRASelect?.(lora)
  }, [onLoRASelect])

  // Handle stack optimization
  const handleOptimizeStack = useCallback(() => {
    if (optimizations.length > 0) {
      onOptimizeStack?.(optimizations)
    }
  }, [optimizations, onOptimizeStack])

  // Get compatibility level color and icon
  const getCompatibilityIndicator = (lora: EnhancedLoRAInfo) => {
    // Simple compatibility check based on base model match
    const isCompatible = lora.baseModel === metadata.workflow.architecture || lora.baseModel === 'Unknown'
    const isOptimalStrength = 
      lora.modelStrength <= lora.optimal.modelStrength.max &&
      lora.clipStrength <= lora.optimal.clipStrength.max
    
    if (isCompatible && isOptimalStrength) {
      return COMPATIBILITY_LEVELS.excellent
    } else if (isCompatible) {
      return COMPATIBILITY_LEVELS.good
    } else if (isOptimalStrength) {
      return COMPATIBILITY_LEVELS.warning
    } else {
      return COMPATIBILITY_LEVELS.error
    }
  }

  // Get category info
  const getCategoryInfo = (category: string) => {
    const key = category.toLowerCase() as keyof typeof LORA_CATEGORIES
    return LORA_CATEGORIES[key] || LORA_CATEGORIES.general
  }

  // Render strength bar
  const renderStrengthBar = (value: number, max: number, optimal: number, label: string) => {
    const percentage = Math.min((value / max) * 100, 100)
    const optimalPercentage = (optimal / max) * 100
    const isOptimal = value <= optimal
    
    return (
      <div className="strength-bar-container">
        <div className="strength-bar-label">
          <span>{label}</span>
          <span className={`strength-value ${isOptimal ? 'optimal' : 'high'}`}>
            {value.toFixed(2)}
          </span>
        </div>
        <div className="strength-bar">
          <div className="strength-bar-track">
            <div 
              className="strength-bar-optimal-marker"
              style={{ left: `${optimalPercentage}%` }}
            />
            <div 
              className={`strength-bar-fill ${isOptimal ? 'optimal' : 'high'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (enhancedLoras.length === 0) {
    return (
      <div className={`lora-display empty ${className}`}>
        <div className="lora-empty">
          <div className="empty-icon">🎯</div>
          <h3>No LoRA Models</h3>
          <p>This workflow doesn't use any LoRA models</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`lora-display ${compact ? 'compact' : ''} ${className}`}>
      {/* Header with stack summary */}
      <div className="lora-header">
        <div className="lora-title">
          <h3>LoRA Stack ({enhancedLoras.length})</h3>
          <div className="stack-weight">
            Total Weight: <strong>{stackVisualization.totalWeight.toFixed(2)}</strong>
          </div>
        </div>
        
        <div className="lora-controls">
          <button
            type="button"
            className="analyze-button"
            onClick={() => setShowStackAnalysis(!showStackAnalysis)}
            title="Toggle stack analysis"
          >
            📊 Analysis
          </button>
          
          {optimizations.length > 0 && (
            <button
              type="button"
              className="optimize-button"
              onClick={handleOptimizeStack}
              title={`${optimizations.length} optimization suggestions`}
            >
              ⚡ Optimize ({optimizations.length})
            </button>
          )}
        </div>
      </div>

      {/* Stack Analysis Panel */}
      {showStackAnalysis && (
        <div className="stack-analysis" ref={analysisRef}>
          <CollapsibleSection
            id="stack-visualization"
            title="Stack Visualization"
            isExpanded={true}
            onToggle={() => {}}
            icon="📊"
          >
            <div className="stack-metrics">
              <div className="metric-item">
                <label>Model Weight:</label>
                <div className="metric-bar">
                  <div 
                    className="metric-fill model"
                    style={{ width: `${Math.min((stackVisualization.modelWeight / 2) * 100, 100)}%` }}
                  />
                  <span>{stackVisualization.modelWeight.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="metric-item">
                <label>CLIP Weight:</label>
                <div className="metric-bar">
                  <div 
                    className="metric-fill clip"
                    style={{ width: `${Math.min((stackVisualization.clipWeight / 2) * 100, 100)}%` }}
                  />
                  <span>{stackVisualization.clipWeight.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="metric-item">
                <label>Effective Strength:</label>
                <div className="metric-bar">
                  <div 
                    className="metric-fill effective"
                    style={{ width: `${Math.min((stackVisualization.effectiveStrength / 2) * 100, 100)}%` }}
                  />
                  <span>{stackVisualization.effectiveStrength.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {stackVisualization.stackConflicts.length > 0 && (
              <div className="stack-conflicts">
                <h4>⚠️ Stack Warnings</h4>
                <ul>
                  {stackVisualization.stackConflicts.map((conflict, index) => (
                    <li key={index} className="conflict-item">
                      {conflict}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleSection>
        </div>
      )}

      {/* LoRA Stack List */}
      <div className="lora-stack" ref={stackRef}>
        {enhancedLoras.map((lora, index) => {
          const categoryInfo = getCategoryInfo(lora.category)
          const compatibilityInfo = showCompatibility ? getCompatibilityIndicator(lora) : null
          const isExpanded = expandedLoras.has(lora.nodeId)
          const isSelected = selectedLora === lora.nodeId

          return (
            <div 
              key={lora.nodeId} 
              className={`lora-item ${isExpanded ? 'expanded' : ''} ${isSelected ? 'selected' : ''}`}
            >
              {/* LoRA Header */}
              <div 
                className="lora-item-header"
                onClick={() => handleLoRASelect(lora)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleLoRASelect(lora)
                  }
                }}
              >
                <div className="lora-info">
                  <div className="lora-name-row">
                    <span 
                      className="category-icon"
                      style={{ color: categoryInfo.color }}
                      title={`Category: ${lora.category}`}
                    >
                      {categoryInfo.icon}
                    </span>
                    <span className="lora-name" title={lora.fullName}>
                      {lora.name}
                    </span>
                    <span className="lora-order">#{index + 1}</span>
                  </div>
                  
                  <div className="lora-meta">
                    <span className="lora-category">{lora.category}</span>
                    <span className="lora-style">{lora.style}</span>
                    <span className="lora-base-model">{lora.baseModel}</span>
                  </div>
                </div>

                <div className="lora-strengths">
                  <div className="strength-display model">
                    <label>Model:</label>
                    <span className="strength-value">{lora.modelStrength.toFixed(2)}</span>
                  </div>
                  <div className="strength-display clip">
                    <label>CLIP:</label>
                    <span className="strength-value">{lora.clipStrength.toFixed(2)}</span>
                  </div>
                </div>

                <div className="lora-actions">
                  {showCompatibility && compatibilityInfo && (
                    <div 
                      className="compatibility-indicator"
                      style={{ color: compatibilityInfo.color }}
                      title={`Compatibility: ${compatibilityInfo.label}`}
                    >
                      {compatibilityInfo.icon}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    className="expand-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleLoRA(lora.nodeId)
                    }}
                    title={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                  
                  <CopyButton 
                    data={lora} 
                    format="json" 
                    size="small"
                  />
                </div>
              </div>

              {/* LoRA Details (Expanded) */}
              {isExpanded && (
                <div className="lora-details">
                  {/* Strength Visualization */}
                  <div className="strength-section">
                    <h4>Strength Settings</h4>
                    {renderStrengthBar(
                      lora.modelStrength,
                      lora.optimal.modelStrength.max,
                      lora.optimal.modelStrength.recommended,
                      'Model Strength'
                    )}
                    {renderStrengthBar(
                      lora.clipStrength,
                      lora.optimal.clipStrength.max,
                      lora.optimal.clipStrength.recommended,
                      'CLIP Strength'
                    )}
                  </div>

                  {/* Optimal Settings */}
                  {showOptimalSettings && (
                    <div className="optimal-section">
                      <h4>Recommended Settings</h4>
                      <div className="optimal-grid">
                        <div className="optimal-item">
                          <label>Model Range:</label>
                          <span>
                            {lora.optimal.modelStrength.min} - {lora.optimal.modelStrength.max}
                            <em> (optimal: {lora.optimal.modelStrength.recommended})</em>
                          </span>
                        </div>
                        <div className="optimal-item">
                          <label>CLIP Range:</label>
                          <span>
                            {lora.optimal.clipStrength.min} - {lora.optimal.clipStrength.max}
                            <em> (optimal: {lora.optimal.clipStrength.recommended})</em>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Trigger Words */}
                  {showTriggerWords && lora.optimal.recommendedTriggers.length > 0 && (
                    <div className="triggers-section">
                      <h4>Recommended Triggers</h4>
                      <div className="trigger-tags">
                        {lora.optimal.recommendedTriggers.map((trigger, idx) => (
                          <span key={idx} className="trigger-tag">
                            {trigger}
                            <CopyButton 
                              data={trigger} 
                              format="text" 
                              size="small"
                              label=""
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Compatibility Info */}
                  {showCompatibility && (
                    <div className="compatibility-section">
                      <h4>Compatibility</h4>
                      <div className="compatibility-grid">
                        <div className="compatibility-item">
                          <label>Base Model:</label>
                          <span className={lora.baseModel === metadata.workflow.architecture ? 'compatible' : 'incompatible'}>
                            {lora.baseModel}
                          </span>
                        </div>
                        <div className="compatibility-item">
                          <label>Compatible With:</label>
                          <div className="compatibility-list">
                            {lora.compatibility.map((arch, idx) => (
                              <span key={idx} className="arch-tag">{arch}</span>
                            ))}
                          </div>
                        </div>
                        {lora.optimal.incompatibleWith.length > 0 && (
                          <div className="compatibility-item">
                            <label>Conflicts With:</label>
                            <div className="incompatible-list">
                              {lora.optimal.incompatibleWith.map((conflict, idx) => (
                                <span key={idx} className="conflict-tag">{conflict}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verification Status */}
                  <div className="verification-section">
                    <h4>Model Verification</h4>
                    <div className="verification-status">
                      <span className={`verification-badge ${lora.verification.verified ? 'verified' : 'unverified'}`}>
                        {lora.verification.verified ? '✓ Verified' : '? Unverified'}
                      </span>
                      {lora.verification.source && (
                        <span className="source-badge">{lora.verification.source}</span>
                      )}
                    </div>
                    {lora.verification.modelPage && (
                      <a 
                        href={lora.verification.modelPage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="model-link"
                      >
                        View Model Page
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Optimization Suggestions */}
      {optimizations.length > 0 && (
        <div className="optimization-suggestions">
          <CollapsibleSection
            id="lora-optimizations"
            title={`Optimization Suggestions (${optimizations.length})`}
            isExpanded={false}
            onToggle={() => {}}
            icon="⚡"
          >
            <div className="optimization-list">
              {optimizations.map((opt, index) => {
                const lora = enhancedLoras.find(l => l.nodeId === opt.loraId)
                const impactColor = {
                  quality: '#e74c3c',
                  performance: '#f39c12',
                  compatibility: '#9b59b6'
                }[opt.impact]

                return (
                  <div key={index} className="optimization-item">
                    <div className="optimization-header">
                      <span className="lora-name">{lora?.name || 'Unknown LoRA'}</span>
                      <span 
                        className="impact-badge"
                        style={{ backgroundColor: impactColor }}
                      >
                        {opt.impact}
                      </span>
                    </div>
                    <div className="optimization-details">
                      <p className="optimization-reason">{opt.reason}</p>
                      <div className="strength-comparison">
                        <span className="current">
                          Current: {opt.currentStrength.toFixed(2)}
                        </span>
                        <span className="arrow">→</span>
                        <span className="recommended">
                          Recommended: {opt.recommendedStrength.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  )
}