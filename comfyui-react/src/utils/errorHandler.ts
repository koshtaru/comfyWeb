// Centralized Error Handling for ComfyUI React
// Provides consistent error handling, logging, and user feedback

import { uploadToasts } from './toast'

export interface ErrorContext {
  operation: string
  userId?: string
  fileName?: string
  fileSize?: number
  metadata?: Record<string, any>
}

export interface ErrorReport {
  id: string
  timestamp: string
  message: string
  stack?: string
  context: ErrorContext
  userAgent: string
  url: string
  resolved: boolean
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export class AppError extends Error {
  public readonly severity: ErrorSeverity
  public readonly code: string
  public readonly context: ErrorContext
  public readonly recoverable: boolean
  public readonly userMessage: string

  constructor(
    message: string,
    code: string,
    severity: ErrorSeverity = 'medium',
    context: ErrorContext,
    recoverable: boolean = true,
    userMessage?: string
  ) {
    super(message)
    this.name = 'AppError'
    this.severity = severity
    this.code = code
    this.context = context
    this.recoverable = recoverable
    this.userMessage = userMessage || this.getDefaultUserMessage()
  }

  private getDefaultUserMessage(): string {
    switch (this.code) {
      case 'UPLOAD_FILE_TOO_LARGE':
        return 'The selected file is too large. Please choose a smaller file.'
      case 'UPLOAD_INVALID_FORMAT':
        return 'The file format is not supported. Please upload a JSON workflow file.'
      case 'VALIDATION_FAILED':
        return 'The workflow contains errors that prevent processing.'
      case 'NETWORK_ERROR':
        return 'Connection failed. Please check your network and try again.'
      case 'PARSE_ERROR':
        return 'Unable to read the workflow file. It may be corrupted.'
      case 'MEMORY_ERROR':
        return 'Not enough memory to process this workflow.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  }
}

class ErrorHandler {
  private errorReports: Map<string, ErrorReport> = new Map()
  private maxReports = 100

  // Handle different types of errors
  handleError(error: Error | AppError, context?: Partial<ErrorContext>): string {
    const errorId = this.generateErrorId()
    const fullContext: ErrorContext = {
      operation: 'unknown',
      ...context
    }

    // Create error report
    const report: ErrorReport = {
      id: errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context: fullContext,
      userAgent: navigator.userAgent,
      url: window.location.href,
      resolved: false
    }

    // Store report
    this.storeErrorReport(report)

    // Handle based on error type
    if (error instanceof AppError) {
      this.handleAppError(error)
    } else {
      this.handleGenericError(error, fullContext)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', error, report)
    }

    return errorId
  }

  private handleAppError(error: AppError) {
    const { severity, code, context, userMessage, recoverable } = error

    // Show appropriate toast based on severity
    switch (severity) {
      case 'critical':
        uploadToasts.uploadError(
          context.fileName || 'Unknown File',
          userMessage,
          recoverable ? () => this.suggestRecovery(error) : undefined
        )
        break
      case 'high':
        uploadToasts.uploadError(
          context.fileName || 'Unknown File',
          userMessage,
          recoverable ? () => this.suggestRecovery(error) : undefined
        )
        break
      case 'medium':
        if (code.includes('VALIDATION')) {
          uploadToasts.validationError(1) // Assuming 1 error for now
        } else {
          uploadToasts.uploadError(
            context.fileName || 'Unknown File',
            userMessage
          )
        }
        break
      case 'low':
        uploadToasts.warning(userMessage, {
          message: `Operation: ${context.operation}`
        })
        break
    }

    // Log to external service for high/critical errors
    if (severity === 'high' || severity === 'critical') {
      this.logToExternalService(error)
    }
  }

  private handleGenericError(error: Error, context: ErrorContext) {
    // Try to categorize the error
    const category = this.categorizeError(error)
    
    switch (category) {
      case 'network':
        uploadToasts.connectionError(() => this.suggestNetworkRecovery())
        break
      case 'memory':
        uploadToasts.memoryWarning('Unknown')
        break
      case 'parse':
        uploadToasts.uploadError(
          context.fileName || 'Unknown File',
          'Failed to parse file content'
        )
        break
      default:
        uploadToasts.uploadError(
          context.fileName || 'Unknown File',
          'An unexpected error occurred'
        )
    }
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    if (message.includes('network') || message.includes('fetch') || 
        message.includes('connection') || stack.includes('network')) {
      return 'network'
    }
    
    if (message.includes('memory') || message.includes('out of memory') ||
        stack.includes('memory')) {
      return 'memory'
    }
    
    if (message.includes('parse') || message.includes('json') ||
        message.includes('syntax') || stack.includes('parse')) {
      return 'parse'
    }
    
    return 'unknown'
  }

  // Recovery suggestions
  private suggestRecovery(error: AppError) {
    switch (error.code) {
      case 'UPLOAD_FILE_TOO_LARGE':
        // Suggest file compression or splitting
        break
      case 'VALIDATION_FAILED':
        // Show validation details
        break
      case 'NETWORK_ERROR':
        this.suggestNetworkRecovery()
        break
      default:
        // Generic retry
        window.location.reload()
    }
  }

  private suggestNetworkRecovery() {
    // Check connection and suggest actions
    if (navigator.onLine) {
      uploadToasts.info('Retrying Connection', {
        message: 'Attempting to reconnect to ComfyUI server...'
      })
    } else {
      uploadToasts.error('No Internet Connection', {
        message: 'Please check your internet connection'
      })
    }
  }

  // Error report management
  private storeErrorReport(report: ErrorReport) {
    // Remove oldest reports if we exceed the limit
    if (this.errorReports.size >= this.maxReports) {
      const oldestId = this.errorReports.keys().next().value
      if (oldestId !== undefined) {
        this.errorReports.delete(oldestId)
      }
    }

    this.errorReports.set(report.id, report)

    // Persist to localStorage for debugging
    this.persistErrorReports()
  }

  private persistErrorReports() {
    try {
      const reports = Array.from(this.errorReports.values())
      localStorage.setItem('comfyui-error-reports', JSON.stringify(reports))
    } catch (error) {
      console.warn('Failed to persist error reports:', error)
    }
  }

  private loadPersistedReports() {
    try {
      const stored = localStorage.getItem('comfyui-error-reports')
      if (stored) {
        const reports: ErrorReport[] = JSON.parse(stored)
        reports.forEach(report => {
          this.errorReports.set(report.id, report)
        })
      }
    } catch (error) {
      console.warn('Failed to load persisted error reports:', error)
    }
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async logToExternalService(error: AppError) {
    // In production, this would send to services like Sentry, DataDog, etc.
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example external logging
        console.log('Would log to external service:', {
          error: error.message,
          code: error.code,
          severity: error.severity,
          context: error.context,
          timestamp: new Date().toISOString()
        })
      } catch (loggingError) {
        console.error('Failed to log to external service:', loggingError)
      }
    }
  }

  // Public methods for error management
  getErrorReport(id: string): ErrorReport | undefined {
    return this.errorReports.get(id)
  }

  getAllErrorReports(): ErrorReport[] {
    return Array.from(this.errorReports.values())
  }

  markResolved(id: string) {
    const report = this.errorReports.get(id)
    if (report) {
      report.resolved = true
      this.persistErrorReports()
    }
  }

  clearErrorReports() {
    this.errorReports.clear()
    localStorage.removeItem('comfyui-error-reports')
  }

  // Initialize error handler
  init() {
    this.loadPersistedReports()

    // Set up global error handlers
    window.addEventListener('error', (event) => {
      this.handleError(new Error(event.message), {
        operation: 'global_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(event.reason), {
        operation: 'unhandled_promise_rejection'
      })
    })
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler()

// Convenience functions for common error scenarios
export const uploadErrors = {
  fileTooLarge: (fileName: string, maxSize: number) => 
    new AppError(
      `File ${fileName} exceeds ${maxSize} bytes`,
      'UPLOAD_FILE_TOO_LARGE',
      'medium',
      { operation: 'file_upload', fileName, fileSize: maxSize },
      true
    ),

  invalidFormat: (fileName: string) =>
    new AppError(
      `File ${fileName} is not a valid JSON workflow`,
      'UPLOAD_INVALID_FORMAT',
      'medium',
      { operation: 'file_validation', fileName },
      true
    ),

  validationFailed: (fileName: string, errorCount: number) =>
    new AppError(
      `Workflow validation failed with ${errorCount} errors`,
      'VALIDATION_FAILED',
      'high',
      { operation: 'workflow_validation', fileName, metadata: { errorCount } },
      true
    ),

  networkError: (operation: string) =>
    new AppError(
      'Network request failed',
      'NETWORK_ERROR',
      'high',
      { operation },
      true,
      'Connection to ComfyUI server failed. Please check your connection.'
    ),

  parseError: (fileName: string) =>
    new AppError(
      `Failed to parse ${fileName}`,
      'PARSE_ERROR',
      'medium',
      { operation: 'file_parsing', fileName },
      true
    ),

  memoryError: (operation: string) =>
    new AppError(
      'Insufficient memory to complete operation',
      'MEMORY_ERROR',
      'high',
      { operation },
      false,
      'Not enough memory available. Try closing other applications or using a smaller workflow.'
    )
}

// Helper for async operations with error handling
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T | null> => {
  try {
    return await operation()
  } catch (error) {
    errorHandler.handleError(error as Error, context)
    return null
  }
}

// Initialize on import
errorHandler.init()