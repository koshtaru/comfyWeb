// ============================================================================
// ComfyUI React - Slider Component
// ============================================================================

import React, { forwardRef, useId, useRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { SliderProps } from '../../types/component'

// Slider variants using CVA
const sliderVariants = cva(
  // Base classes for the track
  'relative w-full rounded-full bg-comfy-bg-tertiary cursor-pointer',
  {
    variants: {
      size: {
        xs: 'h-1',
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
        xl: 'h-5'
      },
      disabled: {
        true: 'opacity-50 cursor-not-allowed',
        false: ''
      }
    },
    defaultVariants: {
      size: 'md',
      disabled: false
    }
  }
)

const thumbVariants = cva(
  // Base classes for the thumb
  'absolute top-1/2 -translate-y-1/2 rounded-full bg-comfy-accent-orange shadow-comfy transition-all duration-200 cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-comfy-accent-orange focus:ring-offset-2 focus:ring-offset-comfy-bg-primary',
  {
    variants: {
      size: {
        xs: 'w-3 h-3',
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
        xl: 'w-7 h-7'
      },
      disabled: {
        true: 'cursor-not-allowed',
        false: 'hover:scale-110'
      }
    },
    defaultVariants: {
      size: 'md',
      disabled: false
    }
  }
)

/**
 * A customizable slider component with keyboard navigation and value display.
 * 
 * @example
 * ```tsx
 * <Slider
 *   label="Volume"
 *   value={volume}
 *   onChange={setVolume}
 *   min={0}
 *   max={100}
 *   step={1}
 *   showValue
 *   formatValue={(value) => `${value}%`}
 * />
 * ```
 */
const Slider = forwardRef<HTMLDivElement, SliderProps>(
  ({
    className,
    label,
    error,
    helpText,
    required,
    disabled,
    testId,
    id,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    showValue = false,
    formatValue,
    size = 'md'
  }, ref) => {
    const sliderId = useId()
    const finalId = id || sliderId
    const hasError = !!error
    
    const sliderRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)

    // Calculate percentage
    const percentage = ((value - min) / (max - min)) * 100

    // Format display value
    const displayValue = formatValue ? formatValue(value) : value.toString()

    // Handle mouse/touch events
    const updateValue = (clientX: number) => {
      if (!trackRef.current || disabled) return
      
      const rect = trackRef.current.getBoundingClientRect()
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newValue = min + percentage * (max - min)
      const steppedValue = Math.round(newValue / step) * step
      const clampedValue = Math.max(min, Math.min(max, steppedValue))
      
      onChange(clampedValue)
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      if (disabled) return
      
      updateValue(e.clientX)
      
      const handleMouseMove = (e: MouseEvent) => {
        updateValue(e.clientX)
      }
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return

      const stepSize = step
      let newValue = value

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault()
          newValue = Math.max(min, value - stepSize)
          break
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault()
          newValue = Math.min(max, value + stepSize)
          break
        case 'Home':
          e.preventDefault()
          newValue = min
          break
        case 'End':
          e.preventDefault()
          newValue = max
          break
        case 'PageDown':
          e.preventDefault()
          newValue = Math.max(min, value - stepSize * 10)
          break
        case 'PageUp':
          e.preventDefault()
          newValue = Math.min(max, value + stepSize * 10)
          break
        default:
          return
      }

      onChange(newValue)
    }

    return (
      <div className="w-full" ref={ref}>
        <div className="flex items-center justify-between mb-2">
          {label && (
            <label
              htmlFor={finalId}
              className="block text-sm font-medium text-comfy-text-primary"
            >
              {label}
              {required && (
                <span className="text-comfy-error ml-1" aria-label="required">
                  *
                </span>
              )}
            </label>
          )}
          
          {showValue && (
            <span className="text-sm text-comfy-text-secondary font-mono">
              {displayValue}
            </span>
          )}
        </div>
        
        <div className="relative py-2">
          <div
            ref={trackRef}
            className={cn(sliderVariants({ size, disabled, className }))}
            onMouseDown={handleMouseDown}
          >
            {/* Fill */}
            <div
              className="absolute top-0 left-0 h-full bg-comfy-accent-orange rounded-full transition-all duration-200"
              style={{ width: `${percentage}%` }}
            />
            
            {/* Thumb */}
            <div
              ref={sliderRef}
              className={cn(thumbVariants({ size, disabled }))}
              style={{ left: `${percentage}%`, transform: `translateX(-50%) translateY(-50%)` }}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={displayValue}
              aria-invalid={hasError}
              aria-describedby={
                error ? `${finalId}-error` : helpText ? `${finalId}-help` : undefined
              }
              onKeyDown={handleKeyDown}
              data-testid={testId}
            />
          </div>
        </div>
        
        <div className="flex items-center justify-between text-xs text-comfy-text-secondary mt-1">
          <span>{formatValue ? formatValue(min) : min}</span>
          <span>{formatValue ? formatValue(max) : max}</span>
        </div>
        
        {error && (
          <p
            id={`${finalId}-error`}
            className="mt-1.5 text-sm text-comfy-error"
            role="alert"
          >
            {error}
          </p>
        )}
        
        {helpText && !error && (
          <p
            id={`${finalId}-help`}
            className="mt-1.5 text-sm text-comfy-text-secondary"
          >
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Slider.displayName = 'Slider'

export { Slider, sliderVariants, thumbVariants }