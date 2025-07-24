import React, { useCallback, useEffect, useState, useRef } from 'react'
import { useParameterValidation } from './hooks/useParameterValidation'
import { useEnhancedValidation } from './hooks/useEnhancedValidation'
import { ValidationMessage } from './ValidationMessage'
import { Tooltip } from '@/components/ui/Tooltip'

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
  /** Optional tooltip content */
  tooltip?: React.ReactNode
  /** Tooltip placement */
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
  /** Parameter type for enhanced validation */
  parameterType?: 'steps' | 'cfg' | 'width' | 'height' | 'seed' | 'batchSize' | 'batchCount'
  /** Show validation feedback */
  showValidation?: boolean
  /** Compact validation messages */
  compactValidation?: boolean
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
  'aria-label': ariaLabel,
  tooltip,
  tooltipPlacement = 'top',
  parameterType,
  showValidation = true,
  compactValidation = false
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
  
  // Enhanced validation for visual feedback
  const enhancedValidation = useEnhancedValidation(min, max, step, parameterType)

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

  const labelContent = (
    <label 
      className="parameter-label"
      htmlFor={`${label.toLowerCase().replace(/\s+/g, '-')}-slider`}
    >
      {label}
      {tooltip && (
        <span className="parameter-label-tooltip-indicator">
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="currentColor"
            style={{ marginLeft: '0.25rem', opacity: 0.6 }}
          >
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.8,10.5 10.5,9.3 10.5,9C10.5,7.8 11.2,7 12,7S13.5,7.8 13.5,9C13.5,9.3 13.2,10.5 12,10.5Z" />
          </svg>
        </span>
      )}
    </label>
  )

  // Get validation state for current value
  const validationClasses = showValidation ? enhancedValidation.getValidationClasses(localValue) : ''
  const validationMessage = showValidation ? enhancedValidation.getPrimaryMessage(localValue) : null
  const validationResult = showValidation ? enhancedValidation.validateValue(localValue) : null

  return (
    <div className={`parameter-input-wrapper ${showValidation ? 'has-validation' : ''} ${className}`}>
      {tooltip ? (
        <Tooltip 
          content={tooltip} 
          placement={tooltipPlacement}
          delay={200}
        >
          {labelContent}
        </Tooltip>
      ) : (
        labelContent
      )}
      
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
            className={`parameter-slider ${validationClasses}`}
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
              className={`parameter-number-input ${validationClasses}`}
              aria-label={ariaLabel || `${label} input`}
            />
          )}
        </div>
      </div>
      
      {/* Validation Message */}
      {showValidation && validationMessage && validationResult && (
        <ValidationMessage
          message={validationMessage}
          severity={validationResult.severity}
          compact={compactValidation}
          show={true}
        />
      )}
    </div>
  )
}