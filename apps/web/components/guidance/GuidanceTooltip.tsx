/**
 * 🎯 Guidance Tooltip - 極簡暖色系引導組件
 *
 * 設計原則:
 * - 極簡主義: 無花俏特效,僅保留必要動畫
 * - 暖色系: 使用品牌色 (#FAF6E9, #FED168, #528555, #5D4037)
 * - 柔和視覺: 溫暖發光,不刺眼
 * - 快速識別: 7秒自動消失
 *
 * 三個呈現層級:
 * - Level 1: 柔和暖光 (Warm Glow) - 僅視覺高亮
 * - Level 2: 簡約氣泡 (Simple Bubble) - 簡短文字提示
 * - Level 3: 極簡對話框 (Minimal Dialog) - 重要操作引導
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { GuidanceItem } from '@/lib/guidance/guidance-engine'

const palette = {
  surface: 'rgba(255, 249, 236, 0.82)',
  surfaceAlt: 'rgba(255, 243, 220, 0.72)',
  accent: '#FED168',
  border: 'rgba(254, 209, 104, 0.55)',
  text: '#5D4037',
}

interface GuidanceTooltipProps {
  item: GuidanceItem
  onDismiss: (dismissalType: 'permanent' | 'session') => void
  onComplete: () => void
  autoHideMs?: number
}

export function GuidanceTooltip({
  item,
  onDismiss,
  onComplete,
  autoHideMs = 7000,
}: GuidanceTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  // 查找目標元素並獲取位置
  useEffect(() => {
    if (!item.targetElement) {
      setIsVisible(true)
      return
    }

    const findTarget = () => {
      const target = document.querySelector(item.targetElement!)
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)
        setIsVisible(true)
        return true
      }
      return false
    }

    // 立即嘗試查找
    if (findTarget()) return

    // 如果未找到，使用 MutationObserver 等待元素出現
    const observer = new MutationObserver(() => {
      if (findTarget()) {
        observer.disconnect()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      observer.disconnect()
    }
  }, [item.targetElement])

  // 自動隱藏（Level 1 & 2）
  useEffect(() => {
    if (!isVisible || item.presentationLevel === 3) return

    timeoutRef.current = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => {
        onDismiss('session')
      }, 300)
    }, autoHideMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isVisible, item.presentationLevel, autoHideMs, onDismiss])

  // ============================================
  // Level 1: 柔和暖光 (Warm Glow)
  // ============================================
  if (item.presentationLevel === 1) {
    if (!targetRect) return null

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="pointer-events-none fixed z-50"
            style={{
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          >
            {/* 🎨 極簡暖光環 - 單層柔和發光 */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'radial-gradient(circle at 50% 50%, rgba(254, 209, 104, 0.22) 0%, rgba(254, 209, 104, 0.08) 45%, transparent 75%)',
                boxShadow: '0 0 0 1px rgba(254, 209, 104, 0.25), 0 18px 40px rgba(93, 64, 55, 0.14)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                animation: 'gentlePulse 3s ease-in-out infinite',
              }}
            />

            {/* 🎨 極簡文字氣泡 */}
            {item.copy && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  [item.position === 'bottom' ? 'top' : 'bottom']: -40,
                }}
              >
                <div
                  className="whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium shadow-md"
                  style={{
                    background: 'linear-gradient(125deg, rgba(254, 209, 104, 0.92), rgba(255, 236, 195, 0.85))',
                    color: palette.text,
                    border: '1px solid rgba(93, 64, 55, 0.12)',
                    boxShadow: '0 12px 35px rgba(93, 64, 55, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  {item.copy}
                </div>
              </motion.div>
            )}

            {/* CSS Animation */}
            <style jsx>{`
              @keyframes gentlePulse {
                0%, 100% { opacity: 0.8; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.02); }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // ============================================
  // Level 2: 簡約氣泡 (Simple Bubble)
  // ============================================
  if (item.presentationLevel === 2) {
    if (!targetRect) return null

    const getPosition = () => {
      const position = item.position || 'top'
      const offset = 16

      switch (position) {
        case 'top':
          return {
            top: targetRect.top - offset,
            left: targetRect.left + targetRect.width / 2,
            transform: 'translate(-50%, -100%)',
          }
        case 'bottom':
          return {
            top: targetRect.bottom + offset,
            left: targetRect.left + targetRect.width / 2,
            transform: 'translate(-50%, 0)',
          }
        case 'left':
          return {
            top: targetRect.top + targetRect.height / 2,
            left: targetRect.left - offset,
            transform: 'translate(-100%, -50%)',
          }
        case 'right':
          return {
            top: targetRect.top + targetRect.height / 2,
            left: targetRect.right + offset,
            transform: 'translate(0, -50%)',
          }
        default:
          return {
            top: targetRect.top - offset,
            left: targetRect.left + targetRect.width / 2,
            transform: 'translate(-50%, -100%)',
          }
      }
    }

    const pos = getPosition()

    return (
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="pointer-events-auto fixed z-50"
            style={{
              top: pos.top,
              left: pos.left,
              transform: pos.transform,
            }}
          >
            {/* 🎨 極簡暖色氣泡 */}
            <div
              className="relative flex items-start gap-3 overflow-hidden rounded-3xl px-5 py-4 shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${palette.surface}, ${palette.surfaceAlt})`,
                border: `1.5px solid ${palette.border}`,
                boxShadow: '0 18px 48px rgba(52, 35, 21, 0.18), 0 1px 0 rgba(255, 255, 255, 0.55)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                minWidth: 240,
                maxWidth: 360,
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background: 'radial-gradient(circle at 16% 24%, rgba(254, 209, 104, 0.2), transparent 32%), radial-gradient(circle at 88% 6%, rgba(82, 133, 85, 0.14), transparent 28%)',
                }}
              />

              <div
                className="relative mt-0.5 h-8 w-1 rounded-full"
                style={{
                  background: 'linear-gradient(180deg, rgba(254, 209, 104, 0.85), rgba(82, 133, 85, 0.5))',
                  boxShadow: '0 10px 28px rgba(254, 209, 104, 0.32)',
                }}
              />

              {/* Content */}
              <div className="relative flex flex-1 items-start gap-2">
                <span
                  className="text-sm font-semibold leading-snug"
                  style={{
                    color: palette.text,
                    textShadow: '0 1px 0 rgba(255, 255, 255, 0.75)',
                  }}
                >
                  {item.copy}
                </span>
              </div>

              {/* Dismiss button */}
              {item.dismissalOption !== 'none' && (
                <button
                  onClick={() => {
                    setIsVisible(false)
                    setTimeout(() => {
                      onDismiss(item.dismissalOption === 'permanent' ? 'permanent' : 'session')
                    }, 200)
                  }}
                  className="relative flex h-7 w-7 items-center justify-center rounded-full transition-all hover:scale-110"
                  style={{
                    background: 'rgba(254, 209, 104, 0.82)',
                    color: palette.text,
                    border: '1px solid rgba(93, 64, 55, 0.08)',
                    boxShadow: '0 10px 28px rgba(52, 35, 21, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
                  }}
                  aria-label="關閉提示"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              )}

              {/* 🎨 極簡小尾巴 */}
              <div
                className="absolute"
                style={{
                  width: 0,
                  height: 0,
                  borderStyle: 'solid',
                  filter: 'drop-shadow(0 8px 24px rgba(52, 35, 21, 0.16))',
                  ...(item.position === 'top' && {
                    bottom: -6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: '6px 6px 0 6px',
                    borderColor: `${palette.surface} transparent transparent transparent`,
                  }),
                  ...(item.position === 'bottom' && {
                    top: -6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: '0 6px 6px 6px',
                    borderColor: `transparent transparent ${palette.surface} transparent`,
                  }),
                  ...(item.position === 'left' && {
                    right: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderWidth: '6px 0 6px 6px',
                    borderColor: `transparent transparent transparent ${palette.surface}`,
                  }),
                  ...(item.position === 'right' && {
                    left: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    borderWidth: '6px 6px 6px 0',
                    borderColor: `transparent ${palette.surface} transparent transparent`,
                  }),
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // ============================================
  // Level 3: 極簡對話框 (Minimal Dialog)
  // ============================================
  if (item.presentationLevel === 3) {
    return (
      <AnimatePresence>
        {isVisible && (
          <>
            {/* 🎨 極簡半透明背景 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{
                background: 'rgba(93, 64, 55, 0.25)',
                backdropFilter: 'blur(8px)',
              }}
              onClick={() => {
                setIsVisible(false)
                setTimeout(() => {
                  onDismiss('session')
                }, 200)
              }}
            />

            {/* 🎨 極簡對話框 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 shadow-2xl"
              style={{
                background: '#FFFDF5',
                border: '2px solid #E0D0B8',
              }}
            >
              {/* Content */}
              <div className="mb-6">
                <h3
                  className="mb-2 text-lg font-semibold leading-tight"
                  style={{ color: '#5D4037' }}
                >
                  {item.copy}
                </h3>
                {item.condition && (
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#8B6F47' }}
                  >
                    {item.condition}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsVisible(false)
                    setTimeout(() => {
                      onDismiss(item.dismissalOption === 'permanent' ? 'permanent' : 'session')
                    }, 200)
                  }}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition-all hover:scale-105"
                  style={{
                    background: '#F8F5E8',
                    color: '#8B6F47',
                    border: '1.5px solid #E0D0B8',
                  }}
                >
                  {item.dismissalOption === 'permanent' ? '不再顯示' : '我知道了'}
                </button>
                <button
                  onClick={() => {
                    setIsVisible(false)
                    setTimeout(() => {
                      onComplete()
                    }, 200)
                  }}
                  className="flex-1 rounded-2xl px-4 py-3 text-sm font-medium shadow-md transition-all hover:scale-105 hover:shadow-lg"
                  style={{
                    background: '#FED168',
                    color: '#5D4037',
                  }}
                >
                  立即試試
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return null
}
