// Timing Visualization Component
// Canvas-based bar charts for node execution duration visualization

import React, { useRef, useEffect, useState, useCallback } from 'react'
import type { NodePerformanceData, TimingVisualizationConfig } from '@/types/timing'

interface TimingVisualizationProps {
  data: NodePerformanceData[]
  config?: Partial<TimingVisualizationConfig>
  width?: number
  height?: number
  className?: string
}

interface ChartDimensions {
  width: number
  height: number
  margin: { top: number; right: number; bottom: number; left: number }
  chartWidth: number
  chartHeight: number
}

interface TooltipData {
  visible: boolean
  x: number
  y: number
  content: string
}

export const TimingVisualization: React.FC<TimingVisualizationProps> = ({
  data,
  config = {},
  width = 800,
  height = 400,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | undefined>(undefined)
  const [tooltip, setTooltip] = useState<TooltipData>({ visible: false, x: 0, y: 0, content: '' })
  const [animationProgress, setAnimationProgress] = useState(0)

  const vizConfig: Required<TimingVisualizationConfig> = {
    showNodeTypes: config.showNodeTypes ?? true,
    showCachedNodes: config.showCachedNodes ?? true,
    colorScheme: config.colorScheme ?? 'performance',
    chartHeight: config.chartHeight ?? height,
    animationDuration: config.animationDuration ?? 1000,
    tooltipEnabled: config.tooltipEnabled ?? true
  }

  const dimensions: ChartDimensions = {
    width,
    height,
    margin: { top: 40, right: 40, bottom: 80, left: 120 },
    chartWidth: width - 160, // total margin left + right
    chartHeight: height - 120 // total margin top + bottom
  }

  // Color schemes
  const colorSchemes = {
    default: {
      background: '#0b0f19',
      text: '#ffffff',
      bars: ['#ff7c00', '#1f77b4', '#2ca02c', '#d62728', '#9467bd'],
      grid: '#374151',
      bottleneck: '#ef4444',
      cached: '#10b981'
    },
    performance: {
      background: '#0b0f19',
      text: '#ffffff',
      bars: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
      grid: '#374151',
      bottleneck: '#dc2626',
      cached: '#059669'
    },
    accessibility: {
      background: '#000000',
      text: '#ffffff',
      bars: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'],
      grid: '#808080',
      bottleneck: '#ff4444',
      cached: '#00cc88'
    }
  }

  const colors = colorSchemes[vizConfig.colorScheme]

  // Animation logic
  useEffect(() => {
    if (data.length === 0) return

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / vizConfig.animationDuration, 1)
      
      setAnimationProgress(progress)
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current!)
      }
    }
  }, [data, vizConfig.animationDuration])

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return

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

    // Sort data by duration for better visualization
    const sortedData = [...data].sort((a, b) => b.averageDuration - a.averageDuration).slice(0, 15)
    
    if (sortedData.length === 0) return

    // Calculate scales
    const maxDuration = Math.max(...sortedData.map(d => d.averageDuration))
    const barHeight = dimensions.chartHeight / sortedData.length * 0.8
    const barSpacing = dimensions.chartHeight / sortedData.length * 0.2

    // Draw grid lines
    drawGrid(ctx, maxDuration)
    
    // Draw bars
    sortedData.forEach((nodeData, index) => {
      const barWidth = (nodeData.averageDuration / maxDuration) * dimensions.chartWidth * animationProgress
      const y = dimensions.margin.top + index * (barHeight + barSpacing)
      
      drawBar(ctx, nodeData, barWidth, y, barHeight, index)
    })

    // Draw axes
    drawAxes(ctx, maxDuration)
    
    // Draw labels
    drawLabels(ctx, sortedData, barHeight, barSpacing)

  }, [data, animationProgress, width, height, colors, dimensions])

  const drawGrid = (ctx: CanvasRenderingContext2D, _maxDuration: number) => {
    ctx.strokeStyle = colors.grid
    ctx.lineWidth = 1
    ctx.setLineDash([2, 2])

    // Vertical grid lines
    for (let i = 1; i <= 5; i++) {
      const x = dimensions.margin.left + (i / 5) * dimensions.chartWidth
      ctx.beginPath()
      ctx.moveTo(x, dimensions.margin.top)
      ctx.lineTo(x, dimensions.margin.top + dimensions.chartHeight)
      ctx.stroke()
    }

    ctx.setLineDash([])
  }

  const drawBar = (
    ctx: CanvasRenderingContext2D, 
    nodeData: NodePerformanceData, 
    barWidth: number, 
    y: number, 
    barHeight: number, 
    index: number
  ) => {
    // Determine bar color based on performance
    let barColor = colors.bars[index % colors.bars.length]
    
    if (nodeData.isBottleneck) {
      barColor = colors.bottleneck
    } else if (nodeData.cacheHitRate > 80) {
      barColor = colors.cached
    }

    // Draw main bar
    ctx.fillStyle = barColor
    ctx.fillRect(dimensions.margin.left, y, barWidth, barHeight)

    // Draw cache hit rate indicator (small bar on top)
    if (vizConfig.showCachedNodes && nodeData.cacheHitRate > 0) {
      const cacheBarHeight = barHeight * 0.2
      const cacheBarWidth = barWidth * (nodeData.cacheHitRate / 100)
      
      ctx.fillStyle = colors.cached
      ctx.fillRect(dimensions.margin.left, y - cacheBarHeight - 2, cacheBarWidth, cacheBarHeight)
    }

    // Draw bottleneck indicator
    if (nodeData.isBottleneck) {
      ctx.strokeStyle = colors.bottleneck
      ctx.lineWidth = 2
      ctx.strokeRect(dimensions.margin.left, y, barWidth, barHeight)
    }
  }

  const drawAxes = (ctx: CanvasRenderingContext2D, maxDuration: number) => {
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

    // X-axis labels
    ctx.fillStyle = colors.text
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'

    for (let i = 0; i <= 5; i++) {
      const value = (maxDuration * i / 5).toFixed(0)
      const x = dimensions.margin.left + (i / 5) * dimensions.chartWidth
      ctx.fillText(`${value}ms`, x, dimensions.margin.top + dimensions.chartHeight + 20)
    }

    // Axis titles
    ctx.font = 'bold 14px Inter, system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Average Duration (ms)', width / 2, height - 20)

    ctx.save()
    ctx.translate(20, height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Node Types', 0, 0)
    ctx.restore()
  }

  const drawLabels = (
    ctx: CanvasRenderingContext2D, 
    sortedData: NodePerformanceData[], 
    barHeight: number, 
    barSpacing: number
  ) => {
    ctx.fillStyle = colors.text
    ctx.font = '12px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'

    sortedData.forEach((nodeData, index) => {
      const y = dimensions.margin.top + index * (barHeight + barSpacing) + barHeight / 2 + 4
      
      // Truncate long node names
      let nodeName = nodeData.nodeType
      if (nodeName.length > 15) {
        nodeName = nodeName.substring(0, 12) + '...'
      }
      
      ctx.fillText(nodeName, dimensions.margin.left - 10, y)
    })
  }

  // Handle mouse events for tooltips
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!vizConfig.tooltipEnabled || data.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Check if mouse is over a bar
    const sortedData = [...data].sort((a, b) => b.averageDuration - a.averageDuration).slice(0, 15)
    const barHeight = dimensions.chartHeight / sortedData.length * 0.8
    const barSpacing = dimensions.chartHeight / sortedData.length * 0.2

    let hoveredNode: NodePerformanceData | null = null
    
    for (let i = 0; i < sortedData.length; i++) {
      const barY = dimensions.margin.top + i * (barHeight + barSpacing)
      
      if (y >= barY && y <= barY + barHeight && x >= dimensions.margin.left) {
        hoveredNode = sortedData[i]
        break
      }
    }

    if (hoveredNode) {
      const tooltipContent = `
        ${hoveredNode.nodeType}
        Avg Duration: ${hoveredNode.averageDuration.toFixed(1)}ms
        Executions: ${hoveredNode.totalExecutions}
        Cache Hit Rate: ${hoveredNode.cacheHitRate.toFixed(1)}%
        Error Rate: ${hoveredNode.errorRate.toFixed(1)}%
        ${hoveredNode.isBottleneck ? '⚠️ Bottleneck' : ''}
      `.trim()

      setTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        content: tooltipContent
      })
    } else {
      setTooltip(prev => ({ ...prev, visible: false }))
    }
  }, [data, vizConfig.tooltipEnabled, dimensions])

  const handleMouseLeave = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }, [])

  return (
    <div className={`timing-visualization ${className}`} style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          width: `${width}px`, 
          height: `${height}px`,
          cursor: vizConfig.tooltipEnabled ? 'pointer' : 'default'
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            background: colors.background,
            border: `1px solid ${colors.grid}`,
            borderRadius: '6px',
            padding: '8px 12px',
            color: colors.text,
            fontSize: '12px',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'pre-line',
            zIndex: 1000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        background: colors.background,
        border: `1px solid ${colors.grid}`,
        borderRadius: '6px',
        padding: '8px',
        fontSize: '11px',
        color: colors.text
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            backgroundColor: colors.bottleneck, 
            marginRight: '6px',
            borderRadius: '2px'
          }} />
          Bottleneck
        </div>
        {vizConfig.showCachedNodes && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: colors.cached, 
              marginRight: '6px',
              borderRadius: '2px'
            }} />
            High Cache Rate
          </div>
        )}
      </div>
    </div>
  )
}

export default TimingVisualization