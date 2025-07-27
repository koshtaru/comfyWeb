import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import Tooltip from './Tooltip'
import type { BaseComponentProps } from '../../types/component'

const iconButtonVariants = cva(
  'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-comfy-bg-primary disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-comfy-accent-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-comfy focus:ring-comfy-accent-orange',
        secondary: 'bg-comfy-bg-tertiary hover:bg-gray-600 text-comfy-text-primary border border-comfy-border focus:ring-comfy-accent-blue',
        ghost: 'hover:bg-comfy-bg-tertiary text-comfy-text-secondary hover:text-comfy-text-primary focus:ring-comfy-accent-blue',
        danger: 'bg-comfy-error hover:bg-red-600 text-white shadow-comfy focus:ring-comfy-error'
      },
      size: {
        xs: 'h-6 w-6 text-xs',
        sm: 'h-8 w-8 text-sm',
        md: 'h-10 w-10 text-base',
        lg: 'h-12 w-12 text-lg',
        xl: 'h-14 w-14 text-xl'
      }
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md'
    }
  }
)

/**
 * Icon-only button component with integrated tooltip support.
 * 
 * @example
 * ```tsx
 * <IconButton
 *   variant="primary"
 *   size="md"
 *   tooltip="Delete item"
 *   onClick={handleDelete}
 * >
 *   <TrashIcon />
 * </IconButton>
 * ```
 */
export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
          BaseComponentProps,
          VariantProps<typeof iconButtonVariants> {
  /** Tooltip content to display on hover */
  tooltip?: React.ReactNode
  /** Tooltip placement */
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
  /** Whether the button is in a loading state */
  loading?: boolean
  /** Icon element to display */
  children: React.ReactNode
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    tooltip,
    tooltipPlacement = 'top',
    loading = false,
    disabled,
    children,
    testId,
    ...props 
  }, ref) => {
    const button = (
      <button
        ref={ref}
        className={cn(iconButtonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        data-testid={testId}
        aria-label={typeof tooltip === 'string' ? tooltip : undefined}
        {...props}
      >
        {loading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          children
        )}
      </button>
    )

    if (tooltip && !disabled && !loading) {
      return (
        <Tooltip 
          content={tooltip} 
          placement={tooltipPlacement}
          trigger="hover"
          delay={500}
        >
          {button}
        </Tooltip>
      )
    }

    return button
  }
)

IconButton.displayName = 'IconButton'

export { IconButton, iconButtonVariants }