// Enhanced Performance Panel Component
// Integrates static workflow performance data with real-time timing analysis

import React, { useState } from 'react'
import { CollapsibleSection } from './CollapsibleSection'
import { TimingDashboard } from '@/components/timing/TimingDashboard'
import type { MetadataSchema, PerformanceMetadata } from '@/utils/metadataParser'
import type { ComfyUIWebSocketService } from '@/services/websocket'

interface EnhancedPerformancePanelProps {
  metadata: MetadataSchema
  expandedSections: Set<string>
  onToggleSection: (id: string) => void
  webSocketService?: ComfyUIWebSocketService
  className?: string
}

export const EnhancedPerformancePanel: React.FC<EnhancedPerformancePanelProps> = ({
  metadata,
  expandedSections,
  onToggleSection,
  webSocketService,
  className = ''
}) => {
  const { performance } = metadata
  const [activeView, setActiveView] = useState<'static' | 'realtime'>('static')

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds.toFixed(1)}s`
  }

  const formatMemory = (bytes?: number): string => {
    if (!bytes) return 'N/A'
    const gb = bytes / (1024 * 1024 * 1024)
    if (gb > 1) return `${gb.toFixed(2)} GB`
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(0)} MB`
  }

  const getPerformanceGrade = (performance: PerformanceMetadata): { grade: string; color: string } => {
    const efficiency = performance.processedNodes / performance.totalNodes
    const cacheRate = performance.cachedNodes / performance.totalNodes
    
    let score = efficiency * 50 + cacheRate * 30
    if (performance.bottlenecks.length === 0) score += 20
    else score -= performance.bottlenecks.length * 5

    if (score >= 90) return { grade: 'Excellent', color: '#10b981' }
    if (score >= 80) return { grade: 'Good', color: '#22c55e' }
    if (score >= 70) return { grade: 'Fair', color: '#f59e0b' }
    if (score >= 60) return { grade: 'Poor', color: '#ef4444' }
    return { grade: 'Critical', color: '#dc2626' }
  }

  const performanceGrade = getPerformanceGrade(performance)

  return (
    <div className={`enhanced-performance-panel ${className}`}>
      {/* View Toggle */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        background: '#1f2937',
        padding: '4px',
        borderRadius: '6px',
        border: '1px solid #374151'
      }}>
        <button
          onClick={() => setActiveView('static')}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: activeView === 'static' ? '#3b82f6' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          📋 Workflow Analysis
        </button>
        <button
          onClick={() => setActiveView('realtime')}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: activeView === 'realtime' ? '#3b82f6' : 'transparent',
            border: 'none',
            borderRadius: '4px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          📊 Real-time Analytics
        </button>
      </div>

      {activeView === 'static' ? (
        <>
          {/* Static Workflow Performance Analysis */}
          <CollapsibleSection
            id="performance-overview"
            title="Workflow Performance Overview"
            isExpanded={expandedSections.has('performance-overview')}
            onToggle={() => onToggleSection('performance-overview')}
            icon="⚡"
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {/* Performance Grade */}
              <div style={{
                background: '#1f2937',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #374151',
                textAlign: 'center'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
                  Performance Grade
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: performanceGrade.color
                }}>
                  {performanceGrade.grade}
                </div>
              </div>

              {/* Node Statistics */}
              <div style={{
                background: '#1f2937',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #374151'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
                  Node Processing
                </div>
                <div style={{ fontSize: '14px', color: '#ffffff' }}>
                  <div>Total: {performance.totalNodes}</div>
                  <div>Processed: {performance.processedNodes}</div>
                  <div style={{ color: '#10b981' }}>Cached: {performance.cachedNodes}</div>
                </div>
              </div>

              {/* Timing Information */}
              <div style={{
                background: '#1f2937',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #374151'
              }}>
                <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
                  Execution Time
                </div>
                <div style={{ fontSize: '14px', color: '#ffffff' }}>
                  <div>Estimated: {formatTime(performance.estimatedTime)}</div>
                  {performance.actualTime && (
                    <div>Actual: {formatTime(performance.actualTime)}</div>
                  )}
                </div>
              </div>

              {/* Memory Usage */}
              {(performance.peakMemory || performance.averageMemory) && (
                <div style={{
                  background: '#1f2937',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #374151'
                }}>
                  <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '8px' }}>
                    Memory Usage
                  </div>
                  <div style={{ fontSize: '14px', color: '#ffffff' }}>
                    {performance.peakMemory && (
                      <div>Peak: {formatMemory(performance.peakMemory)}</div>
                    )}
                    {performance.averageMemory && (
                      <div>Average: {formatMemory(performance.averageMemory)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Cache Efficiency Bar */}
            <div style={{ marginTop: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>Cache Efficiency</span>
                <span style={{ color: '#ffffff', fontSize: '12px' }}>
                  {((performance.cachedNodes / performance.totalNodes) * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{
                background: '#374151',
                height: '6px',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: '#10b981',
                  height: '100%',
                  width: `${(performance.cachedNodes / performance.totalNodes) * 100}%`,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Bottlenecks Section */}
          {performance.bottlenecks && performance.bottlenecks.length > 0 && (
            <CollapsibleSection
              id="performance-bottlenecks"
              title={`Performance Bottlenecks (${performance.bottlenecks.length})`}
              isExpanded={expandedSections.has('performance-bottlenecks')}
              onToggle={() => onToggleSection('performance-bottlenecks')}
              icon="🔥"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {performance.bottlenecks.map((bottleneck, index) => (
                  <div
                    key={`${bottleneck.nodeId}-${index}`}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '6px',
                      padding: '12px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '4px'
                    }}>
                      <div style={{ color: '#ffffff', fontWeight: '500', fontSize: '14px' }}>
                        {bottleneck.nodeType}
                      </div>
                      <div style={{ color: '#ef4444', fontSize: '12px' }}>
                        {formatTime(bottleneck.executionTime)}
                      </div>
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
                      Node ID: {bottleneck.nodeId}
                    </div>
                    <div style={{ color: '#fca5a5', fontSize: '12px' }}>
                      {bottleneck.reason}
                    </div>
                    {bottleneck.memoryUsage > 0 && (
                      <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>
                        Memory: {formatMemory(bottleneck.memoryUsage)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </>
      ) : (
        <>
          {/* Real-time Performance Analytics */}
          <CollapsibleSection
            id="realtime-analytics"
            title="Real-time Performance Analytics"
            isExpanded={expandedSections.has('realtime-analytics')}
            onToggle={() => onToggleSection('realtime-analytics')}
            icon="📊"
          >
            {webSocketService ? (
              <TimingDashboard
                webSocketService={webSocketService}
                config={{
                  maxExecutions: 50,
                  trendSampleInterval: 30000,
                  bottleneckThreshold: 2000,
                  enableRealTimeUpdates: true,
                  exportFormat: 'csv'
                }}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#6b7280'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔌</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#9ca3af' }}>WebSocket Not Connected</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  Connect to ComfyUI to enable real-time performance analytics
                </p>
              </div>
            )}
          </CollapsibleSection>
        </>
      )}
    </div>
  )
}

export default EnhancedPerformancePanel