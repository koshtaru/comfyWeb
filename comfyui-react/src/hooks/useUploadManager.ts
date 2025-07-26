// Upload Manager Hook
// Provides a comprehensive interface for managing workflow uploads

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useUploadStore } from '@/store/uploadStore'
import { validateWorkflowJSON } from '@/utils/workflowValidator'
import { extractWorkflowParameters, updateWorkflowParameter } from '@/utils/parameterExtractor'
import { errorHandler, uploadErrors, withErrorHandling } from '@/utils/errorHandler'
import { uploadToasts } from '@/utils/toast'
import type { WorkflowData } from '@/utils/workflowValidator'
import type { ComfyUIWorkflow } from '@/types'

interface UseUploadManagerOptions {
  maxFileSize?: number
  autoValidate?: boolean
  autoExtractParameters?: boolean
  onUploadComplete?: (workflow: ComfyUIWorkflow) => void
  onValidationComplete?: (result: any) => void
  onParametersExtracted?: (parameters: any) => void
  onError?: (error: Error) => void
}

export const useUploadManager = (options: UseUploadManagerOptions = {}) => {
  const {
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    autoValidate = true,
    autoExtractParameters = true,
    onUploadComplete,
    onValidationComplete,
    onParametersExtracted,
    onError
  } = options

  const {
    currentUpload,
    validationResult,
    extractedParameters,
    currentWorkflow,
    setUploadStatus,
    setValidationResult,
    setExtractedParameters,
    setCurrentWorkflow,
    addToHistory,
    resetCurrentUpload
  } = useUploadStore()

  const abortControllerRef = useRef<AbortController | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // File validation
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!file.name.toLowerCase().endsWith('.json')) {
      return 'Please upload a JSON file'
    }

    // Check file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1)
      return `File size exceeds ${maxSizeMB}MB limit`
    }

    // Check file name
    if (file.name.length > 255) {
      return 'File name is too long'
    }

    return null
  }, [maxFileSize])

  // Read file content
  const readFile = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadStatus({ progress })
        }
      }
      
      reader.onload = (event) => {
        const content = event.target?.result as string
        resolve(content)
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsText(file)
    })
  }, [setUploadStatus])

  // Validate workflow JSON
  const validateWorkflow = useCallback(async (content: string, fileName: string) => {
    setUploadStatus({ status: 'validating' })

    return await withErrorHandling(
      async () => {
        const validation = validateWorkflowJSON(content)
        setValidationResult(validation)
        onValidationComplete?.(validation)

        if (validation.isValid) {
          uploadToasts.uploadSuccess(fileName)
          if (validation.warnings.length > 0) {
            uploadToasts.validationWarnings(validation.warnings.length, validation.nodeCount)
          }
        } else {
          const error = uploadErrors.validationFailed(fileName, validation.errors.length)
          throw error
        }

        return validation
      },
      { operation: 'workflow_validation', fileName }
    )
  }, [setUploadStatus, setValidationResult, onValidationComplete])

  // Extract parameters from workflow
  const extractParameters = useCallback(async (workflow: WorkflowData, fileName: string) => {
    setUploadStatus({ status: 'extracting' })

    return await withErrorHandling(
      async () => {
        const parameters = extractWorkflowParameters(workflow)
        setExtractedParameters(parameters)
        onParametersExtracted?.(parameters)

        uploadToasts.parametersExtracted(parameters.metadata.totalNodes)

        // Check for high VRAM usage
        if (parameters.metadata.estimatedVRAM) {
          const vramValue = parseInt(parameters.metadata.estimatedVRAM.replace(/[^\d]/g, ''))
          if (vramValue > 8) {
            uploadToasts.memoryWarning(parameters.metadata.estimatedVRAM)
          }
        }

        return parameters
      },
      { operation: 'parameter_extraction', fileName }
    )
  }, [setUploadStatus, setExtractedParameters, onParametersExtracted])

  // Main upload function
  const uploadFile = useCallback(async (file: File) => {
    // Reset previous state
    resetCurrentUpload()
    
    // Create abort controller for this upload
    abortControllerRef.current = new AbortController()

    const startTime = Date.now()
    setUploadStatus({
      status: 'uploading',
      progress: 0,
      fileName: file.name,
      fileSize: file.size,
      startTime
    })

    try {
      // Validate file
      const fileError = validateFile(file)
      if (fileError) {
        throw uploadErrors.invalidFormat(file.name)
      }

      uploadToasts.uploadStarted(file.name)

      // Read file content
      setUploadStatus({ status: 'processing' })
      const content = await readFile(file)

      // Parse JSON
      let workflow: WorkflowData
      try {
        workflow = JSON.parse(content)
        setCurrentWorkflow(workflow)
      } catch (parseError) {
        throw uploadErrors.parseError(file.name)
      }

      // Validate workflow if enabled
      let validation
      if (autoValidate) {
        validation = await validateWorkflow(content, file.name)
        if (!validation) return // Error handled by validateWorkflow
      }

      // Extract parameters if enabled
      let parameters
      if (autoExtractParameters && workflow) {
        parameters = await extractParameters(workflow, file.name)
        if (!parameters) return // Error handled by extractParameters
      }

      // Complete upload
      const endTime = Date.now()
      setUploadStatus({ 
        status: 'complete', 
        progress: 100,
        endTime 
      })

      // Add to history
      if (validation && parameters) {
        addToHistory({
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          validationResult: validation,
          extractedParameters: parameters,
          processingTime: endTime - startTime,
          success: true
        })
      }

      // Call completion callback
      onUploadComplete?.(workflow)

    } catch (error) {
      const endTime = Date.now()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      setUploadStatus({
        status: 'error',
        error: errorMessage,
        endTime
      })

      // Add failed upload to history
      addToHistory({
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        validationResult: validationResult || {
          isValid: false,
          errors: [{ type: 'syntax', message: errorMessage, severity: 'error' }],
          warnings: [],
          nodeCount: 0,
          nodeTypes: []
        },
        extractedParameters: extractedParameters || {
          generation: {},
          model: { loras: [], controlnets: [] },
          image: {},
          prompts: {},
          advanced: { customNodes: [] },
          metadata: {
            totalNodes: 0,
            nodeTypes: [],
            hasImg2Img: false,
            hasInpainting: false,
            hasControlNet: false,
            hasLora: false,
            hasUpscaling: false,
            architecture: 'Unknown',
            complexity: 'Simple'
          }
        },
        processingTime: endTime - startTime,
        success: false,
        errorMessage
      })

      // Handle error
      if (error instanceof Error) {
        errorHandler.handleError(error, {
          operation: 'file_upload',
          fileName: file.name,
          fileSize: file.size
        })
        onError?.(error)
      }
    }
  }, [
    autoValidate,
    autoExtractParameters,
    validateFile,
    readFile,
    validateWorkflow,
    extractParameters,
    setUploadStatus,
    setCurrentWorkflow,
    resetCurrentUpload,
    addToHistory,
    validationResult,
    extractedParameters,
    onUploadComplete,
    onError
  ])

  // Cancel upload
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setUploadStatus({
      status: 'error',
      error: 'Upload cancelled by user',
      endTime: Date.now()
    })

    uploadToasts.info('Upload Cancelled', {
      message: 'File upload was cancelled'
    })
  }, [setUploadStatus])

  // Retry upload
  const retryUpload = useCallback(() => {
    if (currentUpload.fileName) {
      // Create a dummy file object for retry
      // In a real implementation, you'd store the original file
      uploadToasts.info('Retry Upload', {
        message: 'Please select the file again to retry'
      })
      resetCurrentUpload()
    }
  }, [currentUpload.fileName, resetCurrentUpload])

  // Debounced parameter update to prevent excessive re-renders
  const debouncedUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const updateParameter = useCallback((nodeId: string, parameter: string, value: any) => {
    if (currentWorkflow) {
      const updatedWorkflow = updateWorkflowParameter(currentWorkflow, nodeId, parameter, value)
      setCurrentWorkflow(updatedWorkflow)
      
      // Debounce parameter extraction to improve performance
      if (autoExtractParameters) {
        if (debouncedUpdateTimeoutRef.current) {
          clearTimeout(debouncedUpdateTimeoutRef.current)
        }
        
        debouncedUpdateTimeoutRef.current = setTimeout(() => {
          const updatedParameters = extractWorkflowParameters(updatedWorkflow)
          setExtractedParameters(updatedParameters)
          void uploadToasts.autoSaved() // Show auto-save notification
        }, 300) // 300ms debounce
      }
    }
  }, [currentWorkflow, autoExtractParameters, setCurrentWorkflow, setExtractedParameters])

  // Cleanup debounced timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedUpdateTimeoutRef.current) {
        clearTimeout(debouncedUpdateTimeoutRef.current)
      }
    }
  }, [])

  // Paste workflow from clipboard
  const pasteWorkflow = useCallback(async (content: string) => {
    try {
      // Validate JSON
      JSON.parse(content)
      
      // Create a virtual file object
      const blob = new Blob([content], { type: 'application/json' })
      const file = new File([blob], 'pasted-workflow.json', { type: 'application/json' })
      
      await uploadFile(file)
    } catch (error) {
      const parseError = uploadErrors.parseError('pasted content')
      errorHandler.handleError(parseError, {
        operation: 'paste_workflow'
      })
    }
  }, [uploadFile])

  // Memoized status helpers to prevent unnecessary re-renders
  const statusHelpers = useMemo(() => ({
    isUploading: currentUpload.status === 'uploading',
    isProcessing: ['processing', 'validating', 'extracting'].includes(currentUpload.status),
    isComplete: currentUpload.status === 'complete',
    hasError: currentUpload.status === 'error',
    canCancel: ['uploading', 'processing', 'validating', 'extracting'].includes(currentUpload.status),
    canRetry: currentUpload.status === 'error'
  }), [currentUpload.status])

  return {
    // State
    currentUpload,
    validationResult,
    extractedParameters,
    currentWorkflow,
    
    // Actions
    uploadFile,
    cancelUpload,
    retryUpload,
    updateParameter,
    pasteWorkflow,
    validateFile,
    
    // Status helpers (memoized)
    ...statusHelpers
  }
}