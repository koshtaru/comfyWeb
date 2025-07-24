// ============================================================================
// ComfyUI React - Component Type Definitions
// ============================================================================

import React from 'react'

// Base component props that all components extend
export interface BaseComponentProps {
  /** Additional CSS classes to apply */
  className?: string
  /** React children */
  children?: React.ReactNode
  /** Test ID for testing */
  testId?: string
}

// Form control props for input components
export interface FormControlProps<T> extends BaseComponentProps {
  /** Current value */
  value: T
  /** Change handler */
  onChange: (value: T) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Input label */
  label?: string
  /** Whether the input is required */
  required?: boolean
  /** Placeholder text */
  placeholder?: string
}

// Standard color variants used across components
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning'

// Standard size variants
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Button specific variants
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

// Input specific variants
export type InputVariant = 'default' | 'filled' | 'outlined'

// Modal specific types
export interface ModalProps extends BaseComponentProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to close the modal */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether clicking backdrop closes modal */
  closeOnBackdrop?: boolean
  /** Whether pressing Escape closes modal */
  closeOnEscape?: boolean
}

// Toast notification types
export interface ToastData {
  id: string
  title?: string
  message: string
  variant: ColorVariant
  duration?: number
  dismissible?: boolean
}

// Tooltip types
export interface TooltipProps extends BaseComponentProps {
  /** Content to show in tooltip */
  content: React.ReactNode
  /** Tooltip placement */
  placement?: 'top' | 'right' | 'bottom' | 'left'
  /** Trigger element */
  children: React.ReactElement
  /** Delay before showing tooltip (ms) */
  delay?: number
  /** Whether tooltip is disabled */
  disabled?: boolean
}

// Progress types
export interface ProgressProps extends BaseComponentProps {
  /** Current progress value (0-100) */
  value: number
  /** Maximum value */
  max?: number
  /** Progress variant */
  variant?: ColorVariant
  /** Progress size */
  size?: SizeVariant
  /** Whether to show percentage text */
  showValue?: boolean
  /** Custom label */
  label?: string
}

// Spinner types
export interface SpinnerProps extends BaseComponentProps {
  /** Spinner size */
  size?: SizeVariant
  /** Spinner color */
  variant?: ColorVariant
  /** Custom label for accessibility */
  label?: string
}

// Badge types
export interface BadgeProps extends BaseComponentProps {
  /** Badge variant */
  variant?: ColorVariant
  /** Badge size */
  size?: SizeVariant
  /** Whether badge is removable */
  removable?: boolean
  /** Remove handler */
  onRemove?: () => void
}

// Card types
export interface CardProps extends BaseComponentProps {
  /** Card variant */
  variant?: 'default' | 'elevated' | 'outlined'
  /** Card padding */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Whether card is interactive (hover effects) */
  interactive?: boolean
  /** Click handler for interactive cards */
  onClick?: () => void
}

// Panel types
export interface PanelProps extends BaseComponentProps {
  /** Panel title */
  title?: string
  /** Panel actions */
  actions?: React.ReactNode
  /** Whether panel is collapsible */
  collapsible?: boolean
  /** Whether panel is initially collapsed */
  defaultCollapsed?: boolean
  /** Collapse state change handler */
  onCollapseChange?: (collapsed: boolean) => void
}

// Select types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  group?: string
}

export interface SelectProps extends Omit<FormControlProps<string>, 'onChange'> {
  /** Available options */
  options: SelectOption[]
  /** Change handler */
  onChange: (value: string) => void
  /** Select variant */
  variant?: InputVariant
  /** Select size */
  size?: SizeVariant
  /** Help text to display below select */
  helpText?: string
  /** Element ID */
  id?: string
  /** Multiple selection */
  multiple?: boolean
  /** Search functionality */
  searchable?: boolean
  /** Custom placeholder for search */
  searchPlaceholder?: string
  /** Maximum height for dropdown */
  maxHeight?: number
}

// Slider types
export interface SliderProps extends Omit<FormControlProps<number>, 'onChange'> {
  /** Change handler */
  onChange: (value: number) => void
  /** Help text to display below slider */
  helpText?: string
  /** Element ID */
  id?: string
  /** Slider size */
  size?: SizeVariant
  /** Minimum value */
  min?: number
  /** Maximum value */
  max?: number
  /** Step size */
  step?: number
  /** Whether to show value */
  showValue?: boolean
  /** Value formatter */
  formatValue?: (value: number) => string
}

// Tab types
export interface TabItem {
  id: string
  label: string
  disabled?: boolean
  badge?: string | number
}

export interface TabsProps extends BaseComponentProps {
  /** Available tabs */
  items: TabItem[]
  /** Active tab ID */
  value: string
  /** Tab change handler */
  onValueChange: (value: string) => void
  /** Tab orientation */
  orientation?: 'horizontal' | 'vertical'
  /** Tab variant */
  variant?: 'default' | 'pills' | 'underline'
}

// File upload types
export interface FileUploadProps extends BaseComponentProps {
  /** Accepted file types */
  accept?: string
  /** Multiple file selection */
  multiple?: boolean
  /** Maximum file size in bytes */
  maxSize?: number
  /** Upload handler */
  onUpload: (files: File[]) => void
  /** Upload progress */
  progress?: number
  /** Whether upload is in progress */
  uploading?: boolean
  /** Error message */
  error?: string
}