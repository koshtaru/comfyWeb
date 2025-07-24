// Performance Trends Component
// Line charts showing timing history and performance trends over time

import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { TimingTrend } from '@/types/timing'

interface PerformanceTrendsProps {
  trends: TimingTrend[]
  width?: number
  height?: number
  className?: string
  timeRange?: number // minutes
  metrics?: ('executionTime' | 'queueTime' | 'nodeCount' | 'cacheHitRate' | 'gpuUtilization')[]
}

interface ChartDimensions {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  chartWidth: number
  chartHeight: number
}

interface LegendItem {
  label: string
  color: string
  visible: boolean
  key: keyof TimingTrend
  unit: string
}

export const PerformanceTrends: React.FC<PerformanceTrendsProps> = ({
  trends,
  width = 800,
  height = 400,
  className = '',
  timeRange = 60, // 1 hour default
  metrics = ['executionTime', 'queueTime', 'cacheHitRate', 'gpuUtilization']
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(metrics))
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: TimingTrend } | null>(null)

  const dimensions: ChartDimensions = {
    width,
    height,
    margin: { top: 40, right: 120, bottom: 60, left: 80 },
    chartWidth: width - 200, // total margin left + right
    chartHeight: height - 100 // total margin top + bottom
  }

  const colors = {
    background: '#0b0f19',
    text: '#ffffff',
    grid: '#374151',
    executionTime: '#ff7c00',
    queueTime: '#1f77b4',
    nodeCount: '#2ca02c',
    cacheHitRate: '#d62728',
    gpuUtilization: '#9467bd'
  }

  const legendItems: LegendItem[] = [
    { label: 'Execution Time', color: colors.executionTime, visible: true, key: 'executionTime' as keyof TimingTrend, unit: 'ms' },
    { label: 'Queue Time', color: colors.queueTime, visible: true, key: 'queueTime' as keyof TimingTrend, unit: 'ms' },
    { label: 'Node Count', color: colors.nodeCount, visible: true, key: 'nodeCount' as keyof TimingTrend, unit: '' },
    { label: 'Cache Hit Rate', color: colors.cacheHitRate, visible: true, key: 'cacheHitRate' as keyof TimingTrend, unit: '%' },
    { label: 'GPU Utilization', color: colors.gpuUtilization, visible: true, key: 'gpuUtilization' as keyof TimingTrend, unit: '%' }
  ].filter(item => metrics.includes(item.key as any))

  // Filter trends by time range
  const filteredTrends = trends.filter(trend => {
    const ageMinutes = (Date.now() - trend.timestamp) / (1000 * 60)
    return ageMinutes <= timeRange
  }).sort((a, b) => a.timestamp - b.timestamp)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || filteredTrends.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size for retina displays
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = width * devicePixelRatio
    canvas.height = height * devicePixelRatio
    ctx.scale(devicePixelRatio, devicePixelRatio)

    // Clear canvas
    ctx.fillStyle = colors.background
    ctx.fillRect(0, 0, width, height)

    if (filteredTrends.length < 2) {
      drawNoDataMessage(ctx)
      return
    }

    // Calculate scales
    const timeExtent = [
      Math.min(...filteredTrends.map(d => d.timestamp)),
      Math.max(...filteredTrends.map(d => d.timestamp))
    ]

    // Draw grid and axes
    drawGrid(ctx, timeExtent)
    drawAxes(ctx, timeExtent)

    // Draw trend lines for each visible metric
    legendItems.forEach(item => {
      if (visibleMetrics.has(item.key)) {
        drawTrendLine(ctx, filteredTrends, item, timeExtent)
      }
    })

    // Draw hover point if exists
    if (hoveredPoint) {
      drawHoverPoint(ctx, hoveredPoint, timeExtent)
    }

  }, [filteredTrends, visibleMetrics, hoveredPoint, width, height])

  const drawNoDataMessage = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = colors.text
    ctx.font = '16px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Not enough data to show trends', width / 2, height / 2)
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.fillText('Generate a few images to see performance trends', width / 2, height / 2 + 24)
  }

  const drawGrid = (ctx: CanvasRenderingContext2D, _timeExtent: number[]) => {
    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    // Vertical grid lines (time)
    for (let i = 1; i < 5; i++) {
      const x = dimensions.margin.left + (i / 5) * dimensions.chartWidth
      ctx.beginPath()
      ctx.moveTo(x, dimensions.margin.top)
      ctx.lineTo(x, dimensions.margin.top + dimensions.chartHeight)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let i = 1; i < 5; i++) {
      const y = dimensions.margin.top + (i / 5) * dimensions.chartHeight
      ctx.beginPath()
      ctx.moveTo(dimensions.margin.left, y)
      ctx.lineTo(dimensions.margin.left + dimensions.chartWidth, y)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }

  const drawAxes = (ctx: CanvasRenderingContext2D, timeExtent: number[]) => {
    ctx.strokeStyle = colors.text
    ctx.lineWidth = 2

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(dimensions.margin.left, dimensions.margin.top)
    ctx.lineTo(dimensions.margin.left, dimensions.margin.top + dimensions.chartHeight)
    ctx.stroke()

    // X-axis
    ctx.beginPath()
    ctx.moveTo(dimensions.margin.left, dimensions.margin.top + dimensions.chartHeight)
    ctx.lineTo(dimensions.margin.left + dimensions.chartWidth, dimensions.margin.top + dimensions.chartHeight)
    ctx.stroke()

    // Time labels
    ctx.fillStyle = colors.text
    ctx.font = '11px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'

    const timeRange = timeExtent[1] - timeExtent[0]
    for (let i = 0; i <= 4; i++) {
      const time = timeExtent[0] + (timeRange * i / 4)
      const x = dimensions.margin.left + (i / 4) * dimensions.chartWidth
      const timeStr = formatTime(time)
      ctx.fillText(timeStr, x, dimensions.margin.top + dimensions.chartHeight + 20)
    }

    // Axis titles
    ctx.font = 'bold 12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Time', width / 2, height - 15)
  }

  const drawTrendLine = (
    ctx: CanvasRenderingContext2D,
    data: TimingTrend[],
    item: LegendItem,
    timeExtent: number[]
  ) => {
    const values = data.map(d => d[item.key] as number)
    const valueExtent = [Math.min(...values), Math.max(...values)]
    
    if (valueExtent[1] === valueExtent[0]) {
      valueExtent[1] = valueExtent[0] + 1 // Avoid division by zero
    }

    ctx.strokeStyle = item.color
    ctx.lineWidth = 2
    ctx.beginPath()

    let firstPoint = true
    data.forEach((trend) => {
      const x = dimensions.margin.left + 
        ((trend.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * dimensions.chartWidth
      const y = dimensions.margin.top + dimensions.chartHeight - 
        ((trend[item.key] as number - valueExtent[0]) / (valueExtent[1] - valueExtent[0])) * dimensions.chartHeight

      if (firstPoint) {
        ctx.moveTo(x, y)
        firstPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw data points
    ctx.fillStyle = item.color
    data.forEach((trend) => {
      const x = dimensions.margin.left + 
        ((trend.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * dimensions.chartWidth
      const y = dimensions.margin.top + dimensions.chartHeight - 
        ((trend[item.key] as number - valueExtent[0]) / (valueExtent[1] - valueExtent[0])) * dimensions.chartHeight

      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })
  }

  const drawHoverPoint = (
    ctx: CanvasRenderingContext2D,
    hover: { x: number; y: number; data: TimingTrend },
    _timeExtent: number[]
  ) => {
    // Draw vertical line
    ctx.strokeStyle = colors.text
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(hover.x, dimensions.margin.top)
    ctx.lineTo(hover.x, dimensions.margin.top + dimensions.chartHeight)
    ctx.stroke()
    ctx.setLineDash([])

    // Highlight data points
    legendItems.forEach(item => {
      if (visibleMetrics.has(item.key)) {
        const values = filteredTrends.map(d => d[item.key] as number)
        const valueExtent = [Math.min(...values), Math.max(...values)]
        
        if (valueExtent[1] === valueExtent[0]) {
          valueExtent[1] = valueExtent[0] + 1
        }

        const y = dimensions.margin.top + dimensions.chartHeight - 
          ((hover.data[item.key] as number - valueExtent[0]) / (valueExtent[1] - valueExtent[0])) * dimensions.chartHeight

        ctx.fillStyle = item.color
        ctx.strokeStyle = colors.background
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(hover.x, y, 5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
      }
    })
  }

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || filteredTrends.length < 2) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Check if mouse is in chart area
    if (x < dimensions.margin.left || x > dimensions.margin.left + dimensions.chartWidth ||
        y < dimensions.margin.top || y > dimensions.margin.top + dimensions.chartHeight) {
      setHoveredPoint(null)
      return
    }

    // Find closest data point
    const timeExtent = [
      Math.min(...filteredTrends.map(d => d.timestamp)),
      Math.max(...filteredTrends.map(d => d.timestamp))
    ]

    const relativeX = (x - dimensions.margin.left) / dimensions.chartWidth
    const targetTime = timeExtent[0] + relativeX * (timeExtent[1] - timeExtent[0])

    let closestTrend = filteredTrends[0]
    let closestDistance = Math.abs(closestTrend.timestamp - targetTime)

    filteredTrends.forEach(trend => {
      const distance = Math.abs(trend.timestamp - targetTime)
      if (distance < closestDistance) {
        closestDistance = distance
        closestTrend = trend
      }
    })

    const dataX = dimensions.margin.left + 
      ((closestTrend.timestamp - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * dimensions.chartWidth

    setHoveredPoint({ x: dataX, y, data: closestTrend })
  }, [filteredTrends, dimensions])

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null)
  }, [])

  const toggleMetric = (key: string) => {
    const newVisible = new Set(visibleMetrics)
    if (newVisible.has(key)) {
      newVisible.delete(key)
    } else {
      newVisible.add(key)
    }
    setVisibleMetrics(newVisible)
  }

  return (
    <div className={`performance-trends ${className}`} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          cursor: 'crosshair'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />

      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: colors.background,
        border: `1px solid ${colors.grid}`,
        borderRadius: '6px',
        padding: '8px',
        fontSize: '11px'
      }}>
        {legendItems.map(item => (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '4px',
              cursor: 'pointer',
              opacity: visibleMetrics.has(item.key) ? 1 : 0.5
            }}
            onClick={() => toggleMetric(item.key)}
          >
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: item.color,
              marginRight: '6px',
              borderRadius: '2px'
            }} />
            <span style={{ color: colors.text }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredPoint && (
        <div style={{
          position: 'fixed',
          left: hoveredPoint.x + 15,
          top: hoveredPoint.y - 100,
          background: colors.background,
          border: `1px solid ${colors.grid}`,
          borderRadius: '6px',
          padding: '8px 12px',
          color: colors.text,
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, sans-serif',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          minWidth: '160px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {formatTime(hoveredPoint.data.timestamp)}
          </div>
          {legendItems.map(item => (
            visibleMetrics.has(item.key) && (
              <div key={item.key} style={{ marginBottom: '2px' }}>
                <span style={{ color: item.color }}>●</span>
                {' '}{item.label}: {(hoveredPoint.data[item.key] as number).toFixed(1)}{item.unit}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

export default PerformanceTrends