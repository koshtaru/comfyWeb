// ============================================================================
// ComfyUI React - Generate Page (txt2img)
// ============================================================================

import { useState } from 'react'
import { useAppStore } from '@/store'
import { FileUpload, UploadProgress } from '@/components/workflow'

export default function GeneratePage() {
  const { isGenerating, setIsGenerating, setCurrentWorkflow } = useAppStore()
  const [uploadStatus, setUploadStatus] = useState<{
    status: 'uploading' | 'processing' | 'complete' | 'error' | null
    progress: number
    error?: string
    fileName?: string
  }>({ status: null, progress: 0 })

  const handleFileSelect = async (file: File) => {
    setUploadStatus({ 
      status: 'uploading', 
      progress: 0,
      fileName: file.name
    })
    
    try {
      // Read file content
      const reader = new FileReader()
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setUploadStatus(prev => ({ ...prev, progress }))
        }
      }
      
      reader.onload = async (event) => {
        setUploadStatus(prev => ({ ...prev, status: 'processing', progress: 100 }))
        
        try {
          const content = event.target?.result as string
          const workflow = JSON.parse(content)
          
          // TODO: Validate workflow structure
          setCurrentWorkflow(workflow)
          setUploadStatus(prev => ({ ...prev, status: 'complete' }))
          
          // Clear status after 3 seconds
          setTimeout(() => {
            setUploadStatus({ status: null, progress: 0 })
          }, 3000)
        } catch (error) {
          setUploadStatus({
            status: 'error',
            progress: 100,
            error: 'Invalid JSON format',
            fileName: file.name
          })
        }
      }
      
      reader.onerror = () => {
        setUploadStatus({
          status: 'error',
          progress: 0,
          error: 'Failed to read file',
          fileName: file.name
        })
      }
      
      reader.readAsText(file)
    } catch (error) {
      setUploadStatus({
        status: 'error',
        progress: 0,
        error: 'Upload failed',
        fileName: file.name
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="comfy-panel p-6">
        <h1 className="mb-4 text-2xl font-bold text-comfy-text-primary">
          Generate Images
        </h1>
        <p className="mb-6 text-comfy-text-secondary">
          Create images using ComfyUI workflows. Upload a workflow JSON file or
          configure parameters manually.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-comfy-text-primary">
              Workflow Upload
            </label>
            <FileUpload 
              onFileSelect={handleFileSelect}
              accept=".json"
              maxSize={10 * 1024 * 1024} // 10MB
            />
            
            {uploadStatus.status && (
              <UploadProgress
                status={uploadStatus.status}
                progress={uploadStatus.progress}
                error={uploadStatus.error}
                fileName={uploadStatus.fileName}
              />
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-comfy-text-primary">
              Prompt
            </label>
            <textarea
              className="comfy-input h-24"
              placeholder="Enter your prompt here..."
              disabled={isGenerating}
            />
          </div>

          <button
            className={`comfy-button w-full ${isGenerating ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => setIsGenerating(!isGenerating)}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>

          {isGenerating && (
            <div className="mt-4 rounded-md bg-comfy-bg-tertiary p-4">
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-comfy-accent-orange border-t-transparent"></div>
                <span className="text-comfy-text-secondary">
                  Generation in progress...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
