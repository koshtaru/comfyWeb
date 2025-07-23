import { useCallback, useMemo } from 'react'

/**
 * Hook for parameter validation and formatting
 * Handles value clamping, validation, and proper formatting
 */
export const useParameterValidation = (
  min: number,
  max: number,
  step: number = 1
) => {
  // Calculate decimal places from step for formatting
  const decimalPlaces = useMemo(() => {
    const stepStr = step.toString()
    const decimalIndex = stepStr.indexOf('.')
    return decimalIndex === -1 ? 0 : stepStr.length - decimalIndex - 1
  }, [step])

  // Clamp value to valid range
  const clampValue = useCallback((value: number): number => {
    if (isNaN(value)) return min
    return Math.max(min, Math.min(max, value))
  }, [min, max])

  // Validate if value is within acceptable range
  const isValid = useCallback((value: number): boolean => {
    return !isNaN(value) && value >= min && value <= max
  }, [min, max])

  // Format value with proper decimal places
  const formatValue = useCallback((value: number): string => {
    if (isNaN(value)) return min.toString()
    const clampedValue = clampValue(value)
    return decimalPlaces > 0 
      ? clampedValue.toFixed(decimalPlaces)
      : Math.round(clampedValue).toString()
  }, [clampValue, decimalPlaces, min])

  // Round value to step precision
  const roundToStep = useCallback((value: number): number => {
    return Math.round(value / step) * step
  }, [step])

  // Get next valid value (for keyboard navigation)
  const getNextValue = useCallback((currentValue: number, direction: 'up' | 'down'): number => {
    const delta = direction === 'up' ? step : -step
    const newValue = currentValue + delta
    return clampValue(roundToStep(newValue))
  }, [step, clampValue, roundToStep])

  // Validate step alignment
  const isStepAligned = useCallback((value: number): boolean => {
    const normalizedValue = (value - min) / step
    return Math.abs(normalizedValue - Math.round(normalizedValue)) < 0.0001
  }, [min, step])

  return {
    clampValue,
    isValid,
    formatValue,
    roundToStep,
    getNextValue,
    isStepAligned,
    decimalPlaces
  }
}