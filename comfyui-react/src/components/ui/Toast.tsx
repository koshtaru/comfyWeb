import React, { useState, useEffect } from 'react'
import { toastManager, type Toast } from '@/utils/toast'

interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
  maxToasts?: number
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const unsubscribe = toastManager.subscribe((newToasts) => {
      // Limit the number of visible toasts
      setToasts(newToasts.slice(0, maxToasts))
    })

    // Initialize with current toasts
    setToasts(toastManager.getToasts().slice(0, maxToasts))

    return () => {
      unsubscribe()
    }
  }, [maxToasts])

  if (toasts.length === 0) return null

  return (
    <div className={`toast-container ${position}`}>
      {toasts.map((toast) => (
        <ToastItem 
          key={toast.id} 
          toast={toast}
          onDismiss={() => toastManager.dismiss(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onDismiss: () => void
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss()
    }, 300) // Animation duration
  }

  const handleAction = () => {
    if (toast.action) {
      toast.action.onClick()
      handleDismiss()
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="toast-icon success" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="toast-icon error" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M13,13H11V7H13M13,17H11V15H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className="toast-icon warning" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
          </svg>
        )
      case 'info':
        return (
          <svg className="toast-icon info" viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" />
          </svg>
        )
    }
  }

  return (
    <div 
      className={`toast-item ${toast.type} ${isVisible ? 'visible' : ''} ${isLeaving ? 'leaving' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-content">
        <div className="toast-header">
          {getIcon()}
          <div className="toast-text">
            <div className="toast-title">{toast.title}</div>
            {toast.message && (
              <div className="toast-message">{toast.message}</div>
            )}
          </div>
        </div>

        <div className="toast-actions">
          {toast.action && (
            <button
              type="button"
              className="toast-action-button"
              onClick={handleAction}
            >
              {toast.action.label}
            </button>
          )}
          
          {toast.dismissible && (
            <button
              type="button"
              className="toast-dismiss-button"
              onClick={handleDismiss}
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for timed toasts */}
      {toast.duration && toast.duration > 0 && (
        <div className="toast-progress">
          <div 
            className="toast-progress-bar"
            style={{
              animationDuration: `${toast.duration}ms`
            }}
          />
        </div>
      )}
    </div>
  )
}

// Hook for using toast notifications in components
export const useToast = () => {
  return {
    success: toastManager.success.bind(toastManager),
    error: toastManager.error.bind(toastManager),
    warning: toastManager.warning.bind(toastManager),
    info: toastManager.info.bind(toastManager),
    dismiss: toastManager.dismiss.bind(toastManager),
    dismissAll: toastManager.dismissAll.bind(toastManager)
  }
}