'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface TypewriterMarkdownProps {
  content: string
  speed?: number // 打字速度（毫秒/字符），預設 20ms
  className?: string
}

/**
 * TypewriterMarkdown 組件
 * ChatGPT 風格打字動畫，支援 markdown 渲染
 * 
 * 特性：
 * - 逐字顯示 markdown 內容
 * - 顯示跳動的光標（bg-primary animate-pulse）
 * - 打字速度：每 20ms 增加字符
 * - 使用 text-foreground（深咖啡棕）
 */
export default function TypewriterMarkdown({ content, speed = 20, className = '' }: TypewriterMarkdownProps) {
  const [displayedLength, setDisplayedLength] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // 重置狀態
    setDisplayedLength(0)
    setIsComplete(false)

    if (content.length === 0) {
      setIsComplete(true)
      return
    }

    let currentIndex = 0
    const timer = setInterval(() => {
      currentIndex++
      if (currentIndex >= content.length) {
        setDisplayedLength(content.length)
        setIsComplete(true)
        clearInterval(timer)
      } else {
        setDisplayedLength(currentIndex)
      }
    }, speed)

    return () => clearInterval(timer)
  }, [content, speed])

  const displayedContent = content.slice(0, displayedLength)

  return (
    <div className={`text-foreground text-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:text-foreground"
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-2 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ children }) => <code className="bg-primary/10 px-1 py-0.5 rounded text-xs">{children}</code>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        }}
      >
        {displayedContent}
      </ReactMarkdown>
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: 0.53,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="inline-block w-[1px] h-[1em] align-baseline bg-primary ml-0.5"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

