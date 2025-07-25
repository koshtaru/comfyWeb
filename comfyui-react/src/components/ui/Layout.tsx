import React, { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { BaseComponentProps } from '../../types/component'

const layoutVariants = cva(
  'min-h-screen bg-comfy-bg-primary',
  {
    variants: {
      variant: {
        default: 'grid grid-rows-[auto_1fr] grid-cols-1',
        sidebar: 'grid grid-rows-[auto_1fr] grid-cols-[auto_1fr]',
        'sidebar-right': 'grid grid-rows-[auto_1fr] grid-cols-[1fr_auto]',
        'three-column': 'grid grid-rows-[auto_1fr] grid-cols-[auto_1fr_auto]'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

/**
 * Main layout component providing structure for the application with CSS Grid.
 * 
 * @example
 * ```tsx
 * <Layout variant="sidebar">
 *   <LayoutHeader>
 *     <nav>Navigation</nav>
 *   </LayoutHeader>
 *   <LayoutSidebar>
 *     <aside>Sidebar content</aside>
 *   </LayoutSidebar>
 *   <LayoutMain>
 *     <main>Main content</main>
 *   </LayoutMain>
 * </Layout>
 * ```
 */
export interface LayoutProps
  extends React.HTMLAttributes<HTMLDivElement>,
          BaseComponentProps,
          VariantProps<typeof layoutVariants> {}

const Layout = forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, variant, children, testId, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(layoutVariants({ variant }), className)}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Layout.displayName = 'Layout'

/**
 * Header section of the layout.
 */
export interface LayoutHeaderProps extends React.HTMLAttributes<HTMLElement> {}

const LayoutHeader = forwardRef<HTMLElement, LayoutHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          'bg-comfy-bg-secondary border-b border-comfy-border px-4 py-3 col-span-full z-10',
          className
        )}
        {...props}
      >
        {children}
      </header>
    )
  }
)

LayoutHeader.displayName = 'LayoutHeader'

/**
 * Sidebar section of the layout.
 */
export interface LayoutSidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Position of the sidebar */
  position?: 'left' | 'right'
  /** Width of the sidebar */
  width?: 'sm' | 'md' | 'lg' | 'xl'
  /** Whether the sidebar is collapsible */
  collapsible?: boolean
  /** Whether the sidebar is collapsed */
  collapsed?: boolean
}

const LayoutSidebar = forwardRef<HTMLElement, LayoutSidebarProps>(
  ({ 
    className, 
    position = 'left',
    width = 'md',
    collapsible = false,
    collapsed = false,
    children, 
    ...props 
  }, ref) => {
    const widthClasses = {
      sm: collapsed ? 'w-16' : 'w-48',
      md: collapsed ? 'w-16' : 'w-64',
      lg: collapsed ? 'w-16' : 'w-80',
      xl: collapsed ? 'w-16' : 'w-96'
    }

    return (
      <aside
        ref={ref}
        className={cn(
          'bg-comfy-bg-secondary border-comfy-border',
          position === 'right' ? 'border-l' : 'border-r',
          widthClasses[width],
          collapsible && 'transition-all duration-300 ease-in-out',
          'overflow-hidden',
          className
        )}
        {...props}
      >
        <div className="h-full overflow-y-auto p-4">
          {children}
        </div>
      </aside>
    )
  }
)

LayoutSidebar.displayName = 'LayoutSidebar'

/**
 * Main content area of the layout.
 */
export interface LayoutMainProps extends React.HTMLAttributes<HTMLElement> {
  /** Padding for the main content */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const LayoutMain = forwardRef<HTMLElement, LayoutMainProps>(
  ({ className, padding = 'md', children, ...props }, ref) => {
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }

    return (
      <main
        ref={ref}
        className={cn(
          'bg-comfy-bg-primary min-h-0 overflow-auto',
          paddingClasses[padding],
          className
        )}
        {...props}
      >
        {children}
      </main>
    )
  }
)

LayoutMain.displayName = 'LayoutMain'

/**
 * Footer section of the layout.
 */
export interface LayoutFooterProps extends React.HTMLAttributes<HTMLElement> {}

const LayoutFooter = forwardRef<HTMLElement, LayoutFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <footer
        ref={ref}
        className={cn(
          'bg-comfy-bg-secondary border-t border-comfy-border px-4 py-3 col-span-full mt-auto',
          className
        )}
        {...props}
      >
        {children}
      </footer>
    )
  }
)

LayoutFooter.displayName = 'LayoutFooter'

export { 
  Layout, 
  LayoutHeader, 
  LayoutSidebar, 
  LayoutMain, 
  LayoutFooter,
  layoutVariants 
}