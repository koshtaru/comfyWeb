// ============================================================================
// ComfyUI React - Centralized Logging Service
// ============================================================================

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  component?: string
  userId?: string
  sessionId?: string
  operation?: string
  metadata?: Record<string, unknown>
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: Error
  data?: unknown
}

class Logger {
  private logLevel: LogLevel = LogLevel.INFO
  private isDevelopment: boolean
  private logs: LogEntry[] = []
  private maxLogs = 1000
  private isNode: boolean

  constructor() {
    this.isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development'
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR
    this.isNode = typeof process !== 'undefined' && process.versions?.node
    
    // Create logs directory if we're in Node.js environment
    if (this.isNode && this.isDevelopment) {
      this.ensureLogDirectory()
    }
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  // Ensure logs directory exists (Node.js only)
  private ensureLogDirectory(): void {
    if (!this.isNode) return
    
    try {
      const fs = require('fs')
      const path = require('path')
      
      const logDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
    } catch (error) {
      // Fail silently if we can't create logs directory
    }
  }

  // Log to terminal console (works in dev server terminal)
  private logToTerminal(level: LogLevel, message: string, context?: LogContext, error?: Error, data?: unknown): void {
    if (!this.isDevelopment) return

    const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG']
    const levelName = levelNames[level] || 'UNKNOWN'
    const timestamp = new Date().toISOString()
    
    // Color codes for terminal output
    const colors = {
      ERROR: '\x1b[31m',   // Red
      WARN: '\x1b[33m',    // Yellow  
      INFO: '\x1b[36m',    // Cyan
      DEBUG: '\x1b[37m',   // White
      RESET: '\x1b[0m'     // Reset
    }

    const color = colors[levelName as keyof typeof colors] || colors.DEBUG
    const reset = colors.RESET
    
    // Format the message
    let logMessage = `${color}[${timestamp}] [${levelName}]${reset} ${message}`
    
    // Add context if present
    if (context?.component) {
      logMessage += ` ${color}(${context.component})${reset}`
    }
    
    // Output to appropriate console method
    if (this.isNode) {
      // Running in Node.js (dev server) - this shows in your terminal!
      const output = level === LogLevel.ERROR ? console.error : console.log
      output(logMessage)
      
      if (context && Object.keys(context).length > 1) {
        output(`${color}  Context:${reset}`, JSON.stringify(context, null, 2))
      }
      
      if (data) {
        output(`${color}  Data:${reset}`, data)
      }
      
      if (error) {
        output(`${color}  Error:${reset}`, error.message)
        if (error.stack) {
          output(`${color}  Stack:${reset}`, error.stack)
        }
      }
    } else {
      // Running in browser - fallback to regular console
      const consoleMethod = level === LogLevel.ERROR ? console.error : 
                           level === LogLevel.WARN ? console.warn : console.log
      consoleMethod(`[${levelName}] ${message}`, context || '', data || '', error || '')
    }
  }

  // Write to log file (Node.js only)
  private writeToLogFile(entry: LogEntry): void {
    if (!this.isNode || !this.isDevelopment) return
    
    try {
      const fs = require('fs')
      const path = require('path')
      
      const logFile = path.join(process.cwd(), 'logs', 'app.log')
      const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG']
      const levelName = levelNames[entry.level] || 'UNKNOWN'
      
      let logLine = `${entry.timestamp} [${levelName}] ${entry.message}`
      
      if (entry.context?.component) {
        logLine += ` (${entry.context.component})`
      }
      
      logLine += '\n'
      
      // Add context details
      if (entry.context && Object.keys(entry.context).length > 1) {
        logLine += `  Context: ${JSON.stringify(entry.context)}\n`
      }
      
      // Add data if present
      if (entry.data) {
        logLine += `  Data: ${JSON.stringify(entry.data)}\n`
      }
      
      // Add error details
      if (entry.error) {
        logLine += `  Error: ${entry.error.message}\n`
        if (entry.error.stack) {
          logLine += `  Stack: ${entry.error.stack}\n`
        }
      }
      
      logLine += '\n' // Empty line for readability
      
      fs.appendFileSync(logFile, logLine)
    } catch (error) {
      // Fail silently if we can't write to log file
    }
  }


  private createLogEntry(level: LogLevel, message: string, context?: LogContext, error?: Error, data?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      data
    }

    // Store log entry
    this.logs.push(entry)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    return entry
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error)
    
    // Log to terminal (dev server) and file
    this.logToTerminal(LogLevel.ERROR, message, context, error)
    this.writeToLogFile(entry)

    // In production, could send to error reporting service
    // this.sendToErrorService(entry)
  }

  warn(message: string, context?: LogContext, data?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return

    const entry = this.createLogEntry(LogLevel.WARN, message, context, undefined, data)
    
    // Log to terminal (dev server) and file
    this.logToTerminal(LogLevel.WARN, message, context, undefined, data)
    this.writeToLogFile(entry)
  }

  info(message: string, context?: LogContext, data?: unknown): void {
    if (!this.shouldLog(LogLevel.INFO)) return

    const entry = this.createLogEntry(LogLevel.INFO, message, context, undefined, data)
    
    // Log to terminal (dev server) and file
    this.logToTerminal(LogLevel.INFO, message, context, undefined, data)
    this.writeToLogFile(entry)
  }

  debug(message: string, context?: LogContext, data?: unknown): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context, undefined, data)
    
    // Log to terminal (dev server) and file
    this.logToTerminal(LogLevel.DEBUG, message, context, undefined, data)
    this.writeToLogFile(entry)
  }

  // Get recent logs for debugging
  getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(-limit)
  }

  // Clear logs
  clearLogs(): void {
    this.logs = []
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  // Get log file path (for terminal access)
  getLogFilePath(): string | null {
    if (!this.isNode) return null
    try {
      const path = require('path')
      return path.join(process.cwd(), 'logs', 'app.log')
    } catch {
      return null
    }
  }
}

// Create singleton instance
export const logger = new Logger()

// Test log on module load to verify terminal logging works
logger.info('🚀 Logger system initialized successfully', { 
  mode: logger['isDevelopment'] ? 'development' : 'production',
  terminalLogging: logger['isNode'],
  fileLogging: logger['isNode'] && logger['isDevelopment']
})

// Convenience functions for common patterns
export const logError = (message: string, error?: Error, context?: LogContext) => 
  logger.error(message, error, context)

export const logWarn = (message: string, context?: LogContext, data?: unknown) => 
  logger.warn(message, context, data)

export const logInfo = (message: string, context?: LogContext, data?: unknown) => 
  logger.info(message, context, data)

export const logDebug = (message: string, context?: LogContext, data?: unknown) => 
  logger.debug(message, context, data)

// Component-specific loggers
export const createComponentLogger = (componentName: string) => ({
  error: (message: string, error?: Error, metadata?: Record<string, unknown>) =>
    logError(message, error, { component: componentName, metadata }),
  warn: (message: string, metadata?: Record<string, unknown>) =>
    logWarn(message, { component: componentName, metadata }),
  info: (message: string, metadata?: Record<string, unknown>) =>
    logInfo(message, { component: componentName, metadata }),
  debug: (message: string, metadata?: Record<string, unknown>) =>
    logDebug(message, { component: componentName, metadata })
})

export default logger