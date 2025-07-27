// ============================================================================
// ComfyUI React - Tooltip Component Types
// ============================================================================

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