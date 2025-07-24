// ============================================================================
// ComfyUI React - Card Component
// ============================================================================

import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { BaseComponentProps, CardProps } from '../../types/component'

// Card variants using CVA
const cardVariants = cva(
  // Base classes
  'rounded-lg border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-comfy-bg-secondary border-comfy-border',
        elevated: 'bg-comfy-bg-secondary border-comfy-border shadow-comfy',
        outlined: 'bg-transparent border-comfy-border'
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6'
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-comfy-lg hover:border-comfy-accent-blue/50',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      interactive: false
    }
  }
)

/**
 * A versatile card component for content containers with multiple variants.
 * 
 * @example
 * ```tsx
 * <Card variant="elevated" padding="lg" interactive onClick={handleClick}>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *   </CardHeader>
 *   <CardContent>
 *     Card content goes here...
 *   </CardContent>
 * </Card>
 * ```
 */
interface CardComponent extends 
  React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>,
  VariantProps<typeof cardVariants> {
  displayName?: string
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant,
    padding,
    interactive,
    onClick,
    children,
    testId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, padding, interactive, className }))}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        } : undefined}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    )
  }
) as CardComponent

Card.displayName = 'Card'

/**
 * Card header component for consistent card layouts.
 */
const CardHeader = forwardRef<HTMLDivElement, BaseComponentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 pb-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardHeader.displayName = 'CardHeader'

/**
 * Card title component with proper typography.
 */
const CardTitle = forwardRef<HTMLHeadingElement, BaseComponentProps & {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}>(({ className, as: Component = 'h3', children, ...props }, ref) => (
  <Component
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-comfy-text-primary', className)}
    {...props}
  >
    {children}
  </Component>
))
CardTitle.displayName = 'CardTitle'

/**
 * Card description component for subtitle text.
 */
const CardDescription = forwardRef<HTMLParagraphElement, BaseComponentProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-comfy-text-secondary', className)}
      {...props}
    >
      {children}
    </p>
  )
)
CardDescription.displayName = 'CardDescription'

/**
 * Card content component for main content area.
 */
const CardContent = forwardRef<HTMLDivElement, BaseComponentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardContent.displayName = 'CardContent'

/**
 * Card footer component for actions or additional info.
 */
const CardFooter = forwardRef<HTMLDivElement, BaseComponentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardFooter.displayName = 'CardFooter'

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  cardVariants 
}