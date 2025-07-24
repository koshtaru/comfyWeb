// Bottleneck Analysis Component
// Displays performance bottlenecks and optimization recommendations

import React from 'react'
import type { BottleneckAnalysis as BottleneckData, NodePerformanceData } from '@/types/timing'

interface BottleneckAnalysisProps {
  analysis: BottleneckData
  className?: string
  showRecommendations?: boolean
  maxBottlenecks?: number
}

interface BottleneckItemProps {
  node: NodePerformanceData
  rank: number
  threshold: number
}

const BottleneckItem: React.FC<BottleneckItemProps> = ({ node, rank, threshold }) => {
  const severityLevel = node.averageDuration > threshold * 3 ? 'critical' : 
                       node.averageDuration > threshold * 2 ? 'high' : 'medium'
  
  const severityColors = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#d97706'
  }

  const severityLabels = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium'
  }

  const performanceImpact = ((node.averageDuration - threshold) / threshold * 100).toFixed(0)

  return (
    <div className="bottleneck-item" style={{
      background: 'rgba(55, 65, 81, 0.5)',
      border: `1px solid ${severityColors[severityLevel]}`,
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
      position: 'relative'
    }}>
      {/* Rank Badge */}
      <div style={{
        position: 'absolute',
        top: '-8px',
        left: '12px',
        background: severityColors[severityLevel],
        color: '#ffffff',
        width: '24px',
        height: '24px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {rank}
      </div>

      {/* Node Info */}
      <div style={{ marginLeft: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px'
        }}>
          <div>
            <h4 style={{
              margin: 0,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              {node.nodeType}
            </h4>
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '4px',
              fontSize: '12px',
              color: '#9ca3af'
            }}>
              <span>Avg: {node.averageDuration.toFixed(1)}ms</span>
              <span>Executions: {node.totalExecutions}</span>
              <span>Impact: +{performanceImpact}%</span>
            </div>
          </div>
          
          <div style={{
            background: severityColors[severityLevel],
            color: '#ffffff',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase'
          }}>
            {severityLabels[severityLevel]}
          </div>
        </div>

        {/* Performance Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
          gap: '8px',
          fontSize: '11px'
        }}>
          <div>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Min Duration</div>
            <div style={{ color: '#ffffff', fontWeight: '500' }}>{node.minDuration.toFixed(1)}ms</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Max Duration</div>
            <div style={{ color: '#ffffff', fontWeight: '500' }}>{node.maxDuration.toFixed(1)}ms</div>
          </div>
          <div>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Cache Rate</div>
            <div style={{ 
              color: node.cacheHitRate > 50 ? '#10b981' : '#ef4444', 
              fontWeight: '500' 
            }}>
              {node.cacheHitRate.toFixed(1)}%
            </div>
          </div>
          <div>
            <div style={{ color: '#6b7280', marginBottom: '2px' }}>Error Rate</div>
            <div style={{ 
              color: node.errorRate > 5 ? '#ef4444' : '#10b981', 
              fontWeight: '500' 
            }}>
              {node.errorRate.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Performance Bar */}
        <div style={{ marginTop: '8px' }}>
          <div style={{
            background: 'rgba(107, 114, 128, 0.3)',
            height: '4px',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              background: severityColors[severityLevel],
              height: '100%',
              width: `${Math.min(100, (node.bottleneckScore * 100))}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div style={{
            fontSize: '10px',
            color: '#6b7280',
            marginTop: '2px'
          }}>
            Bottleneck Score: {node.bottleneckScore.toFixed(2)}x threshold
          </div>
        </div>
      </div>
    </div>
  )
}

export const BottleneckAnalysis: React.FC<BottleneckAnalysisProps> = ({
  analysis,
  className = '',
  showRecommendations = true,
  maxBottlenecks = 5
}) => {
  const displayedBottlenecks = analysis.slowestNodes.slice(0, maxBottlenecks)

  if (analysis.slowestNodes.length === 0) {
    return (
      <div className={`bottleneck-analysis ${className}`} style={{
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '8px',
        padding: '16px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '24px',
          marginBottom: '8px'
        }}>✅</div>
        <h3 style={{
          margin: 0,
          color: '#10b981',
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '4px'
        }}>
          No Performance Bottlenecks Detected
        </h3>
        <p style={{
          margin: 0,
          color: '#6b7280',
          fontSize: '14px'
        }}>
          All nodes are performing within optimal thresholds
        </p>
      </div>
    )
  }

  return (
    <div className={`bottleneck-analysis ${className}`} style={{
      background: '#0b0f19',
      border: '1px solid #374151',
      borderRadius: '8px',
      padding: '16px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '600'
        }}>
          Performance Bottlenecks
        </h3>
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          color: '#ef4444',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {analysis.slowestNodes.length} Issues Found
        </div>
      </div>

      {/* Threshold Info */}
      <div style={{
        background: 'rgba(55, 65, 81, 0.3)',
        border: '1px solid #4b5563',
        borderRadius: '6px',
        padding: '8px 12px',
        marginBottom: '16px',
        fontSize: '12px',
        color: '#9ca3af'
      }}>
        <span style={{ color: '#ffffff', fontWeight: '500' }}>Bottleneck Threshold:</span>
        {' '}{analysis.bottleneckThreshold}ms
        {' '}• Nodes exceeding this duration are flagged as potential bottlenecks
      </div>

      {/* Critical Path */}
      {analysis.criticalPath.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '16px'
        }}>
          <div style={{
            color: '#ef4444',
            fontSize: '12px',
            fontWeight: '600',
            marginBottom: '4px'
          }}>
            🔥 Critical Path
          </div>
          <div style={{
            color: '#ffffff',
            fontSize: '12px'
          }}>
            {analysis.criticalPath.join(' → ')}
          </div>
        </div>
      )}

      {/* Bottleneck List */}
      <div style={{ marginBottom: showRecommendations ? '20px' : '0' }}>
        {displayedBottlenecks.map((node, index) => (
          <BottleneckItem
            key={node.nodeType}
            node={node}
            rank={index + 1}
            threshold={analysis.bottleneckThreshold}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {analysis.slowestNodes.length > maxBottlenecks && (
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '12px',
          marginBottom: showRecommendations ? '20px' : '0'
        }}>
          +{analysis.slowestNodes.length - maxBottlenecks} more bottlenecks not shown
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && analysis.recommendations.length > 0 && (
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            💡 Optimization Recommendations
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysis.recommendations.map((recommendation, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  color: '#bfdbfe'
                }}
              >
                {recommendation}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default BottleneckAnalysis