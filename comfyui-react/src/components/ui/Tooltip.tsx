import React, { useState, useRef, useEffect } from 'react'
import './Tooltip.css'

export interface TooltipProps {
  /** The content to display in the tooltip */
  content: React.ReactNode
  /** Placement of the tooltip relative to the trigger */
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** How the tooltip is triggered */
  trigger?: 'hover' | 'click' | 'focus'
  /** Delay before showing tooltip (in ms) */
  delay?: number
  /** Maximum width of the tooltip */
  maxWidth?: number
  /** Whether the tooltip is disabled */
  disabled?: boolean
  /** Additional CSS class */
  className?: string
  /** Children that trigger the tooltip */
  children: React.ReactNode
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  placement = 'top',
  trigger = 'hover',
  delay = 300,
  maxWidth = 320,
  disabled = false,
  className = '',
  children
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate tooltip position
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let top = 0
    let left = 0

    switch (placement) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - 8
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'bottom':
        top = triggerRect.bottom + 8
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left - tooltipRect.width - 8
        break
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + 8
        break
    }

    // Adjust for viewport boundaries
    if (left < 8) left = 8
    if (left + tooltipRect.width > viewport.width - 8) {
      left = viewport.width - tooltipRect.width - 8
    }
    if (top < 8) top = 8
    if (top + tooltipRect.height > viewport.height - 8) {
      top = viewport.height - tooltipRect.height - 8
    }

    setPosition({ top, left })
  }

  const showTooltip = () => {
    if (disabled) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
  }

  const toggleTooltip = () => {
    if (disabled) return
    setIsVisible(!isVisible)
  }

  // Update position when tooltip becomes visible
  useEffect(() => {
    if (isVisible) {
      setTimeout(calculatePosition, 0) // Defer to next tick to ensure DOM is updated
    }
  }, [isVisible, placement])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        setTimeout(calculatePosition, 0)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isVisible])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [])

  const triggerProps = {
    ref: triggerRef,
    ...(trigger === 'hover' && {
      onMouseEnter: showTooltip,
      onMouseLeave: hideTooltip,
      onFocus: showTooltip,
      onBlur: hideTooltip
    }),
    ...(trigger === 'click' && {
      onClick: toggleTooltip
    }),
    ...(trigger === 'focus' && {
      onFocus: showTooltip,
      onBlur: hideTooltip
    })
  }

  return (
    <>
      <div className={`tooltip-trigger ${className}`} {...triggerProps}>
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip-${placement}`}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            maxWidth: maxWidth,
            zIndex: 2000
          }}
          role="tooltip"
          aria-hidden={!isVisible}
        >
          <div className="tooltip-content">
            {content}
          </div>
          <div className={`tooltip-arrow tooltip-arrow-${placement}`} />
        </div>
      )}
    </>
  )
}

export default Tooltip