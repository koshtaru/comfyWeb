// ============================================================================
// ComfyUI React - Spinner Helper Components
// ============================================================================

import React, { forwardRef } from 'react'
import { cn } from './cn'
import Spinner, { type SpinnerProps } from '@/components/ui/Spinner'

export interface CenteredSpinnerProps extends SpinnerProps {
  /** Whether to fill the entire container */
  fullScreen?: boolean
}

export const CenteredSpinner = forwardRef<HTMLDivElement, CenteredSpinnerProps>(
  ({ fullScreen = false, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-center',
          fullScreen ? 'fixed inset-0 bg-comfy-bg-primary bg-opacity-75 z-50' : 'w-full h-32',
          className
        )}
      >
        <Spinner {...props} />
      </div>
    )
  }
)

CenteredSpinner.displayName = 'CenteredSpinner'