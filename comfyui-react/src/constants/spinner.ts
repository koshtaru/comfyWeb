// ============================================================================
// ComfyUI React - Spinner Variants Configuration
// ============================================================================

import { cva } from 'class-variance-authority'

export const spinnerVariants = cva(
  'animate-spin rounded-full border-solid',
  {
    variants: {
      size: {
        xs: 'h-3 w-3 border',
        sm: 'h-4 w-4 border',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2',
        xl: 'h-12 w-12 border-4'
      },
      variant: {
        default: 'border-comfy-accent-orange border-t-transparent',
        primary: 'border-comfy-accent-orange border-t-transparent',
        secondary: 'border-comfy-text-secondary border-t-transparent',
        success: 'border-green-500 border-t-transparent',
        warning: 'border-yellow-500 border-t-transparent',
        error: 'border-red-500 border-t-transparent',
        white: 'border-white border-t-transparent'
      }
    },
    defaultVariants: {
      size: 'md',
      variant: 'default'
    }
  }
)