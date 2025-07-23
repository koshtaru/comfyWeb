// WebSocket Connection Status Component
// Displays real-time connection status and provides recovery options

import React, { useState } from 'react'
import { useConnectionStatus, useWebSocketContext } from '@/contexts/WebSocketContext'
import type { WebSocketState } from '@/types/websocket'

interface ConnectionStatusProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  showDetails = false,
  compact = false,
  className = ''
}) => {
  const { connectionState, isConnected, isReconnecting, lastError, isHealthy, latency } = useConnectionStatus()
  const { connect, disconnect, reconnect, health } = useWebSocketContext()
  const [isExpanded, setIsExpanded] = useState(false)

  const getStatusColor = (state: WebSocketState): string => {
    switch (state) {
      case 'connected': return 'text-comfy-success'
      case 'connecting': 
      case 'reconnecting': return 'text-comfy-accent-orange'
      case 'disconnected': return 'text-comfy-text-secondary'
      case 'error': return 'text-comfy-error'
      default: return 'text-comfy-text-secondary'
    }
  }

  const getStatusIcon = (state: WebSocketState) => {
    switch (state) {
      case 'connected':
        return (
          <svg className="status-icon connected" viewBox="0 0 24 24" width="16" height="16">
            <circle cx="12" cy="12" r="3" fill="currentColor" />
            <path fill="currentColor" d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M12 7C13.4 7 14.8 7.6 15.8 8.6C16.8 9.6 17.4 11 17.4 12.4C17.4 13.8 16.8 15.2 15.8 16.2C14.8 17.2 13.4 17.8 12 17.8C10.6 17.8 9.2 17.2 8.2 16.2C7.2 15.2 6.6 13.8 6.6 12.4C6.6 11 7.2 9.6 8.2 8.6C9.2 7.6 10.6 7 12 7Z"/>
          </svg>
        )
      case 'connecting':
      case 'reconnecting':
        return (
          <svg className="status-icon connecting animate-spin" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
          </svg>
        )
      case 'disconnected':
        return (
          <svg className="status-icon disconnected" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M14.5,9L13.09,10.41L15.67,13L13.09,15.59L14.5,17L18.5,13L14.5,9M9.5,9L5.5,13L9.5,17L10.91,15.59L8.33,13L10.91,10.41L9.5,9Z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="status-icon error" viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
    }
  }

  const getStatusText = (state: WebSocketState): string => {
    switch (state) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'reconnecting': return 'Reconnecting...'
      case 'disconnected': return 'Disconnected'
      case 'error': return 'Connection Error'
      default: return 'Unknown'
    }
  }

  const handleAction = async (action: 'connect' | 'disconnect' | 'reconnect') => {
    try {
      switch (action) {
        case 'connect':
          await connect()
          break
        case 'disconnect':
          disconnect()
          break
        case 'reconnect':
          await reconnect()
          break
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error)
    }
  }

  if (compact) {
    return (
      <div className={`connection-status compact ${className}`}>
        <div className="status-indicator">
          <span className={`status-dot ${connectionState}`}></span>
          <span className={`status-text ${getStatusColor(connectionState)}`}>
            {getStatusText(connectionState)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={`connection-status ${className}`}>
      <div className="status-header">
        <div className="status-info">
          <div className="status-main">
            {getStatusIcon(connectionState)}
            <span className={`status-text ${getStatusColor(connectionState)}`}>
              {getStatusText(connectionState)}
            </span>
            {latency !== null && isConnected && (
              <span className="latency-info">
                {Math.round(latency)}ms
              </span>
            )}
          </div>
          
          {lastError && (
            <div className="error-message">
              {lastError}
            </div>
          )}
        </div>

        <div className="status-actions">
          {connectionState === 'disconnected' && (
            <button
              type="button"
              className="comfy-button small"
              onClick={() => handleAction('connect')}
            >
              Connect
            </button>
          )}
          
          {connectionState === 'connected' && (
            <button
              type="button"
              className="comfy-button small secondary"
              onClick={() => handleAction('disconnect')}
            >
              Disconnect
            </button>
          )}
          
          {(connectionState === 'error' || connectionState === 'disconnected') && (
            <button
              type="button"
              className="comfy-button small"
              onClick={() => handleAction('reconnect')}
              disabled={isReconnecting}
            >
              {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
            </button>
          )}

          {showDetails && (
            <button
              type="button"
              className="details-toggle"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Hide details' : 'Show details'}
            >
              <svg 
                viewBox="0 0 24 24" 
                width="16" 
                height="16"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path fill="currentColor" d="M7,10L12,15L17,10H7Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {showDetails && isExpanded && (
        <div className="status-details">
          <div className="detail-row">
            <span className="detail-label">Health:</span>
            <span className={`detail-value ${isHealthy ? 'healthy' : 'unhealthy'}`}>
              {isHealthy ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>
          
          {latency !== null && (
            <div className="detail-row">
              <span className="detail-label">Latency:</span>
              <span className="detail-value">{Math.round(latency)}ms</span>
            </div>
          )}
          
          <div className="detail-row">
            <span className="detail-label">Uptime:</span>
            <span className="detail-value">
              {Math.round(health.uptime / 1000)}s
            </span>
          </div>
          
          {health.reconnectCount > 0 && (
            <div className="detail-row">
              <span className="detail-label">Reconnects:</span>
              <span className="detail-value">{health.reconnectCount}</span>
            </div>
          )}
          
          <div className="detail-row">
            <span className="detail-label">Messages/sec:</span>
            <span className="detail-value">{health.messageRate}</span>
          </div>
        </div>
      )}
    </div>
  )
}