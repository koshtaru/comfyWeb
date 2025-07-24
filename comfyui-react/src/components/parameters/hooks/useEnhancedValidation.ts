import { useCallback, useMemo } from 'react'
import { useParameterValidation } from './useParameterValidation'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationResult {
  isValid: boolean
  severity: ValidationSeverity
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

interface ValidationRule {
  check: (value: number) => boolean
  message: string
  severity: ValidationSeverity
  priority: number // Lower numbers = higher priority
}

/**
 * Enhanced validation hook that provides detailed validation feedback
 * with visual states and helpful error messages
 */
export const useEnhancedValidation = (
  min: number,
  max: number,
  step: number = 1,
  parameterType?: 'steps' | 'cfg' | 'width' | 'height' | 'seed' | 'batchSize' | 'batchCount'
) => {
  const baseValidation = useParameterValidation(min, max, step)

  // Define parameter-specific validation rules
  const validationRules = useMemo((): ValidationRule[] => {
    const rules: ValidationRule[] = [
      // Basic range validation
      {
        check: (value: number) => isNaN(value),
        message: 'Value must be a valid number',
        severity: 'error',
        priority: 1
      },
      {
        check: (value: number) => !isNaN(value) && value < min,
        message: `Value must be at least ${min}`,
        severity: 'error',
        priority: 2
      },
      {
        check: (value: number) => !isNaN(value) && value > max,
        message: `Value must be no more than ${max}`,
        severity: 'error',
        priority: 3
      },
      {
        check: (value: number) => !isNaN(value) && !baseValidation.isStepAligned(value),
        message: `Value must be a multiple of ${step}`,
        severity: 'error',
        priority: 4
      }
    ]

    // Add parameter-specific rules
    switch (parameterType) {
      case 'steps':
        rules.push(
          {
            check: (value: number) => value > 0 && value < 10,
            message: 'Very low steps may produce poor quality images',
            severity: 'warning',
            priority: 10
          },
          {
            check: (value: number) => value > 100,
            message: 'High step counts have diminishing returns and increase generation time significantly',
            severity: 'warning',
            priority: 11
          },
          {
            check: (value: number) => value >= 20 && value <= 50,
            message: 'Optimal range for most use cases',
            severity: 'info',
            priority: 20
          }
        )
        break

      case 'cfg':
        rules.push(
          {
            check: (value: number) => value > 0 && value < 3,
            message: 'Very low CFG may ignore your prompt',
            severity: 'warning',
            priority: 10
          },
          {
            check: (value: number) => value > 15,
            message: 'High CFG values may cause artifacts and over-saturation',
            severity: 'warning',
            priority: 11
          },
          {
            check: (value: number) => value >= 7 && value <= 12,
            message: 'Recommended range for balanced results',
            severity: 'info',
            priority: 20
          }
        )
        break

      case 'width':
      case 'height':
        rules.push(
          {
            check: (value: number) => value % 8 !== 0,
            message: 'Dimensions must be divisible by 8 for optimal performance',
            severity: 'error',
            priority: 5
          },
          {
            check: (value: number) => value > 1024,
            message: 'Large dimensions require significant VRAM and processing time',
            severity: 'warning',
            priority: 10
          },
          {
            check: (value: number) => value < 256,
            message: 'Very small dimensions may produce low-quality results',
            severity: 'warning',
            priority: 11
          }
        )
        break

      case 'batchSize':
        rules.push(
          {
            check: (value: number) => value > 4,
            message: 'Large batch sizes require significant VRAM and may cause out-of-memory errors',
            severity: 'warning',
            priority: 10
          },
          {
            check: (value: number) => value === 1,
            message: 'Single image generation - consider batch size 2-4 for variations',
            severity: 'info',
            priority: 20
          }
        )
        break

      case 'batchCount':
        rules.push(
          {
            check: (value: number) => value > 10,
            message: 'High batch counts will take considerable time to complete',
            severity: 'warning',
            priority: 10
          }
        )
        break

      case 'seed':
        rules.push(
          {
            check: (value: number) => value < -1,
            message: 'Seed values should be -1 (random) or positive integers',
            severity: 'warning',
            priority: 10
          },
          {
            check: (value: number) => value === -1,
            message: 'Random seed - will generate different results each time',
            severity: 'info',
            priority: 20
          }
        )
        break
    }

    return rules.sort((a, b) => a.priority - b.priority)
  }, [min, max, step, parameterType, baseValidation])

  // Validate a value and return detailed results
  const validateValue = useCallback((value: number): ValidationResult => {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []
    let severity: ValidationSeverity = 'info'
    let isValid = true

    // Check each validation rule
    for (const rule of validationRules) {
      if (rule.check(value)) {
        switch (rule.severity) {
          case 'error':
            errors.push(rule.message)
            severity = 'error'
            isValid = false
            break
          case 'warning':
            warnings.push(rule.message)
            if (severity !== 'error') severity = 'warning'
            break
          case 'info':
            suggestions.push(rule.message)
            break
        }
      }
    }

    return {
      isValid,
      severity,
      errors,
      warnings,
      suggestions
    }
  }, [validationRules])

  // Get validation state CSS classes
  const getValidationClasses = useCallback((value: number): string => {
    const result = validateValue(value)
    const classes = ['parameter-validated']
    
    if (!result.isValid) {
      classes.push('parameter-error')
    } else if (result.warnings.length > 0) {
      classes.push('parameter-warning')
    } else if (result.suggestions.length > 0) {
      classes.push('parameter-info')
    } else {
      classes.push('parameter-valid')
    }
    
    return classes.join(' ')
  }, [validateValue])

  // Get the most important message to display
  const getPrimaryMessage = useCallback((value: number): string | null => {
    const result = validateValue(value)
    
    if (result.errors.length > 0) {
      return result.errors[0] // Show first (highest priority) error
    }
    if (result.warnings.length > 0) {
      return result.warnings[0] // Show first warning
    }
    if (result.suggestions.length > 0) {
      return result.suggestions[0] // Show first suggestion
    }
    
    return null
  }, [validateValue])

  // Get validation icon
  const getValidationIcon = useCallback((value: number): string | null => {
    const result = validateValue(value)
    
    if (result.errors.length > 0) return '❌'
    if (result.warnings.length > 0) return '⚠️'
    if (result.suggestions.length > 0) return '💡'
    return '✅'
  }, [validateValue])

  return {
    ...baseValidation,
    validateValue,
    getValidationClasses,
    getPrimaryMessage,
    getValidationIcon,
    // Helper to check if value has any issues
    hasValidationIssues: (value: number) => {
      const result = validateValue(value)
      return !result.isValid || result.warnings.length > 0
    }
  }
}

export default useEnhancedValidation