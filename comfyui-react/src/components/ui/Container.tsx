// ============================================================================
// ComfyUI React - Container Component
// ============================================================================

import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { BaseComponentProps } from '../../types/component'

// Container variants using CVA
const containerVariants = cva(
  // Base classes
  'mx-auto w-full',
  {
    variants: {
      size: {
        sm: 'max-w-2xl',
        md: 'max-w-4xl',
        lg: 'max-w-6xl',
        xl: 'max-w-7xl',
        full: 'max-w-full',
        none: 'max-w-none'
      },
      padding: {
        none: '',
        xs: 'px-2',
        sm: 'px-4',
        md: 'px-6',
        lg: 'px-8'
      },
      center: {
        true: 'flex items-center justify-center',
        false: ''
      }
    },
    defaultVariants: {
      size: 'lg',
      padding: 'sm',
      center: false
    }
  }
)

/**
 * A responsive container component with configurable max-widths and padding.
 * 
 * @example
 * ```tsx
 * <Container size="md" padding="lg">
 *   <h1>Page Title</h1>
 *   <p>Page content...</p>
 * </Container>
 * ```
 */
export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
          BaseComponentProps,
          VariantProps<typeof containerVariants> {
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({
    className,
    size,
    padding,
    center,
    children,
    testId,
    ...props
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(containerVariants({ size, padding, center, className }))}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Container.displayName = 'Container'

/**
 * A flex container component for flexible layouts.
 */
const Flex = forwardRef<HTMLDivElement, BaseComponentProps & {
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(({
  className,
  direction = 'row',
  align = 'start',
  justify = 'start',
  wrap = 'nowrap',
  gap = 'none',
  children,
  testId,
  ...props
}, ref) => {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse'
  }

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline'
  }

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  }

  const wrapClasses = {
    nowrap: 'flex-nowrap',
    wrap: 'flex-wrap',
    'wrap-reverse': 'flex-wrap-reverse'
  }

  const gapClasses = {
    none: '',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }

  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        directionClasses[direction],
        alignClasses[align],
        justifyClasses[justify],
        wrapClasses[wrap],
        gapClasses[gap],
        className
      )}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  )
})

Flex.displayName = 'Flex'

/**
 * A CSS Grid container component for grid layouts with responsive support.
 */
export interface GridProps extends BaseComponentProps {
  /** Number of columns */
  cols?: '1' | '2' | '3' | '4' | '5' | '6' | '12'
  /** Number of rows */
  rows?: '1' | '2' | '3' | '4' | '5' | '6'
  /** Grid Gap */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Responsive breakpoint configurations */
  responsive?: {
    sm?: '1' | '2' | '3' | '4' | '5' | '6' | '12'
    md?: '1' | '2' | '3' | '4' | '5' | '6' | '12'
    lg?: '1' | '2' | '3' | '4' | '5' | '6' | '12'
    xl?: '1' | '2' | '3' | '4' | '5' | '6' | '12'
  }
}

const Grid = forwardRef<HTMLDivElement, GridProps>(({
  className,
  cols = '1',
  rows,
  gap = 'md',
  responsive,
  children,
  testId,
  ...props
}, ref) => {
  const colClasses = {
    '1': 'grid-cols-1',
    '2': 'grid-cols-2',
    '3': 'grid-cols-3',
    '4': 'grid-cols-4',
    '5': 'grid-cols-5',
    '6': 'grid-cols-6',
    '12': 'grid-cols-12'
  }

  const rowClasses = rows ? {
    '1': 'grid-rows-1',
    '2': 'grid-rows-2',
    '3': 'grid-rows-3',
    '4': 'grid-rows-4',
    '5': 'grid-rows-5',
    '6': 'grid-rows-6'
  } : {}

  const gapClasses = {
    none: '',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  }

  // Build responsive classes
  const responsiveClasses = responsive ? [
    responsive.sm && `sm:grid-cols-${responsive.sm}`,
    responsive.md && `md:grid-cols-${responsive.md}`,
    responsive.lg && `lg:grid-cols-${responsive.lg}`,
    responsive.xl && `xl:grid-cols-${responsive.xl}`
  ].filter(Boolean).join(' ') : '';

  return (
    <div
      ref={ref}
      className={cn(
        'grid',
        colClasses[cols],
        rows && rowClasses[rows as keyof typeof rowClasses],
        gapClasses[gap],
        responsiveClasses,
        className
      )}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  )
})

Grid.displayName = 'Grid'

/**
 * A simple divider component for visual separation.
 */
const Divider = forwardRef<HTMLDivElement, BaseComponentProps & {
  orientation?: 'horizontal' | 'vertical'
  variant?: 'solid' | 'dashed' | 'dotted'
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}>(({
  className,
  orientation = 'horizontal',
  variant = 'solid',
  spacing = 'md',
  ...props
}, ref) => {
  const orientationClasses = {
    horizontal: 'w-full h-px',
    vertical: 'w-px h-full'
  }

  const variantClasses = {
    solid: 'bg-comfy-border',
    dashed: 'border-t border-dashed border-comfy-border bg-transparent',
    dotted: 'border-t border-dotted border-comfy-border bg-transparent'
  }

  const spacingClasses = {
    none: '',
    sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',
    md: orientation === 'horizontal' ? 'my-4' : 'mx-4',
    lg: orientation === 'horizontal' ? 'my-6' : 'mx-6'
  }

  return (
    <div
      ref={ref}
      className={cn(
        orientationClasses[orientation],
        variantClasses[variant],
        spacingClasses[spacing],
        className
      )}
      role="separator"
      {...props}
    />
  )
})

Divider.displayName = 'Divider'

export { Container, Flex, Grid, Divider, containerVariants }