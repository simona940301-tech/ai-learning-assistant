'use client'

/**
 * StreamingExplainCard v2
 *
 * 極簡設計，支持：
 * - 流式輸出 + 打字機效果
 * - 題幹自動折疊（>100 字）
 * - 引用跳轉與高亮
 * - Markdown 渲染
 */

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

interface StreamingExplainCardProps {
  questionText: string
  onError?: (error: string) => void
}

export function StreamingExplainCard({ questionText, onError }: StreamingExplainCardProps) {
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 題幹折疊狀態
  const [isStemExpanded, setIsStemExpanded] = useState(false)

  useEffect(() => {
    const fetchExplanation = async () => {
      setIsStreaming(true)
      setStreamingContent('')
      setError(null)

      try {
        const response = await fetch('/api/explain-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              text: questionText,
            },
            mode: 'deep',
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            setIsComplete(true)
            setIsStreaming(false)
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6)

              if (data === '[DONE]') {
                continue
              }

              try {
                const json = JSON.parse(data)

                if (json.error) {
                  throw new Error(json.error)
                }

                if (json.content) {
                  setStreamingContent((prev) => prev + json.content)
                }
              } catch (e) {
                // Ignore JSON parse errors
              }
            }
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setIsStreaming(false)
        onError?.(errorMessage)
        console.error('[StreamingExplainCard] Error:', err)
      }
    }

    if (questionText) {
      fetchExplanation()
    }
  }, [questionText, onError])

  // 解析 Markdown 中的題幹長度（只計算 ## 📝 題目 區段）
  const stemSection = streamingContent.match(/## 📝 題目\n([\s\S]*?)(?=\n## |$)/)?.[1] || ''
  const stemLength = stemSection.length
  const shouldCollapseStem = stemLength > 100

  return (
    <div className="streaming-explain-card">
      {/* Loading 狀態 */}
      {isStreaming && streamingContent.length === 0 && (
        <div className="loading-indicator">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <p>AI 正在思考...</p>
        </div>
      )}

      {/* 錯誤狀態 */}
      {error && (
        <div className="error-message">
          <p>⚠️ 無法生成詳解，請再試一次</p>
          <p className="error-detail">{error}</p>
        </div>
      )}

      {/* Markdown 內容 */}
      {streamingContent && (
        <div className={`markdown-container ${isStreaming ? 'streaming' : 'complete'}`}>
          <ReactMarkdown
            components={{
              // 自定義題幹渲染（支持折疊）
              h2: ({ node, children, ...props }) => {
                const text = String(children)

                if (text.includes('📝 題目')) {
                  return (
                    <div className="section section-question">
                      <h2 {...props}>{children}</h2>
                      {shouldCollapseStem && !isStemExpanded && (
                        <button
                          className="expand-button"
                          onClick={() => setIsStemExpanded(true)}
                        >
                          展開全文 ▼
                        </button>
                      )}
                      {shouldCollapseStem && isStemExpanded && (
                        <button
                          className="expand-button"
                          onClick={() => setIsStemExpanded(false)}
                        >
                          收合 ▲
                        </button>
                      )}
                    </div>
                  )
                }

                if (text.includes('🔡 選項')) {
                  return (
                    <div className="section section-options">
                      <h2 {...props}>{children}</h2>
                    </div>
                  )
                }

                if (text.includes('✅ 答案')) {
                  return (
                    <div className="section section-answer">
                      <h2 {...props}>{children}</h2>
                    </div>
                  )
                }

                if (text.includes('🧠 詳解')) {
                  return (
                    <div className="section section-explanation">
                      <h2 {...props}>{children}</h2>
                    </div>
                  )
                }

                if (text.includes('💡 解題技巧')) {
                  return (
                    <div className="section section-tips">
                      <h2 {...props}>{children}</h2>
                    </div>
                  )
                }

                return <h2 {...props}>{children}</h2>
              },

              // 自定義段落渲染（題幹折疊邏輯）
              p: ({ node, children, ...props }) => {
                const parent = node?.position
                const isInStem = stemSection.includes(String(children))

                if (isInStem && shouldCollapseStem && !isStemExpanded) {
                  // 只顯示前 100 字
                  const text = String(children)
                  if (text.length > 100) {
                    return (
                      <p {...props} className="collapsed-stem">
                        {text.substring(0, 100)}...
                      </p>
                    )
                  }
                }

                return <p {...props}>{children}</p>
              },

              // 自定義引用渲染（支持跳轉和高亮）
              blockquote: ({ node, children, ...props }) => {
                return (
                  <blockquote
                    {...props}
                    className="evidence-quote"
                    onClick={() => {
                      // TODO: 實現跳轉和高亮邏輯
                      console.log('Jump to evidence')
                    }}
                  >
                    {children}
                  </blockquote>
                )
              },
            }}
          >
            {streamingContent}
          </ReactMarkdown>

          {/* 打字機游標 */}
          {isStreaming && <span className="typing-cursor">▋</span>}
        </div>
      )}

      <style jsx>{`
        .streaming-explain-card {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        .loading-indicator {
          text-align: center;
          padding: 48px 24px;
        }

        .loading-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .loading-dots span {
          width: 8px;
          height: 8px;
          background: #3b82f6;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .loading-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .loading-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 8px;
          padding: 16px;
          color: #991b1b;
        }

        .error-detail {
          margin-top: 8px;
          font-size: 14px;
          opacity: 0.8;
        }

        .markdown-container {
          line-height: 1.7;
          color: #1f2937;
        }

        .markdown-container.streaming {
          opacity: 0.95;
        }

        .section {
          margin-bottom: 32px;
        }

        .section h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }

        .section-answer {
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
          padding: 16px;
          border-radius: 8px;
        }

        .section-answer h2 {
          color: #16a34a;
          border-bottom: none;
        }

        .expand-button {
          margin-top: 12px;
          padding: 8px 16px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .expand-button:hover {
          background: #e5e7eb;
        }

        .collapsed-stem {
          position: relative;
        }

        .evidence-quote {
          background: #f9fafb;
          border-left: 4px solid #6b7280;
          padding: 12px 16px;
          margin: 16px 0;
          cursor: pointer;
          transition: all 0.2s;
        }

        .evidence-quote:hover {
          background: #f3f4f6;
          border-left-color: #3b82f6;
        }

        .typing-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: #3b82f6;
          animation: blink 1s infinite;
          margin-left: 2px;
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
