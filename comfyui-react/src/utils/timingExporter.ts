// Timing Data Exporter
// Exports timing analysis data to CSV and JSON formats

import type {
  ExecutionTiming,
  PerformanceMetrics,
  NodePerformanceData,
  TimingTrend,
  BottleneckAnalysis,
  TimingExportData
} from '@/types/timing'

export class TimingExporter {
  static exportToCSV(data: TimingExportData): string {
    const lines: string[] = []

    // Header
    lines.push('# ComfyUI Timing Analysis Export')
    lines.push(`# Generated: ${new Date(data.exportTimestamp).toISOString()}`)
    lines.push(`# Time Range: ${new Date(data.timeRange.startTime).toISOString()} - ${new Date(data.timeRange.endTime).toISOString()}`)
    lines.push('')

    // Performance Metrics
    lines.push('## Performance Metrics')
    lines.push('Metric,Value,Unit')
    lines.push(`Total Executions,${data.metrics.totalExecutions},count`)
    lines.push(`Average Execution Time,${data.metrics.averageExecutionTime.toFixed(2)},ms`)
    lines.push(`Average Queue Time,${data.metrics.averageQueueTime.toFixed(2)},ms`)
    lines.push(`Success Rate,${data.metrics.successRate.toFixed(2)},%`)
    lines.push(`Error Rate,${data.metrics.errorRate.toFixed(2)},%`)
    lines.push(`Average Nodes Per Execution,${data.metrics.averageNodesPerExecution.toFixed(2)},count`)
    lines.push(`Average Cache Hit Rate,${data.metrics.averageCacheHitRate.toFixed(2)},%`)
    lines.push(`Estimated GPU Utilization,${data.metrics.estimatedGpuUtilization.toFixed(2)},%`)
    lines.push('')

    // Node Performance
    lines.push('## Node Performance')
    lines.push('Node Type,Total Executions,Average Duration (ms),Min Duration (ms),Max Duration (ms),Cache Hit Rate (%),Error Rate (%),Is Bottleneck,Bottleneck Score')
    data.nodePerformance.forEach(node => {
      lines.push([
        `"${node.nodeType}"`,
        node.totalExecutions,
        node.averageDuration.toFixed(2),
        node.minDuration.toFixed(2),
        node.maxDuration.toFixed(2),
        node.cacheHitRate.toFixed(2),
        node.errorRate.toFixed(2),
        node.isBottleneck ? 'Yes' : 'No',
        node.bottleneckScore.toFixed(2)
      ].join(','))
    })
    lines.push('')

    // Execution History
    lines.push('## Execution History')
    lines.push('Prompt ID,Start Time,End Time,Total Duration (ms),Queue Time (ms),Execution Time (ms),Node Count,Cached Nodes,Status,Error Node,Error Message')
    data.executions.forEach(execution => {
      const errorInfo = execution.errorInfo
      lines.push([
        `"${execution.promptId}"`,
        new Date(execution.startTime).toISOString(),
        execution.endTime ? new Date(execution.endTime).toISOString() : '',
        execution.totalDuration?.toFixed(2) || '',
        execution.queueTime?.toFixed(2) || '',
        execution.executionTime?.toFixed(2) || '',
        execution.nodes.size,
        execution.cachedNodes.length,
        execution.status,
        errorInfo ? `"${errorInfo.nodeId}"` : '',
        errorInfo ? `"${errorInfo.message.replace(/"/g, '""')}"` : ''
      ].join(','))
    })
    lines.push('')

    // Performance Trends
    if (data.trends.length > 0) {
      lines.push('## Performance Trends')
      lines.push('Timestamp,Execution Time (ms),Queue Time (ms),Node Count,Cache Hit Rate (%),GPU Utilization (%)')
      data.trends.forEach(trend => {
        lines.push([
          new Date(trend.timestamp).toISOString(),
          trend.executionTime.toFixed(2),
          trend.queueTime.toFixed(2),
          trend.nodeCount,
          trend.cacheHitRate.toFixed(2),
          trend.gpuUtilization.toFixed(2)
        ].join(','))
      })
      lines.push('')
    }

    // Bottleneck Analysis
    lines.push('## Bottleneck Analysis')
    lines.push(`Bottleneck Threshold: ${data.bottlenecks.bottleneckThreshold}ms`)
    lines.push(`Critical Path: ${data.bottlenecks.criticalPath.join(' → ')}`)
    lines.push('')
    lines.push('### Recommendations')
    data.bottlenecks.recommendations.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec}`)
    })

    return lines.join('\n')
  }

  static exportToJSON(data: TimingExportData): string {
    return JSON.stringify(data, null, 2)
  }

  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType })
    const url = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    window.URL.revokeObjectURL(url)
  }

  static generateFilename(format: 'csv' | 'json', prefix: string = 'comfyui-timing'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const timeString = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-')
    return `${prefix}-${timestamp}-${timeString}.${format}`
  }

  static async exportData(
    executions: ExecutionTiming[],
    metrics: PerformanceMetrics,
    nodePerformance: NodePerformanceData[],
    trends: TimingTrend[],
    bottlenecks: BottleneckAnalysis,
    format: 'csv' | 'json' = 'csv',
    timeRange?: { startTime: number; endTime: number }
  ): Promise<void> {
    const now = Date.now()
    const defaultTimeRange = {
      startTime: executions.length > 0 ? Math.min(...executions.map(e => e.startTime)) : now,
      endTime: executions.length > 0 ? Math.max(...executions.map(e => e.endTime || e.startTime)) : now
    }

    const exportData: TimingExportData = {
      exportTimestamp: now,
      timeRange: timeRange || defaultTimeRange,
      executions,
      metrics,
      nodePerformance,
      trends,
      bottlenecks
    }

    const filename = this.generateFilename(format)
    
    try {
      if (format === 'csv') {
        const csvContent = this.exportToCSV(exportData)
        this.downloadFile(csvContent, filename, 'text/csv')
      } else {
        const jsonContent = this.exportToJSON(exportData)
        this.downloadFile(jsonContent, filename, 'application/json')
      }
      
      console.log(`Timing data exported as ${filename}`)
    } catch (error) {
      console.error('Failed to export timing data:', error)
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  static generateSummaryReport(
    metrics: PerformanceMetrics,
    _nodePerformance: NodePerformanceData[],
    bottlenecks: BottleneckAnalysis
  ): string {
    const lines: string[] = []

    lines.push('# ComfyUI Performance Summary Report')
    lines.push(`Generated: ${new Date().toLocaleString()}`)
    lines.push('')

    // Key Metrics
    lines.push('## Key Performance Metrics')
    lines.push(`- Total Executions: ${metrics.totalExecutions}`)
    lines.push(`- Average Execution Time: ${metrics.averageExecutionTime.toFixed(1)}ms`)
    lines.push(`- Success Rate: ${metrics.successRate.toFixed(1)}%`)
    lines.push(`- Cache Hit Rate: ${metrics.averageCacheHitRate.toFixed(1)}%`)
    lines.push(`- Estimated GPU Utilization: ${metrics.estimatedGpuUtilization.toFixed(1)}%`)
    lines.push('')

    // Performance Status
    const performanceGrade = this.calculatePerformanceGrade(metrics, bottlenecks)
    lines.push(`## Overall Performance: ${performanceGrade.grade} ${performanceGrade.emoji}`)
    lines.push(performanceGrade.description)
    lines.push('')

    // Top Issues
    if (bottlenecks.slowestNodes.length > 0) {
      lines.push('## Top Performance Issues')
      bottlenecks.slowestNodes.slice(0, 3).forEach((node, index) => {
        lines.push(`${index + 1}. ${node.nodeType}: ${node.averageDuration.toFixed(1)}ms (${node.totalExecutions} executions)`)
      })
      lines.push('')
    }

    // Recommendations
    if (bottlenecks.recommendations.length > 0) {
      lines.push('## Optimization Recommendations')
      bottlenecks.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. ${rec}`)
      })
    }

    return lines.join('\n')
  }

  private static calculatePerformanceGrade(
    metrics: PerformanceMetrics,
    bottlenecks: BottleneckAnalysis
  ): { grade: string; emoji: string; description: string } {
    let score = 100

    // Deduct for low success rate
    if (metrics.successRate < 90) score -= (90 - metrics.successRate) * 2
    
    // Deduct for bottlenecks
    score -= bottlenecks.slowestNodes.length * 10
    
    // Deduct for low cache hit rate
    if (metrics.averageCacheHitRate < 50) score -= (50 - metrics.averageCacheHitRate)
    
    // Deduct for low GPU utilization
    if (metrics.estimatedGpuUtilization < 70) score -= (70 - metrics.estimatedGpuUtilization) * 0.5

    if (score >= 90) {
      return {
        grade: 'Excellent',
        emoji: '🚀',
        description: 'Your workflow is performing optimally with minimal bottlenecks and high efficiency.'
      }
    } else if (score >= 80) {
      return {
        grade: 'Good',
        emoji: '✅',
        description: 'Performance is good with room for minor optimizations.'
      }
    } else if (score >= 70) {
      return {
        grade: 'Fair',
        emoji: '⚠️',
        description: 'Performance is acceptable but several optimizations could improve efficiency.'
      }
    } else if (score >= 60) {
      return {
        grade: 'Poor',
        emoji: '❌',
        description: 'Significant performance issues detected. Optimization is strongly recommended.'
      }
    } else {
      return {
        grade: 'Critical',
        emoji: '🔥',
        description: 'Critical performance issues detected. Immediate optimization required.'
      }
    }
  }
}