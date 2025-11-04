/**
 * Preview Logger - Analytics and Sampler Logs
 * 
 * Centralized logging for preview mode with color-coded output
 * and filtering capabilities.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'analytics' | 'sampler'

interface LogEntry {
  timestamp: string
  level: LogLevel
  category: string
  message: string
  data?: any
}

class PreviewLogger {
  private logs: LogEntry[] = []
  private maxLogs = 1000
  
  private colors = {
    debug: '#9CA3AF',
    info: '#60A5FA',
    warn: '#FBBF24',
    error: '#F87171',
    analytics: '#8B5CF6',
    sampler: '#10B981',
  }
  
  /**
   * Log a message
   */
  log(level: LogLevel, category: string, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    }
    
    this.logs.push(entry)
    
    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
    
    // Output to console with colors
    const color = this.colors[level]
    const prefix = this.getPrefix(level, category)
    
    if (data) {
      console.log(
        `%c${prefix}%c ${message}`,
        `color: ${color}; font-weight: bold`,
        'color: inherit',
        data
      )
    } else {
      console.log(
        `%c${prefix}%c ${message}`,
        `color: ${color}; font-weight: bold`,
        'color: inherit'
      )
    }
    
    // Store in sessionStorage for persistence
    if (typeof window !== 'undefined') {
      try {
        const stored = this.logs.slice(-100) // Keep last 100
        sessionStorage.setItem('plms_preview_logs', JSON.stringify(stored))
      } catch (e) {
        // Ignore quota exceeded errors
      }
    }
  }
  
  private getPrefix(level: LogLevel, category: string): string {
    const icons = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      analytics: '📊',
      sampler: '🎲',
    }
    
    return `${icons[level]} [${category}]`
  }
  
  /**
   * Specific log methods
   */
  debug(category: string, message: string, data?: any) {
    if (process.env.NEXT_PUBLIC_LOG_LEVEL === 'debug') {
      this.log('debug', category, message, data)
    }
  }
  
  info(category: string, message: string, data?: any) {
    this.log('info', category, message, data)
  }
  
  warn(category: string, message: string, data?: any) {
    this.log('warn', category, message, data)
  }
  
  error(category: string, message: string, data?: any) {
    this.log('error', category, message, data)
  }
  
  analytics(action: string, data?: any) {
    this.log('analytics', 'Analytics', action, data)
  }
  
  sampler(message: string, data?: any) {
    this.log('sampler', 'Sampler', message, data)
  }
  
  /**
   * Get all logs
   */
  getLogs(filter?: { level?: LogLevel; category?: string }): LogEntry[] {
    let filtered = this.logs
    
    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level)
    }
    
    if (filter?.category) {
      filtered = filtered.filter(log => log.category === filter.category)
    }
    
    return filtered
  }
  
  /**
   * Clear logs
   */
  clear() {
    this.logs = []
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('plms_preview_logs')
    }
    console.clear()
    console.log('%c📝 Preview logs cleared', 'color: #10B981; font-weight: bold')
  }
  
  /**
   * Export logs as JSON
   */
  export() {
    const json = JSON.stringify(this.logs, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plms-logs-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  /**
   * Show logs summary
   */
  summary() {
    const counts = this.logs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.group('📊 Preview Logs Summary')
    console.log('Total logs:', this.logs.length)
    console.log('By level:', counts)
    console.log('Time range:', 
      this.logs[0]?.timestamp, 
      '→', 
      this.logs[this.logs.length - 1]?.timestamp
    )
    console.groupEnd()
  }
}

// Singleton instance
export const previewLogger = new PreviewLogger()

// Convenience exports
export const logDebug = previewLogger.debug.bind(previewLogger)
export const logInfo = previewLogger.info.bind(previewLogger)
export const logWarn = previewLogger.warn.bind(previewLogger)
export const logError = previewLogger.error.bind(previewLogger)
export const logAnalytics = previewLogger.analytics.bind(previewLogger)
export const logSampler = previewLogger.sampler.bind(previewLogger)

/**
 * React Hook for accessing logs
 */
import { useEffect, useState } from 'react'

export function usePreviewLogs(filter?: { level?: LogLevel; category?: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  
  useEffect(() => {
    const updateLogs = () => {
      setLogs(previewLogger.getLogs(filter))
    }
    
    // Update initially
    updateLogs()
    
    // Update on interval (for real-time logs)
    const interval = setInterval(updateLogs, 1000)
    return () => clearInterval(interval)
  }, [filter])
  
  return {
    logs,
    clear: () => previewLogger.clear(),
    export: () => previewLogger.export(),
    summary: () => previewLogger.summary(),
  }
}

