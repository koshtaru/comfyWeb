import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { BaseComponentProps } from '../../types/component'
import { cn } from '../../utils/cn'

export interface ModalProps extends BaseComponentProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback fired when the modal should close */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdrop?: boolean
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean
  /** Size variant of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Custom header content */
  header?: React.ReactNode
  /** Custom footer content */
  footer?: React.ReactNode
}

export interface ModalHeaderProps extends BaseComponentProps {
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Callback for close button */
  onClose?: () => void
}

export interface ModalBodyProps extends BaseComponentProps {}

export interface ModalFooterProps extends BaseComponentProps {}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      closeOnBackdrop = true,
      closeOnEscape = true,
      size = 'md',
      showCloseButton = true,
      header,
      footer,
      children,
      className,
      testId,
      ...props
    },
    ref
  ) => {
    const backdropRef = useRef<HTMLDivElement>(null)
    const modalRef = useRef<HTMLDivElement>(null)

    // Handle escape key
    useEffect(() => {
      if (!isOpen || !closeOnEscape) return

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, closeOnEscape, onClose])

    // Handle body scroll lock
    useEffect(() => {
      if (!isOpen) return

      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalOverflow
      }
    }, [isOpen])

    // Focus management
    useEffect(() => {
      if (!isOpen) return

      const modal = modalRef.current
      if (!modal) return

      // Focus the modal
      modal.focus()

      // Trap focus within modal
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement?.focus()
            e.preventDefault()
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            firstElement?.focus()
            e.preventDefault()
          }
        }
      }

      modal.addEventListener('keydown', handleTabKey)
      return () => modal.removeEventListener('keydown', handleTabKey)
    }, [isOpen])

    const handleBackdropClick = (event: React.MouseEvent) => {
      if (closeOnBackdrop && event.target === backdropRef.current) {
        onClose()
      }
    }

    const sizeClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      full: 'max-w-full m-4'
    }

    if (!isOpen) return null

    const modalContent = (
      <div
        ref={backdropRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        data-testid={testId}
      >
        <div
          ref={ref || modalRef}
          className={cn(
            'relative w-full bg-comfy-bg-secondary border border-comfy-border rounded-lg shadow-2xl',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            sizeClasses[size],
            className
          )}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          {...props}
        >
          {/* Header */}
          {(header || title || showCloseButton) && (
            <ModalHeader showCloseButton={showCloseButton} onClose={onClose}>
              {header || (
                title && (
                  <h2 id="modal-title" className="text-lg font-semibold text-comfy-text-primary">
                    {title}
                  </h2>
                )
              )}
            </ModalHeader>
          )}

          {/* Body */}
          <ModalBody>{children}</ModalBody>

          {/* Footer */}
          {footer && <ModalFooter>{footer}</ModalFooter>}
        </div>
      </div>
    )

    return createPortal(modalContent, document.body)
  }
)

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ showCloseButton = true, onClose, children, className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between p-4 border-b border-comfy-border',
        className
      )}
      data-testid={testId}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="ml-4 p-1 rounded-md text-comfy-text-secondary hover:text-comfy-text-primary hover:bg-comfy-bg-tertiary transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
)

const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ children, className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-4', className)}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  )
)

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ children, className, testId, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-end gap-2 p-4 border-t border-comfy-border bg-comfy-bg-primary/50',
        className
      )}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  )
)

Modal.displayName = 'Modal'
ModalHeader.displayName = 'ModalHeader'
ModalBody.displayName = 'ModalBody'
ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalHeader, ModalBody, ModalFooter }