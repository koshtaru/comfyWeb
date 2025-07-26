// ============================================================================
// ComfyUI React - History Statistics Dashboard
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { HistoryStats as HistoryStatsData } from '@/services/historyManager'
import { historyManager } from '@/services/historyManager'
import './HistoryStats.css'

export interface HistoryStatsProps {
  className?: string
  refreshInterval?: number // Auto-refresh interval in ms
}

interface ChartDimensions {
  width: number
  height: number
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export const HistoryStats: React.FC<HistoryStatsProps> = ({
  className = '',
  refreshInterval = 30000 // 30 seconds
}) => {
  const [stats, setStats] = useState<HistoryStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChart, setActiveChart] = useState<'models' | 'dimensions' | 'timeline' | 'success-rate'>('models')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load statistics
  const loadStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const statsData = await historyManager.getStats()
      setStats(statsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load statistics'
      setError(errorMessage)
      console.error('Failed to load history stats:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Initialize and set up auto-refresh
  useEffect(() => {
    loadStats()

    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(loadStats, refreshInterval)
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [refreshInterval])

  // Draw charts when stats change or active chart changes
  useEffect(() => {
    if (stats && canvasRef.current) {
      drawChart()
    }
  }, [stats, activeChart, drawChart])

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (stats && canvasRef.current) {
        drawChart()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [stats, drawChart])

  // Draw chart based on active selection
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !stats) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size based on container
    const container = canvas.parentElement
    if (!container) return

    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = 300 * window.devicePixelRatio
    canvas.style.width = rect.width + 'px'
    canvas.style.height = '300px'

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const dimensions: ChartDimensions = {
      width: rect.width,
      height: 300,
      padding: { top: 20, right: 20, bottom: 40, left: 60 }
    }

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    // Draw appropriate chart
    switch (activeChart) {
      case 'models':
        drawBarChart(ctx, dimensions, stats.topModels.slice(0, 10), 'Models Usage')
        break
      case 'dimensions':
        drawBarChart(ctx, dimensions, stats.topDimensions.slice(0, 10), 'Image Dimensions')
        break
      case 'timeline':
        drawLineChart(ctx, dimensions, stats.generationsPerDay, 'Generations Over Time', 'count')
        break
      case 'success-rate':
        drawLineChart(ctx, dimensions, stats.successRateOverTime, 'Success Rate Over Time', 'rate')
        break
    }
  }, [stats, activeChart])

  // Draw bar chart
  const drawBarChart = (
    ctx: CanvasRenderingContext2D,
    dimensions: ChartDimensions,
    data: Array<{ name?: string; dimensions?: string; count: number }>,
    title: string
  ) => {
    const { width, height, padding } = dimensions
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    if (data.length === 0) {
      drawNoDataMessage(ctx, dimensions, 'No data available')
      return
    }

    const maxValue = Math.max(...data.map(d => d.count))
    const barWidth = chartWidth / data.length * 0.8
    const barSpacing = chartWidth / data.length * 0.2

    // Set styles
    ctx.fillStyle = '#374151' // Gray background for bars
    ctx.strokeStyle = '#6b7280'
    ctx.font = '12px system-ui, -apple-system, sans-serif'

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.count / maxValue) * chartHeight
      const x = padding.left + index * (barWidth + barSpacing)
      const y = padding.top + chartHeight - barHeight

      // Bar background
      ctx.fillStyle = '#374151'
      ctx.fillRect(x, y, barWidth, barHeight)

      // Bar border
      ctx.strokeStyle = '#6b7280'
      ctx.strokeRect(x, y, barWidth, barHeight)

      // Accent color for top items
      if (index < 3) {
        ctx.fillStyle = `rgba(255, 124, 0, ${0.8 - index * 0.2})`
        ctx.fillRect(x, y, barWidth, barHeight)
      }

      // Value label
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.fillText(
        item.count.toString(),
        x + barWidth / 2,
        y - 5
      )

      // X-axis label
      const label = (item.name || item.dimensions || '').length > 10 
        ? (item.name || item.dimensions || '').substring(0, 10) + '...'
        : (item.name || item.dimensions || '')
      
      ctx.save()
      ctx.translate(x + barWidth / 2, height - padding.bottom + 15)
      ctx.rotate(-Math.PI / 4)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#9ca3af'
      ctx.fillText(label, 0, 0)
      ctx.restore()
    })

    // Draw axes
    drawAxes(ctx, dimensions)

    // Draw title
    drawTitle(ctx, dimensions, title)
  }

  // Draw line chart
  const drawLineChart = (
    ctx: CanvasRenderingContext2D,
    dimensions: ChartDimensions,
    data: Array<{ date: string; count?: number; rate?: number }>,
    title: string,
    valueKey: 'count' | 'rate'
  ) => {
    const { width, height, padding } = dimensions
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    if (data.length === 0) {
      drawNoDataMessage(ctx, dimensions, 'No data available')
      return
    }

    const values = data.map(d => d[valueKey] || 0)
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const valueRange = maxValue - minValue || 1

    // Draw grid lines
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(width - padding.right, y)
      ctx.stroke()
    }

    // Vertical grid lines
    const stepX = chartWidth / Math.max(data.length - 1, 1)
    for (let i = 0; i < data.length; i++) {
      const x = padding.left + i * stepX
      ctx.beginPath()
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, height - padding.bottom)
      ctx.stroke()
    }

    // Draw line
    ctx.strokeStyle = '#ff7c00'
    ctx.lineWidth = 2
    ctx.beginPath()

    data.forEach((item, index) => {
      const value = item[valueKey] || 0
      const x = padding.left + index * stepX
      const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw points
    ctx.fillStyle = '#ff7c00'
    data.forEach((item, index) => {
      const value = item[valueKey] || 0
      const x = padding.left + index * stepX
      const y = padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight

      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })

    // Draw axes
    drawAxes(ctx, dimensions)

    // Draw Y-axis labels
    ctx.fillStyle = '#9ca3af'
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'right'
    
    for (let i = 0; i <= 5; i++) {
      const value = minValue + (valueRange / 5) * (5 - i)
      const y = padding.top + (chartHeight / 5) * i + 4
      const label = valueKey === 'rate' ? `${value.toFixed(1)}%` : Math.round(value).toString()
      ctx.fillText(label, padding.left - 10, y)
    }

    // Draw title
    drawTitle(ctx, dimensions, title)
  }

  // Helper function to draw axes
  const drawAxes = (ctx: CanvasRenderingContext2D, dimensions: ChartDimensions) => {
    const { width, height, padding } = dimensions
    
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 1
    
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, height - padding.bottom)
    ctx.stroke()
    
    // X-axis
    ctx.beginPath()
    ctx.moveTo(padding.left, height - padding.bottom)
    ctx.lineTo(width - padding.right, height - padding.bottom)
    ctx.stroke()
  }

  // Helper function to draw title
  const drawTitle = (ctx: CanvasRenderingContext2D, dimensions: ChartDimensions, title: string) => {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 14px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(title, dimensions.width / 2, 16)
  }

  // Helper function to draw no data message
  const drawNoDataMessage = (ctx: CanvasRenderingContext2D, dimensions: ChartDimensions, message: string) => {
    ctx.fillStyle = '#6b7280'
    ctx.font = '14px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(message, dimensions.width / 2, dimensions.height / 2)
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className={`history-stats loading ${className}`}>
        <div className="stats-loading">
          <div className="loading-spinner">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
          </div>
          <p>Loading statistics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`history-stats error ${className}`}>
        <div className="stats-error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <p>Failed to load statistics</p>
          <p className="error-message">{error}</p>
          <button onClick={loadStats} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className={`history-stats empty ${className}`}>
        <div className="stats-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M9 9h6v6H9z" />
          </svg>
          <p>No statistics available</p>
          <p>Generate some images to see your stats!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`history-stats ${className}`}>
      {/* Overview cards */}
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21,15 16,10 5,21" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalGenerations.toLocaleString()}</div>
            <div className="stat-label">Total Generations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.successRate.toFixed(1)}%</div>
            <div className="stat-label">Success Rate</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12,6 12,12 16,14" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(stats.averageGenerationTime)}</div>
            <div className="stat-label">Avg Generation Time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatFileSize(stats.totalStorageUsed)}</div>
            <div className="stat-label">Storage Used</div>
          </div>
        </div>
      </div>

      {/* Chart controls */}
      <div className="chart-controls">
        <div className="chart-tabs">
          <button
            className={`chart-tab ${activeChart === 'models' ? 'active' : ''}`}
            onClick={() => setActiveChart('models')}
          >
            Models
          </button>
          <button
            className={`chart-tab ${activeChart === 'dimensions' ? 'active' : ''}`}
            onClick={() => setActiveChart('dimensions')}
          >
            Dimensions
          </button>
          <button
            className={`chart-tab ${activeChart === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveChart('timeline')}
          >
            Timeline
          </button>
          <button
            className={`chart-tab ${activeChart === 'success-rate' ? 'active' : ''}`}
            onClick={() => setActiveChart('success-rate')}
          >
            Success Rate
          </button>
        </div>

        <button
          onClick={loadStats}
          className="refresh-button"
          disabled={isLoading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M3 2v6h6M21 12a9 9 0 11-3-7.5L9 12" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <canvas 
          ref={canvasRef} 
          className="stats-chart"
          role="img"
          aria-label={`${activeChart === 'models' ? 'Models Usage' : 
                       activeChart === 'dimensions' ? 'Image Dimensions' : 
                       activeChart === 'timeline' ? 'Generations Over Time' : 
                       'Success Rate Over Time'} chart`}
        />
        
        {/* Accessibility fallback - hidden table for screen readers */}
        <div className="sr-only" role="table" aria-label="Chart data table">
          {activeChart === 'models' && stats.topModels.length > 0 && (
            <>
              <div role="row">
                <div role="columnheader">Model</div>
                <div role="columnheader">Usage Count</div>
                <div role="columnheader">Percentage</div>
              </div>
              {stats.topModels.slice(0, 10).map((model, index) => (
                <div key={index} role="row">
                  <div role="cell">{model.name}</div>
                  <div role="cell">{model.count}</div>
                  <div role="cell">{model.percentage.toFixed(1)}%</div>
                </div>
              ))}
            </>
          )}
          
          {activeChart === 'dimensions' && stats.topDimensions.length > 0 && (
            <>
              <div role="row">
                <div role="columnheader">Dimensions</div>
                <div role="columnheader">Usage Count</div>
                <div role="columnheader">Percentage</div>
              </div>
              {stats.topDimensions.slice(0, 10).map((dim, index) => (
                <div key={index} role="row">
                  <div role="cell">{dim.dimensions}</div>
                  <div role="cell">{dim.count}</div>
                  <div role="cell">{dim.percentage.toFixed(1)}%</div>
                </div>
              ))}
            </>
          )}
          
          {activeChart === 'timeline' && stats.generationsPerDay.length > 0 && (
            <>
              <div role="row">
                <div role="columnheader">Date</div>
                <div role="columnheader">Generations</div>
              </div>
              {stats.generationsPerDay.map((day, index) => (
                <div key={index} role="row">
                  <div role="cell">{day.date}</div>
                  <div role="cell">{day.count}</div>
                </div>
              ))}
            </>
          )}
          
          {activeChart === 'success-rate' && stats.successRateOverTime.length > 0 && (
            <>
              <div role="row">
                <div role="columnheader">Date</div>
                <div role="columnheader">Success Rate</div>
              </div>
              {stats.successRateOverTime.map((day, index) => (
                <div key={index} role="row">
                  <div role="cell">{day.date}</div>
                  <div role="cell">{day.rate.toFixed(1)}%</div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Additional details */}
      {stats.oldestGeneration && stats.newestGeneration && (
        <div className="stats-details">
          <div className="detail-item">
            <span className="detail-label">Date Range:</span>
            <span className="detail-value">
              {stats.oldestGeneration.toLocaleDateString()} - {stats.newestGeneration.toLocaleDateString()}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Most Used Model:</span>
            <span className="detail-value">
              {stats.topModels[0]?.name || 'None'} ({stats.topModels[0]?.count || 0} uses)
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Most Common Size:</span>
            <span className="detail-value">
              {stats.topDimensions[0]?.dimensions || 'None'} ({stats.topDimensions[0]?.count || 0} uses)
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryStats