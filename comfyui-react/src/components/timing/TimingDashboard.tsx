// Timing Dashboard Component
// Main dashboard that integrates all timing analysis components

import React, { useState, useEffect, useCallback } from 'react'
import { TimingAnalyzer } from '@/utils/timingAnalyzer'
import { TimingExporter } from '@/utils/timingExporter'
import TimingVisualization from './TimingVisualization'
import PerformanceTrends from './PerformanceTrends'
import BottleneckAnalysis from './BottleneckAnalysis'
import type {
  PerformanceMetrics,
  NodePerformanceData,
  TimingTrend,
  BottleneckAnalysis as BottleneckData,
  TimingAnalyzerConfig
} from '@/types/timing'
import type { ComfyUIWebSocketService } from '@/services/websocket'

interface TimingDashboardProps {
  webSocketService?: ComfyUIWebSocketService
  config?: Partial<TimingAnalyzerConfig>
  className?: string
}

interface DashboardData {
  metrics: PerformanceMetrics
  nodePerformance: NodePerformanceData[]
  trends: TimingTrend[]
  bottlenecks: BottleneckData
}

export const TimingDashboard: React.FC<TimingDashboardProps> = ({
  webSocketService,
  config,
  className = ''
}) => {
  const [analyzer] = useState(() => new TimingAnalyzer(config))
  const [data, setData] = useState<DashboardData>({
    metrics: {
      totalExecutions: 0,
      averageExecutionTime: 0,
      averageQueueTime: 0,
      successRate: 0,
      errorRate: 0,
      averageNodesPerExecution: 0,
      averageCacheHitRate: 0,
      estimatedGpuUtilization: 0
    },
    nodePerformance: [],
    trends: [],
    bottlenecks: {
      slowestNodes: [],
      criticalPath: [],
      bottleneckThreshold: 2000,
      recommendations: []
    }
  })
  
  const [isExporting, setIsExporting] = useState(false)
  const [selectedTimeRange, setSelectedTimeRange] = useState(60) // minutes
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Update data when analyzer processes new messages
  useEffect(() => {
    const unsubscribe = analyzer.addListener((newData: DashboardData) => {
      setData(newData)
    })

    return unsubscribe
  }, [analyzer])

  // Connect to WebSocket service for real-time updates
  useEffect(() => {
    if (!webSocketService) return

    const handleMessage = (message: any) => {
      analyzer.processMessage(message)
    }

    const unsubscribe = webSocketService.addEventListener('onMessage', handleMessage)
    
    return unsubscribe
  }, [webSocketService, analyzer])

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Force update by calculating fresh data
      const freshData = {
        metrics: analyzer.calculateMetrics(),
        nodePerformance: analyzer.analyzeNodePerformance(),
        trends: analyzer.generateTrends(),
        bottlenecks: analyzer.analyzeBottlenecks()
      }
      setData(freshData)
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [analyzer, autoRefresh])

  const handleExport = useCallback(async (format: 'csv' | 'json') => {
    setIsExporting(true)
    
    try {
      await TimingExporter.exportData(
        analyzer.getExecutionHistory(),
        data.metrics,
        data.nodePerformance,
        data.trends,
        data.bottlenecks,
        format
      )
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExporting(false)
    }
  }, [analyzer, data])

  const handleClearData = useCallback(() => {
    if (confirm('Are you sure you want to clear all timing data?')) {
      analyzer.clear()
      setData({
        metrics: {
          totalExecutions: 0,
          averageExecutionTime: 0,
          averageQueueTime: 0,
          successRate: 0,
          errorRate: 0,
          averageNodesPerExecution: 0,
          averageCacheHitRate: 0,
          estimatedGpuUtilization: 0
        },
        nodePerformance: [],
        trends: [],
        bottlenecks: {
          slowestNodes: [],
          criticalPath: [],
          bottleneckThreshold: 2000,
          recommendations: []
        }
      })
    }
  }, [analyzer])

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className={`timing-dashboard ${className}`} style={{
      background: '#0b0f19',
      color: '#ffffff',
      padding: '20px',
      borderRadius: '8px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid #374151'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600'
          }}>
            Performance Analysis
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            color: '#9ca3af',
            fontSize: '14px'
          }}>
            Real-time timing analysis and bottleneck detection
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Auto-refresh toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: '#9ca3af',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ margin: 0 }}
            />
            Auto-refresh
          </label>

          {/* Time range selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            style={{
              background: '#374151',
              border: '1px solid #4b5563',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '4px 8px',
              fontSize: '12px'
            }}
          >
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
            <option value={180}>3 hours</option>
            <option value={360}>6 hours</option>
            <option value={1440}>24 hours</option>
          </select>

          {/* Export buttons */}
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting || data.metrics.totalExecutions === 0}
            style={{
              background: '#3b82f6',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              opacity: isExporting || data.metrics.totalExecutions === 0 ? 0.5 : 1
            }}
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            onClick={() => handleExport('json')}
            disabled={isExporting || data.metrics.totalExecutions === 0}
            style={{
              background: '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              opacity: isExporting || data.metrics.totalExecutions === 0 ? 0.5 : 1
            }}
          >
            Export JSON
          </button>

          <button
            onClick={handleClearData}
            disabled={data.metrics.totalExecutions === 0}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              opacity: data.metrics.totalExecutions === 0 ? 0.5 : 1
            }}
          >
            Clear Data
          </button>
        </div>
      </div>

      {data.metrics.totalExecutions === 0 ? (
        /* No Data State */
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <h3 style={{ margin: '0 0 8px 0', color: '#9ca3af' }}>No Timing Data Available</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Generate some images to start collecting performance data
          </p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: '#1f2937',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #374151'
            }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
                Total Executions
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>
                {data.metrics.totalExecutions}
              </div>
            </div>

            <div style={{
              background: '#1f2937',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #374151'
            }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
                Avg Execution Time
              </div>
              <div style={{ fontSize: '24px', fontWeight: '600' }}>
                {formatDuration(data.metrics.averageExecutionTime)}
              </div>
            </div>

            <div style={{
              background: '#1f2937',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #374151'
            }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
                Success Rate
              </div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '600',
                color: data.metrics.successRate > 90 ? '#10b981' : 
                      data.metrics.successRate > 75 ? '#f59e0b' : '#ef4444'
              }}>
                {formatPercentage(data.metrics.successRate)}
              </div>
            </div>

            <div style={{
              background: '#1f2937',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #374151'
            }}>
              <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
                GPU Utilization
              </div>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '600',
                color: data.metrics.estimatedGpuUtilization > 80 ? '#10b981' : 
                      data.metrics.estimatedGpuUtilization > 60 ? '#f59e0b' : '#ef4444'
              }}>
                {formatPercentage(data.metrics.estimatedGpuUtilization)}
              </div>
            </div>
          </div>

          {/* Bottleneck Analysis */}
          <div style={{ marginBottom: '24px' }}>
            <BottleneckAnalysis
              analysis={data.bottlenecks}
              showRecommendations={true}
              maxBottlenecks={5}
            />
          </div>

          {/* Visualization Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '24px'
          }}>
            {/* Node Performance Chart */}
            {data.nodePerformance.length > 0 && (
              <div style={{
                background: '#1f2937',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #374151'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Node Performance Analysis
                </h3>
                <TimingVisualization
                  data={data.nodePerformance}
                  width={760}
                  height={400}
                />
              </div>
            )}

            {/* Performance Trends */}
            {data.trends.length > 1 && (
              <div style={{
                background: '#1f2937',
                padding: '20px',
                borderRadius: '8px',
                border: '1px solid #374151'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  Performance Trends
                </h3>
                <PerformanceTrends
                  trends={data.trends}
                  width={760}
                  height={300}
                  timeRange={selectedTimeRange}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default TimingDashboard