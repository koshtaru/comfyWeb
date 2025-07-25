import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Badge, 
  Flex,
  IconButton
} from '@/components/ui'
import { useWebSocketContext } from '@/contexts/WebSocketContext'

export interface WebSocketLogEntry {
  id: string
  timestamp: number
  type: 'sent' | 'received' | 'error' | 'info' | 'debug' | 'warning'
  level: 'low' | 'medium' | 'high'
  message: string
  data?: any
  category?: string
}

interface WebSocketDebugPanelProps {
  maxLogs?: number
  className?: string
}

export const WebSocketDebugPanel: React.FC<WebSocketDebugPanelProps> = ({
  maxLogs = 500,
  className = ''
}) => {
  const { connectionState, connectionStats } = useWebSocketContext()
  const [logs, setLogs] = useState<WebSocketLogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [selectedLog, setSelectedLog] = useState<WebSocketLogEntry | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll functionality
  useEffect(() => {
    if (autoScroll && logsEndRef.current && !isPaused) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll, isPaused])

  // Add log entry
  const addLog = useCallback((
    type: WebSocketLogEntry['type'], 
    message: string, 
    data?: any,
    level: WebSocketLogEntry['level'] = 'medium',
    category?: string
  ) => {
    if (isPaused) return

    const entry: WebSocketLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      level,
      message,
      data,
      category
    }

    setLogs(prev => {
      const newLogs = [...prev, entry]
      return newLogs.slice(-maxLogs)
    })
  }, [isPaused, maxLogs])

  // Mock WebSocket message interception (in real implementation, this would hook into the WebSocket service)
  useEffect(() => {
    const interval = setInterval(() => {
      // Add connection state changes as logs
      addLog('info', `Connection state: ${connectionState}`, { connectionState }, 'medium', 'connection')
      
      // Add periodic stats
      if (connectionState === 'connected') {
        addLog('debug', `Stats - Total: ${connectionStats.totalMessages}, Latency: ${connectionStats.averageLatency}ms`, 
          connectionStats, 'low', 'stats')
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [connectionState, connectionStats, addLog])

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesText = filter === '' || 
      log.message.toLowerCase().includes(filter.toLowerCase()) ||
      log.category?.toLowerCase().includes(filter.toLowerCase())
    
    const matchesType = typeFilter === 'all' || log.type === typeFilter
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter

    return matchesText && matchesType && matchesLevel
  })

  // Clear logs
  const clearLogs = () => {
    setLogs([])
    setSelectedLog(null)
  }

  // Export logs
  const exportLogs = () => {
    const logsData = {
      exportTime: new Date().toISOString(),
      totalLogs: logs.length,
      logs: logs
    }
    
    const blob = new Blob([JSON.stringify(logsData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `websocket-logs-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Get badge variant for log type
  const getLogTypeBadge = (type: WebSocketLogEntry['type']) => {
    switch (type) {
      case 'sent': return 'primary'
      case 'received': return 'success'
      case 'error': return 'error'
      case 'warning': return 'warning'
      case 'info': return 'default'
      case 'debug': return 'secondary'
      default: return 'default'
    }
  }

  // Get level indicator
  const getLevelIndicator = (level: WebSocketLogEntry['level']) => {
    switch (level) {
      case 'high': return '🔴'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <Card className={className}>
      <CardHeader>
        <Flex justify="between" align="center">
          <CardTitle>WebSocket Debug Panel</CardTitle>
          <Flex gap="sm" align="center">
            <Badge variant={connectionState === 'connected' ? 'success' : 'error'}>
              {filteredLogs.length} / {logs.length}
            </Badge>
            <IconButton
              onClick={() => setIsPaused(!isPaused)}
              tooltip={isPaused ? 'Resume logging' : 'Pause logging'}
              variant={isPaused ? 'danger' : 'secondary'}
              size="sm"
            >
              {isPaused ? '▶' : '⏸'}
            </IconButton>
          </Flex>
        </Flex>
      </CardHeader>
      
      <CardContent>
        {/* Controls */}
        <div className="mb-4 space-y-3">
          <Flex gap="sm" align="center" wrap="wrap">
            <Input
              value={filter}
              onChange={setFilter}
              placeholder="Filter messages..."
              className="min-w-48"
            />
            
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1 rounded border border-comfy-border bg-comfy-bg-tertiary text-comfy-text-primary text-sm"
            >
              <option value="all">All Types</option>
              <option value="sent">Sent</option>
              <option value="received">Received</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>

            <select 
              value={levelFilter} 
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-3 py-1 rounded border border-comfy-border bg-comfy-bg-tertiary text-comfy-text-primary text-sm"
            >
              <option value="all">All Levels</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </Flex>

          <Flex gap="sm" align="center" className="text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
            
            <Button onClick={clearLogs} variant="ghost" size="sm">
              Clear
            </Button>
            
            <Button onClick={exportLogs} variant="ghost" size="sm">
              Export
            </Button>
          </Flex>
        </div>

        {/* Log Display */}
        <div 
          ref={logContainerRef}
          className="bg-comfy-bg-primary rounded-lg p-3 h-80 overflow-y-auto font-mono text-sm border border-comfy-border"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-comfy-text-secondary text-center py-8">
              {logs.length === 0 ? 'No logs yet...' : 'No logs match current filters'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className={`mb-1 p-2 rounded cursor-pointer transition-colors ${
                  selectedLog?.id === log.id ? 'bg-comfy-bg-secondary' : 'hover:bg-comfy-bg-secondary/50'
                }`}
                onClick={() => setSelectedLog(log)}
              >
                <Flex gap="sm" align="center" className="mb-1">
                  <span className="text-comfy-text-secondary whitespace-nowrap text-xs">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  
                  <span className="text-xs">
                    {getLevelIndicator(log.level)}
                  </span>
                  
                  <Badge
                    variant={getLogTypeBadge(log.type) as any}
                    size="sm"
                  >
                    {log.type}
                  </Badge>
                  
                  {log.category && (
                    <Badge variant="outline" size="sm">
                      {log.category}
                    </Badge>
                  )}
                </Flex>
                
                <div className="text-comfy-text-primary ml-2">
                  {log.message}
                </div>
                
                {log.data && selectedLog?.id === log.id && (
                  <div className="mt-2 ml-2 p-2 bg-comfy-bg-tertiary rounded text-xs overflow-x-auto">
                    <pre className="text-comfy-text-secondary">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Selected Log Details */}
        {selectedLog && (
          <div className="mt-4 p-3 bg-comfy-bg-secondary rounded-lg">
            <div className="text-sm text-comfy-text-primary font-medium mb-2">
              Log Details
            </div>
            <div className="text-xs text-comfy-text-secondary space-y-1">
              <div><strong>ID:</strong> {selectedLog.id}</div>
              <div><strong>Time:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</div>
              <div><strong>Type:</strong> {selectedLog.type}</div>
              <div><strong>Level:</strong> {selectedLog.level}</div>
              {selectedLog.category && <div><strong>Category:</strong> {selectedLog.category}</div>}
              <div><strong>Message:</strong> {selectedLog.message}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default WebSocketDebugPanel