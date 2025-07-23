import React, { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { uploadToasts } from '@/utils/toast'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean // If true, only catches errors from this boundary
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Show toast notification for upload-related errors
    if (this.isUploadError(error)) {
      uploadToasts.uploadError(
        'Unknown File',
        `Unexpected error: ${error.message}`,
        () => this.handleRetry()
      )
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  private isUploadError(error: Error): boolean {
    const uploadKeywords = ['upload', 'file', 'workflow', 'validation', 'parse']
    const errorMessage = error.message.toLowerCase()
    const stackTrace = error.stack?.toLowerCase() || ''
    
    return uploadKeywords.some(keyword => 
      errorMessage.includes(keyword) || stackTrace.includes(keyword)
    )
  }

  private async logErrorToService(error: Error, errorInfo: ErrorInfo) {
    try {
      // In a real app, this would send to a service like Sentry, LogRocket, etc.
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('user-id') || 'anonymous'
      }

      // For now, just log to console
      console.error('Error report:', errorReport)
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          isolate={this.props.isolate}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  errorInfo: ErrorInfo | null
  onRetry: () => void
  onReload: () => void
  isolate?: boolean
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  onRetry,
  onReload,
  isolate = false
}) => {
  const isUploadError = error && (
    error.message.toLowerCase().includes('upload') ||
    error.message.toLowerCase().includes('file') ||
    error.message.toLowerCase().includes('workflow')
  )

  return (
    <div className="error-boundary">
      <div className="error-content">
        <div className="error-icon">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path 
              fill="currentColor" 
              d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" 
            />
          </svg>
        </div>

        <h2 className="error-title">
          {isUploadError ? 'Upload Error' : 'Something went wrong'}
        </h2>

        <p className="error-message">
          {isUploadError 
            ? 'There was a problem processing your workflow file.'
            : 'An unexpected error occurred while loading this section.'
          }
        </p>

        {error && (
          <details className="error-details">
            <summary>Error Details</summary>
            <pre className="error-stack">
              <strong>Error:</strong> {error.message}
              {process.env.NODE_ENV === 'development' && error.stack && (
                <>
                  <br />
                  <strong>Stack:</strong> {error.stack}
                </>
              )}
              {process.env.NODE_ENV === 'development' && errorInfo?.componentStack && (
                <>
                  <br />
                  <strong>Component Stack:</strong> {errorInfo.componentStack}
                </>
              )}
            </pre>
          </details>
        )}

        <div className="error-actions">
          {isolate ? (
            <button
              type="button"
              className="comfy-button"
              onClick={onRetry}
            >
              Try Again
            </button>
          ) : (
            <>
              <button
                type="button"
                className="comfy-button"
                onClick={onRetry}
              >
                Try Again
              </button>
              <button
                type="button"
                className="comfy-button secondary"
                onClick={onReload}
              >
                Reload Page
              </button>
            </>
          )}
        </div>

        {isUploadError && (
          <div className="error-suggestions">
            <h3>Suggestions:</h3>
            <ul>
              <li>Check that your file is a valid JSON workflow</li>
              <li>Ensure the file size is under the limit</li>
              <li>Try uploading a different workflow file</li>
              <li>Check your internet connection</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// Higher-order component for easier use
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Hook for handling async errors that React Error Boundaries can't catch
export const useErrorHandler = () => {
  const [, setState] = React.useState()

  return React.useCallback((error: Error) => {
    setState(() => {
      throw error
    })
  }, [])
}

// Specialized error boundary for upload operations
export const UploadErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary 
    isolate={true}
    onError={(error, errorInfo) => {
      console.error('Upload Error Boundary:', error, errorInfo)
    }}
  >
    {children}
  </ErrorBoundary>
)