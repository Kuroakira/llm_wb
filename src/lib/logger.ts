/**
 * Production-safe logging utility
 * Only logs in development environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface Logger {
  debug: (message: string, data?: any) => void
  info: (message: string, data?: any) => void
  warn: (message: string, data?: any) => void
  error: (message: string, data?: any) => void
}

const isDevelopment = process.env.NODE_ENV === 'development'

const createLogger = (module?: string): Logger => {
  const formatMessage = (level: LogLevel, message: string, data?: any) => {
    const prefix = module ? `[${module}]` : ''
    const timestamp = new Date().toISOString().slice(11, -1) // HH:mm:ss.sss
    return {
      formatted: `${timestamp} ${prefix} ${message}`,
      data
    }
  }

  return {
    debug: (message: string, data?: any) => {
      if (isDevelopment) {
        const { formatted, data: logData } = formatMessage('debug', message, data)
        if (logData !== undefined) {
          console.debug(formatted, logData)
        } else {
          console.debug(formatted)
        }
      }
    },
    
    info: (message: string, data?: any) => {
      if (isDevelopment) {
        const { formatted, data: logData } = formatMessage('info', message, data)
        if (logData !== undefined) {
          console.info(formatted, logData)
        } else {
          console.info(formatted)
        }
      }
    },
    
    warn: (message: string, data?: any) => {
      const { formatted, data: logData } = formatMessage('warn', message, data)
      if (logData !== undefined) {
        console.warn(formatted, logData)
      } else {
        console.warn(formatted)
      }
    },
    
    error: (message: string, data?: any) => {
      const { formatted, data: logData } = formatMessage('error', message, data)
      if (logData !== undefined) {
        console.error(formatted, logData)
      } else {
        console.error(formatted)
      }
    }
  }
}

export const logger = createLogger()
export const createModuleLogger = (moduleName: string) => createLogger(moduleName)

// Legacy support - replace console.log with proper logging
export const debugLog = (message: string, data?: any) => {
  if (isDevelopment) {
    logger.debug(message, data)
  }
}