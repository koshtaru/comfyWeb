// ============================================================================
// ComfyUI React - Class Name Utility
// ============================================================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to conditionally combine class names with Tailwind CSS conflict resolution.
 * 
 * This function combines clsx for conditional classes and tailwind-merge for resolving
 * Tailwind CSS class conflicts, ensuring the last applied class takes precedence.
 * 
 * @param inputs - Class values to combine
 * @returns Combined and deduplicated class string
 * 
 * @example
 * ```tsx
 * cn('px-4 py-2', isActive && 'bg-blue-500', className)
 * cn('text-sm text-lg') // Returns 'text-lg' (last one wins)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}