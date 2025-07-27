// ============================================================================
// ComfyUI React - Button Variants Configuration
// ============================================================================

import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  // Base classes
  'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-comfy-bg-primary disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-gradient-to-r from-comfy-accent-orange to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-comfy focus:ring-comfy-accent-orange',
        secondary: 'bg-comfy-bg-tertiary hover:bg-gray-600 text-comfy-text-primary border border-comfy-border focus:ring-comfy-accent-blue',
        ghost: 'hover:bg-comfy-bg-tertiary text-comfy-text-secondary hover:text-comfy-text-primary focus:ring-comfy-accent-blue',
        danger: 'bg-comfy-error hover:bg-red-600 text-white shadow-comfy focus:ring-comfy-error'
      },
      size: {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
)