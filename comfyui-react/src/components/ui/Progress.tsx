import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { BaseComponentProps } from '../../types/component'

const progressVariants = cva(
  'w-full bg-comfy-bg-tertiary rounded-full overflow-hidden',
  {
    variants: {
      size: {
        xs: 'h-1',
        sm: 'h-2',
        md: 'h-3',
        lg: 'h-4',
        xl: 'h-6'
      }
    },
    defaultVariants: {
      size: 'md'
    }
  }
)

const progressBarVariants = cva(
  'h-full transition-all duration-300 ease-out rounded-full',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-comfy-accent-orange to-orange-600',
        success: 'bg-gradient-to-r from-green-500 to-green-600',
        warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
        error: 'bg-gradient-to-r from-red-500 to-red-600',
        info: 'bg-gradient-to-r from-comfy-accent-blue to-blue-600'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

/**
 * Progress bar component for showing generation status and other progress indicators.
 * 
 * @example
 * ```tsx
 * <Progress 
 *   value={75} 
 *   max={100}
 *   showLabel
 *   variant="default"
 *   size="md"
 * />
 * ```
 */
export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
          BaseComponentProps,
          VariantProps<typeof progressVariants> {
  /** Current progress value */
  value?: number
  /** Maximum progress value */
  max?: number
  /** Visual variant for different states */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  /** Whether to show percentage label */
  showLabel?: boolean
  /** Custom label text */
  label?: string
  /** Whether the progress bar is indeterminate (animated) */
  indeterminate?: boolean
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className,
    size,
    variant = 'default',
    value = 0,
    max = 100,
    showLabel = false,
    label,
    indeterminate = false,
    testId,
    ...props 
  }, ref) => {
    // Ensure value is within bounds
    const normalizedValue = Math.min(Math.max(value, 0), max)
    const percentage = max > 0 ? (normalizedValue / max) * 100 : 0

    const displayLabel = label || (showLabel ? `${Math.round(percentage)}%` : '')

    return (
      <div
        ref={ref}
        className={cn('relative', className)}
        data-testid={testId}
        {...props}
      >
        {displayLabel && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-comfy-text-primary">
              {displayLabel}
            </span>
            {showLabel && !label && (
              <span className="text-sm text-comfy-text-secondary">
                {normalizedValue} / {max}
              </span>
            )}
          </div>
        )}
        
        <div 
          className={cn(progressVariants({ size }))}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : normalizedValue}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={typeof label === 'string' ? label : `Progress: ${percentage}%`}
        >
          <div
            className={cn(
              progressBarVariants({ variant }),
              indeterminate && 'animate-pulse'
            )}
            style={{
              width: indeterminate ? '100%' : `${percentage}%`,
              ...(indeterminate && {
                background: 'linear-gradient(90deg, transparent 0%, currentColor 50%, transparent 100%)',
                animation: 'progress-indeterminate 2s infinite linear'
              })
            }}
          />
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'

// CSS animation for indeterminate progress
const progressAnimationCSS = `
@keyframes progress-indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
`

// Inject CSS if it doesn't exist
if (typeof document !== 'undefined' && !document.getElementById('progress-animations')) {
  const style = document.createElement('style')
  style.id = 'progress-animations'
  style.textContent = progressAnimationCSS
  document.head.appendChild(style)
}

export { Progress, progressVariants }