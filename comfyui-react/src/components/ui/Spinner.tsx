import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { BaseComponentProps } from '../../types/component'

const spinnerVariants = cva(
  'animate-spin rounded-full border-solid',
  {
    variants: {
      size: {
        xs: 'h-3 w-3 border',
        sm: 'h-4 w-4 border',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2',
        xl: 'h-12 w-12 border-4'
      },
      variant: {
        default: 'border-comfy-accent-orange border-t-transparent',
        primary: 'border-comfy-accent-orange border-t-transparent',
        secondary: 'border-comfy-text-secondary border-t-transparent',
        success: 'border-green-500 border-t-transparent',
        warning: 'border-yellow-500 border-t-transparent',
        error: 'border-red-500 border-t-transparent',
        white: 'border-white border-t-transparent'
      }
    },
    defaultVariants: {
      size: 'md',
      variant: 'default'
    }
  }
)

/**
 * Spinner component for loading states with customizable sizes and colors.
 * 
 * @example
 * ```tsx
 * <Spinner 
 *   size="lg" 
 *   variant="primary"
 *   label="Loading..."
 * />
 * ```
 */
export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
          BaseComponentProps,
          VariantProps<typeof spinnerVariants> {
  /** Accessible label for screen readers */
  label?: string
  /** Whether to show the label text */
  showLabel?: boolean
}

const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  ({ 
    className,
    size,
    variant,
    label = 'Loading...',
    showLabel = false,
    testId,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center', className)}
        data-testid={testId}
        {...props}
      >
        <div
          className={cn(spinnerVariants({ size, variant }))}
          role="status"
          aria-label={label}
        >
          <span className="sr-only">{label}</span>
        </div>
        
        {showLabel && (
          <span className="ml-2 text-sm text-comfy-text-secondary">
            {label}
          </span>
        )}
      </div>
    )
  }
)

Spinner.displayName = 'Spinner'

/**
 * Centered spinner for full-screen or container loading states.
 */
export interface CenteredSpinnerProps extends SpinnerProps {
  /** Whether to fill the entire container */
  fullScreen?: boolean
}

export const CenteredSpinner = forwardRef<HTMLDivElement, CenteredSpinnerProps>(
  ({ fullScreen = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center',
          fullScreen ? 'fixed inset-0 bg-comfy-bg-primary bg-opacity-75 z-50' : 'w-full h-32',
          className
        )}
      >
        <Spinner {...props} />
      </div>
    )
  }
)

CenteredSpinner.displayName = 'CenteredSpinner'

export { Spinner, spinnerVariants }