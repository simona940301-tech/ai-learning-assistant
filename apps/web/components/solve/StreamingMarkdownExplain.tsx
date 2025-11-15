'use client'

/**
 * StreamingMarkdownExplain
 *
 * 極簡流式 Markdown 解釋組件
 * - 使用 /api/explain-stream
 * - ChatGPT 風格打字機效果
 * - 保持原本 ask 頁面的風格
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

interface StreamingMarkdownExplainProps {
  inputText: string
  onLoadingChange?: (loading: boolean) => void
}

export function StreamingMarkdownExplain({ inputText, onLoadingChange }: StreamingMarkdownExplainProps) {
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)

  useEffect(() => {
    const fetchExplanation = async () => {
      setIsStreaming(true)
      setStreamingContent('')
      setError(null)
      setLoadingStep(0)
      onLoadingChange?.(true)

      try {
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              text: inputText,
            },
            mode: 'deep',
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        // /api/explain 返回 JSON，不是 stream
        const data = await response.json()
        
        if (data.error) {
          throw new Error(data.error)
        }

        // 如果有 markdown，直接顯示
        if (data.markdown) {
          setStreamingContent(data.markdown)
          setIsStreaming(false)
          onLoadingChange?.(false)
        } else {
          throw new Error('API 未返回 markdown 內容')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setIsStreaming(false)
        onLoadingChange?.(false)
        console.error('[StreamingMarkdownExplain] Error:', err)
      }
    }

    if (inputText) {
      fetchExplanation()
    }
  }, [inputText, onLoadingChange])

  // Loading state（保持原本風格）
  if (isStreaming && streamingContent.length === 0) {
    const loadingSteps = [
      '正在分析題目…',
      '正在生成詳解…',
    ]
    const message = loadingSteps[loadingStep] || loadingSteps[0]

    return (
      <motion.div
        key={loadingStep}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 border border-zinc-800/50 p-6 shadow-lg backdrop-blur-sm"
      >
        <div className="flex items-center gap-3">
          {/* ChatGPT-style jumping dots */}
          <div className="flex gap-1.5">
            <motion.div
              className="h-2 w-2 rounded-full bg-blue-500"
              animate={{
                y: [0, -6, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: 0,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="h-2 w-2 rounded-full bg-blue-500"
              animate={{
                y: [0, -6, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: 0.2,
                ease: 'easeInOut',
              }}
            />
            <motion.div
              className="h-2 w-2 rounded-full bg-blue-500"
              animate={{
                y: [0, -6, 0],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: 0.4,
                ease: 'easeInOut',
              }}
            />
          </div>
          <span className="text-zinc-300 text-sm font-medium">{message}</span>
        </div>
      </motion.div>
    )
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-red-500/40 bg-red-500/10 p-6"
      >
        <div className="text-red-400 font-medium mb-2">⚠️ 無法生成詳解</div>
        <div className="text-sm text-red-300/70">{error}</div>
        <div className="text-xs text-red-300/50 mt-2">請再試一次</div>
      </motion.div>
    )
  }

  // Main content（保持原本風格）
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl bg-zinc-900/50 border border-zinc-800/50 overflow-hidden"
    >
      <div className="p-6 prose prose-invert max-w-none">
        <ReactMarkdown
          components={{
            // 自定義 h2 樣式（保持原本風格）
            h2: ({ children }) => {
              const text = String(children)

              if (text.includes('📝 題目')) {
                return (
                  <h2 className="text-lg font-semibold text-zinc-100 mb-4 pb-2 border-b border-zinc-800/50">
                    {children}
                  </h2>
                )
              }

              if (text.includes('✅ 答案')) {
                return (
                  <h2 className="text-lg font-semibold text-green-400 mb-4 pb-2 border-b border-green-500/30">
                    {children}
                  </h2>
                )
              }

              return (
                <h2 className="text-lg font-semibold text-zinc-200 mb-4 pb-2 border-b border-zinc-800/30">
                  {children}
                </h2>
              )
            },

            // 自定義段落樣式
            p: ({ children }) => (
              <p className="text-zinc-300 leading-relaxed mb-3">
                {children}
              </p>
            ),

            // 自定義列表樣式
            ul: ({ children }) => (
              <ul className="space-y-2 mb-4 text-zinc-300">
                {children}
              </ul>
            ),

            li: ({ children }) => (
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span className="flex-1">{children}</span>
              </li>
            ),

            // 自定義 strong（答案高亮）
            strong: ({ children }) => (
              <strong className="font-semibold text-green-400">
                {children}
              </strong>
            ),

            // 自定義引用區塊
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500/50 pl-4 my-4 text-zinc-400 italic">
                {children}
              </blockquote>
            ),
          }}
        >
          {streamingContent}
        </ReactMarkdown>

        {/* 打字機游標（只在流式時顯示） */}
        {isStreaming && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-blue-500 ml-1"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>
    </motion.div>
  )
}
