import React, { forwardRef } from 'react'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { BaseComponentProps } from '../../types/component'
import { spinnerVariants } from '@/constants/spinner'

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

export default Spinner