'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const PROGRESS_MESSAGES = [
  '正在解析題目…',
  '正在判讀題型…',
  '正在分析語意結構…',
  '正在抽取關鍵訊息…',
  '正在生成詳解…',
]

interface LoadingStateProps {
  className?: string
}

/**
 * LoadingState 組件
 * 顯示輪播的 AI 進度訊息
 * 
 * 特性：
 * - 5 個進度訊息輪播
 * - 每 2 秒自動切換訊息
 * - 使用 motion.div 淡入淡出動畫
 * - 使用暖黃色調（bg-card, border-border, bg-primary）
 */
export default function LoadingState({ className = '' }: LoadingStateProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length)
    }, 2000) // 每 2 秒切換

    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`flex flex-col items-center justify-center min-h-[40vh] px-4 ${className}`}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="text-6xl mb-4"
      >
        ⏳
      </motion.div>
      
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg bg-card border border-border px-6 py-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-primary"
            />
            <div className="text-lg font-medium text-foreground">
              {PROGRESS_MESSAGES[currentIndex]}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}















































