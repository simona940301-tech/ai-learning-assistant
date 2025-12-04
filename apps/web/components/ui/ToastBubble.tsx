'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ToastBubbleProps {
  message: string
  duration?: number // 毫秒，預設 2000ms
  onClose?: () => void
  className?: string
}

/**
 * 🎈 Toast Bubble - 輕量透明氣泡提示
 *
 * 特點：
 * - 透明背景（稍微透明）
 * - 2秒自動淡出
 * - 極簡主義設計
 * - 無邊框
 */
export function ToastBubble({
  message,
  duration = 2000,
  onClose,
  className = '',
}: ToastBubbleProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        onClose?.()
      }, 300) // 等待淡出動畫完成
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 300)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 ${className}`}
        >
          <div className="relative max-w-md">
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#4A3728]/85 backdrop-blur-md shadow-lg">
              <p className="text-sm text-[#FFF7E6] leading-relaxed">
                {message}
              </p>
              <button
                onClick={handleClose}
                className="flex-shrink-0 text-[#FFF7E6]/60 hover:text-[#FFF7E6] transition-colors"
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* 小尾巴 */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-[#4A3728]/85 backdrop-blur-md"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 🎈 Toast Bubble Hook - 簡化使用方式
 */
export function useToastBubble() {
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string, duration = 2000) => {
    setToast(message)
    setTimeout(() => setToast(null), duration + 300)
  }

  const ToastComponent = toast ? (
    <ToastBubble
      message={toast}
      onClose={() => setToast(null)}
    />
  ) : null

  return { showToast, ToastComponent }
}
