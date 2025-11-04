/**
 * Unified Toast Component
 *
 * Gentle, non-blocking toast messages with auto-retry logic for API errors.
 * Positioned bottom-center, never blocks scrolling or hides cards.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { useTheme } from '@/lib/theme'

// ========================================
// Toast Types
// ========================================

export type ToastType = 'loading' | 'success' | 'error' | 'info'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number // Auto-dismiss after N ms (0 = manual dismiss only)
  onRetry?: () => void // Optional retry callback
}

// ========================================
// Toast Context (Singleton)
// ========================================

type ToastListener = (message: ToastMessage) => void

class ToastManager {
  private listeners: ToastListener[] = []

  subscribe(listener: ToastListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  show(message: Omit<ToastMessage, 'id'>) {
    const id = `toast_${Date.now()}_${Math.random()}`
    const fullMessage: ToastMessage = { id, ...message }
    this.listeners.forEach(listener => listener(fullMessage))
    return id
  }

  // Convenience methods
  loading(message: string) {
    return this.show({ type: 'loading', message, duration: 0 })
  }

  success(message: string, duration = 2000) {
    return this.show({ type: 'success', message, duration })
  }

  error(message: string, duration = 3000, onRetry?: () => void) {
    return this.show({ type: 'error', message, duration, onRetry })
  }

  info(message: string, duration = 3000) {
    return this.show({ type: 'info', message, duration })
  }
}

export const toast = new ToastManager()

// ========================================
// Toast Component
// ========================================

export default function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const { theme } = useTheme()

  useEffect(() => {
    const unsubscribe = toast.subscribe((message) => {
      setMessages(prev => [...prev, message])

      // Auto-dismiss after duration
      if (message.duration && message.duration > 0) {
        setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== message.id))
        }, message.duration)
      }
    })

    return unsubscribe
  }, [])

  const dismissToast = (id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[9999] flex justify-center px-4">
      <AnimatePresence mode="sync">
        {messages.map((message, index) => (
          <ToastItem
            key={message.id}
            message={message}
            index={index}
            onDismiss={() => dismissToast(message.id)}
            theme={theme}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ========================================
// Individual Toast Item
// ========================================

interface ToastItemProps {
  message: ToastMessage
  index: number
  onDismiss: () => void
  theme: any
}

function ToastItem({ message, index, onDismiss, theme }: ToastItemProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (message.onRetry && !isRetrying) {
      setIsRetrying(true)
      try {
        await message.onRetry()
        // On success, dismiss current toast and show success
        onDismiss()
        toast.success('✅ 已完成')
      } catch (error) {
        // On failure, show retry failed toast
        onDismiss()
        toast.error('請稍後重試 🕓', 3000)
      } finally {
        setIsRetrying(false)
      }
    }
  }

  const getIcon = () => {
    switch (message.type) {
      case 'loading':
        return <RefreshCw className="h-5 w-5 animate-spin" style={{ color: theme.accent }} />
      case 'success':
        return <CheckCircle className="h-5 w-5" style={{ color: theme.success }} />
      case 'error':
        return <AlertCircle className="h-5 w-5" style={{ color: theme.error }} />
      case 'info':
        return <Clock className="h-5 w-5" style={{ color: theme.accent }} />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: -index * 70, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="pointer-events-auto absolute"
      style={{
        backgroundColor: theme.toastBg,
        borderColor: theme.toastBorder,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="flex min-w-[280px] max-w-[400px] items-center gap-3 rounded-[16px] border px-4 py-3 shadow-lg"
        style={{
          borderColor: theme.toastBorder,
          boxShadow: theme.shadow,
        }}
      >
        {/* Icon */}
        <div className="flex-shrink-0">{getIcon()}</div>

        {/* Message */}
        <div
          className="flex-1 text-sm font-medium"
          style={{ color: theme.text }}
        >
          {message.message}
        </div>

        {/* Retry button (only for errors with retry callback) */}
        {message.type === 'error' && message.onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: theme.badgeBg,
              color: theme.accent,
              borderColor: theme.badgeBorder,
            }}
          >
            {isRetrying ? '重試中...' : '重試'}
          </button>
        )}

        {/* Close button (only for manual dismiss) */}
        {message.duration === 0 && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-xs transition hover:opacity-80"
            style={{ color: theme.textSecondary }}
          >
            關閉
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ========================================
// API Error Handler with Auto-Retry
// ========================================

/**
 * Wraps API calls with automatic retry logic and toast feedback
 */
export async function withToastRetry<T>(
  apiCall: () => Promise<T>,
  options?: {
    loadingMessage?: string
    successMessage?: string
    errorMessage?: string
    maxRetries?: number
  }
): Promise<T> {
  const {
    loadingMessage = '網路稍慢，我再幫你試一次 🔄',
    successMessage = '✅ 已完成',
    errorMessage = '請稍後重試 🕓',
    maxRetries = 1,
  } = options || {}

  let toastId: string | undefined

  try {
    // Show loading toast
    toastId = toast.loading(loadingMessage)

    // Try the API call
    const result = await apiCall()

    // Success - dismiss loading and show success
    if (toastId) {
      // Dismiss loading toast
      // Note: We can't directly dismiss, so we'll just show success
    }
    toast.success(successMessage)

    return result
  } catch (error) {
    // First failure - auto-retry
    if (maxRetries > 0) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s
        const result = await apiCall()
        toast.success(successMessage)
        return result
      } catch (retryError) {
        // Retry failed - show error with manual retry option
        toast.error(errorMessage, 3000, async () => {
          return withToastRetry(apiCall, { ...options, maxRetries: 0 })
        })
        throw retryError
      }
    } else {
      // No retries left - just show error
      toast.error(errorMessage, 3000)
      throw error
    }
  }
}

// ========================================
// Usage Examples
// ========================================

/*
// Basic usage
toast.success('儲存成功！')
toast.error('網路連線失敗', 3000)
toast.loading('處理中...')

// With API call and auto-retry
await withToastRetry(
  () => fetch('/api/solve-simple', { method: 'POST', body: '...' }),
  {
    loadingMessage: '生成解題步驟中...',
    successMessage: '✅ 解題完成',
    errorMessage: '生成失敗，請重試',
  }
)

// Manual retry callback
toast.error('載入失敗', 0, async () => {
  await loadData()
})
*/
