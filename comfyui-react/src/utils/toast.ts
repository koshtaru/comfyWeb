// Toast Notification System for ComfyUI React
// Provides user feedback for upload operations, errors, and success states

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number // milliseconds, 0 = permanent
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
  timestamp: number
}

export interface ToastOptions {
  type?: Toast['type']
  message?: string
  duration?: number
  action?: Toast['action']
  dismissible?: boolean
}

class ToastManager {
  private toasts: Toast[] = []
  private listeners: Set<(toasts: Toast[]) => void> = new Set()
  private nextId = 1

  // Subscribe to toast updates
  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Get current toasts
  getToasts(): Toast[] {
    return [...this.toasts]
  }

  // Add a new toast
  private addToast(title: string, options: ToastOptions = {}): string {
    const id = `toast-${this.nextId++}`
    const toast: Toast = {
      id,
      type: options.type || 'info',
      title,
      message: options.message,
      duration: options.duration ?? 5000, // 5 seconds default
      action: options.action,
      dismissible: options.dismissible ?? true,
      timestamp: Date.now()
    }

    this.toasts.push(toast)
    this.notifyListeners()

    // Auto-dismiss if duration is set
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, toast.duration)
    }

    return id
  }

  // Success toast
  success(title: string, options: Omit<ToastOptions, 'type'> = {}) {
    return this.addToast(title, { ...options, type: 'success' })
  }

  // Error toast
  error(title: string, options: Omit<ToastOptions, 'type'> = {}) {
    return this.addToast(title, { 
      ...options, 
      type: 'error',
      duration: options.duration ?? 8000 // Longer duration for errors
    })
  }

  // Warning toast
  warning(title: string, options: Omit<ToastOptions, 'type'> = {}) {
    return this.addToast(title, { ...options, type: 'warning' })
  }

  // Info toast
  info(title: string, options: Omit<ToastOptions, 'type'> = {}) {
    return this.addToast(title, { ...options, type: 'info' })
  }

  // Dismiss a specific toast
  dismiss(id: string) {
    const index = this.toasts.findIndex(toast => toast.id === id)
    if (index > -1) {
      this.toasts.splice(index, 1)
      this.notifyListeners()
    }
  }

  // Dismiss all toasts
  dismissAll() {
    this.toasts = []
    this.notifyListeners()
  }

  // Dismiss all toasts of a specific type
  dismissByType(type: Toast['type']) {
    this.toasts = this.toasts.filter(toast => toast.type !== type)
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }
}

// Singleton instance
export const toastManager = new ToastManager()

// Convenience functions for common upload-related toasts
export const uploadToasts = {
  // Upload started
  uploadStarted: (fileName: string) => 
    toastManager.info('Upload Started', {
      message: `Processing ${fileName}...`,
      duration: 3000
    }),

  // Upload completed successfully
  uploadSuccess: (fileName: string) => 
    toastManager.success('Upload Complete', {
      message: `${fileName} processed successfully`,
      duration: 4000
    }),

  // Upload failed
  uploadError: (fileName: string, error: string, retry?: () => void) => 
    toastManager.error('Upload Failed', {
      message: `${fileName}: ${error}`,
      duration: 0, // Permanent until dismissed
      action: retry ? {
        label: 'Retry',
        onClick: retry
      } : undefined
    }),

  // Validation completed with warnings
  validationWarnings: (warningCount: number, nodeCount: number) => 
    toastManager.warning('Validation Warnings', {
      message: `${warningCount} warnings found in ${nodeCount} nodes`,
      duration: 6000
    }),

  // Validation failed
  validationError: (errorCount: number) => 
    toastManager.error('Validation Failed', {
      message: `${errorCount} critical errors found`,
      duration: 0
    }),

  // Parameter extraction completed
  parametersExtracted: (nodeCount: number) => 
    toastManager.success('Parameters Extracted', {
      message: `Found parameters from ${nodeCount} nodes`,
      duration: 3000
    }),

  // File too large
  fileTooLarge: (fileName: string, maxSize: string) => 
    toastManager.error('File Too Large', {
      message: `${fileName} exceeds ${maxSize} limit`,
      duration: 6000
    }),

  // Invalid file type
  invalidFileType: (fileName: string) => 
    toastManager.error('Invalid File Type', {
      message: `${fileName} is not a valid JSON workflow`,
      duration: 6000
    }),

  // Connection error
  connectionError: (retry?: () => void) => 
    toastManager.error('Connection Error', {
      message: 'Unable to connect to ComfyUI server',
      duration: 0,
      action: retry ? {
        label: 'Retry',
        onClick: retry
      } : undefined
    }),

  // Memory warning
  memoryWarning: (estimatedVRAM: string) => 
    toastManager.warning('High VRAM Usage', {
      message: `This workflow may require ${estimatedVRAM} of VRAM`,
      duration: 8000
    }),

  // Auto-save
  autoSaved: () => 
    toastManager.info('Auto-saved', {
      message: 'Workflow parameters saved',
      duration: 2000
    }),

  // Generic info toast
  info: (title: string, options?: Omit<ToastOptions, 'type'>) =>
    toastManager.info(title, options),

  // Generic warning toast
  warning: (title: string, options?: Omit<ToastOptions, 'type'>) =>
    toastManager.warning(title, options),

  // Generic error toast  
  error: (title: string, options?: Omit<ToastOptions, 'type'>) =>
    toastManager.error(title, options)
}

// Hook for React components
export { toastManager as toast }