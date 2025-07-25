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
  const { currentWorkflow, extractedParameters, currentUpload } = useUploadStore()
  const { promptOverride, usePromptOverride } = usePromptStore()
  
  // Check if processing
  const isProcessing = currentUpload.status !== 'idle' && currentUpload.status !== 'complete'

  return (
    <header className="relative border-b border-comfy-border bg-comfy-bg-secondary">
      {/* Absolute Far Left - WebSocket Button and Generate Button */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 flex items-center space-x-3">
        <button
          className={`transition-colors duration-200 ${
            wsConnected
              ? 'comfy-button text-white'
              : 'comfy-button secondary'
          }`}
          style={wsConnected ? {
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            width: '100px'
          } : {
            width: '100px'
          }}
          onClick={() => {
            if (!wsConnected && !isReconnecting && connectionState !== 'connecting') {
              console.log('[Navigation] WebSocket connect requested')
              connectWS()
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

        {/* Generate Button */}
        <button
          className={`comfy-button ${
            (!isReady || isProcessing || !currentWorkflow) 
              ? 'cursor-not-allowed opacity-50' 
              : ''
          }`}
          onClick={() => {
            if (currentWorkflow && isReady) {
              console.log('[Navigation Generate] Starting generation', {
                promptOverride: promptOverride.trim(),
                usePromptOverride,
                extractedParameters: !!extractedParameters
              })
              
              // Apply prompt override if enabled and provided
              const workflowToGenerate = (usePromptOverride && promptOverride.trim()) 
                ? applyPromptOverride(currentWorkflow, promptOverride, extractedParameters)
                : currentWorkflow
              
              if (usePromptOverride && promptOverride.trim()) {
                console.log('[Navigation Generate] ✅ Applied prompt override:', promptOverride.trim())
              } else {
                console.log('[Navigation Generate] Using original workflow prompts')
              }
              
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
            className="comfy-button secondary"
            onClick={interrupt}
            title="Cancel generation"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Absolute Far Right - ComfyUI React Title */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
        <Link
          to="/"
          className="text-xl font-bold text-comfy-accent-orange transition-colors hover:text-comfy-accent-blue"
        >
          ComfyUI React
        </Link>
      </div>

      <div className="container mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-center">
          {/* Center - Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            {TAB_CONFIG.map(tab => {
              const isActive = location.pathname === tab.path

              return (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={`rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-comfy-accent-orange text-comfy-text-primary shadow-comfy'
                      : 'text-comfy-text-secondary hover:bg-comfy-bg-tertiary hover:text-comfy-text-primary'
                  } `}
                >
                  <span className="flex items-center space-x-2">
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.name}</span>
                  </span>
                </Link>
              )
            })}
          </nav>
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
