// ============================================================================
// ComfyUI React - TextArea Component
// ============================================================================

import React, { forwardRef, useId, useRef, useEffect } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { FormControlProps, InputVariant, SizeVariant } from '../../types/component'

// TextArea variants using CVA (reusing input variants)
const textAreaVariants = cva(
  // Base classes
  'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-comfy-bg-primary disabled:opacity-50 disabled:cursor-not-allowed resize-vertical',
  {
    variants: {
      variant: {
        default: 'bg-comfy-bg-tertiary border-comfy-border text-comfy-text-primary placeholder:text-comfy-text-secondary focus:border-comfy-accent-blue focus:ring-comfy-accent-blue',
        filled: 'bg-comfy-bg-secondary border-transparent text-comfy-text-primary placeholder:text-comfy-text-secondary focus:bg-comfy-bg-tertiary focus:ring-comfy-accent-blue',
        outlined: 'bg-transparent border-comfy-border text-comfy-text-primary placeholder:text-comfy-text-secondary focus:border-comfy-accent-blue focus:ring-comfy-accent-blue'
      },
      size: {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-2.5 text-base',
        xl: 'px-4 py-3 text-lg'
      },
      error: {
        true: 'border-comfy-error focus:border-comfy-error focus:ring-comfy-error',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      error: false
    }
  }
)

/**
 * A versatile textarea component with auto-resize capability and character counting.
 * 
 * @example
 * ```tsx
 * <TextArea
 *   label="Description"
 *   value={description}
 *   onChange={setDescription}
 *   placeholder="Enter description..."
 *   rows={4}
 *   autoResize
 *   maxLength={500}
 *   showCharCount
 * />
 * ```
 */
export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value' | 'size'>,
          Omit<FormControlProps<string>, 'children'> {
  /** TextArea variant */
  variant?: InputVariant
  /** TextArea size */
  size?: SizeVariant
  /** Help text to display below textarea */
  helpText?: string
  /** Whether to auto-resize based on content */
  autoResize?: boolean
  /** Minimum rows when auto-resizing */
  minRows?: number
  /** Maximum rows when auto-resizing */
  maxRows?: number
  /** Whether to show character count */
  showCharCount?: boolean
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({
    className,
    variant,
    size,
    label,
    error,
    helpText,
    required,
    disabled,
    testId,
    id,
    value,
    onChange,
    autoResize = false,
    minRows = 3,
    maxRows = 10,
    showCharCount = false,
    maxLength,
    rows = 3,
    ...props
  }, ref) => {
    const textareaId = useId()
    const finalId = id || textareaId
    const hasError = !!error
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value)
    }

    // Auto-resize functionality
    useEffect(() => {
      const textarea = textareaRef.current
      if (!textarea || !autoResize) return

      const adjustHeight = () => {
        textarea.style.height = 'auto'
        const scrollHeight = textarea.scrollHeight
        const minHeight = minRows * 24 // Approximate line height
        const maxHeight = maxRows * 24
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
        textarea.style.height = `${newHeight}px`
      }

      adjustHeight()
      textarea.addEventListener('input', adjustHeight)

      return () => {
        textarea.removeEventListener('input', adjustHeight)
      }
    }, [value, autoResize, minRows, maxRows, textareaRef])

    const charCount = typeof value === 'string' ? value.length : 0
    const isOverLimit = maxLength && charCount > maxLength

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={finalId}
            className="block text-sm font-medium text-comfy-text-primary mb-1.5"
          >
            {label}
            {required && (
              <span className="text-comfy-error ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={finalId}
            className={cn(
              textAreaVariants({ variant, size, error: hasError }),
              className
            )}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            rows={autoResize ? minRows : rows}
            maxLength={maxLength}
            aria-invalid={hasError}
            aria-describedby={
              error 
                ? `${finalId}-error` 
                : helpText 
                ? `${finalId}-help` 
                : showCharCount
                ? `${finalId}-count`
                : undefined
            }
            data-testid={testId}
            {...props}
          />
        </div>
        
        <div className="flex items-center justify-between mt-1.5">
          <div>
            {error && (
              <p
                id={`${finalId}-error`}
                className="text-sm text-comfy-error"
                role="alert"
              >
                {error}
              </p>
            )}
            
            {helpText && !error && (
              <p
                id={`${finalId}-help`}
                className="text-sm text-comfy-text-secondary"
              >
                {helpText}
              </p>
            )}
          </div>
          
          {showCharCount && (
            <p
              id={`${finalId}-count`}
              className={cn(
                'text-sm',
                isOverLimit ? 'text-comfy-error' : 'text-comfy-text-secondary'
              )}
            >
              {charCount}
              {maxLength && ` / ${maxLength}`}
            </p>
          )}
        </div>
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'

export { TextArea, textAreaVariants }