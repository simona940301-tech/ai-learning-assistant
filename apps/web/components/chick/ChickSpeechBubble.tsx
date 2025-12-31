'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'

interface ChickSpeechBubbleProps {
  message: string | null
  visible: boolean
  onHide: () => void
  onClick?: () => void
  cta?: {
    label: string
    onClick: () => void
  }
  persistent?: boolean
  priority?: 'low' | 'medium' | 'high'
  onDismiss?: () => void
  dismissLabel?: string
}

export function ChickSpeechBubble({
  message,
  visible,
  onHide,
  onClick,
  cta,
  persistent,
  priority = 'low',
  onDismiss,
  dismissLabel = '關閉',
}: ChickSpeechBubbleProps) {
  // Auto-hide after 5 seconds unless persistent
  useEffect(() => {
    if (visible && message && !persistent) {
      const timer = setTimeout(() => {
        onHide()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [visible, message, onHide, persistent])

  const priorityStyle =
    priority === 'high'
      ? 'bg-red-50 ring-red-200 text-red-900'
      : priority === 'medium'
        ? 'bg-amber-50 ring-amber-200 text-amber-900'
        : 'bg-[#fffdfa] ring-[#E7E1D8] text-[#42372b]'
  const tailStyle =
    priority === 'high'
      ? 'bg-red-50 ring-red-200'
      : priority === 'medium'
        ? 'bg-amber-50 ring-amber-200'
        : 'bg-[#fffdfa] ring-[#E7E1D8]'

  const priorityMotion =
    priority === 'high'
      ? { x: [0, -1.5, 1.5, -1.5, 0], transition: { duration: 0.6, repeat: Infinity } }
      : priority === 'medium'
        ? { scale: [1, 1.02, 1], transition: { duration: 1.4, repeat: Infinity } }
        : {}

  return (
    <AnimatePresence>
      {visible && message && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1, ...priorityMotion }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{
            duration: 0.3,
            ease: [0.4, 0.0, 0.2, 1],
          }}
          className="pointer-events-auto"
          style={{ willChange: 'transform, opacity' }}
          onClick={onClick}
        >
          {/* Speech Bubble */}
          <div
            className={`relative min-w-[160px] max-w-[85vw] sm:max-w-[420px] px-6 py-4 rounded-3xl shadow-[0_3px_10px_rgba(0,0,0,0.05)] ring-[0.75px] ${priorityStyle} ${onClick ? 'cursor-pointer hover:shadow-[0_5px_14px_rgba(0,0,0,0.06)] transition-all' : ''
              }`}
          >
            {/* Dismiss */}
            {(persistent || onDismiss) && (
              <button
                aria-label="關閉提示"
                className="absolute right-4 top-4 text-sm font-medium leading-none text-[#B8AFA4] hover:text-[#9c8f82] transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss?.()
                  onHide()
                }}
              >
                ×
              </button>
            )}

            {/* Message Text */}
            <p className="text-[15px] sm:text-base leading-[1.7] font-normal whitespace-pre-wrap break-words pr-8">
              {message}
            </p>

            {/* CTA Button */}
            {cta && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    cta.onClick()
                  }}
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:bg-primary/90 active:scale-95 transition-all"
                >
                  {cta.label}
                </button>
              </div>
            )}

            {!cta && !persistent && onClick && (
              <p className="text-[10px] text-muted-foreground mt-2 text-center">
                點擊查看詳情
              </p>
            )}

            {persistent && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDismiss?.()
                    onHide()
                  }}
                  className="text-xs text-foreground underline underline-offset-4"
                >
                  {dismissLabel}
                </button>
              </div>
            )}

            {/* Bubble Tail */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div className={`w-3 h-3 rotate-45 ring-[0.75px] ${tailStyle}`} />
            </div>

            {/* Tail Cover */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-3 bg-transparent" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
