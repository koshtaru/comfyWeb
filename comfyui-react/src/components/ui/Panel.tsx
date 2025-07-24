// ============================================================================
// ComfyUI React - Panel Component
// ============================================================================

import React, { forwardRef, useState } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../utils/cn'
import type { PanelProps } from '../../types/component'

// Panel variants using CVA
const panelVariants = cva(
  // Base classes
  'rounded-lg bg-comfy-bg-secondary border border-comfy-border overflow-hidden',
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-comfy',
        outlined: 'border-comfy-border'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

/**
 * A collapsible panel component with header and content sections.
 * 
 * @example
 * ```tsx
 * <Panel
 *   title="Settings"
 *   collapsible
 *   actions={<Button variant="ghost" size="sm">Edit</Button>}
 * >
 *   Panel content goes here...
 * </Panel>
 * ```
 */
interface PanelComponent extends 
  React.ForwardRefExoticComponent<PanelProps & React.RefAttributes<HTMLDivElement>>,
  VariantProps<typeof panelVariants> {
  displayName?: string
}

const Panel = forwardRef<HTMLDivElement, PanelProps>(
  ({
    className,
    title,
    actions,
    collapsible = false,
    defaultCollapsed = false,
    onCollapseChange,
    children,
    testId,
    ...props
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

    const handleToggle = () => {
      const newCollapsed = !isCollapsed
      setIsCollapsed(newCollapsed)
      onCollapseChange?.(newCollapsed)
    }

    return (
      <div
        ref={ref}
        className={cn(panelVariants({ className }))}
        data-testid={testId}
        {...props}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-comfy-border bg-comfy-bg-tertiary">
            <div className="flex items-center">
              {collapsible && (
                <button
                  onClick={handleToggle}
                  className="mr-2 p-1 rounded hover:bg-comfy-bg-secondary transition-colors"
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                >
                  <svg
                    className={cn(
                      'h-4 w-4 transition-transform duration-200 text-comfy-text-secondary',
                      isCollapsed ? 'rotate-0' : 'rotate-90'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              )}
              <h3 className="text-sm font-medium text-comfy-text-primary">
                {title}
              </h3>
            </div>
            
            {actions && (
              <div className="flex items-center space-x-2">
                {actions}
              </div>
            )}
          </div>
        )}
        
        <div
          className={cn(
            'transition-all duration-200 ease-in-out overflow-hidden',
            isCollapsed && collapsible ? 'max-h-0' : 'max-h-none'
          )}
        >
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    )
  }
) as PanelComponent

Panel.displayName = 'Panel'

/**
 * Panel header component for custom header layouts.
 */
const PanelHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-comfy-border bg-comfy-bg-tertiary',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
PanelHeader.displayName = 'PanelHeader'

/**
 * Panel content component for main content area.
 */
const PanelContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
)
PanelContent.displayName = 'PanelContent'

export { Panel, PanelHeader, PanelContent, panelVariants }