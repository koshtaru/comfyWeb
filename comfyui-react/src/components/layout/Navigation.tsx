// ============================================================================
// ComfyUI React - Navigation Component
// ============================================================================

import { Link, useLocation } from 'react-router-dom'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { TAB_CONFIG } from '@/constants/routes'
import { useGeneration } from '@/hooks/useGeneration'
import { useUploadStore } from '@/store/uploadStore'
import { usePromptStore } from '@/store/promptStore'
import { applyPromptOverride } from '@/utils/promptOverride'
import { ProgressToast } from '@/components/ui'
import AlertNotificationIconSimple from '@/components/ui/AlertNotificationIconSimple'

export default function Navigation() {
  const location = useLocation()
  const { 
    isConnected: wsConnected, 
    connectionState, 
    isReconnecting,
    connect: connectWS,
    progress
  } = useWebSocketContext()
  
  // Generation functionality
  const { state: generationState, generate, interrupt, isReady } = useGeneration()
  const { 
    currentWorkflow, 
    extractedParameters, 
    currentUpload, 
    validationResult,
    notificationState,
    setNotificationDropdownOpen,
    markValidationIssuesAsRead
  } = useUploadStore()
  const { promptOverride, usePromptOverride } = usePromptStore()
  
  // Check if processing
  const isProcessing = currentUpload.status !== 'idle' && currentUpload.status !== 'complete'
  
  // Validation notification state
  const hasValidationErrors = validationResult?.errors && validationResult.errors.length > 0
  const hasValidationWarnings = validationResult?.warnings && validationResult.warnings.length > 0
  const actionableWarnings = validationResult?.warnings.filter(warning => 
    !(warning.type === 'schema' && warning.message.startsWith('Unknown node type:'))
  ) || []
  
  const errorCount = validationResult?.errors.length || 0
  const warningCount = actionableWarnings.length || 0

  return (
    <header className="relative border-b border-comfy-border bg-comfy-bg-secondary">
      {/* Desktop Layout - Simplified */}
      <div className="container mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-[1fr_2fr_1fr] h-16 items-center gap-4">
          {/* Left Column - Action Buttons */}
          <div className="flex items-center justify-start">
            <div className="flex items-center space-x-3 bg-comfy-bg-tertiary/30 px-4 py-2 rounded-lg border border-comfy-border/20">
            <button 
              className={`comfy-button text-sm ${
                wsConnected ? 'bg-green-600 hover:bg-green-500' : ''
              }`}
              onClick={() => {
                console.log('[Navigation] Connect button clicked', {
                  wsConnected,
                  isReconnecting,
                  connectionState
                })
                
                if (!wsConnected && !isReconnecting && connectionState !== 'connecting') {
                  console.log('[Navigation] Attempting WebSocket connection...')
                  try {
                    connectWS()
                  } catch (error) {
                    console.error('[Navigation] WebSocket connection error:', error)
                  }
                } else {
                  console.log('[Navigation] Connection skipped - already connected or connecting')
                }
              }}
              disabled={wsConnected || isReconnecting || connectionState === 'connecting'}
              title={wsConnected ? 'WebSocket Connected' : 'Connect to ComfyUI WebSocket'}
            >
              {wsConnected 
                ? 'Connected' 
                : isReconnecting 
                  ? 'Reconnecting...'
                  : connectionState === 'connecting'
                    ? 'Connecting...'
                    : 'Connect'
              }
            </button>
            <button 
              className={`comfy-button text-sm font-semibold shadow-md ${
                (!isReady || isProcessing || !currentWorkflow) 
                  ? 'cursor-not-allowed opacity-50' 
                  : 'ring-2 ring-comfy-accent-orange/20'
              }`}
              onClick={() => {
                if (currentWorkflow && isReady) {
                  // Apply prompt override if enabled and provided
                  const workflowToGenerate = (usePromptOverride && promptOverride.trim()) 
                    ? applyPromptOverride(currentWorkflow, promptOverride, extractedParameters)
                    : currentWorkflow
                  
                  generate(workflowToGenerate)
                }
              }}
              disabled={!isReady || isProcessing || !currentWorkflow}
              title={!currentWorkflow ? 'Upload a workflow first' : 'Generate images'}
            >
              {generationState.isGenerating ? 'Generating...' : 'Generate'}
            </button>
            {/* Cancel Button (when generating) */}
            {generationState.isGenerating && (
              <button
                className="comfy-button secondary text-sm"
                onClick={interrupt}
                title="Cancel generation"
              >
                Cancel
              </button>
            )}
            </div>
          </div>

          {/* Center Column - Navigation Tabs */}
          <div className="flex items-center justify-center">
            <nav className="flex items-center space-x-1 bg-comfy-bg-primary px-3 py-2 rounded-lg border border-comfy-border/40 w-full justify-center">
              {TAB_CONFIG.map(tab => (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                    location.pathname === tab.path
                      ? 'bg-comfy-accent-orange text-comfy-text-primary shadow-sm'
                      : 'text-comfy-text-secondary hover:bg-comfy-bg-tertiary/50 hover:text-comfy-text-primary'
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    <span className="text-sm">{tab.icon}</span>
                    <span>{tab.name}</span>
                  </span>
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Column - Utility Section */}
          <div className="flex items-center justify-end space-x-4">
            <AlertNotificationIconSimple
              hasErrors={!!hasValidationErrors}
              hasWarnings={!!hasValidationWarnings}
              errorCount={errorCount}
              warningCount={warningCount}
              isOpen={notificationState.isNotificationDropdownOpen}
              onToggle={() => {
                const newState = !notificationState.isNotificationDropdownOpen
                setNotificationDropdownOpen(newState)
                if (newState && notificationState.hasUnreadValidationIssues) {
                  markValidationIssuesAsRead()
                }
              }}
            />
            <Link
              to="/"
              className="text-xl font-bold text-comfy-accent-orange transition-colors hover:text-comfy-accent-blue"
            >
              ComfyUI React
            </Link>
          </div>
        </div>
      </div>


      {/* Floating Progress Toast */}
      <ProgressToast
        isVisible={generationState.isGenerating}
        progress={progress.progress || 0}
        maxProgress={progress.maxProgress || 100}
        currentNode={progress.currentNode || undefined}
        onDismiss={() => {
          // Toast dismissed - could add user preference to remember this
          console.log('[ProgressToast] User dismissed progress toast')
        }}
        autoHideDelay={3000}
      />
    </header>
  )
}
