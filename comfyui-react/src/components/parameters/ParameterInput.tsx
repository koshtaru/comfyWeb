import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useParameterValidation } from './hooks/useParameterValidation'

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export interface ParameterInputProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  disabled?: boolean
  className?: string
  showInput?: boolean
  debounceMs?: number
  'aria-label'?: string
}

export const ParameterInput: React.FC<ParameterInputProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  className = '',
  showInput = true,
  debounceMs = 50,
  'aria-label': ariaLabel
}) => {
  const [localValue, setLocalValue] = useState(value)
  const [inputValue, setInputValue] = useState(value.toString())
  const [isSliderActive, setIsSliderActive] = useState(false)
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragEndTime, setDragEndTime] = useState<number>(0)

  // Use a ref to track the last value we sent to parent
  const lastSentValueRef = useRef(value)
  
  const { isValid, clampValue, formatValue } = useParameterValidation(
    min,
    max,
    step
  )

  // Global mouse/touch event listeners to properly track dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        console.log('🌍 [ParameterInput] Global mouse up - ending drag:', label)
        setIsDragging(false)
        setIsSliderActive(false)
        setDragEndTime(Date.now()) // Set cooldown period
      }
    }

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        console.log('🌍 [ParameterInput] Global touch end - ending drag:', label)
        setIsDragging(false)
        setIsSliderActive(false)
        setDragEndTime(Date.now()) // Set cooldown period
      }
    }

    if (isDragging) {
      document.addEventListener('mouseup', handleGlobalMouseUp)
      document.addEventListener('touchend', handleGlobalTouchEnd)
      document.addEventListener('mouseleave', handleGlobalMouseUp) // Handle mouse leaving window
    }

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
      document.removeEventListener('mouseleave', handleGlobalMouseUp)
    }
  }, [isDragging, label])

  // Only update local state when external value changes AND we're not actively interacting
  useEffect(() => {
    console.log('🔍 [ParameterInput] Effect triggered:', {
      label,
      externalValue: value,
      localValue,
      lastSentValue: lastSentValueRef.current,
      isSliderActive,
      isInputFocused,
      shouldUpdate: !isSliderActive && !isInputFocused && value !== lastSentValueRef.current
    })
    
    // NEVER update local state if slider is active, being dragged, or in cooldown period
    const isInteracting = isSliderActive || isDragging || isInputFocused
    const isInCooldown = Date.now() - dragEndTime < 200 // 200ms cooldown after drag ends
    const shouldBlock = isInteracting || isInCooldown
    
    if (!shouldBlock && value !== lastSentValueRef.current) {
      console.log('🔄 [ParameterInput] Updating local state from external value:', value)
      setLocalValue(value)
      setInputValue(formatValue(value))
      lastSentValueRef.current = value
    } else if (shouldBlock && value !== lastSentValueRef.current) {
      console.log('🚫 [ParameterInput] BLOCKED external update:', {
        externalValue: value,
        localValue,
        isSliderActive,
        isDragging,
        isInputFocused,
        isInCooldown,
        timeSinceDragEnd: Date.now() - dragEndTime,
        reason: isInteracting ? 'user is interacting' : 'cooldown period'
      })
    }
  }, [value, isSliderActive, isDragging, isInputFocused, dragEndTime, formatValue, localValue, label])

  // Debounced callback to parent
  const debouncedOnChange = useCallback(
    debounce((newValue: number) => {
      console.log('⏰ [ParameterInput] Debounced onChange called:', { label, newValue })
      lastSentValueRef.current = newValue
      onChange(newValue)
    }, debounceMs),
    [onChange, debounceMs, label]
  )

  // Handle slider changes - immediate local update, debounced parent callback
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    console.log('🎚️ [ParameterInput] Slider changed:', { 
      label, 
      newValue, 
      oldLocalValue: localValue,
      isSliderActive,
      willCallImmediately: isSliderActive 
    })
    
    setLocalValue(newValue)
    setInputValue(formatValue(newValue))
    
    // For slider, we want immediate visual feedback but debounced parent updates
    if (isDragging || isSliderActive) {
      // During active dragging, call onChange immediately for responsiveness
      console.log('🚀 [ParameterInput] Immediate onChange (dragging):', { label, newValue, isDragging, isSliderActive })
      lastSentValueRef.current = newValue
      onChange(newValue)
    } else {
      // For single clicks, use debounced callback
      console.log('⏳ [ParameterInput] Debounced onChange (not dragging):', { label, newValue })
      debouncedOnChange(newValue)
    }
  }, [formatValue, isSliderActive, isDragging, onChange, debouncedOnChange, localValue, label])

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    setInputValue(rawValue)
    
    const numericValue = parseFloat(rawValue)
    if (!isNaN(numericValue) && isValid(numericValue)) {
      const clampedValue = clampValue(numericValue)
      setLocalValue(clampedValue)
      debouncedOnChange(clampedValue)
    }
  }, [isValid, clampValue, debouncedOnChange])

  // Handle input blur (validate and format)
  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false)
    const numericValue = parseFloat(inputValue)
    
    if (isNaN(numericValue)) {
      // Reset to current local value if invalid
      setInputValue(formatValue(localValue))
    } else {
      // Clamp and format the value
      const clampedValue = clampValue(numericValue)
      setLocalValue(clampedValue)
      setInputValue(formatValue(clampedValue))
      
      // Immediate update on blur
      lastSentValueRef.current = clampedValue
      onChange(clampedValue)
    }
  }, [inputValue, localValue, clampValue, formatValue, onChange])

  // Handle keyboard navigation for slider
  const handleSliderKeyDown = useCallback((e: React.KeyboardEvent) => {
    let delta = 0
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = -step
        break
      case 'ArrowRight':
      case 'ArrowUp':
        delta = step
        break
      case 'PageDown':
        delta = -step * 10
        break
      case 'PageUp':
        delta = step * 10
        break
      case 'Home':
        delta = min - localValue
        break
      case 'End':
        delta = max - localValue
        break
      default:
        return
    }
    
    e.preventDefault()
    const newValue = clampValue(localValue + delta)
    setLocalValue(newValue)
    setInputValue(formatValue(newValue))
    
    // Immediate update for keyboard navigation
    lastSentValueRef.current = newValue
    onChange(newValue)
  }, [step, min, max, localValue, clampValue, formatValue, onChange])

  return (
    <div className={`parameter-input-wrapper ${className}`}>
      <label 
        className="parameter-label"
        htmlFor={`${label.toLowerCase().replace(/\s+/g, '-')}-slider`}
      >
        {label}
      </label>
      
      <div className="parameter-control-container">
        <div className="parameter-dual-input">
          {/* Range Slider */}
          <input
            id={`${label.toLowerCase().replace(/\s+/g, '-')}-slider`}
            type="range"
            min={min}
            max={max}
            step={step}
            value={localValue}
            onChange={handleSliderChange}
            onMouseDown={() => {
              console.log('👇 [ParameterInput] Mouse down - starting drag:', label)
              setIsSliderActive(true)
              setIsDragging(true)
            }}
            onMouseUp={() => {
              console.log('👆 [ParameterInput] Mouse up - ending drag:', label)
              setIsSliderActive(false)
              setIsDragging(false)
              setDragEndTime(Date.now()) // Set cooldown period
            }}
            onTouchStart={() => {
              console.log('👇 [ParameterInput] Touch start - starting drag:', label)
              setIsSliderActive(true)
              setIsDragging(true)
            }}
            onTouchEnd={() => {
              console.log('👆 [ParameterInput] Touch end - ending drag:', label)
              setIsSliderActive(false)
              setIsDragging(false)
              setDragEndTime(Date.now()) // Set cooldown period
            }}
            onKeyDown={handleSliderKeyDown}
            disabled={disabled}
            className="parameter-slider"
            aria-label={ariaLabel || `${label} slider`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={localValue}
            aria-valuetext={`${label}: ${formatValue(localValue)}`}
          />
          
          {/* Number Input */}
          {showInput && (
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setIsInputFocused(true)}
              onBlur={handleInputBlur}
              disabled={disabled}
              className="parameter-number-input"
              aria-label={ariaLabel || `${label} input`}
            />
          )}
        </div>
      </div>
    </div>
  )
}