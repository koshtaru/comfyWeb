// Advanced Metadata Display Component with Tabbed Interface
// Sophisticated metadata display system with collapsible sections and interactive features

import React, { useState, useCallback, useMemo, useRef, useEffect, type KeyboardEvent } from 'react'
import type { MetadataSchema } from '@/utils/metadataParser'
import { CollapsibleSection } from './CollapsibleSection'
import { CopyButton } from './CopyButton'
import { MetadataSearch } from './MetadataSearch'
import './MetadataDisplay.css'

export interface MetadataDisplayProps {
  metadata: MetadataSchema | null
  isLoading?: boolean
  compact?: boolean
  defaultTab?: MetadataTab
  onTabChange?: (tab: MetadataTab) => void
  showSearch?: boolean
  className?: string
}

export type MetadataTab = 'generation' | 'models' | 'workflow' | 'performance' | 'nodes'

interface TabConfig {
  id: MetadataTab
  label: string
  icon: string
  description: string
}

const TABS: TabConfig[] = [
  {
    id: 'generation',
    label: 'Generation Info',
    icon: '⚡',
    description: 'Generation parameters, prompts, and settings'
  },
  {
    id: 'models',
    label: 'Model Details',
    icon: '🧠',
    description: 'Checkpoint, LoRA, VAE, and model information'
  },
  {
    id: 'workflow',
    label: 'Workflow Graph',
    icon: '🔗',
    description: 'Node connections and workflow structure'
  },
  {
    id: 'performance',
    label: 'Performance',
    icon: '📊',
    description: 'Timing analysis and performance metrics'
  },
  {
    id: 'nodes',
    label: 'Node Details',
    icon: '🔧',
    description: 'Individual node parameters and metadata'
  }
]

export const MetadataDisplay: React.FC<MetadataDisplayProps> = ({
  metadata,
  isLoading = false,
  compact = false,
  defaultTab = 'generation',
  onTabChange,
  showSearch = true,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<MetadataTab>(defaultTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))
  const [_focusedTabIndex, setFocusedTabIndex] = useState(0)
  
  // Refs for keyboard navigation
  const tabsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Handle tab changes
  const handleTabChange = useCallback((tab: MetadataTab) => {
    setActiveTab(tab)
    onTabChange?.(tab)
  }, [onTabChange])

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

  // Expand all sections
  const expandAll = useCallback(() => {
    if (!metadata) return
    const allSections = new Set(['basic', 'prompts', 'sampling', 'models', 'advanced'])
    setExpandedSections(allSections)
  }, [metadata])

  // Collapse all sections
  const collapseAll = useCallback(() => {
    setExpandedSections(new Set())
  }, [])

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    // Global keyboard shortcuts
    switch (event.key) {
      case 'f':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          searchRef.current?.focus()
        }
        break
      case 'Escape':
        if (document.activeElement === searchRef.current) {
          setSearchQuery('')
          searchRef.current?.blur()
        }
        break
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        if (event.altKey) {
          event.preventDefault()
          const tabIndex = parseInt(event.key) - 1
          if (tabIndex < TABS.length) {
            handleTabChange(TABS[tabIndex].id)
            setFocusedTabIndex(tabIndex)
          }
        }
        break
    }
  }, [handleTabChange])

  // Tab navigation with arrow keys
  const handleTabKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, tabIndex: number) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        const prevIndex = tabIndex > 0 ? tabIndex - 1 : TABS.length - 1
        setFocusedTabIndex(prevIndex)
        handleTabChange(TABS[prevIndex].id)
        break
      case 'ArrowRight':
        event.preventDefault()
        const nextIndex = tabIndex < TABS.length - 1 ? tabIndex + 1 : 0
        setFocusedTabIndex(nextIndex)
        handleTabChange(TABS[nextIndex].id)
        break
      case 'Home':
        event.preventDefault()
        setFocusedTabIndex(0)
        handleTabChange(TABS[0].id)
        break
      case 'End':
        event.preventDefault()
        const lastIndex = TABS.length - 1
        setFocusedTabIndex(lastIndex)
        handleTabChange(TABS[lastIndex].id)
        break
    }
  }, [handleTabChange])

  // Update focused tab index when active tab changes
  useEffect(() => {
    const activeTabIndex = TABS.findIndex(tab => tab.id === activeTab)
    if (activeTabIndex !== -1) {
      setFocusedTabIndex(activeTabIndex)
    }
  }, [activeTab])

  // Filter metadata based on search query
  const filteredMetadata = useMemo(() => {
    if (!metadata || !searchQuery.trim()) return metadata
    
    // This would implement fuzzy search logic
    // For now, return original metadata
    return metadata
  }, [metadata, searchQuery])

  // Loading state
  if (isLoading) {
    return (
      <div className={`metadata-display loading ${className}`}>
        <div className="metadata-loading">
          <div className="loading-spinner"></div>
          <span>Loading metadata...</span>
        </div>
      </div>
    )
  }

  // No metadata state
  if (!filteredMetadata) {
    return (
      <div className={`metadata-display empty ${className}`}>
        <div className="metadata-empty">
          <div className="empty-icon">📄</div>
          <h3>No Metadata Available</h3>
          <p>Upload a workflow or generate an image to see metadata</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`metadata-display ${compact ? 'compact' : ''} ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      role="application"
      aria-label="Metadata display with keyboard navigation"
    >
      {/* Header with controls */}
      <div className="metadata-header">
        <div className="metadata-title">
          <h2>Generation Metadata</h2>
          <span className="metadata-timestamp">
            {new Date(filteredMetadata.timestamp).toLocaleString()}
          </span>
        </div>
        
        <div className="metadata-controls">
          {showSearch && (
            <MetadataSearch
              ref={searchRef}
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search metadata... (Ctrl+F)"
            />
          )}
          
          <div className="section-controls">
            <button
              type="button"
              className="control-button"
              onClick={expandAll}
              title="Expand all sections"
            >
              ⬇️
            </button>
            <button
              type="button"
              className="control-button"
              onClick={collapseAll}
              title="Collapse all sections"
            >
              ⬆️
            </button>
          </div>

          <CopyButton
            data={filteredMetadata}
            format="json"
            label="Copy All"
            className="copy-all-button"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="metadata-tabs" role="tablist" ref={tabsRef}>
        {TABS.map((tab, _index) => (
          <button
            key={tab.id}
            type="button"
            id={`tab-${tab.id}`}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            onKeyDown={(e) => handleTabKeyDown(e, _index)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tab-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            title={`${tab.description} (Alt+${_index + 1})`}
          >
            <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="metadata-content" ref={contentRef}>
        {/* Generation Info Tab */}
        {activeTab === 'generation' && (
          <div
            id="tab-panel-generation"
            className="tab-panel"
            role="tabpanel"
            aria-labelledby="tab-generation"
            tabIndex={0}
          >
            <GenerationInfoPanel
              metadata={filteredMetadata}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </div>
        )}

        {/* Model Details Tab */}
        {activeTab === 'models' && (
          <div
            id="tab-panel-models"
            className="tab-panel"
            role="tabpanel"
            aria-labelledby="tab-models"
            tabIndex={0}
          >
            <ModelDetailsPanel
              metadata={filteredMetadata}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </div>
        )}

        {/* Workflow Graph Tab */}
        {activeTab === 'workflow' && (
          <div
            id="tab-panel-workflow"
            className="tab-panel"
            role="tabpanel"
            aria-labelledby="tab-workflow"
            tabIndex={0}
          >
            <WorkflowGraphPanel
              metadata={filteredMetadata}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div
            id="tab-panel-performance"
            className="tab-panel"
            role="tabpanel"
            aria-labelledby="tab-performance"
            tabIndex={0}
          >
            <PerformancePanel
              metadata={filteredMetadata}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </div>
        )}

        {/* Node Details Tab */}
        {activeTab === 'nodes' && (
          <div
            id="tab-panel-nodes"
            className="tab-panel"
            role="tabpanel"
            aria-labelledby="tab-nodes"
            tabIndex={0}
          >
            <NodeDetailsPanel
              metadata={filteredMetadata}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Generation Info Panel Component
interface PanelProps {
  metadata: MetadataSchema
  expandedSections: Set<string>
  onToggleSection: (sectionId: string) => void
}

const GenerationInfoPanel: React.FC<PanelProps> = ({
  metadata,
  expandedSections,
  onToggleSection
}) => {
  const { generation } = metadata

  return (
    <div className="generation-panel">
      {/* Basic Generation Parameters */}
      <CollapsibleSection
        id="basic-generation"
        title="Basic Parameters"
        isExpanded={expandedSections.has('basic-generation')}
        onToggle={() => onToggleSection('basic-generation')}
        icon="⚙️"
      >
        <div className="parameter-grid">
          <div className="parameter-item">
            <label>Steps:</label>
            <span>{generation.generation.steps || 'N/A'}</span>
            <CopyButton data={generation.generation.steps} format="text" size="small" />
          </div>
          <div className="parameter-item">
            <label>CFG Scale:</label>
            <span>{generation.generation.cfg || 'N/A'}</span>
            <CopyButton data={generation.generation.cfg} format="text" size="small" />
          </div>
          <div className="parameter-item">
            <label>Seed:</label>
            <span>{generation.seed || 'Random'}</span>
            <CopyButton data={generation.seed} format="text" size="small" />
          </div>
          <div className="parameter-item">
            <label>Sampler:</label>
            <span>{generation.generation.sampler || 'N/A'}</span>
            <CopyButton data={generation.generation.sampler} format="text" size="small" />
          </div>
          <div className="parameter-item">
            <label>Scheduler:</label>
            <span>{generation.generation.scheduler || 'N/A'}</span>
            <CopyButton data={generation.generation.scheduler} format="text" size="small" />
          </div>
          <div className="parameter-item">
            <label>Dimensions:</label>
            <span>{generation.image.width || 'N/A'} × {generation.image.height || 'N/A'}</span>
            <CopyButton data={`${generation.image.width}x${generation.image.height}`} format="text" size="small" />
          </div>
        </div>
      </CollapsibleSection>

      {/* Prompts */}
      <CollapsibleSection
        id="prompts"
        title="Prompts"
        isExpanded={expandedSections.has('prompts')}
        onToggle={() => onToggleSection('prompts')}
        icon="📝"
      >
        <div className="prompt-section">
          {generation.prompts.positive && (
            <div className="prompt-item">
              <label>Positive Prompt:</label>
              <div className="prompt-text">{generation.prompts.positive}</div>
              <CopyButton data={generation.prompts.positive} format="text" />
            </div>
          )}
          {generation.prompts.negative && (
            <div className="prompt-item">
              <label>Negative Prompt:</label>
              <div className="prompt-text">{generation.prompts.negative}</div>
              <CopyButton data={generation.prompts.negative} format="text" />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Sampler Chain */}
      {generation.samplerChain && generation.samplerChain.length > 0 && (
        <CollapsibleSection
          id="sampler-chain"
          title="Sampler Chain"
          isExpanded={expandedSections.has('sampler-chain')}
          onToggle={() => onToggleSection('sampler-chain')}
          icon="🔗"
        >
          <div className="sampler-chain">
            {generation.samplerChain.map((sampler, index) => (
              <div key={sampler.nodeId} className="sampler-item">
                <div className="sampler-header">
                  <span className="sampler-order">#{index + 1}</span>
                  <span className="sampler-name">{sampler.name}</span>
                  <CopyButton data={sampler} format="json" size="small" />
                </div>
                <div className="sampler-details">
                  <span>Steps: {sampler.steps}</span>
                  <span>CFG: {sampler.cfg}</span>
                  <span>Scheduler: {sampler.scheduler}</span>
                  <span>Denoise: {sampler.denoise}</span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

// Model Details Panel Component
const ModelDetailsPanel: React.FC<PanelProps> = ({
  metadata,
  expandedSections,
  onToggleSection
}) => {
  const { models } = metadata

  return (
    <div className="models-panel">
      {/* Checkpoint Info */}
      <CollapsibleSection
        id="checkpoint"
        title="Checkpoint"
        isExpanded={expandedSections.has('checkpoint')}
        onToggle={() => onToggleSection('checkpoint')}
        icon="🧠"
      >
        <div className="model-info">
          <div className="model-item">
            <label>Name:</label>
            <span>{models.checkpoint.name}</span>
            <CopyButton data={models.checkpoint.name} format="text" size="small" />
          </div>
          <div className="model-item">
            <label>Architecture:</label>
            <span className={`architecture-badge ${models.checkpoint.architecture.toLowerCase()}`}>
              {models.checkpoint.architecture}
            </span>
            <CopyButton data={models.checkpoint.architecture} format="text" size="small" />
          </div>
          <div className="model-item">
            <label>Base Model:</label>
            <span>{models.checkpoint.baseModel}</span>
            <CopyButton data={models.checkpoint.baseModel} format="text" size="small" />
          </div>
          {models.checkpoint.hash && (
            <div className="model-item">
              <label>Hash:</label>
              <span className="model-hash">{models.checkpoint.hash}</span>
              <CopyButton data={models.checkpoint.hash} format="text" size="small" />
            </div>
          )}
          {models.checkpoint.clipSkip && (
            <div className="model-item">
              <label>CLIP Skip:</label>
              <span>{models.checkpoint.clipSkip}</span>
              <CopyButton data={models.checkpoint.clipSkip} format="text" size="small" />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* LoRA Stack */}
      {models.loras && models.loras.length > 0 && (
        <CollapsibleSection
          id="loras"
          title={`LoRA Stack (${models.loras.length})`}
          isExpanded={expandedSections.has('loras')}
          onToggle={() => onToggleSection('loras')}
          icon="🎯"
        >
          <div className="lora-stack">
            {models.loras.map((lora, _index) => (
              <div key={lora.nodeId} className="lora-item">
                <div className="lora-header">
                  <span className="lora-name">{lora.name}</span>
                  <CopyButton data={lora} format="json" size="small" />
                </div>
                <div className="lora-strengths">
                  <span className="strength-item">
                    Model: <strong>{lora.modelStrength}</strong>
                  </span>
                  <span className="strength-item">
                    CLIP: <strong>{lora.clipStrength}</strong>
                  </span>
                </div>
                {lora.triggerWords && lora.triggerWords.length > 0 && (
                  <div className="trigger-words">
                    <label>Trigger Words:</label>
                    <div className="trigger-tags">
                      {lora.triggerWords.map((word, idx) => (
                        <span key={idx} className="trigger-tag">{word}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* VAE Info */}
      {models.vae && (
        <CollapsibleSection
          id="vae"
          title="VAE"
          isExpanded={expandedSections.has('vae')}
          onToggle={() => onToggleSection('vae')}
          icon="🔄"
        >
          <div className="vae-info">
            <div className="model-item">
              <label>Name:</label>
              <span>{models.vae.name}</span>
              <CopyButton data={models.vae.name} format="text" size="small" />
            </div>
            {models.vae.hash && (
              <div className="model-item">
                <label>Hash:</label>
                <span className="model-hash">{models.vae.hash}</span>
                <CopyButton data={models.vae.hash} format="text" size="small" />
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* ControlNet */}
      {models.controlnets && models.controlnets.length > 0 && (
        <CollapsibleSection
          id="controlnets"
          title={`ControlNet (${models.controlnets.length})`}
          isExpanded={expandedSections.has('controlnets')}
          onToggle={() => onToggleSection('controlnets')}
          icon="🎮"
        >
          <div className="controlnet-stack">
            {models.controlnets.map((cn, _index) => (
              <div key={cn.nodeId} className="controlnet-item">
                <div className="controlnet-header">
                  <span className="controlnet-name">{cn.name}</span>
                  <CopyButton data={cn} format="json" size="small" />
                </div>
                <div className="controlnet-details">
                  <span>Model: {cn.model}</span>
                  <span>Strength: {cn.strength}</span>
                  <span>Range: {cn.startPercent} - {cn.endPercent}</span>
                  {cn.preprocessor && <span>Preprocessor: {cn.preprocessor}</span>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

// Workflow Graph Panel Component
const WorkflowGraphPanel: React.FC<PanelProps> = ({
  metadata,
  expandedSections,
  onToggleSection
}) => {
  const { workflow, relationships } = metadata

  return (
    <div className="workflow-panel">
      {/* Workflow Overview */}
      <CollapsibleSection
        id="workflow-overview"
        title="Workflow Overview"
        isExpanded={expandedSections.has('workflow-overview')}
        onToggle={() => onToggleSection('workflow-overview')}
        icon="📊"
      >
        <div className="workflow-stats">
          <div className="stat-item">
            <label>Total Nodes:</label>
            <span>{workflow.nodeCount}</span>
          </div>
          <div className="stat-item">
            <label>Connections:</label>
            <span>{workflow.connectionCount}</span>
          </div>
          <div className="stat-item">
            <label>Custom Nodes:</label>
            <span>{workflow.customNodeCount}</span>
          </div>
          <div className="stat-item">
            <label>Complexity:</label>
            <span className={`complexity-badge ${workflow.complexity.toLowerCase()}`}>
              {workflow.complexity}
            </span>
          </div>
          <div className="stat-item">
            <label>Architecture:</label>
            <span className={`architecture-badge ${workflow.architecture.toLowerCase()}`}>
              {workflow.architecture}
            </span>
          </div>
          <div className="stat-item">
            <label>Est. VRAM:</label>
            <span>{workflow.estimatedVRAM}</span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Workflow Features */}
      <CollapsibleSection
        id="workflow-features"
        title="Features"
        isExpanded={expandedSections.has('workflow-features')}
        onToggle={() => onToggleSection('workflow-features')}
        icon="✨"
      >
        <div className="feature-grid">
          {Object.entries(workflow.features).map(([feature, enabled]) => (
            <div key={feature} className={`feature-item ${enabled ? 'enabled' : 'disabled'}`}>
              <span className="feature-icon">{enabled ? '✅' : '❌'}</span>
              <span className="feature-name">
                {feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Node Relationships */}
      <CollapsibleSection
        id="relationships"
        title={`Node Connections (${relationships.length})`}
        isExpanded={expandedSections.has('relationships')}
        onToggle={() => onToggleSection('relationships')}
        icon="🔗"
      >
        <div className="relationships-list">
          {relationships.slice(0, 20).map((rel, index) => (
            <div key={index} className="relationship-item">
              <div className="connection-flow">
                <span className="node-id">{rel.fromNode}</span>
                <span className="output-name">{rel.fromOutput}</span>
                <span className="arrow">→</span>
                <span className="input-name">{rel.toInput}</span>
                <span className="node-id">{rel.toNode}</span>
              </div>
              <div className="connection-meta">
                <span className="data-type">{rel.dataType}</span>
                {rel.isRequired && <span className="required-badge">Required</span>}
              </div>
            </div>
          ))}
          {relationships.length > 20 && (
            <div className="truncation-notice">
              ... and {relationships.length - 20} more connections
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}

// Performance Panel Component
const PerformancePanel: React.FC<PanelProps> = ({
  metadata,
  expandedSections,
  onToggleSection
}) => {
  const { performance } = metadata

  return (
    <div className="performance-panel">
      {/* Performance Overview */}
      <CollapsibleSection
        id="performance-overview"
        title="Performance Overview"
        isExpanded={expandedSections.has('performance-overview')}
        onToggle={() => onToggleSection('performance-overview')}
        icon="⚡"
      >
        <div className="performance-stats">
          <div className="stat-item">
            <label>Total Nodes:</label>
            <span>{performance.totalNodes}</span>
          </div>
          <div className="stat-item">
            <label>Processed:</label>
            <span>{performance.processedNodes}</span>
          </div>
          <div className="stat-item">
            <label>Cached:</label>
            <span>{performance.cachedNodes}</span>
          </div>
          <div className="stat-item">
            <label>Estimated Time:</label>
            <span>{performance.estimatedTime}s</span>
          </div>
          {performance.actualTime && (
            <div className="stat-item">
              <label>Actual Time:</label>
              <span>{performance.actualTime}s</span>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Bottlenecks */}
      {performance.bottlenecks && performance.bottlenecks.length > 0 && (
        <CollapsibleSection
          id="bottlenecks"
          title={`Performance Bottlenecks (${performance.bottlenecks.length})`}
          isExpanded={expandedSections.has('bottlenecks')}
          onToggle={() => onToggleSection('bottlenecks')}
          icon="🚨"
        >
          <div className="bottlenecks-list">
            {performance.bottlenecks.map((bottleneck, index) => (
              <div key={index} className="bottleneck-item">
                <div className="bottleneck-header">
                  <span className="node-type">{bottleneck.nodeType}</span>
                  <span className="node-id">#{bottleneck.nodeId}</span>
                  <span className="execution-time">{bottleneck.executionTime}s</span>
                </div>
                <div className="bottleneck-details">
                  <span>Memory: {bottleneck.memoryUsage}MB</span>
                  <span className="reason">{bottleneck.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  )
}

// Node Details Panel Component
const NodeDetailsPanel: React.FC<PanelProps> = ({
  metadata,
  expandedSections,
  onToggleSection
}) => {
  const { nodes } = metadata
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Get unique node categories
  const categories = useMemo(() => {
    const cats = new Set(nodes.map(node => node.category))
    return ['all', ...Array.from(cats).sort()]
  }, [nodes])

  // Filter nodes by category
  const filteredNodes = useMemo(() => {
    if (selectedCategory === 'all') return nodes
    return nodes.filter(node => node.category === selectedCategory)
  }, [nodes, selectedCategory])

  return (
    <div className="nodes-panel">
      {/* Category Filter */}
      <div className="category-filter">
        <label>Category:</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="category-select"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
        <span className="node-count">({filteredNodes.length} nodes)</span>
      </div>

      {/* Nodes List */}
      <div className="nodes-list">
        {filteredNodes.map((node) => (
          <CollapsibleSection
            key={node.id}
            id={`node-${node.id}`}
            title={node.title || node.type}
            isExpanded={expandedSections.has(`node-${node.id}`)}
            onToggle={() => onToggleSection(`node-${node.id}`)}
            icon={node.isCustom ? '🔧' : '📦'}
            subtitle={`${node.type} • ${node.category}`}
          >
            <div className="node-details">
              {/* Node Inputs */}
              {node.inputs.length > 0 && (
                <div className="node-section">
                  <h4>Inputs ({node.inputs.length})</h4>
                  <div className="node-params">
                    {node.inputs.map((input, index) => (
                      <div key={index} className="param-item">
                        <div className="param-header">
                          <span className="param-name">{input.name}</span>
                          <span className="param-type">{input.type}</span>
                          {input.isConnected && (
                            <span className="connection-badge">Connected</span>
                          )}
                        </div>
                        {!input.isConnected && input.value !== undefined && (
                          <div className="param-value">
                            {typeof input.value === 'object' 
                              ? JSON.stringify(input.value)
                              : String(input.value)
                            }
                            <CopyButton data={input.value} format="text" size="small" />
                          </div>
                        )}
                        {input.connectedFrom && (
                          <div className="param-connection">
                            Connected from: <strong>{input.connectedFrom}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Node Outputs */}
              {node.outputs.length > 0 && (
                <div className="node-section">
                  <h4>Outputs ({node.outputs.length})</h4>
                  <div className="node-params">
                    {node.outputs.map((output, index) => (
                      <div key={index} className="param-item">
                        <div className="param-header">
                          <span className="param-name">{output.name}</span>
                          <span className="param-type">{output.type}</span>
                        </div>
                        {output.connectedTo.length > 0 && (
                          <div className="param-connections">
                            Connected to: {output.connectedTo.map((nodeId, idx) => (
                              <span key={idx} className="connected-node">{nodeId}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Execution Info */}
              {(node.executionTime || node.memoryUsage || node.cacheHit !== undefined) && (
                <div className="node-section">
                  <h4>Execution Info</h4>
                  <div className="execution-info">
                    {node.executionTime && (
                      <span>Time: {node.executionTime}ms</span>
                    )}
                    {node.memoryUsage && (
                      <span>Memory: {node.memoryUsage}MB</span>
                    )}
                    {node.cacheHit !== undefined && (
                      <span className={node.cacheHit ? 'cache-hit' : 'cache-miss'}>
                        {node.cacheHit ? 'Cache Hit' : 'Cache Miss'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  )
}