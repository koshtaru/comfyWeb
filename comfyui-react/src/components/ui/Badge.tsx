import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { BaseComponentProps } from '../../types/component'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-comfy-bg-tertiary text-comfy-text-primary hover:bg-comfy-bg-tertiary/80',
        primary: 'border-transparent bg-gradient-to-r from-comfy-accent-orange to-orange-600 text-white shadow hover:shadow-md',
        secondary: 'border-transparent bg-comfy-text-secondary text-comfy-bg-primary hover:bg-comfy-text-secondary/80',
        success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100/80 dark:hover:bg-green-900/50',
        warning: 'border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100/80 dark:hover:bg-yellow-900/50',
        error: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/50',
        outline: 'border-comfy-border text-comfy-text-secondary hover:bg-comfy-bg-tertiary hover:text-comfy-text-primary'
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
)

/**
 * Badge component for status indicators and metadata display.
 * 
 * @example
 * ```tsx
 * <Badge variant="success" size="sm">
 *   Active
 * </Badge>
 * ```
 */
export interface BadgeProps
  extends BaseComponentProps,
          VariantProps<typeof badgeVariants> {
  /** Icon to display before text */
  icon?: React.ReactNode
  /** Whether the badge is clickable */
  clickable?: boolean
  /** Click handler when clickable */
  onClick?: () => void
  /** Additional CSS class */
  className?: string
  /** Children content */
  children: React.ReactNode
}

const Badge = forwardRef<HTMLElement, BadgeProps>(
  ({ 
    className,
    variant,
    size,
    icon,
    clickable = false,
    onClick,
    children,
    testId,
    ...props 
  }, ref) => {
    if (clickable) {
      return (
        <button
          ref={ref as React.RefObject<HTMLButtonElement>}
          type="button"
          className={cn(
            badgeVariants({ variant, size }),
            'cursor-pointer hover:scale-105 active:scale-95',
            className
          )}
          onClick={onClick}
          data-testid={testId}
        >
          {icon && (
            <span className="mr-1" aria-hidden="true">
              {icon}
            </span>
          )}
          {children}
        </button>
      )
    }
    
    return (
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className={cn(badgeVariants({ variant, size }), className)}
        data-testid={testId}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {icon && (
          <span className="mr-1" aria-hidden="true">
            {icon}
          </span>
        )}
        {children}
      </div>
    )
  }
)

Badge.displayName = 'Badge'

/**
 * Tag component for removable labels and categories.
 * 
 * @example
 * ```tsx
 * <Tag onRemove={() => handleRemove('tag-id')}>
 *   React
 * </Tag>
 * ```
 */
export interface TagProps extends Omit<BadgeProps, 'clickable'> {
  /** Whether the tag can be removed */
  removable?: boolean
  /** Callback when tag is removed */
  onRemove?: () => void
  /** Custom remove icon */
  removeIcon?: React.ReactNode
}

const Tag = forwardRef<HTMLDivElement, TagProps>(
  ({ 
    className,
    variant = 'outline',
    size,
    icon,
    removable = false,
    onRemove,
    removeIcon,
    children,
    testId,
    ...props 
  }, ref) => {
    const defaultRemoveIcon = (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    )

    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          'gap-1',
          className
        )}
        data-testid={testId}
        {...props}
      >
        {icon && (
          <span aria-hidden="true">
            {icon}
          </span>
        )}
        
        <span>{children}</span>
        
        {removable && onRemove && (
          <button
            type="button"
            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-ring"
            onClick={onRemove}
            aria-label={`Remove ${children}`}
          >
            {removeIcon || defaultRemoveIcon}
          </button>
        )}
      </div>
    )
  }
)

Tag.displayName = 'Tag'

export { Badge, Tag, badgeVariants }