// Metadata Comparison Component
// Provides side-by-side comparison view for different generation metadata with diff highlighting

import React, { useState, useMemo, useCallback } from 'react'
import type { MetadataSchema } from '@/utils/metadataParser'
import { CollapsibleSection } from './CollapsibleSection'
import { CopyButton } from './CopyButton'
import './MetadataComparison.css'

export interface MetadataComparisonProps {
  leftMetadata: MetadataSchema | null
  rightMetadata: MetadataSchema | null
  leftLabel?: string
  rightLabel?: string
  showDiffsOnly?: boolean
  highlightDifferences?: boolean
  compact?: boolean
  onSwap?: () => void
  onClose?: () => void
  className?: string
}

interface ComparisonResult {
  path: string[]
  leftValue: any
  rightValue: any
  status: 'added' | 'removed' | 'modified' | 'equal'
  category: string
}

type ComparisonCategory = 'generation' | 'models' | 'workflow' | 'performance' | 'nodes' | 'all'

export const MetadataComparison: React.FC<MetadataComparisonProps> = ({
  leftMetadata,
  rightMetadata,
  leftLabel = 'Generation A',
  rightLabel = 'Generation B',
  showDiffsOnly = false,
  highlightDifferences = true,
  compact = false,
  onSwap,
  onClose,
  className = ''
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ComparisonCategory>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']))

  // Generate comparison results
  const comparisonResults = useMemo(() => {
    if (!leftMetadata && !rightMetadata) return []
    
    return generateComparison(leftMetadata, rightMetadata)
  }, [leftMetadata, rightMetadata])

  // Filter results by category and diff-only option
  const filteredResults = useMemo(() => {
    let results = comparisonResults

    // Filter by category
    if (selectedCategory !== 'all') {
      results = results.filter(result => result.category === selectedCategory)
    }

    // Filter to show only differences
    if (showDiffsOnly) {
      results = results.filter(result => result.status !== 'equal')
    }

    return results
  }, [comparisonResults, selectedCategory, showDiffsOnly])

  // Get summary statistics
  const summary = useMemo(() => {
    const stats = {
      total: comparisonResults.length,
      added: 0,
      removed: 0,
      modified: 0,
      equal: 0
    }

    comparisonResults.forEach(result => {
      stats[result.status]++
    })

    return stats
  }, [comparisonResults])

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

  // Handle category change
  const handleCategoryChange = (category: ComparisonCategory) => {
    setSelectedCategory(category)
  }

  // No metadata state
  if (!leftMetadata && !rightMetadata) {
    return (
      <div className={`metadata-comparison empty ${className}`}>
        <div className="comparison-empty">
          <div className="empty-icon">📊</div>
          <h3>No Metadata to Compare</h3>
          <p>Select two generations to compare their metadata</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`metadata-comparison ${compact ? 'compact' : ''} ${className}`}>
      {/* Header */}
      <div className="comparison-header">
        <div className="comparison-title">
          <h2>Metadata Comparison</h2>
          <div className="comparison-labels">
            <span className="label left-label">{leftLabel}</span>
            <span className="vs">vs</span>
            <span className="label right-label">{rightLabel}</span>
          </div>
        </div>

        <div className="comparison-controls">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value as ComparisonCategory)}
            className="category-select"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            <option value="generation">Generation</option>
            <option value="models">Models</option>
            <option value="workflow">Workflow</option>
            <option value="performance">Performance</option>
            <option value="nodes">Nodes</option>
          </select>

          {/* Action Buttons */}
          {onSwap && (
            <button
              type="button"
              className="action-button"
              onClick={onSwap}
              title="Swap left and right"
              aria-label="Swap comparison sides"
            >
              ⇄
            </button>
          )}

          <CopyButton
            data={filteredResults}
            format="json"
            label="Copy Diff"
            size="small"
          />

          {onClose && (
            <button
              type="button"
              className="action-button close-button"
              onClick={onClose}
              title="Close comparison"
              aria-label="Close comparison"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <CollapsibleSection
        id="summary"
        title="Comparison Summary"
        isExpanded={expandedSections.has('summary')}
        onToggle={() => toggleSection('summary')}
        icon="📊"
      >
        <div className="comparison-summary">
          <div className="summary-stats">
            <div className="stat-item total">
              <label>Total Properties:</label>
              <span>{summary.total}</span>
            </div>
            <div className="stat-item added">
              <label>Added:</label>
              <span>{summary.added}</span>
            </div>
            <div className="stat-item removed">
              <label>Removed:</label>
              <span>{summary.removed}</span>
            </div>
            <div className="stat-item modified">
              <label>Modified:</label>
              <span>{summary.modified}</span>
            </div>
            <div className="stat-item equal">
              <label>Unchanged:</label>
              <span>{summary.equal}</span>
            </div>
          </div>

          {/* Difference Ratio */}
          <div className="difference-ratio">
            <label>Difference Ratio:</label>
            <div className="ratio-bar">
              <div
                className="ratio-fill modified"
                style={{
                  width: `${((summary.added + summary.removed + summary.modified) / summary.total) * 100}%`
                }}
              />
            </div>
            <span>
              {Math.round(((summary.added + summary.removed + summary.modified) / summary.total) * 100)}% different
            </span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Comparison Results */}
      <div className="comparison-content">
        {filteredResults.length === 0 ? (
          <div className="no-results">
            {showDiffsOnly ? (
              <p>No differences found in the selected category</p>
            ) : (
              <p>No properties found in the selected category</p>
            )}
          </div>
        ) : (
          <div className="comparison-results">
            {filteredResults.map((result, index) => (
              <ComparisonRow
                key={`${result.path.join('.')}-${index}`}
                result={result}
                highlightDifferences={highlightDifferences}
                compact={compact}
              />
            ))}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="comparison-options">
        <label className="option-checkbox">
          <input
            type="checkbox"
            checked={showDiffsOnly}
            onChange={(_e) => {
              // This would need to be passed up to parent component
              // For now, just show the current state
            }}
            disabled // Disable for now since we can't update parent state
          />
          <span>Show differences only</span>
        </label>

        <label className="option-checkbox">
          <input
            type="checkbox"
            checked={highlightDifferences}
            onChange={(_e) => {
              // This would need to be passed up to parent component
              // For now, just show the current state
            }}
            disabled // Disable for now since we can't update parent state
          />
          <span>Highlight differences</span>
        </label>
      </div>
    </div>
  )
}

// Individual comparison row component
interface ComparisonRowProps {
  result: ComparisonResult
  highlightDifferences: boolean
  compact: boolean
}

const ComparisonRow: React.FC<ComparisonRowProps> = ({
  result,
  highlightDifferences,
  compact
}) => {
  const getStatusIcon = (status: ComparisonResult['status']) => {
    switch (status) {
      case 'added': return '➕'
      case 'removed': return '➖' 
      case 'modified': return '🔄'
      case 'equal': return '='
      default: return '?'
    }
  }

  const getStatusLabel = (status: ComparisonResult['status']) => {
    switch (status) {
      case 'added': return 'Added'
      case 'removed': return 'Removed'
      case 'modified': return 'Modified'
      case 'equal': return 'Equal'
      default: return 'Unknown'
    }
  }

  const formatValue = (value: any): string => {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (typeof value === 'object') {
      return JSON.stringify(value, null, compact ? 0 : 2)
    }
    return String(value)
  }

  return (
    <div
      className={`
        comparison-row 
        ${result.status} 
        ${highlightDifferences && result.status !== 'equal' ? 'highlighted' : ''}
        ${compact ? 'compact' : ''}
      `.trim()}
    >
      {/* Property Path */}
      <div className="property-path">
        <span className="path-text">{result.path.join(' → ')}</span>
        <span className="category-badge">{result.category}</span>
      </div>

      {/* Status */}
      <div className="comparison-status">
        <span className="status-icon" title={getStatusLabel(result.status)}>
          {getStatusIcon(result.status)}
        </span>
        <span className="status-text">{getStatusLabel(result.status)}</span>
      </div>

      {/* Values */}
      <div className="comparison-values">
        {/* Left Value */}
        <div className="value-container left">
          <div className="value-header">
            <span className="value-label">Left</span>
            <CopyButton
              data={result.leftValue}
              format="text"
              size="small"
              variant="ghost"
            />
          </div>
          <div className="value-content">
            {result.status === 'added' ? (
              <span className="missing-value">—</span>
            ) : (
              <pre className="value-text">{formatValue(result.leftValue)}</pre>
            )}
          </div>
        </div>

        {/* Right Value */}
        <div className="value-container right">
          <div className="value-header">
            <span className="value-label">Right</span>
            <CopyButton
              data={result.rightValue}
              format="text"
              size="small"
              variant="ghost"
            />
          </div>
          <div className="value-content">
            {result.status === 'removed' ? (
              <span className="missing-value">—</span>
            ) : (
              <pre className="value-text">{formatValue(result.rightValue)}</pre>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Generate comparison between two metadata objects
function generateComparison(
  left: MetadataSchema | null,
  right: MetadataSchema | null
): ComparisonResult[] {
  const results: ComparisonResult[] = []
  
  // Get all unique paths from both objects
  const leftPaths = left ? getAllPaths(left) : new Map()
  const rightPaths = right ? getAllPaths(right) : new Map()
  const allPaths = new Set([...leftPaths.keys(), ...rightPaths.keys()])

  for (const path of allPaths) {
    const pathArray = path.split('.')
    const category = categorizeProperty(pathArray)
    
    const leftValue = leftPaths.get(path)
    const rightValue = rightPaths.get(path)
    
    let status: ComparisonResult['status']
    
    if (leftValue === undefined && rightValue !== undefined) {
      status = 'added'
    } else if (leftValue !== undefined && rightValue === undefined) {
      status = 'removed'
    } else if (!deepEqual(leftValue, rightValue)) {
      status = 'modified'
    } else {
      status = 'equal'
    }
    
    results.push({
      path: pathArray,
      leftValue,
      rightValue,
      status,
      category
    })
  }
  
  return results.sort((a, b) => {
    // Sort by category first, then by path
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category)
    }
    return a.path.join('.').localeCompare(b.path.join('.'))
  })
}

// Get all property paths from an object
function getAllPaths(obj: any, prefix = '', paths = new Map<string, any>()): Map<string, any> {
  if (obj === null || obj === undefined) {
    if (prefix) paths.set(prefix, obj)
    return paths
  }
  
  if (typeof obj !== 'object') {
    paths.set(prefix, obj)
    return paths
  }
  
  if (Array.isArray(obj)) {
    paths.set(prefix, obj)
    obj.forEach((item, index) => {
      getAllPaths(item, `${prefix}[${index}]`, paths)
    })
    return paths
  }
  
  for (const [key, value] of Object.entries(obj)) {
    const newPath = prefix ? `${prefix}.${key}` : key
    getAllPaths(value, newPath, paths)
  }
  
  return paths
}

// Categorize property by its path
function categorizeProperty(path: string[]): string {
  const firstLevel = path[0]?.toLowerCase()
  
  switch (firstLevel) {
    case 'generation':
      return 'generation'
    case 'models':
      return 'models'
    case 'workflow':
      return 'workflow'
    case 'performance':
      return 'performance'
    case 'nodes':
      return 'nodes'
    default:
      return 'other'
  }
}

// Deep equality check
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true
  
  if (a === null || b === null) return a === b
  if (a === undefined || b === undefined) return a === b
  
  if (typeof a !== typeof b) return false
  
  if (typeof a !== 'object') return a === b
  
  if (Array.isArray(a) !== Array.isArray(b)) return false
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  
  if (keysA.length !== keysB.length) return false
  
  return keysA.every(key => deepEqual(a[key], b[key]))
}

// Export utility functions for external use
export { generateComparison, getAllPaths, deepEqual }