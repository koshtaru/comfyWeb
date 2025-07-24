// ============================================================================
// ComfyUI React - Comprehensive Model Compatibility Checker with Intelligent Warnings
// ============================================================================

import React, { useState, useMemo, useCallback, useRef } from 'react'
import type { MetadataSchema } from '@/utils/metadataParser'
import type { 
  EnhancedModelInfo, 
  CompatibilityAnalysis, 
  CompatibilityIssue 
} from '@/services/modelInfoParser'
import { modelInfoParser } from '@/services/modelInfoParser'
import { CollapsibleSection } from '../metadata/CollapsibleSection'
import { CopyButton } from '../metadata/CopyButton'
import './CompatibilityChecker.css'

export interface CompatibilityCheckerProps {
  metadata: MetadataSchema
  className?: string
  showDetailedAnalysis?: boolean
  showRecommendations?: boolean
  showPerformanceImpact?: boolean
  autoExpand?: boolean
  onIssueSelect?: (issue: CompatibilityIssue) => void
  onApplyRecommendations?: (recommendations: OptimizationRecommendation[]) => void
}

export interface OptimizationRecommendation {
  id: string
  type: 'parameter' | 'model' | 'setting' | 'architecture'
  component: string
  current: any
  recommended: any
  reason: string
  impact: 'performance' | 'quality' | 'compatibility'
  difficulty: 'easy' | 'moderate' | 'advanced'
  estimatedImprovement: number // 0-100%
}

interface CompatibilityInsight {
  category: 'excellent' | 'good' | 'warning' | 'critical'
  title: string
  description: string
  details: string[]
  actionable: boolean
  learnMoreUrl?: string
}

const SEVERITY_CONFIG = {
  critical: {
    color: '#e74c3c',
    bgColor: 'rgba(231, 76, 60, 0.1)',
    icon: '🚨',
    label: 'Critical'
  },
  high: {
    color: '#f39c12',
    bgColor: 'rgba(243, 156, 18, 0.1)',
    icon: '⚠️',
    label: 'High'
  },
  medium: {
    color: '#3498db',
    bgColor: 'rgba(52, 152, 219, 0.1)',
    icon: 'ℹ️',
    label: 'Medium'
  },
  low: {
    color: '#95a5a6',
    bgColor: 'rgba(149, 165, 166, 0.1)',
    icon: '💡',
    label: 'Low'
  }
} as const

const ISSUE_TYPES = {
  conflict: {
    color: '#e74c3c',
    icon: '⚡',
    label: 'Conflict'
  },
  incompatible: {
    color: '#9b59b6',
    icon: '❌',
    label: 'Incompatible'
  },
  suboptimal: {
    color: '#f39c12',
    icon: '⚠️',
    label: 'Suboptimal'
  },
  deprecated: {
    color: '#95a5a6',
    icon: '📅',
    label: 'Deprecated'
  }
} as const

export const CompatibilityChecker: React.FC<CompatibilityCheckerProps> = ({
  metadata,
  className = '',
  showRecommendations = true,
  autoExpand = false,
  onIssueSelect,
  onApplyRecommendations
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    autoExpand ? new Set(['overview', 'warnings', 'issues', 'recommendations']) : new Set(['overview'])
  )
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null)
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  
  // Refs for scrolling and focus management
  const checkerRef = useRef<HTMLDivElement>(null)
  const issuesRef = useRef<HTMLDivElement>(null)

  // Enhanced model information and compatibility analysis
  const modelInfo = useMemo((): EnhancedModelInfo => {
    return modelInfoParser.parseModelInfo(metadata)
  }, [metadata])

  const compatibility = useMemo((): CompatibilityAnalysis => {
    return modelInfo.compatibility
  }, [modelInfo])

  // Generate optimization recommendations
  const optimizationRecommendations = useMemo((): OptimizationRecommendation[] => {
    const recommendations: OptimizationRecommendation[] = []
    let idCounter = 0

    // LoRA strength recommendations
    modelInfo.loras.forEach(lora => {
      if (lora.modelStrength > lora.optimal.modelStrength.recommended) {
        recommendations.push({
          id: `lora-model-${idCounter++}`,
          type: 'parameter',
          component: `LoRA: ${lora.name}`,
          current: lora.modelStrength,
          recommended: lora.optimal.modelStrength.recommended,
          reason: `Model strength ${lora.modelStrength} is higher than optimal`,
          impact: 'quality',
          difficulty: 'easy',
          estimatedImprovement: 15
        })
      }

      if (lora.clipStrength > lora.optimal.clipStrength.recommended) {
        recommendations.push({
          id: `lora-clip-${idCounter++}`,
          type: 'parameter',
          component: `LoRA: ${lora.name}`,
          current: lora.clipStrength,
          recommended: lora.optimal.clipStrength.recommended,
          reason: `CLIP strength ${lora.clipStrength} is higher than optimal`,
          impact: 'compatibility',
          difficulty: 'easy',
          estimatedImprovement: 10
        })
      }
    })

    // Architecture-specific recommendations
    if (modelInfo.architecture.type === 'SDXL') {
      const generation = metadata.generation
      if (generation.generation.cfg && generation.generation.cfg > 8) {
        recommendations.push({
          id: `cfg-${idCounter++}`,
          type: 'parameter',
          component: 'CFG Scale',
          current: generation.generation.cfg,
          recommended: 6,
          reason: 'SDXL models work best with CFG scale between 3-8',
          impact: 'quality',
          difficulty: 'easy',
          estimatedImprovement: 20
        })
      }

      if (generation.generation.steps && generation.generation.steps > 30) {
        recommendations.push({
          id: `steps-${idCounter++}`,
          type: 'parameter',
          component: 'Steps',
          current: generation.generation.steps,
          recommended: 25,
          reason: 'SDXL converges faster, fewer steps often produce better results',
          impact: 'performance',
          difficulty: 'easy',
          estimatedImprovement: 25
        })
      }
    }

    // Resolution recommendations
    const width = metadata.generation.image.width || 512
    const height = metadata.generation.image.height || 512
    const recommendedRes = modelInfo.architecture.recommendedResolutions[0]
    
    if (width !== recommendedRes.width || height !== recommendedRes.height) {
      recommendations.push({
        id: `resolution-${idCounter++}`,
        type: 'setting',
        component: 'Image Resolution',
        current: `${width}x${height}`,
        recommended: `${recommendedRes.width}x${recommendedRes.height}`,
        reason: `Current resolution may not be optimal for ${modelInfo.architecture.type}`,
        impact: 'quality',
        difficulty: 'easy',
        estimatedImprovement: 12
      })
    }

    return recommendations.sort((a, b) => b.estimatedImprovement - a.estimatedImprovement)
  }, [modelInfo, metadata])

  // Generate insights based on analysis
  const compatibilityInsights = useMemo((): CompatibilityInsight[] => {
    const insights: CompatibilityInsight[] = []

    // Overall compatibility insight
    if (compatibility.overall === 'excellent') {
      insights.push({
        category: 'excellent',
        title: 'Excellent Compatibility',
        description: 'Your model configuration is well-optimized and fully compatible.',
        details: [
          'All models are compatible with the current architecture',
          'Parameters are within optimal ranges',
          'No conflicts detected between components'
        ],
        actionable: false
      })
    } else if (compatibility.overall === 'warning') {
      insights.push({
        category: 'warning',
        title: 'Compatibility Warnings Detected',
        description: 'Your configuration has some compatibility issues that may affect results.',
        details: compatibility.warnings.slice(0, 3).map(w => w.message),
        actionable: true,
        learnMoreUrl: '/docs/compatibility-guide'
      })
    }

    // VRAM insight
    const vramWarnings = compatibility.warnings.filter(w => w.type === 'vram')
    if (vramWarnings.length > 0) {
      insights.push({
        category: 'warning',
        title: 'High VRAM Usage Expected',
        description: 'Your configuration may require more VRAM than available.',
        details: [
          `Estimated VRAM usage: ${modelInfo.architecture.vramRequirement}MB`,
          'Consider reducing resolution or batch size',
          'Remove unnecessary LoRAs to free up memory'
        ],
        actionable: true,
        learnMoreUrl: '/docs/vram-optimization'
      })
    }

    // Architecture insight
    const archMismatch = compatibility.warnings.find(w => w.type === 'architecture')
    if (archMismatch) {
      insights.push({
        category: 'critical',
        title: 'Architecture Mismatch',
        description: 'Some models are not compatible with the current architecture.',
        details: [
          archMismatch.message,
          archMismatch.suggestion,
          'This may cause generation failures or poor quality'
        ],
        actionable: true,
        learnMoreUrl: '/docs/model-compatibility'
      })
    }

    return insights
  }, [compatibility, modelInfo])

  // Filter warnings and issues
  const filteredWarnings = useMemo(() => {
    let warnings = compatibility.warnings
    
    if (filterSeverity !== 'all') {
      warnings = warnings.filter(w => w.severity === filterSeverity)
    }
    
    return warnings
  }, [compatibility.warnings, filterSeverity])

  const filteredIssues = useMemo(() => {
    let issues = compatibility.issues
    
    if (filterType !== 'all') {
      issues = issues.filter(i => i.type === filterType)
    }
    
    return issues
  }, [compatibility.issues, filterType])

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

  // Handle issue selection
  const handleIssueSelect = useCallback((issue: CompatibilityIssue) => {
    setSelectedIssue(issue.component)
    onIssueSelect?.(issue)
  }, [onIssueSelect])

  // Handle apply recommendations
  const handleApplyRecommendations = useCallback(() => {
    onApplyRecommendations?.(optimizationRecommendations)
  }, [optimizationRecommendations, onApplyRecommendations])

  // Get compatibility score display
  const getScoreDisplay = (score: number) => {
    if (score >= 90) return { color: '#27ae60', label: 'Excellent', icon: '🟢' }
    if (score >= 70) return { color: '#2ecc71', label: 'Good', icon: '🟡' }
    if (score >= 50) return { color: '#f39c12', label: 'Fair', icon: '🟠' }
    return { color: '#e74c3c', label: 'Poor', icon: '🔴' }
  }

  const scoreDisplay = getScoreDisplay(compatibility.score)

  return (
    <div className={`compatibility-checker ${className}`} ref={checkerRef}>
      {/* Header */}
      <div className="checker-header">
        <div className="checker-title">
          <h3>Compatibility Analysis</h3>
          <div className="compatibility-score">
            <span className="score-icon">{scoreDisplay.icon}</span>
            <span className="score-value" style={{ color: scoreDisplay.color }}>
              {compatibility.score}/100
            </span>
            <span className="score-label">({scoreDisplay.label})</span>
          </div>
        </div>
        
        <div className="checker-controls">
          <div className="filter-controls">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="conflict">Conflicts</option>
              <option value="incompatible">Incompatible</option>
              <option value="suboptimal">Suboptimal</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>

          {optimizationRecommendations.length > 0 && (
            <button
              type="button"
              className="apply-recommendations-button"
              onClick={handleApplyRecommendations}
              title={`Apply ${optimizationRecommendations.length} optimization recommendations`}
            >
              ⚡ Apply Optimizations ({optimizationRecommendations.length})
            </button>
          )}
          
          <CopyButton 
            data={compatibility} 
            format="json" 
            label="Copy Analysis"
            size="small"
          />
        </div>
      </div>

      {/* Compatibility Overview */}
      <CollapsibleSection
        id="compatibility-overview"
        title="Overview"
        isExpanded={expandedSections.has('compatibility-overview')}
        onToggle={() => toggleSection('compatibility-overview')}
        icon="📊"
      >
        <div className="overview-content">
          <div className="compatibility-summary">
            <div className="summary-stats">
              <div className="stat-item">
                <div className="stat-value warnings">{compatibility.warnings.length}</div>
                <div className="stat-label">Warnings</div>
              </div>
              <div className="stat-item">
                <div className="stat-value issues">{compatibility.issues.length}</div>
                <div className="stat-label">Issues</div>
              </div>
              <div className="stat-item">
                <div className="stat-value recommendations">{optimizationRecommendations.length}</div>
                <div className="stat-label">Optimizations</div>
              </div>
            </div>
          </div>

          {compatibilityInsights.length > 0 && (
            <div className="insights-section">
              <h4>Key Insights</h4>
              <div className="insights-list">
                {compatibilityInsights.map((insight, index) => (
                  <div key={index} className={`insight-item ${insight.category}`}>
                    <div className="insight-header">
                      <h5>{insight.title}</h5>
                    </div>
                    <p className="insight-description">{insight.description}</p>
                    <ul className="insight-details">
                      {insight.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                    {insight.learnMoreUrl && (
                      <a 
                        href={insight.learnMoreUrl} 
                        className="learn-more-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn More
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Warnings */}
      {filteredWarnings.length > 0 && (
        <CollapsibleSection
          id="compatibility-warnings"
          title={`Warnings (${filteredWarnings.length})`}
          isExpanded={expandedSections.has('compatibility-warnings')}
          onToggle={() => toggleSection('compatibility-warnings')}
          icon="⚠️"
        >
          <div className="warnings-list">
            {filteredWarnings.map((warning, index) => {
              const severityConfig = SEVERITY_CONFIG[warning.severity]
              
              return (
                <div 
                  key={index} 
                  className="warning-item"
                  style={{ 
                    borderLeftColor: severityConfig.color,
                    backgroundColor: severityConfig.bgColor 
                  }}
                >
                  <div className="warning-header">
                    <div className="warning-severity">
                      <span className="severity-icon">{severityConfig.icon}</span>
                      <span className="severity-label">{severityConfig.label}</span>
                    </div>
                    <div className="warning-type">
                      {warning.type.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="warning-content">
                    <p className="warning-message">{warning.message}</p>
                    <p className="warning-suggestion">
                      <strong>Suggestion:</strong> {warning.suggestion}
                    </p>
                    {warning.learnMoreUrl && (
                      <a 
                        href={warning.learnMoreUrl} 
                        className="warning-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Learn More
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Issues */}
      {filteredIssues.length > 0 && (
        <CollapsibleSection
          id="compatibility-issues"
          title={`Issues (${filteredIssues.length})`}
          isExpanded={expandedSections.has('compatibility-issues')}
          onToggle={() => toggleSection('compatibility-issues')}
          icon="🔧"
        >
          <div className="issues-list" ref={issuesRef}>
            {filteredIssues.map((issue, index) => {
              const typeConfig = ISSUE_TYPES[issue.type]
              const isSelected = selectedIssue === issue.component
              
              return (
                <div 
                  key={index} 
                  className={`issue-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleIssueSelect(issue)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleIssueSelect(issue)
                    }
                  }}
                >
                  <div className="issue-header">
                    <div className="issue-type" style={{ color: typeConfig.color }}>
                      <span className="type-icon">{typeConfig.icon}</span>
                      <span className="type-label">{typeConfig.label}</span>
                    </div>
                    <div className="issue-component">{issue.component}</div>
                  </div>
                  
                  <div className="issue-content">
                    <p className="issue-description">{issue.description}</p>
                    <div className="issue-details">
                      <div className="issue-impact">
                        <strong>Impact:</strong> 
                        <span className={`impact-badge ${issue.impact}`}>
                          {issue.impact}
                        </span>
                      </div>
                      <div className="issue-solution">
                        <strong>Solution:</strong> {issue.solution}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Optimization Recommendations */}
      {showRecommendations && optimizationRecommendations.length > 0 && (
        <CollapsibleSection
          id="optimization-recommendations"
          title={`Optimization Recommendations (${optimizationRecommendations.length})`}
          isExpanded={expandedSections.has('optimization-recommendations')}
          onToggle={() => toggleSection('optimization-recommendations')}
          icon="⚡"
        >
          <div className="recommendations-list">
            {optimizationRecommendations.map((rec) => (
              <div key={rec.id} className="recommendation-item">
                <div className="recommendation-header">
                  <div className="recommendation-info">
                    <span className="component-name">{rec.component}</span>
                    <span className={`difficulty-badge ${rec.difficulty}`}>
                      {rec.difficulty}
                    </span>
                  </div>
                  <div className="improvement-estimate">
                    +{rec.estimatedImprovement}% improvement
                  </div>
                </div>
                
                <div className="recommendation-content">
                  <p className="recommendation-reason">{rec.reason}</p>
                  <div className="value-comparison">
                    <div className="current-value">
                      Current: <span className="value">{rec.current}</span>
                    </div>
                    <div className="arrow">→</div>
                    <div className="recommended-value">
                      Recommended: <span className="value">{rec.recommended}</span>
                    </div>
                  </div>
                  <div className="recommendation-meta">
                    <span className={`impact-badge ${rec.impact}`}>
                      {rec.impact}
                    </span>
                    <span className={`type-badge ${rec.type}`}>
                      {rec.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}