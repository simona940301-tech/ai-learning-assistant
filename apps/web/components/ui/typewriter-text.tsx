'use client'

import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface TypewriterTextProps {
  text: string
  speed?: number // 打字速度（毫秒/字符）
  delay?: number // 開始延遲（毫秒）
  onComplete?: () => void
  className?: string
  showCursor?: boolean
  cursorBlinkSpeed?: number
}

/**
 * 極簡主義打字機效果組件
 * 
 * 特性：
 * - 平滑的字元逐字顯示
 * - 可配置速度和延遲
 * - 極簡的游標動畫
 * - 完成回調
 */
export function TypewriterText({
  text,
  speed = 20,
  delay = 0,
  onComplete,
  className = '',
  showCursor = true,
  cursorBlinkSpeed = 530,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('')
  const [isComplete, setIsComplete] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const delayRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // 重置狀態
    setDisplayedText('')
    setIsComplete(false)

    // 延遲開始
    if (delay > 0) {
      delayRef.current = setTimeout(() => {
        startTyping()
      }, delay)
    } else {
      startTyping()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (delayRef.current) {
        clearTimeout(delayRef.current)
      }
    }
  }, [text, speed, delay])

  const startTyping = () => {
    let currentIndex = 0

    const typeNextChar = () => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1))
        currentIndex++
        timeoutRef.current = setTimeout(typeNextChar, speed)
      } else {
        setIsComplete(true)
        onComplete?.()
      }
    }

    typeNextChar()
  }

  return (
    <span className={className}>
      {displayedText}
      {showCursor && !isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: cursorBlinkSpeed / 1000,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="inline-block w-[1px] h-[1em] align-baseline bg-current ml-0.5"
          aria-hidden="true"
        />
      )}
    </span>
  )
}

