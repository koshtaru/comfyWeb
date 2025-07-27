// Upload State Management Store
// Handles workflow upload operations, validation results, and parameter extraction

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ValidationResult } from '@/utils/workflowValidator'
import type { ExtractedParameters } from '@/utils/parameterExtractor'
import type { WorkflowData } from '@/utils/workflowValidator'
import type { ComfyUIWorkflow } from '@/types'

export interface UploadStatus {
  status: 'idle' | 'uploading' | 'processing' | 'validating' | 'extracting' | 'complete' | 'error'
  progress: number
  fileName?: string
  fileSize?: number
  error?: string
  startTime?: number
  endTime?: number
}

export interface UploadHistoryItem {
  id: string
  fileName: string
  fileSize: number
  uploadedAt: string
  validationResult: ValidationResult
  extractedParameters: ExtractedParameters
  processingTime: number
  success: boolean
  errorMessage?: string
}

export interface UploadQueue {
  id: string
  file: File
  status: UploadStatus['status']
  progress: number
  result?: {
    workflow: WorkflowData
    validation: ValidationResult
    parameters: ExtractedParameters
  }
  error?: string
}

interface UploadState {
  // Current upload state
  currentUpload: UploadStatus
  validationResult: ValidationResult | null
  extractedParameters: ExtractedParameters | null
  currentWorkflow: ComfyUIWorkflow | null

  // Upload queue for batch processing
  uploadQueue: UploadQueue[]
  processingQueue: boolean

  // Upload history
  uploadHistory: UploadHistoryItem[]
  maxHistoryItems: number

  // Notification state
  notificationState: {
    hasUnreadValidationIssues: boolean
    lastValidationResultId: string | null
    isNotificationDropdownOpen: boolean
  }

  // Settings
  autoValidate: boolean
  autoExtractParameters: boolean
  showValidationWarnings: boolean
  retryAttempts: number

  // Actions
  setUploadStatus: (status: Partial<UploadStatus>) => void
  setValidationResult: (result: ValidationResult | null) => void
  setExtractedParameters: (parameters: ExtractedParameters | null) => void
  setCurrentWorkflow: (workflow: ComfyUIWorkflow | null) => void
  
  // Queue management
  addToQueue: (file: File) => string
  removeFromQueue: (id: string) => void
  updateQueueItem: (id: string, updates: Partial<UploadQueue>) => void
  clearQueue: () => void
  startQueueProcessing: () => void
  stopQueueProcessing: () => void

  // History management
  addToHistory: (item: Omit<UploadHistoryItem, 'id'>) => void
  removeFromHistory: (id: string) => void
  clearHistory: () => void
  getHistoryStats: () => {
    totalUploads: number
    successfulUploads: number
    failedUploads: number
    averageProcessingTime: number
  }

  // Notification management
  setNotificationDropdownOpen: (isOpen: boolean) => void
  markValidationIssuesAsRead: () => void
  updateNotificationState: (updates: Partial<UploadState['notificationState']>) => void

  // Settings
  updateSettings: (settings: Partial<{
    autoValidate: boolean
    autoExtractParameters: boolean
    showValidationWarnings: boolean
    retryAttempts: number
    maxHistoryItems: number
  }>) => void

  // Parameter reuse
  reuseParameters: (parameters: ExtractedParameters) => void
  reuseParametersWithWorkflow: (parameters: ExtractedParameters, workflow: ComfyUIWorkflow) => void

  // Reset functions
  resetCurrentUpload: () => void
  resetAll: () => void
}

const initialUploadStatus: UploadStatus = {
  status: 'idle',
  progress: 0
}

export const useUploadStore = create<UploadState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentUpload: initialUploadStatus,
      validationResult: null,
      extractedParameters: null,
      currentWorkflow: null,
      uploadQueue: [],
      processingQueue: false,
      uploadHistory: [],
      maxHistoryItems: 50,
      notificationState: {
        hasUnreadValidationIssues: false,
        lastValidationResultId: null,
        isNotificationDropdownOpen: false
      },
      autoValidate: true,
      autoExtractParameters: true,
      showValidationWarnings: true,
      retryAttempts: 3,

      // Actions
      setUploadStatus: (status) =>
        set(
          (state) => ({
            currentUpload: { ...state.currentUpload, ...status }
          }),
          false,
          'setUploadStatus'
        ),

      setValidationResult: (result) => {
        const currentResult = get().validationResult
        const hasIssues = result && (result.errors.length > 0 || result.warnings.length > 0)
        const resultId = result ? `${Date.now()}-${Math.random()}` : null
        
        // Mark as unread if this is a new validation result with issues
        const hasUnreadIssues = !!(hasIssues && (!currentResult || 
          currentResult.errors.length !== result.errors.length ||
          currentResult.warnings.length !== result.warnings.length))

        set(
          (state) => ({
            validationResult: result,
            notificationState: {
              ...state.notificationState,
              hasUnreadValidationIssues: hasUnreadIssues,
              lastValidationResultId: resultId
            }
          }),
          false,
          'setValidationResult'
        )
      },

      setExtractedParameters: (parameters) =>
        set({ extractedParameters: parameters }, false, 'setExtractedParameters'),

      setCurrentWorkflow: (workflow) =>
        set({ currentWorkflow: workflow }, false, 'setCurrentWorkflow'),

      // Queue management
      addToQueue: (file) => {
        const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const queueItem: UploadQueue = {
          id,
          file,
          status: 'idle',
          progress: 0
        }

        set(
          (state) => ({
            uploadQueue: [...state.uploadQueue, queueItem]
          }),
          false,
          'addToQueue'
        )

        return id
      },

      removeFromQueue: (id) =>
        set(
          (state) => ({
            uploadQueue: state.uploadQueue.filter(item => item.id !== id)
          }),
          false,
          'removeFromQueue'
        ),

      updateQueueItem: (id, updates) =>
        set(
          (state) => ({
            uploadQueue: state.uploadQueue.map(item =>
              item.id === id ? { ...item, ...updates } : item
            )
          }),
          false,
          'updateQueueItem'
        ),

      clearQueue: () =>
        set({ uploadQueue: [] }, false, 'clearQueue'),

      startQueueProcessing: () =>
        set({ processingQueue: true }, false, 'startQueueProcessing'),

      stopQueueProcessing: () =>
        set({ processingQueue: false }, false, 'stopQueueProcessing'),

      // History management
      addToHistory: (item) => {
        const id = `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const historyItem: UploadHistoryItem = { ...item, id }

        set(
          (state) => {
            const newHistory = [historyItem, ...state.uploadHistory]
            
            // Limit history size
            if (newHistory.length > state.maxHistoryItems) {
              newHistory.splice(state.maxHistoryItems)
            }

            return { uploadHistory: newHistory }
          },
          false,
          'addToHistory'
        )
      },

      removeFromHistory: (id) =>
        set(
          (state) => ({
            uploadHistory: state.uploadHistory.filter(item => item.id !== id)
          }),
          false,
          'removeFromHistory'
        ),

      clearHistory: () =>
        set({ uploadHistory: [] }, false, 'clearHistory'),

      getHistoryStats: () => {
        const { uploadHistory } = get()
        const totalUploads = uploadHistory.length
        const successfulUploads = uploadHistory.filter(item => item.success).length
        const failedUploads = totalUploads - successfulUploads
        const averageProcessingTime = uploadHistory.length > 0
          ? uploadHistory.reduce((sum, item) => sum + item.processingTime, 0) / uploadHistory.length
          : 0

        return {
          totalUploads,
          successfulUploads,
          failedUploads,
          averageProcessingTime
        }
      },

      // Notification management
      setNotificationDropdownOpen: (isOpen) =>
        set(
          (state) => ({
            notificationState: {
              ...state.notificationState,
              isNotificationDropdownOpen: isOpen
            }
          }),
          false,
          'setNotificationDropdownOpen'
        ),

      markValidationIssuesAsRead: () =>
        set(
          (state) => ({
            notificationState: {
              ...state.notificationState,
              hasUnreadValidationIssues: false
            }
          }),
          false,
          'markValidationIssuesAsRead'
        ),

      updateNotificationState: (updates) =>
        set(
          (state) => ({
            notificationState: {
              ...state.notificationState,
              ...updates
            }
          }),
          false,
          'updateNotificationState'
        ),

      // Settings
      updateSettings: (settings) =>
        set(settings, false, 'updateSettings'),

      // Parameter reuse
      reuseParameters: (parameters) =>
        set({
          extractedParameters: parameters,
          currentUpload: {
            ...initialUploadStatus,
            status: 'complete'
          }
        }, false, 'reuseParameters'),

      reuseParametersWithWorkflow: (parameters, workflow) =>
        set({
          extractedParameters: parameters,
          currentWorkflow: workflow,
          currentUpload: {
            ...initialUploadStatus,
            status: 'complete'
          }
        }, false, 'reuseParametersWithWorkflow'),

      // Reset functions
      resetCurrentUpload: () =>
        set({
          currentUpload: initialUploadStatus,
          validationResult: null,
          extractedParameters: null,
          currentWorkflow: null
        }, false, 'resetCurrentUpload'),

      resetAll: () =>
        set({
          currentUpload: initialUploadStatus,
          validationResult: null,
          extractedParameters: null,
          currentWorkflow: null,
          uploadQueue: [],
          processingQueue: false
        }, false, 'resetAll')
    }),
    {
      name: 'ComfyUI Upload Store'
    }
  )
)

// Selectors for common use cases
export const uploadSelectors = {
  // Check if currently uploading or processing
  isActive: (state: UploadState) => 
    state.currentUpload.status !== 'idle' && 
    state.currentUpload.status !== 'complete' && 
    state.currentUpload.status !== 'error',

  // Check if upload was successful
  isSuccess: (state: UploadState) => 
    state.currentUpload.status === 'complete' && !state.currentUpload.error,

  // Check if there are validation errors
  hasValidationErrors: (state: UploadState) => 
    state.validationResult?.errors && state.validationResult.errors.length > 0,

  // Check if there are validation warnings
  hasValidationWarnings: (state: UploadState) => 
    state.validationResult?.warnings && state.validationResult.warnings.length > 0,

  // Get processing time for current upload
  getProcessingTime: (state: UploadState) => {
    const { startTime, endTime } = state.currentUpload
    if (startTime && endTime) {
      return endTime - startTime
    }
    if (startTime) {
      return Date.now() - startTime
    }
    return 0
  },

  // Get queue status
  getQueueStatus: (state: UploadState) => ({
    total: state.uploadQueue.length,
    processing: state.uploadQueue.filter(item => 
      item.status === 'uploading' || 
      item.status === 'processing' || 
      item.status === 'validating'
    ).length,
    completed: state.uploadQueue.filter(item => item.status === 'complete').length,
    failed: state.uploadQueue.filter(item => item.status === 'error').length
  }),

  // Get recent successful uploads
  getRecentSuccessfulUploads: (state: UploadState, limit: number = 5) =>
    state.uploadHistory
      .filter(item => item.success)
      .slice(0, limit),

  // Get upload success rate
  getSuccessRate: (state: UploadState) => {
    const { totalUploads, successfulUploads } = state.uploadHistory.length > 0
      ? {
          totalUploads: state.uploadHistory.length,
          successfulUploads: state.uploadHistory.filter(item => item.success).length
        }
      : { totalUploads: 0, successfulUploads: 0 }

    return totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0
  }
}

// Hook for using upload selectors
export const useUploadSelectors = () => {
  const state = useUploadStore()
  
  return {
    isActive: uploadSelectors.isActive(state),
    isSuccess: uploadSelectors.isSuccess(state),
    hasValidationErrors: uploadSelectors.hasValidationErrors(state),
    hasValidationWarnings: uploadSelectors.hasValidationWarnings(state),
    processingTime: uploadSelectors.getProcessingTime(state),
    queueStatus: uploadSelectors.getQueueStatus(state),
    recentSuccessfulUploads: uploadSelectors.getRecentSuccessfulUploads(state),
    successRate: uploadSelectors.getSuccessRate(state)
  }
}