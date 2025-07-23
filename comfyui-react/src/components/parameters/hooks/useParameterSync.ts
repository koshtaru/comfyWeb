import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook for synchronizing parameter values with optimized debouncing
 * Handles smooth slider/input synchronization without excessive re-renders
 */
export const useParameterSync = (
  value: number,
  onChange: (value: number) => void,
  debounceMs: number = 100
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastValueRef = useRef<number>(value)
  const isSliderActiveRef = useRef<boolean>(false)
  const lastUpdateTimeRef = useRef<number>(0)

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Optimized update function with different strategies for slider vs input
  const updateValue = useCallback((newValue: number, isFromSlider: boolean = false) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only trigger onChange if value actually changed
    if (newValue !== lastValueRef.current) {
      lastValueRef.current = newValue
      
      if (isFromSlider && isSliderActiveRef.current) {
        const now = Date.now()
        const timeSinceLastUpdate = now - lastUpdateTimeRef.current
        
        // Throttle rapid slider updates to prevent lag
        if (timeSinceLastUpdate >= 16) { // ~60fps cap
          lastUpdateTimeRef.current = now
          onChange(newValue)
        } else {
          // For very rapid updates, debounce with minimal delay
          timeoutRef.current = setTimeout(() => {
            onChange(newValue)
          }, 16)
        }
      } else {
        // For input changes, use full debounce
        timeoutRef.current = setTimeout(() => {
          onChange(newValue)
        }, debounceMs)
      }
    }
  }, [onChange, debounceMs])

  // Immediate update function (for cases where debouncing isn't needed)
  const updateValueImmediate = useCallback((newValue: number) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    if (newValue !== lastValueRef.current) {
      onChange(newValue)
      lastValueRef.current = newValue
    }
  }, [onChange])

  // Slider interaction state management
  const setSliderActive = useCallback((active: boolean) => {
    isSliderActiveRef.current = active
    
    // If slider interaction ended, immediately flush any pending update
    if (!active && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      // Only call onChange if there's a pending value that hasn't been sent
      if (lastValueRef.current !== value) {
        onChange(lastValueRef.current)
      }
    }
  }, [onChange, value])

  return {
    debouncedValue: lastValueRef.current,
    updateValue,
    updateValueImmediate,
    setSliderActive
  }
}