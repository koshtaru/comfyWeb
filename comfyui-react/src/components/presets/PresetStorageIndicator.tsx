// ============================================================================
// ComfyUI React - Preset Storage Indicator Component
// ============================================================================

import React, { useState, useEffect } from 'react'
import type { IPresetStorageInfo } from '@/types/preset'
import type { StorageAnalysis } from '@/services/storageMonitor'
import { storageMonitorService } from '@/services/storageMonitor'
import './PresetStorageIndicator.css'

interface PresetStorageIndicatorProps {
  storageInfo: IPresetStorageInfo
  storageAnalysis?: StorageAnalysis | null
  onClose: () => void
  onCleanupPreset?: (presetId: string) => void
  onCompressPreset?: (presetId: string) => void
}

export const PresetStorageIndicator: React.FC<PresetStorageIndicatorProps> = ({
  storageInfo,
  storageAnalysis,
  onClose,
  onCleanupPreset,
  onCompressPreset
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'optimization' | 'cleanup'>('overview')
  const [usageAnalytics, setUsageAnalytics] = useState<ReturnType<typeof storageMonitorService.exportUsageAnalytics> | null>(null)

  // Load usage analytics
  useEffect(() => {
    const analytics = storageMonitorService.exportUsageAnalytics()
    setUsageAnalytics(analytics)
  }, [])

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Format percentage
  const formatPercent = (value: number): string => {
    return Math.round(value) + '%'
  }

  // Get storage status color
  const getStorageStatusColor = (percent: number): string => {
    if (percent >= 90) return '#ef4444' // Red - Critical
    if (percent >= 75) return '#f59e0b' // Yellow - Warning
    return '#10b981' // Green - Good
  }

  // Get priority color
  const getPriorityColor = (priority: 'low' | 'medium' | 'high'): string => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  // Handle cleanup action
  const handleCleanupPreset = (presetId: string) => {
    if (onCleanupPreset) {
      onCleanupPreset(presetId)
    }
  }

  // Handle compression action
  const handleCompressPreset = (presetId: string) => {
    if (onCompressPreset) {
      onCompressPreset(presetId)
    }
  }

  return (
    <div className="storage-indicator-panel">
      {/* Header */}
      <div className="panel-header">
        <h3>Storage Analytics</h3>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Storage overview */}
      <div className="storage-overview">
        <div className="storage-meter">
          <div className="meter-header">
            <span className="meter-label">Storage Usage</span>
            <span className="meter-value">
              {formatSize(storageInfo.totalSize)} / {formatPercent(storageInfo.quotaUsagePercent)}
            </span>
          </div>
          <div className="meter-bar">
            <div 
              className="meter-fill"
              style={{ 
                width: `${Math.min(storageInfo.quotaUsagePercent, 100)}%`,
                backgroundColor: getStorageStatusColor(storageInfo.quotaUsagePercent)
              }}
            />
          </div>
          <div className="meter-footer">
            <span>{formatSize(storageInfo.availableSpace)} available</span>
            <span>{storageInfo.presetCount} presets</span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="quick-stats">
          <div className="stat-item">
            <div className="stat-value">
              {formatPercent((1 - storageInfo.compressionRatio) * 100)}
            </div>
            <div className="stat-label">Space Saved</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {usageAnalytics?.usageStatistics.activePresets || 0}
            </div>
            <div className="stat-label">Active Presets</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">
              {storageInfo.needsCleanup ? 'Yes' : 'No'}
            </div>
            <div className="stat-label">Needs Cleanup</div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'optimization' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimization')}
        >
          Optimization
        </button>
        <button
          className={`tab ${activeTab === 'cleanup' ? 'active' : ''}`}
          onClick={() => setActiveTab('cleanup')}
        >
          Cleanup
        </button>
      </div>

      {/* Tab content */}
      <div className="tab-content">
        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="overview-content">
            {/* Storage breakdown */}
            <div className="section">
              <h4>Storage Breakdown</h4>
              <div className="breakdown-list">
                <div className="breakdown-item">
                  <span className="label">Preset Data</span>
                  <span className="value">{formatSize(storageInfo.totalSize)}</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent activity */}
            {usageAnalytics && (
              <div className="section">
                <h4>Usage Statistics</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">
                      {usageAnalytics?.totalTrackedPresets || 0}
                    </div>
                    <div className="stat-description">Total Tracked</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {Math.round(usageAnalytics?.usageStatistics.averageUseCount || 0)}
                    </div>
                    <div className="stat-description">Avg. Uses</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">
                      {usageAnalytics?.usageStatistics.activePresets || 0}
                    </div>
                    <div className="stat-description">Active (30d)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Most used presets */}
            {usageAnalytics?.mostUsedPresets?.length && usageAnalytics.mostUsedPresets.length > 0 && (
              <div className="section">
                <h4>Most Used Presets</h4>
                <div className="preset-list">
                  {usageAnalytics.mostUsedPresets.slice(0, 5).map((preset: any) => (
                    <div key={preset.presetId} className="preset-usage-item">
                      <div className="preset-info">
                        <span className="preset-name">
                          {preset.presetId.length > 20 
                            ? preset.presetId.substring(0, 20) + '...' 
                            : preset.presetId}
                        </span>
                        <span className="usage-count">{preset.useCount} uses</span>
                      </div>
                      <div className="usage-bar">
                        <div 
                          className="usage-fill"
                          style={{ 
                            width: `${(preset.useCount / (usageAnalytics?.mostUsedPresets?.[0]?.useCount || 1)) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Optimization tab */}
        {activeTab === 'optimization' && storageAnalysis && (
          <div className="optimization-content">
            {/* Recommendations */}
            {storageAnalysis.optimizationRecommendations.length > 0 && (
              <div className="section">
                <h4>Recommendations</h4>
                <div className="recommendations-list">
                  {storageAnalysis.optimizationRecommendations.map((recommendation, index) => (
                    <div key={index} className="recommendation-item">
                      <span className="icon">💡</span>
                      <span className="text">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compression opportunities */}
            {storageAnalysis.compressionOpportunities.length > 0 && (
              <div className="section">
                <h4>
                  Compression Opportunities 
                  <span className="count">({storageAnalysis.compressionOpportunities.length})</span>
                </h4>
                <div className="opportunities-list">
                  {storageAnalysis.compressionOpportunities.slice(0, 10).map((opportunity) => (
                    <div key={opportunity.id} className="opportunity-item">
                      <div className="opportunity-info">
                        <div className="opportunity-name">{opportunity.name}</div>
                        <div className="opportunity-details">
                          <span>Current: {formatSize(opportunity.currentSize)}</span>
                          <span>•</span>
                          <span className="savings">Save: {formatSize(opportunity.potentialSavings)}</span>
                        </div>
                      </div>
                      <button
                        className="action-btn compress"
                        onClick={() => handleCompressPreset(opportunity.id)}
                        title="Compress this preset"
                      >
                        📦 Compress
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Largest presets */}
            {storageAnalysis.largestPresets.length > 0 && (
              <div className="section">
                <h4>Largest Presets</h4>
                <div className="largest-presets-list">
                  {storageAnalysis.largestPresets.slice(0, 10).map((preset) => (
                    <div key={preset.id} className="large-preset-item">
                      <div className="preset-info">
                        <div className="preset-name">{preset.name}</div>
                        <div className="preset-size">
                          {formatSize(preset.size)}
                          {preset.compressionRatio < 1 && (
                            <span className="compression-ratio">
                              ({formatPercent((1 - preset.compressionRatio) * 100)} compressed)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="size-bar">
                        <div 
                          className="size-fill"
                          style={{ 
                            width: `${(preset.size / storageAnalysis.largestPresets[0].size) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cleanup tab */}
        {activeTab === 'cleanup' && storageAnalysis && (
          <div className="cleanup-content">
            {storageAnalysis.cleanupSuggestions.length > 0 ? (
              <div className="section">
                <h4>
                  Cleanup Suggestions 
                  <span className="count">({storageAnalysis.cleanupSuggestions.length})</span>
                </h4>
                <div className="cleanup-list">
                  {storageAnalysis.cleanupSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="cleanup-item">
                      <div className="cleanup-info">
                        <div className="cleanup-header">
                          <span className="preset-name">{suggestion.name}</span>
                          <span 
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(suggestion.priority) }}
                          >
                            {suggestion.priority}
                          </span>
                        </div>
                        <div className="cleanup-reason">{suggestion.reason}</div>
                        <div className="cleanup-savings">
                          Will free: {formatSize(suggestion.potentialSavings)}
                        </div>
                      </div>
                      <button
                        className="action-btn delete"
                        onClick={() => handleCleanupPreset(suggestion.id)}
                        title="Remove this preset"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Cleanup summary */}
                <div className="cleanup-summary">
                  <div className="summary-text">
                    Total space that can be freed: {' '}
                    <strong>
                      {formatSize(
                        storageAnalysis.cleanupSuggestions.reduce(
                          (sum, s) => sum + s.potentialSavings, 0
                        )
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h4>No cleanup needed</h4>
                <p>Your preset storage is well optimized!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}