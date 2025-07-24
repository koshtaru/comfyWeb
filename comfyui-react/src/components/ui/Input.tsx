// ============================================================================
// ComfyUI React - Input Component
// ============================================================================

import React, { forwardRef, useId } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { FormControlProps, InputVariant, SizeVariant } from '../../types/component'

// Input variants using CVA
const inputVariants = cva(
  // Base classes
  'w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-comfy-bg-primary disabled:opacity-50 disabled:cursor-not-allowed',
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
 * A versatile input component with multiple variants and built-in validation states.
 * 
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={setEmail}
 *   placeholder="Enter your email"
 *   required
 * />
 * ```
 */
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'>,
          Omit<FormControlProps<string>, 'children'> {
  /** Input variant */
  variant?: InputVariant
  /** Input size */
  size?: SizeVariant
  /** Left icon element */
  leftIcon?: React.ReactNode
  /** Right icon element */
  rightIcon?: React.ReactNode
  /** Help text to display below input */
  helpText?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    label,
    error,
    helpText,
    leftIcon,
    rightIcon,
    required,
    disabled,
    testId,
    id,
    value,
    onChange,
    ...props
  }, ref) => {
    const inputId = useId()
    const finalId = id || inputId
    const hasError = !!error

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value)
    }

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
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-comfy-text-secondary pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            id={finalId}
            className={cn(
              inputVariants({ variant, size, error: hasError }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${finalId}-error` : helpText ? `${finalId}-help` : undefined
            }
            data-testid={testId}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-comfy-text-secondary pointer-events-none">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input'

export { Input, inputVariants }