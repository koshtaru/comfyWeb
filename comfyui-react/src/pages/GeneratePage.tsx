// ============================================================================
// ComfyUI React - Generate Page (txt2img)
// ============================================================================

import React, { useState, useMemo } from 'react'
import { FileUpload, UploadProgress, ValidationResults } from '@/components/workflow'
import type { ExtractedParameters } from '@/utils/parameterExtractor'
import { MetadataDisplay } from '@/components/metadata/MetadataDisplay'
import { GenerationSettings } from '@/components/ui'
import { parseWorkflowMetadata } from '@/utils/metadataParser'
import { UploadErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastContainer } from '@/components/ui/Toast'
import { useUploadManager } from '@/hooks/useUploadManager'
import { useUploadSelectors } from '@/store/uploadStore'
import { useGeneration } from '@/hooks/useGeneration'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { applyPromptOverride, getPromptOverridePreview } from '@/utils/promptOverride'

export default function GeneratePage() {
  const uploadSelectors = useUploadSelectors()
  const [showEnhancedDisplay, setShowEnhancedDisplay] = useState(false)
  const [promptOverride, setPromptOverride] = useState('')
  const [usePromptOverride, setUsePromptOverride] = useState(false)
  
  // Generation hook
  const { state: generationState, generate, interrupt, clearError, isReady } = useGeneration()
  const { isConnected, progress, generatedImages, connect: connectWS } = useWebSocketContext()
  
  const {
    currentUpload,
    validationResult,
    extractedParameters,
    currentWorkflow,
    uploadFile,
    cancelUpload,
    retryUpload,
    updateParameter,
    pasteWorkflow,
    isProcessing,
    canCancel,
    canRetry
  } = useUploadManager({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    autoValidate: true,
    autoExtractParameters: true,
    onUploadComplete: (workflow) => {
      console.log('Upload completed:', workflow)
    },
    onError: (error) => {
      console.error('Upload error:', error)
    }
  })

  const handleFileSelect = async (file: File) => {
    await uploadFile(file)
  }

  const handleParameterChange = (nodeId: string, parameter: string, value: any) => {
    updateParameter(nodeId, parameter, value)
  }

  // Convert ExtractedParameters to GenerationSettings format
  const convertToGenerationParams = (extractedParams: ExtractedParameters) => {
    return {
      steps: extractedParams.generation.steps,
      cfgScale: extractedParams.generation.cfg,
      seed: extractedParams.generation.seed?.toString() || '',
      sampler: extractedParams.generation.sampler || 'euler',
      scheduler: extractedParams.generation.scheduler || 'simple',
      width: extractedParams.image.width,
      height: extractedParams.image.height
    }
  }

  // Handle parameter changes from GenerationSettings
  const handleGenerationParamChange = (parameter: string, value: any) => {
    if (!extractedParameters) return
    
    const nodeId = extractedParameters.generation.nodeId || ''
    handleParameterChange(nodeId, parameter, value)
  }

  // Generate enhanced metadata from current workflow
  const enhancedMetadata = useMemo(() => {
    if (!currentWorkflow) return null
    
    try {
      return parseWorkflowMetadata(currentWorkflow)
    } catch (error) {
      console.error('Failed to parse workflow metadata:', error)
      return null
    }
  }, [currentWorkflow])

  // Get prompt override preview info
  const promptPreview = useMemo(() => {
    const preview = getPromptOverridePreview(extractedParameters)
    console.log('[PromptPreview] Debug info:', {
      extractedParameters: !!extractedParameters,
      positiveNodeId: extractedParameters?.prompts?.positiveNodeId,
      canOverride: preview.canOverride,
      originalPrompt: preview.originalPrompt
    })
    return preview
  }, [extractedParameters])


  const handlePaste = async (event: React.ClipboardEvent) => {
    const pastedText = event.clipboardData.getData('text')
    if (pastedText) {
      try {
        // Check if it's JSON
        JSON.parse(pastedText)
        await pasteWorkflow(pastedText)
      } catch (error) {
        // Not JSON, ignore
      }
    }
  }

  return (
    <>
      <ToastContainer position="top-right" maxToasts={5} />
      
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_1.25fr] gap-6" onPaste={handlePaste} tabIndex={-1}>
        {/* Left Column - Workflow Controls */}
        <UploadErrorBoundary>
          <div className="comfy-panel p-6">
            <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
              Workflow Controls
            </h1>
            <p className="mb-6 text-comfy-text-secondary">
              Upload a ComfyUI workflow and configure generation parameters.
            </p>

            <div className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-comfy-text-primary">
                    Workflow Upload
                  </label>
                  
                  {uploadSelectors.isActive && (
                    <div className="flex items-center gap-2 text-sm text-comfy-text-secondary">
                      <span>Success Rate: {uploadSelectors.successRate.toFixed(1)}%</span>
                      <span>•</span>
                      <span>Processing Time: {Math.round(uploadSelectors.processingTime / 1000)}s</span>
                    </div>
                  )}
                </div>
                
                <FileUpload 
                  onFileSelect={handleFileSelect}
                  accept=".json"
                  maxSize={10 * 1024 * 1024} // 10MB
                />
                
                {currentUpload.status !== 'idle' && (
                  <div className="mt-3">
                    <UploadProgress
                      status={currentUpload.status as any}
                      progress={currentUpload.progress}
                      error={currentUpload.error}
                      fileName={currentUpload.fileName}
                    />
                    
                    {/* Enhanced controls */}
                    <div className="mt-2 flex gap-2">
                      {canCancel && (
                        <button
                          type="button"
                          className="comfy-button secondary text-xs"
                          onClick={cancelUpload}
                        >
                          Cancel
                        </button>
                      )}
                      
                      {canRetry && (
                        <button
                          type="button"
                          className="comfy-button text-xs"
                          onClick={retryUpload}
                        >
                          Retry
                        </button>
                      )}
                      
                      {uploadSelectors.isSuccess && currentWorkflow && (
                        <span className="flex items-center gap-1 text-xs text-comfy-success">
                          <svg viewBox="0 0 24 24" width="14" height="14">
                            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                          </svg>
                          Workflow loaded successfully
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {validationResult && (
                  <ValidationResults
                    result={validationResult}
                    onDismiss={() => {
                      // Handled by the upload store now
                    }}
                  />
                )}
              </div>

              {extractedParameters && (
                <UploadErrorBoundary>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-medium text-comfy-text-primary">
                        Workflow Analysis
                      </label>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-comfy-text-secondary">
                          <span className={`complexity-${extractedParameters.metadata.complexity.toLowerCase()}`}>
                            {extractedParameters.metadata.complexity}
                          </span>
                          <span>•</span>
                          <span>{extractedParameters.metadata.totalNodes} nodes</span>
                          {extractedParameters.metadata.estimatedVRAM && (
                            <>
                              <span>•</span>
                              <span>{extractedParameters.metadata.estimatedVRAM}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`text-xs px-3 py-1 rounded ${
                              showEnhancedDisplay 
                                ? 'bg-comfy-accent-orange text-white' 
                                : 'bg-comfy-bg-tertiary text-comfy-text-secondary hover:text-comfy-text-primary'
                            }`}
                            onClick={() => setShowEnhancedDisplay(!showEnhancedDisplay)}
                            title="Toggle enhanced analysis display"
                          >
                            {showEnhancedDisplay ? '📊 Enhanced' : '⚙️ Basic'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="comfy-panel p-4">
                      {showEnhancedDisplay && enhancedMetadata ? (
                        <MetadataDisplay
                          metadata={enhancedMetadata}
                          isLoading={false}
                          compact={true}
                          defaultTab="models"
                          showSearch={false}
                        />
                      ) : (
                        <GenerationSettings
                          parameters={convertToGenerationParams(extractedParameters)}
                          onParameterChange={handleGenerationParamChange}
                          readOnly={generationState.isGenerating || isProcessing}
                        />
                      )}
                    </div>
                  </div>
                </UploadErrorBoundary>
              )}


              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-comfy-text-primary">
                    Prompt Override
                  </label>
                  <div className="flex items-center gap-3">
                    {promptPreview.canOverride && (
                      <div className="text-xs text-comfy-text-secondary">
                        {usePromptOverride && promptOverride.trim() ? (
                          <span className="text-comfy-accent-orange">Override active</span>
                        ) : (
                          <span>Original: "{promptPreview.originalPrompt?.substring(0, 30)}..."</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <label className={`relative inline-flex items-center ${promptPreview.canOverride ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={usePromptOverride}
                          disabled={!promptPreview.canOverride}
                          onChange={(e) => setUsePromptOverride(e.target.checked)}
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                          usePromptOverride && promptPreview.canOverride ? 'bg-comfy-accent-orange' : 'bg-comfy-bg-tertiary'
                        }`}>
                          <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                            usePromptOverride && promptPreview.canOverride ? 'translate-x-5' : 'translate-x-0.5'
                          } mt-0.5`} />
                        </div>
                        <span className="ml-2 text-xs text-comfy-text-secondary">
                          Use Override
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                <textarea
                  className={`comfy-input h-24 ${(!usePromptOverride || !promptPreview.canOverride) ? 'opacity-50' : ''}`}
                  placeholder={
                    promptPreview.canOverride 
                      ? (usePromptOverride 
                          ? "Enter prompt to override the workflow's positive prompt... (Ctrl+V to paste workflow JSON)"
                          : "Toggle 'Use Override' to enable prompt override... (Ctrl+V to paste workflow JSON)"
                        )
                      : "Upload a workflow first to enable prompt override... (Ctrl+V to paste workflow JSON)"
                  }
                  value={promptOverride}
                  onChange={(e) => setPromptOverride(e.target.value)}
                  disabled={generationState.isGenerating || isProcessing || !usePromptOverride || !promptPreview.canOverride}
                />
                {usePromptOverride && promptOverride.trim() && promptPreview.canOverride && (
                  <div className="mt-1 text-xs text-comfy-text-secondary">
                    This will replace the positive prompt in node {promptPreview.nodeId}
                  </div>
                )}
              </div>

              {/* WebSocket Status */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm text-comfy-text-secondary">
                    WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                {!isConnected && (
                  <button
                    className="comfy-button secondary text-sm px-3 py-1"
                    onClick={() => {
                      console.log('[WebSocket] Manual connect requested')
                      connectWS()
                    }}
                  >
                    Connect WebSocket
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  className={`comfy-button flex-1 ${
                    (!isReady || isProcessing || !currentWorkflow) 
                      ? 'cursor-not-allowed opacity-50' 
                      : ''
                  }`}
                  onClick={() => {
                    console.log('[Generate Button] Clicked:', {
                      currentWorkflow: !!currentWorkflow,
                      isReady,
                      isProcessing,
                      generationState,
                      promptOverride: promptOverride.trim()
                    })
                    if (currentWorkflow && isReady) {
                      console.log('[Generate Button] Extracted parameters:', extractedParameters)
                      console.log('[Generate Button] Prompt override text:', promptOverride.trim())
                      console.log('[Generate Button] Use prompt override:', usePromptOverride)
                      
                      // Apply prompt override if enabled and provided
                      const workflowToGenerate = (usePromptOverride && promptOverride.trim()) 
                        ? applyPromptOverride(currentWorkflow, promptOverride, extractedParameters)
                        : currentWorkflow
                      
                      if (usePromptOverride && promptOverride.trim()) {
                        console.log('[Generate Button] ✅ Applied prompt override:', promptOverride.trim())
                        
                        // Validate that the override actually worked
                        if (extractedParameters?.prompts.positiveNodeId) {
                          const nodeId = extractedParameters.prompts.positiveNodeId
                          const modifiedNode = workflowToGenerate[nodeId]
                          if (modifiedNode?.inputs?.text === promptOverride.trim()) {
                            console.log('[Generate Button] ✅ Validation: Override successfully applied to workflow')
                          } else {
                            console.error('[Generate Button] ❌ Validation: Override failed to apply to workflow')
                            console.error('[Generate Button] Expected:', promptOverride.trim())
                            console.error('[Generate Button] Actual:', modifiedNode?.inputs?.text)
                          }
                        }
                      } else {
                        console.log('[Generate Button] Using original workflow prompts')
                      }
                      
                      console.log('[Generate Button] Calling generate with workflow')
                      generate(workflowToGenerate)
                    } else {
                      console.log('[Generate Button] Cannot generate:', {
                        noWorkflow: !currentWorkflow,
                        notReady: !isReady
                      })
                    }
                  }}
                  disabled={!isReady || isProcessing || !currentWorkflow}
                >
                  {generationState.isGenerating ? 'Generating...' : 'Generate'}
                </button>
                
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

              {(generationState.isGenerating || isProcessing) && (
                <div className="mt-4 rounded-md bg-comfy-bg-tertiary p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-comfy-accent-orange border-t-transparent"></div>
                    <span className="text-comfy-text-secondary">
                      {generationState.isGenerating 
                        ? (progress.currentNode 
                            ? `Executing: ${progress.currentNode}` 
                            : 'Generation in progress...'
                          )
                        : `${currentUpload.status.charAt(0).toUpperCase() + currentUpload.status.slice(1)}...`
                      }
                    </span>
                  </div>
                  
                  {/* ComfyUI Progress Bar */}
                  {generationState.isGenerating && progress.maxProgress > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-comfy-bg-secondary rounded-full h-2">
                        <div 
                          className="bg-comfy-accent-orange h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((progress.progress / progress.maxProgress) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-comfy-text-secondary">
                        {progress.progress} / {progress.maxProgress} steps
                        {progress.queueRemaining > 0 && ` • ${progress.queueRemaining} in queue`}
                      </div>
                    </div>
                  )}
                  
                  {/* Upload Progress Bar */}
                  {isProcessing && currentUpload.progress > 0 && currentUpload.progress < 100 && (
                    <div className="mt-2">
                      <div className="w-full bg-comfy-bg-secondary rounded-full h-2">
                        <div 
                          className="bg-comfy-accent-orange h-2 rounded-full transition-all duration-300"
                          style={{ width: `${currentUpload.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Generation Error Display */}
              {generationState.error && (
                <div className="mt-4 rounded-md bg-red-900/20 border border-red-500/30 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="text-red-400">⚠️</div>
                      <div>
                        <h4 className="text-sm font-medium text-red-400">Generation Failed</h4>
                        <p className="mt-1 text-sm text-red-300">{generationState.error}</p>
                      </div>
                    </div>
                    <button
                      onClick={clearError}
                      className="text-red-400 hover:text-red-300"
                      title="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {/* Connection Status */}
              {!isConnected && (
                <div className="mt-4 rounded-md bg-yellow-900/20 border border-yellow-500/30 p-4">
                  <div className="flex items-center space-x-3">
                    <div className="text-yellow-400">⚠️</div>
                    <span className="text-sm text-yellow-300">
                      Not connected to ComfyUI server. Please check your connection.
                    </span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </UploadErrorBoundary>

        {/* Right Column - Generated Images Display */}
        <div className="comfy-panel p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-comfy-text-primary">
              Generated Images
            </h2>
            {/* Debug info - smaller on right column */}
            <div className="text-xs text-comfy-text-secondary">
              ({generatedImages?.length || 0})
            </div>
          </div>
          
          {generatedImages && generatedImages.length > 0 ? (
            <div className="space-y-4">
              {generatedImages.slice(0, 6).map((image, index) => (
                <div key={`${image.promptId}-${image.nodeId}-${index}`} className="border border-comfy-border rounded-lg p-3">
                  <div className="mb-2">
                    <img
                      src={image.url}
                      alt={`Generated image ${index + 1}`}
                      className="w-full rounded-md"
                      style={{ maxHeight: '350px', objectFit: 'contain' }}
                      onLoad={() => console.log(`🖼️ Image ${index + 1} loaded successfully:`, image.url)}
                      onError={() => console.error(`🖼️ Failed to load image ${index + 1}:`, image.url)}
                    />
                  </div>
                  <div className="text-xs text-comfy-text-secondary space-y-1">
                    <div>Node: {image.nodeId}</div>
                    <div>Type: {image.imageType}</div>
                    <div>Time: {new Date(image.timestamp).toLocaleTimeString()}</div>
                    <div>URL: <a href={image.url} target="_blank" rel="noopener noreferrer" className="text-comfy-accent-orange hover:underline">View</a></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center text-comfy-text-secondary border-2 border-dashed border-comfy-border rounded-lg">
              <div className="text-3xl mb-2">📷</div>
              <div className="text-sm mb-1">
                {progress.isGenerating ? 'Generating images...' : 'No images generated yet'}
              </div>
              <div className="text-xs">
                Upload a workflow and click Generate to see results here
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
