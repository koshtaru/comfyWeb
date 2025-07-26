// ============================================================================
// ComfyUI React - Generate Page (txt2img)
// ============================================================================

import React, { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FileUpload, UploadProgress } from '@/components/workflow'
import type { ExtractedParameters } from '@/utils/parameterExtractor'
import { MetadataDisplay } from '@/components/metadata/MetadataDisplay'
import { GenerationSettings } from '@/components/ui'
import { parseWorkflowMetadata } from '@/utils/metadataParser'
import { UploadErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastContainer } from '@/components/ui/Toast'
import { useUploadManager } from '@/hooks/useUploadManager'
import { useUploadSelectors, useUploadStore } from '@/store/uploadStore'
import { useGeneration } from '@/hooks/useGeneration'
import { useWebSocketContext } from '@/contexts/WebSocketContext'
import { getPromptOverridePreview } from '@/utils/promptOverride'
import { usePromptStore } from '@/store/promptStore'
import { usePresetStore } from '@/store/presetStore'
import { PresetSaveDialog } from '@/components/presets/PresetSaveDialog'
import type { IPreset } from '@/types/preset'

export default function GeneratePage() {
  const location = useLocation()
  const uploadSelectors = useUploadSelectors()
  const { setCurrentWorkflow, setExtractedParameters, resetCurrentUpload } = useUploadStore()
  const [showEnhancedDisplay, setShowEnhancedDisplay] = useState(false)
  const [showSavePresetDialog, setShowSavePresetDialog] = useState(false)
  const [savingPreset, setSavingPreset] = useState(false)
  
  // Prompt override state from store
  const { promptOverride, usePromptOverride, setPromptOverride, setUsePromptOverride } = usePromptStore()
  
  // Preset store methods
  const { presets, loadPresets, createPreset, activePreset, setActivePreset } = usePresetStore()
  const [showPresetSelector, setShowPresetSelector] = useState(false)
  const [workflowQueue, setWorkflowQueue] = useState<Array<{
    id: string
    name: string
    preset: any
    status: 'pending' | 'processing' | 'completed' | 'failed'
    addedAt: Date
  }>>([])
  const [showQueue, setShowQueue] = useState(false)
  
  // Generation hook (only need clearError since generate/interrupt moved to header)
  const { state: generationState, clearError } = useGeneration()
  const { isConnected, progress, generatedImages } = useWebSocketContext()
  
  const {
    currentUpload,
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

  // Load presets on component mount
  useEffect(() => {
    loadPresets()
  }, [loadPresets])

  const handleFileSelect = async (file: File) => {
    await uploadFile(file)
  }

  const handleLoadPreset = async (preset: IPreset) => {
    try {
      // Directly set the workflow data without JSON conversion
      setCurrentWorkflow(preset.workflowData)
      
      // Try to extract parameters from the workflow using parameter extractor directly
      try {
        const parameterExtractor = await import('@/utils/parameterExtractor')
        const extractor = new parameterExtractor.ParameterExtractor(preset.workflowData)
        const parsedMetadata = extractor.extract()
        if (parsedMetadata) {
          setExtractedParameters(parsedMetadata)
        }
      } catch (extractorError) {
        // Fallback to preset metadata if available
        if (preset.metadata) {
          const extractedParams = {
            generation: preset.metadata.generation,
            model: preset.metadata.model,
            image: preset.metadata.dimensions,
            prompts: preset.metadata.prompts || { positive: '', negative: '', positiveNodeId: null, negativeNodeId: null },
            timing: preset.metadata.timingEstimate ? { duration: preset.metadata.timingEstimate.estimatedSeconds } : { duration: 0 }
          }
          setExtractedParameters(extractedParams)
        }
      }
      
      setShowPresetSelector(false)
    } catch (error) {
      console.error('Failed to load preset:', error)
    }
  }

  // Direct preset loading without using upload manager
  const loadPresetDirect = async (preset: IPreset) => {
    try {
      // Reset any existing upload state first
      resetCurrentUpload()
      
      // Set the workflow directly in the store
      setCurrentWorkflow(preset.workflowData)
      
      // Extract parameters using ParameterExtractor to get the latest prompt data
      try {
        const parameterExtractor = await import('@/utils/parameterExtractor')
        const extractor = new parameterExtractor.ParameterExtractor(preset.workflowData)
        const parsedMetadata = extractor.extract()
        if (parsedMetadata) {
          setExtractedParameters(parsedMetadata)
        }
      } catch (extractorError) {
        // Fallback to preset metadata if available
        if (preset.metadata) {
          const extractedParams = {
            generation: preset.metadata.generation,
            model: preset.metadata.model,
            image: preset.metadata.dimensions,
            prompts: preset.metadata.prompts || { positive: '', negative: '', positiveNodeId: null, negativeNodeId: null },
            timing: preset.metadata.timingEstimate ? { duration: preset.metadata.timingEstimate.estimatedSeconds } : { duration: 0 }
          }
          setExtractedParameters(extractedParams)
        }
      }
      
      setShowPresetSelector(false)
    } catch (error) {
      console.error('Failed to load preset:', error)
      // Make sure we're not stuck in loading state
      resetCurrentUpload()
    }
  }

  // Handle navigation from preset page (apply button)
  useEffect(() => {
    type NavigationState = {
      presetToLoad?: IPreset
      source?: string
    }
    
    const navigationState = location.state as NavigationState | null
    
    if (navigationState?.presetToLoad && navigationState?.source === 'presets-page') {
      
      // Use setTimeout to ensure this runs after the component has mounted
      setTimeout(async () => {
        await loadPresetDirect(navigationState.presetToLoad)
        // Clear navigation state to prevent re-loading on refresh
        window.history.replaceState({}, document.title)
      }, 100)
    }
  }, []) // Empty dependency array - only run once on mount

  // Queue management functions
  const addToQueue = (preset: IPreset, name?: string) => {
    const queueItem = {
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || preset.name || 'Unnamed Workflow',
      preset,
      status: 'pending' as const,
      addedAt: new Date()
    }
    
    setWorkflowQueue(prev => [...prev, queueItem])
    setShowQueue(true)
  }

  const removeFromQueue = (id: string) => {
    setWorkflowQueue(prev => prev.filter(item => item.id !== id))
  }

  const processNextInQueue = async () => {
    const nextItem = workflowQueue.find(item => item.status === 'pending')
    if (!nextItem) return

    // Mark as processing
    setWorkflowQueue(prev => prev.map(item => 
      item.id === nextItem.id 
        ? { ...item, status: 'processing' as const }
        : item
    ))

    try {
      await handleLoadPreset(nextItem.preset)
      
      // Mark as completed
      setWorkflowQueue(prev => prev.map(item => 
        item.id === nextItem.id 
          ? { ...item, status: 'completed' as const }
          : item
      ))
    } catch (error) {
      console.error('Failed to process queue item:', error)
      
      // Mark as failed
      setWorkflowQueue(prev => prev.map(item => 
        item.id === nextItem.id 
          ? { ...item, status: 'failed' as const }
          : item
      ))
    }
  }

  const clearQueue = () => {
    setWorkflowQueue([])
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

  // Convert current workflow to preset format
  const convertWorkflowToPreset = (name: string) => {
    if (!currentWorkflow || !extractedParameters) {
      throw new Error('No workflow loaded')
    }

    return {
      name: name.trim(),
      workflowData: currentWorkflow,
      metadata: {
        model: {
          name: extractedParameters.model.name || 'Unknown Model',
          architecture: extractedParameters.model.architecture || 'SD1.5',
          hash: extractedParameters.model.hash
        },
        generation: {
          steps: extractedParameters.generation.steps || 20,
          cfg: extractedParameters.generation.cfg || 7,
          sampler: extractedParameters.generation.sampler || 'euler',
          scheduler: extractedParameters.generation.scheduler || 'normal',
          seed: extractedParameters.generation.seed || -1
        },
        dimensions: {
          width: extractedParameters.image.width || 512,
          height: extractedParameters.image.height || 512,
          batchSize: extractedParameters.image.batchSize || 1
        },
        prompts: {
          positive: usePromptOverride && promptOverride.trim() 
            ? promptOverride 
            : extractedParameters.prompts.positive || '',
          negative: extractedParameters.prompts.negative || ''
        },
        timingEstimate: {
          estimatedSeconds: extractedParameters.metadata.estimatedVRAM 
            ? parseInt(extractedParameters.metadata.estimatedVRAM.replace(/[^\d]/g, '')) * 2 
            : 30
        }
      },
      category: 'custom' as const,
      tags: [
        'saved-from-txt2img',
        extractedParameters.metadata.complexity?.toLowerCase() || 'medium',
        extractedParameters.model.architecture?.toLowerCase() || 'sd15'
      ]
    }
  }

  // Handle save as preset
  const handleSaveAsPreset = async (presetName: string) => {
    if (!presetName.trim()) return false

    setSavingPreset(true)
    try {
      const presetData = convertWorkflowToPreset(presetName)
      const success = await createPreset(presetData)
      
      if (success) {
        setShowSavePresetDialog(false)
        // Could add a toast notification here
      }
      
      return success
    } catch (error) {
      console.error('Failed to save preset:', error)
      return false
    } finally {
      setSavingPreset(false)
    }
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
    return getPromptOverridePreview(extractedParameters)
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
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-comfy-success">
                            <svg viewBox="0 0 24 24" width="14" height="14">
                              <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                            </svg>
                            Workflow loaded successfully
                          </span>
                          <button
                            type="button"
                            className="comfy-button text-xs"
                            onClick={() => setShowSavePresetDialog(true)}
                            disabled={savingPreset}
                            title="Save current workflow as a preset"
                          >
                            {savingPreset ? '💾 Saving...' : '💾 Save as Preset'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>

              {/* Preset Selector */}
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium text-comfy-text-primary">
                    Load Preset
                  </label>
                  <button
                    type="button"
                    className="text-xs text-comfy-text-secondary hover:text-comfy-text-primary"
                    onClick={() => setShowPresetSelector(!showPresetSelector)}
                  >
                    {showPresetSelector ? 'Hide' : 'Show'} ({presets.length} available)
                  </button>
                </div>

                {showPresetSelector && (
                  <div className="comfy-panel p-3 max-h-48 overflow-y-auto">
                    {presets.length === 0 ? (
                      <div className="text-sm text-comfy-text-secondary text-center py-4">
                        No presets saved yet. Upload a workflow and save it as a preset!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {presets.slice(0, 10).map(preset => (
                          <div
                            key={preset.id}
                            className="flex items-center justify-between p-2 border border-comfy-border rounded hover:bg-comfy-bg-tertiary"
                          >
                            <div className="flex-1 min-w-0" onClick={() => loadPresetDirect(preset).catch(console.error)} style={{ cursor: 'pointer' }}>
                              <div className="text-sm font-medium text-comfy-text-primary truncate">
                                {preset.name}
                              </div>
                              <div className="text-xs text-comfy-text-secondary truncate">
                                {preset.metadata?.model?.name || 'Unknown model'} • {preset.category}
                                {preset.tags && preset.tags.length > 0 && (
                                  <span className="ml-1">
                                    {preset.tags.slice(0, 2).map(tag => (
                                      <span key={tag} className="inline-block bg-comfy-bg-tertiary px-1 rounded text-xs ml-1">
                                        {tag}
                                      </span>
                                    ))}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <button
                                className="text-xs px-2 py-1 bg-comfy-accent-blue text-white rounded hover:bg-opacity-80"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToQueue(preset)
                                }}
                                title="Add to queue"
                              >
                                📋
                              </button>
                              <div className="text-xs text-comfy-text-secondary">
                                {new Date(preset.lastModified).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        {presets.length > 10 && (
                          <div className="text-xs text-comfy-text-secondary text-center pt-2 border-t border-comfy-border">
                            Showing first 10 presets • <a href="/presets" className="text-comfy-accent-orange hover:underline">View all in Preset Manager</a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Workflow Queue */}
              {workflowQueue.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-comfy-text-primary">
                      Workflow Queue ({workflowQueue.length})
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-xs px-2 py-1 bg-comfy-accent-orange text-white rounded hover:bg-opacity-80"
                        onClick={processNextInQueue}
                        disabled={!workflowQueue.find(item => item.status === 'pending')}
                      >
                        Process Next
                      </button>
                      <button
                        type="button"
                        className="text-xs text-comfy-text-secondary hover:text-comfy-text-primary"
                        onClick={() => setShowQueue(!showQueue)}
                      >
                        {showQueue ? 'Hide' : 'Show'} Queue
                      </button>
                      <button
                        type="button"
                        className="text-xs text-red-400 hover:text-red-300"
                        onClick={clearQueue}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {showQueue && (
                    <div className="comfy-panel p-3 max-h-32 overflow-y-auto">
                      <div className="space-y-1">
                        {workflowQueue.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-2 border rounded ${
                              item.status === 'pending' ? 'border-comfy-border' :
                              item.status === 'processing' ? 'border-comfy-accent-orange bg-comfy-accent-orange bg-opacity-10' :
                              item.status === 'completed' ? 'border-comfy-success bg-comfy-success bg-opacity-10' :
                              'border-red-500 bg-red-500 bg-opacity-10'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-comfy-text-primary truncate">
                                {item.name}
                              </div>
                              <div className="text-xs text-comfy-text-secondary">
                                Added: {item.addedAt.toLocaleTimeString()} • Status: {item.status}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <div className="text-xs">
                                {item.status === 'pending' && '⏳'}
                                {item.status === 'processing' && '🔄'}
                                {item.status === 'completed' && '✅'}
                                {item.status === 'failed' && '❌'}
                              </div>
                              <button
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={() => removeFromQueue(item.id)}
                                title="Remove from queue"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                        <pre className="mt-1 text-sm text-red-300 whitespace-pre-wrap font-mono">{generationState.error}</pre>
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

      {/* Save as Preset Dialog */}
      {showSavePresetDialog && currentWorkflow && extractedParameters && (
        <PresetSaveDialog
          onSave={async (presetData) => {
            const success = await createPreset(presetData)
            if (success) {
              setShowSavePresetDialog(false)
            }
          }}
          onClose={() => setShowSavePresetDialog(false)}
          initialData={{
            name: `Workflow ${new Date().toLocaleDateString()}`,
            category: 'custom',
            tags: [
              'saved-from-txt2img',
              extractedParameters.metadata.complexity?.toLowerCase() || 'medium',
              extractedParameters.model.architecture?.toLowerCase() || 'sd15'
            ]
          }}
          workflowData={currentWorkflow}
        />
      )}
    </>
  )
}
