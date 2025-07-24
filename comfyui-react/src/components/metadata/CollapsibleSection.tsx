// Collapsible Section Component with Smooth Animations
// Provides expandable/collapsible content sections with 300ms cubic-bezier animations

import React, { useRef, useEffect, useState } from 'react'
import './CollapsibleSection.css'

export interface CollapsibleSectionProps {
  id: string
  title: string
  subtitle?: string
  icon?: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
  className?: string
  defaultExpanded?: boolean
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  animationDuration?: number
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  subtitle,
  icon,
  isExpanded,
  onToggle,
  children,
  className = '',
  disabled = false,
  size = 'medium',
  animationDuration = 300
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Calculate content height when expanded state changes
  useEffect(() => {
    if (!contentRef.current) return

    const measureHeight = () => {
      const element = contentRef.current!
      
      // Temporarily make content visible to measure its natural height
      const originalHeight = element.style.height
      const originalOverflow = element.style.overflow
      
      element.style.height = 'auto'
      element.style.overflow = 'visible'
      
      const scrollHeight = element.scrollHeight
      
      // Restore original styles
      element.style.height = originalHeight
      element.style.overflow = originalOverflow
      
      setContentHeight(scrollHeight)
    }

    // Measure height immediately
    measureHeight()

    // Set animation state
    setIsAnimating(true)
    const animationTimer = setTimeout(() => {
      setIsAnimating(false)
    }, animationDuration)

    // Add ResizeObserver to handle dynamic content changes
    const resizeObserver = new ResizeObserver(() => {
      if (isExpanded) {
        measureHeight()
      }
    })

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }

    // Cleanup
    return () => {
      clearTimeout(animationTimer)
      resizeObserver.disconnect()
    }
  }, [isExpanded, children, animationDuration])

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        onToggle()
        break
      case 'Escape':
        if (isExpanded) {
          onToggle()
        }
        break
    }
  }

  // Animation styles
  const contentStyle: React.CSSProperties = {
    height: isExpanded ? contentHeight : 0,
    transition: `height ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    overflow: 'hidden'
  }

  return (
    <div
      className={`
        collapsible-section 
        ${size} 
        ${isExpanded ? 'expanded' : 'collapsed'}
        ${disabled ? 'disabled' : ''}
        ${isAnimating ? 'animating' : ''}
        ${className}
      `.trim()}
      data-testid={`collapsible-section-${id}`}
    >
      {/* Section Header */}
      <div
        className="section-header"
        onClick={disabled ? undefined : onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-expanded={isExpanded}
        aria-controls={`section-content-${id}`}
        aria-disabled={disabled}
        title={disabled ? 'Section is disabled' : undefined}
      >
        {/* Expand/Collapse Indicator */}
        <div className="expand-indicator">
          <svg
            className="expand-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: `transform ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
            }}
          >
            <path
              fill="currentColor"
              d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"
            />
          </svg>
        </div>

        {/* Section Icon */}
        {icon && (
          <div className="section-icon" aria-hidden="true">
            {icon}
          </div>
        )}

        {/* Section Title and Subtitle */}
        <div className="section-text">
          <h3 className="section-title">{title}</h3>
          {subtitle && (
            <p className="section-subtitle">{subtitle}</p>
          )}
        </div>

        {/* Section Actions Slot */}
        <div className="section-actions">
          {/* Space for additional buttons/actions */}
        </div>
      </div>

      {/* Section Content */}
      <div
        id={`section-content-${id}`}
        className="section-content-wrapper"
        style={contentStyle}
        aria-hidden={!isExpanded}
      >
        <div
          ref={contentRef}
          className="section-content"
          role="region"
          aria-labelledby={`section-header-${id}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// Utility component for section actions
export interface SectionActionProps {
  icon: string
  label: string
  onClick: () => void
  disabled?: boolean
  className?: string
}

export const SectionAction: React.FC<SectionActionProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  className = ''
}) => {
  return (
    <button
      type="button"
      className={`section-action ${disabled ? 'disabled' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation() // Prevent triggering section toggle
        if (!disabled) onClick()
      }}
      disabled={disabled}
      title={label}
      aria-label={label}
    >
      <span className="action-icon" aria-hidden="true">{icon}</span>
    </button>
  )
}

// Compound component for grouped sections
export interface SectionGroupProps {
  title?: string
  children: React.ReactNode
  className?: string
  expandAll?: () => void
  collapseAll?: () => void
}

export const SectionGroup: React.FC<SectionGroupProps> = ({
  title,
  children,
  className = '',
  expandAll,
  collapseAll
}) => {
  return (
    <div className={`section-group ${className}`}>
      {title && (
        <div className="group-header">
          <h2 className="group-title">{title}</h2>
          <div className="group-actions">
            {expandAll && (
              <button
                type="button"
                className="group-action"
                onClick={expandAll}
                title="Expand all sections"
              >
                Expand All
              </button>
            )}
            {collapseAll && (
              <button
                type="button"
                className="group-action"
                onClick={collapseAll}
                title="Collapse all sections"
              >
                Collapse All
              </button>
            )}
          </div>
        </div>
      )}
      <div className="group-content">
        {children}
      </div>
    </div>
  )
}

// Hook for managing multiple collapsible sections
export interface UseCollapsibleSectionsOptions {
  defaultExpanded?: string[]
  maxExpanded?: number
  accordion?: boolean // Only allow one section expanded at a time
}

export const useCollapsibleSections = (
  sectionIds: string[],
  options: UseCollapsibleSectionsOptions = {}
) => {
  const {
    defaultExpanded = [],
    maxExpanded,
    accordion = false
  } = options

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(defaultExpanded)
  )

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      
      if (newSet.has(sectionId)) {
        // Collapse section
        newSet.delete(sectionId)
      } else {
        // Expand section
        if (accordion) {
          // Accordion mode: close all others
          newSet.clear()
          newSet.add(sectionId)
        } else if (maxExpanded && newSet.size >= maxExpanded) {
          // Respect max expanded limit
          const firstExpanded = Array.from(newSet)[0]
          newSet.delete(firstExpanded)
          newSet.add(sectionId)
        } else {
          // Normal expansion
          newSet.add(sectionId)
        }
      }
      
      return newSet
    })
  }

  const expandAll = () => {
    if (accordion) return // Cannot expand all in accordion mode
    
    const sectionsToExpand = maxExpanded
      ? sectionIds.slice(0, maxExpanded)
      : sectionIds
    
    setExpandedSections(new Set(sectionsToExpand))
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  const isExpanded = (sectionId: string) => {
    return expandedSections.has(sectionId)
  }

  const getExpandedCount = () => {
    return expandedSections.size
  }

  return {
    expandedSections,
    toggleSection,
    expandAll,
    collapseAll,
    isExpanded,
    getExpandedCount
  }
}

// Animation presets
export const ANIMATION_PRESETS = {
  fast: 150,
  normal: 300,
  slow: 500,
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
} as const