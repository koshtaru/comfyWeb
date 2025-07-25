import React, { useState } from 'react'
import { 
  Layout, 
  LayoutHeader, 
  LayoutMain, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Badge, 
  Alert, 
  AlertTitle, 
  AlertDescription,
  Grid,
  Flex,
  Divider
} from '@/components/ui'
import { ConnectionStatus } from '@/components/websocket/ConnectionStatus'
import { WebSocketDebugPanel } from '@/components/websocket/WebSocketDebugPanel'
import { useWebSocketContext, useConnectionStatus } from '@/contexts/WebSocketContext'
import { useAPIStore } from '@/store/apiStore'


export const WebSocketTestPage: React.FC = () => {
  const { 
    connect, 
    disconnect, 
    reconnect, 
    connectionState, 
    health,
    connectionStats 
  } = useWebSocketContext()
  
  const { 
    isConnected, 
    isReconnecting, 
    lastError 
  } = useConnectionStatus()
  
  const { 
    endpoint, 
    testConnection, 
    setEndpoint,
    connectionError 
  } = useAPIStore()

  // State for testing
  const [customEndpoint, setCustomEndpoint] = useState(endpoint)
  const [isTestingAPI, setIsTestingAPI] = useState(false)

  // Test API connection
  const handleTestAPI = async () => {
    setIsTestingAPI(true)
    
    try {
      await testConnection()
      // Results are automatically logged in the debug panel
    } catch (error) {
      console.error('API test error:', error)
    } finally {
      setIsTestingAPI(false)
    }
  }

  // Update endpoint
  const handleUpdateEndpoint = () => {
    setEndpoint(customEndpoint)
  }

  // WebSocket controls (these automatically trigger debug logs)
  const handleConnect = async () => {
    console.log('Connect button clicked')
    try {
      await connect()
      console.log('Connect function completed')
    } catch (error) {
      console.error('Connect function failed:', error)
    }
  }
  const handleDisconnect = () => {
    console.log('Disconnect button clicked')
    disconnect()
  }
  const handleReconnect = async () => {
    console.log('Reconnect button clicked')
    try {
      await reconnect()
      console.log('Reconnect function completed')
    } catch (error) {
      console.error('Reconnect function failed:', error)
    }
  }

  // Get status color
  const getStatusColor = (state: string) => {
    switch (state) {
      case 'connected': return 'success'
      case 'connecting': 
      case 'reconnecting': return 'warning'
      case 'disconnected': return 'secondary'
      case 'error': return 'error'
      default: return 'secondary'
    }
  }

  return (
    <Layout variant="default">
      <LayoutHeader>
        <Flex justify="between" align="center">
          <h1 className="text-xl font-bold text-comfy-text-primary">
            WebSocket Connection Testing
          </h1>
          <Badge variant={getStatusColor(connectionState) as any}>
            {connectionState.toUpperCase()}
          </Badge>
        </Flex>
      </LayoutHeader>

      <LayoutMain padding="md">
        <Grid cols="1" gap="lg" className="max-w-7xl mx-auto">
          
          {/* Connection Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ConnectionStatus showDetails compact={false} />
              
              {lastError && (
                <Alert variant="error" className="mt-4">
                  <AlertTitle>Connection Error</AlertTitle>
                  <AlertDescription>{lastError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Server Configuration */}
          <Grid cols="2" gap="md" responsive={{ sm: '1', md: '2' }}>
            <Card>
              <CardHeader>
                <CardTitle>Server Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-comfy-text-primary mb-2">
                      API Endpoint
                    </label>
                    <Input
                      value={customEndpoint}
                      onChange={(value) => setCustomEndpoint(value)}
                      placeholder="http://192.168.1.15:8188"
                      className="mb-2"
                    />
                    <Flex gap="sm">
                      <Button 
                        onClick={handleUpdateEndpoint}
                        variant="secondary"
                        size="sm"
                      >
                        Update Endpoint
                      </Button>
                      <Button 
                        onClick={handleTestAPI}
                        variant="primary"
                        size="sm"
                        loading={isTestingAPI}
                      >
                        Test API
                      </Button>
                    </Flex>
                  </div>

                  {connectionError && (
                    <Alert variant="error">
                      <AlertDescription>{connectionError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>WebSocket Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Flex gap="sm" wrap="wrap">
                    <Button 
                      onClick={handleConnect}
                      variant="primary"
                      size="sm"
                      disabled={isConnected}
                    >
                      Connect
                    </Button>
                    <Button 
                      onClick={handleDisconnect}
                      variant="secondary"
                      size="sm"
                      disabled={!isConnected}
                    >
                      Disconnect
                    </Button>
                    <Button 
                      onClick={handleReconnect}
                      variant="ghost"
                      size="sm"
                      loading={isReconnecting}
                    >
                      Reconnect
                    </Button>
                  </Flex>

                  <div className="text-sm text-comfy-text-secondary">
                    <div>WebSocket URL: <code className="text-comfy-accent-orange">
                      {endpoint.replace('http', 'ws')}/ws
                    </code></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>

          {/* Connection Health Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Connection Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Grid cols="4" gap="md" responsive={{ sm: '2', md: '4' }}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-comfy-text-primary">
                    {health.latency ? `${health.latency}ms` : 'N/A'}
                  </div>
                  <div className="text-sm text-comfy-text-secondary">Latency</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-comfy-text-primary">
                    {Math.floor(health.uptime / 1000)}s
                  </div>
                  <div className="text-sm text-comfy-text-secondary">Uptime</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-comfy-text-primary">
                    {health.reconnectCount}
                  </div>
                  <div className="text-sm text-comfy-text-secondary">Reconnects</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-comfy-text-primary">
                    {health.messageRate.toFixed(1)}/s
                  </div>
                  <div className="text-sm text-comfy-text-secondary">Msg Rate</div>
                </div>
              </Grid>

              <Divider className="my-4" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-comfy-text-secondary">Health Status:</span>
                  <Badge 
                    variant={health.isHealthy ? 'success' : 'error'} 
                    className="ml-2"
                  >
                    {health.isHealthy ? 'Healthy' : 'Unhealthy'}
                  </Badge>
                </div>
                <div>
                  <span className="text-comfy-text-secondary">Total Messages:</span>
                  <span className="ml-2 text-comfy-text-primary">
                    {connectionStats.totalMessages}
                  </span>
                </div>
                <div>
                  <span className="text-comfy-text-secondary">Total Connections:</span>
                  <span className="ml-2 text-comfy-text-primary">
                    {connectionStats.totalConnections}
                  </span>
                </div>
                <div>
                  <span className="text-comfy-text-secondary">Avg Latency:</span>
                  <span className="ml-2 text-comfy-text-primary">
                    {connectionStats.averageLatency.toFixed(1)}ms
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Debug Panel */}
          <WebSocketDebugPanel maxLogs={200} />

        </Grid>
      </LayoutMain>
    </Layout>
  )
}

export default WebSocketTestPage