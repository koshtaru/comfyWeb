// ============================================================================
// ComfyUI React - Parameter Reuse Hook
// ============================================================================

import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { parameterReuseService } from '@/services/parameterReuseService'
import { useUploadStore } from '@/store/uploadStore'
import { uploadToasts, toastManager } from '@/utils/toast'
import { ROUTES } from '@/constants/routes'
import type { StoredGeneration } from '@/services/historyManager'

export interface UseParameterReuseReturn {
  reuseParameters: (generation: StoredGeneration, options?: ParameterReuseOptions) => Promise<boolean>
  isCompatible: (generation: StoredGeneration) => boolean
  getParameterSummary: (generation: StoredGeneration) => string[]
}

export interface ParameterReuseOptions {
  navigateToGenerate?: boolean
  showConfirmation?: boolean
  showSuccessToast?: boolean
  showWarningToasts?: boolean
}

const DEFAULT_OPTIONS: Required<ParameterReuseOptions> = {
  navigateToGenerate: true,
  showConfirmation: false, // We'll handle confirmation in the UI component
  showSuccessToast: true,
  showWarningToasts: true
}

/**
 * Hook for reusing parameters from history items
 */
export const useParameterReuse = (): UseParameterReuseReturn => {
  const navigate = useNavigate()
  const { 
    currentWorkflow,
    reuseParameters: storeReuseParameters,
    reuseParametersWithWorkflow: storeReuseParametersWithWorkflow
  } = useUploadStore()

  const reuseParameters = useCallback(async (
    generation: StoredGeneration,
    options: ParameterReuseOptions = {}
  ): Promise<boolean> => {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    try {
      // Use the parameter reuse service (now works with or without current workflow)
      const result = parameterReuseService.reuseParameters(generation, currentWorkflow)

      if (!result.success) {
        if (opts.showWarningToasts) {
          uploadToasts.error('Cannot Reuse Parameters', {
            message: result.message,
            duration: 6000
          })
        }
        return false
      }

      // Apply the parameters to the upload store
      if (result.parameters) {
        if (result.workflowToLoad) {
          // No current workflow - load both workflow and parameters
          storeReuseParametersWithWorkflow(result.parameters, result.workflowToLoad)
        } else {
          // Has current workflow - just apply parameters
          storeReuseParameters(result.parameters)
        }
      }

      // Show success notification
      if (opts.showSuccessToast) {
        toastManager.success('Parameters Copied', {
          message: result.message,
          duration: 4000
        })
      }

      // Show warnings if any
      if (opts.showWarningToasts && result.incompatibilities && result.incompatibilities.length > 0) {
        result.incompatibilities.forEach(warning => {
          uploadToasts.warning('Compatibility Warning', {
            message: warning,
            duration: 5000
          })
        })
      }

      // Navigate to generate page if requested
      if (opts.navigateToGenerate) {
        // Small delay to ensure state updates are applied
        setTimeout(() => {
          navigate(ROUTES.GENERATE)
        }, 100)
      }

      return true
    } catch (error) {
      console.error('Failed to reuse parameters:', error)
      
      if (opts.showWarningToasts) {
        uploadToasts.error('Parameter Reuse Failed', {
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          duration: 6000
        })
      }
      
      return false
    }
  }, [currentWorkflow, storeReuseParameters, storeReuseParametersWithWorkflow, navigate])

  const isCompatible = useCallback((generation: StoredGeneration): boolean => {
    try {
      const historyParams = parameterReuseService.convertHistoryToParameters(generation)
      const compatibility = parameterReuseService.checkCompatibility(historyParams, currentWorkflow)
      return compatibility.isCompatible
    } catch (error) {
      console.error('[useParameterReuse] Error checking compatibility:', error)
      return false
    }
  }, [currentWorkflow])

  const getParameterSummary = useCallback((generation: StoredGeneration): string[] => {
    return parameterReuseService.getParameterSummary(generation)
  }, [])

  return {
    reuseParameters,
    isCompatible,
    getParameterSummary
  }
}