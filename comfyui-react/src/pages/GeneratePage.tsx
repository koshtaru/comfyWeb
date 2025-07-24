// ============================================================================
// ComfyUI React - Generate Page (txt2img)
// ============================================================================

import React, { useState, useMemo } from 'react'
import { useAppStore } from '@/store'
import { FileUpload, UploadProgress, ValidationResults, ParameterDisplay } from '@/components/workflow'
import { MetadataDisplay } from '@/components/metadata/MetadataDisplay'
import { parseWorkflowMetadata } from '@/utils/metadataParser'
import { UploadErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastContainer } from '@/components/ui/Toast'
import { useUploadManager } from '@/hooks/useUploadManager'
import { useUploadSelectors } from '@/store/uploadStore'

export default function GeneratePage() {
  const { isGenerating, setIsGenerating } = useAppStore()
  const uploadSelectors = useUploadSelectors()
  const [showEnhancedDisplay, setShowEnhancedDisplay] = useState(false)
  
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
      
      <div className="space-y-6" onPaste={handlePaste} tabIndex={-1}>
        <UploadErrorBoundary>
          <div className="comfy-panel p-6">
            <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
              Generate Images
            </h1>
            <p className="mb-6 text-comfy-text-secondary">
              Create images using ComfyUI workflows. Upload a workflow JSON file,
              paste JSON content, or configure parameters manually.
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
                        <ParameterDisplay
                          parameters={extractedParameters}
                          onParameterChange={handleParameterChange}
                          readOnly={isGenerating || isProcessing}
                        />
                      )}
                    </div>
                  </div>
                </UploadErrorBoundary>
              )}


              <div>
                <label className="mb-2 block text-sm font-medium text-comfy-text-primary">
                  Additional Prompt
                </label>
                <textarea
                  className="comfy-input h-24"
                  placeholder="Enter additional prompt here... (Ctrl+V to paste workflow JSON)"
                  disabled={isGenerating || isProcessing}
                />
              </div>

              <div className="flex gap-3">
                <button
                  className={`comfy-button flex-1 ${
                    (isGenerating || isProcessing || !currentWorkflow) 
                      ? 'cursor-not-allowed opacity-50' 
                      : ''
                  }`}
                  onClick={() => setIsGenerating(!isGenerating)}
                  disabled={isGenerating || isProcessing || !currentWorkflow}
                >
                  {isGenerating ? 'Generating...' : 'Generate'}
                </button>
                
              </div>

              {(isGenerating || isProcessing) && (
                <div className="mt-4 rounded-md bg-comfy-bg-tertiary p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-comfy-accent-orange border-t-transparent"></div>
                    <span className="text-comfy-text-secondary">
                      {isGenerating 
                        ? 'Generation in progress...' 
                        : `${currentUpload.status.charAt(0).toUpperCase() + currentUpload.status.slice(1)}...`
                      }
                    </span>
                  </div>
                  
                  {currentUpload.progress > 0 && currentUpload.progress < 100 && (
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
            </div>
          </div>
        </UploadErrorBoundary>
      </div>
    </>
  )
}
