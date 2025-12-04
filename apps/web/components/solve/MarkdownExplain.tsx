'use client'

import { useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownExplainProps {
  markdown: string
}

/**
 * 極簡 Markdown 渲染器 - 教學級詳解專用（v2）
 *
 * 新功能：
 * - 題幹自動折疊（超過 100 字）
 * - 引用點擊 → 高亮對應段落
 * - 選項區獨立樣式
 * - 答案區綠底強調
 */
export function MarkdownExplain({ markdown }: MarkdownExplainProps) {
  const [isStemExpanded, setIsStemExpanded] = useState(false)
  const [highlightedAnchor, setHighlightedAnchor] = useState<string | null>(null)
  const stemRef = useRef<HTMLDivElement>(null)

  // 提取題目內容（用於折疊判斷）
  // 移除 HTML 註釋和選項標記後計算長度
  const stemMatch = markdown.match(/## 📝 題目\s*\n([\s\S]*?)(?=\n## |$)/)
  let stemContent = stemMatch?.[1]?.trim() || ''
  // 移除 HTML 註釋
  stemContent = stemContent.replace(/<!--[\s\S]*?-->/g, '')
  // 移除選項標記（如果還有殘留）
  stemContent = stemContent.replace(/\([A-E]\)|（[A-E]）/gi, '')
  const shouldCollapseStem = stemContent.length > 100

  // 引用點擊處理：滾動到對應段落並高亮 2 秒
  const handleQuoteClick = useCallback((dataRef: string | null) => {
    if (!dataRef) return

    const targetElement = document.querySelector(`[data-anchor="${dataRef}"]`)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedAnchor(dataRef)
      setTimeout(() => setHighlightedAnchor(null), 2000)
    }
  }, [])

  return (
    <div className="prose prose-invert prose-sm max-w-none prose-h2:text-lg prose-h2:font-semibold prose-h2:mt-6 prose-h2:mb-4 prose-h3:text-base prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-3 prose-p:leading-relaxed prose-p:mb-4 prose-ul:my-4 prose-ul:leading-normal prose-li:my-1.5 prose-li:leading-normal prose-ol:my-4 prose-ol:leading-normal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // h2: 主標題（題目、選項、答案、詳解、解題技巧）
          h2: ({ children }) => {
            const text = String(children)

            // 題目區：支援折疊
            if (text.includes('📝 題目')) {
              return (
                <div ref={stemRef} className="mb-6">
                  <h2 className="text-lg font-semibold text-[#4B3425] mb-3">
                    {children}
                  </h2>
                </div>
              )
            }

            // 選項區：灰底獨立顯示（支援兩種 emoji）
            if (text.includes('🔡 選項') || text.includes('🔘 選項')) {
              return (
                <h2 className="text-base font-medium text-[#5C4033] mt-6 mb-2">
                  {children}
                </h2>
              )
            }

            // 答案區：綠底強調標題
            if (text.includes('✅ 答案')) {
              return (
                <div className="mt-6 mb-3">
                  <h2 className="text-lg font-semibold text-[#4B3425] mb-3">
                    {children}
                  </h2>
                </div>
              )
            }

            // 其他標題
            return (
              <h2 className="text-lg font-semibold text-[#4B3425] mt-6 mb-3">
                {children}
              </h2>
            )
          },
          // h3: 次標題（為什麼正確、其他選項分析）
          h3: ({ children }) => {
            const text = String(children)
            // 詳解區的 h3（例如「(1) 為何選 B：」）
            if (text.includes('為何選') || text.match(/^\(\d+\)/)) {
              return (
                <h3 className="text-base font-semibold text-emerald-300 mt-6 mb-3 first:mt-0">
                  {children}
                </h3>
              )
            }
            return (
              <h3 className="text-base font-medium text-[#5C4033] mt-4 mb-2">
                {children}
              </h3>
            )
          },
          // p: 段落（支援折疊與 data-anchor）
          p: ({ children, node }) => {
            // 從 HTML 註釋中提取 data-anchor（格式：<!-- data-anchor="p-1" -->）
            const childrenText = String(children)
            const currentIndex = markdown.indexOf(childrenText)
            const beforeText = markdown.substring(0, currentIndex)

            // 檢查段落前是否有 data-anchor 註釋
            const anchorMatch = beforeText.match(/<!--\s*data-anchor=["']([^"']+)["']\s*-->\s*$/m)
            const dataAnchor = anchorMatch?.[1] || (node?.properties?.dataAnchor as string | undefined)
            const isHighlighted = highlightedAnchor === dataAnchor

            // 判斷當前段落屬於哪個區塊
            const lastHeading = beforeText.match(/## ([^\n]+)\n[^#]*$/)?.[1]

            const isInStem = lastHeading?.includes('📝 題目')
            const isInAnswer = lastHeading?.includes('✅ 答案')
            const isInOptions = lastHeading?.includes('🔡 選項') || lastHeading?.includes('🔘 選項')
            const isInExplanation = lastHeading?.includes('🧠 詳解')

            // 答案區：綠底強調每一行
            if (isInAnswer) {
              // 檢查是否為答案行格式：(1) A — 或 **A** — 或 (1) A — 或單空格題的 **A** —
              // 支援多種格式：(1) A — text, **A** — text, A — text
              const answerLineMatch = childrenText.match(/^(\(?\d+\)?\s*)?\**([A-E])\**\s*[—–-]\s*(.+)$/i)
              if (answerLineMatch) {
                return (
                  <p className="text-sm text-[#4B3425] font-medium leading-relaxed mb-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                    {children}
                  </p>
                )
              }

              // 檢查是否為簡單格式：A — text 或 **A** — text
              const simpleAnswerMatch = childrenText.match(/^\**([A-E])\**\s*[—–-]\s*(.+)$/i)
              if (simpleAnswerMatch) {
                return (
                  <p className="text-sm text-[#4B3425] font-medium leading-relaxed mb-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                    {children}
                  </p>
                )
              }

              // 如果不符合格式，也顯示為答案區樣式（可能是其他格式）
              return (
                <p className="text-sm text-[#4B3425] leading-relaxed mb-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                  {children}
                </p>
              )
            }

            // 選項區：灰底獨立顯示，每個選項一行
            if (isInOptions) {
              // 檢查是否包含多個選項（用正則表達式分割）
              const optionPattern = /\(([A-E])\)\s*([^\(]+?)(?=\s*\([A-E]\)|$)/gi
              const options = Array.from(childrenText.matchAll(optionPattern))

              if (options.length > 0) {
                // 如果找到多個選項，分別渲染
                return (
                  <div className="space-y-2">
                    {options.map((match, idx) => {
                      const key = match[1]
                      const text = match[2]?.trim() || ''
                      return (
                        <div
                          key={`${key}-${idx}`}
                          className="text-sm text-[#5C4033] leading-relaxed px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]"
                        >
                          ({key}) {text}
                        </div>
                      )
                    })}
                  </div>
                )
              }

              // 單個選項格式：(A) text
              const optionMatch = childrenText.match(/^\(([A-E])\)\s*(.+)$/i)
              if (optionMatch) {
                return (
                  <div className="text-sm text--[#5C4033] leading-relaxed mb-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                    {children}
                  </div>
                )
              }

              // 如果不是標準格式，也顯示為選項樣式
              return (
                <div className="text-sm text-[#5C4033] leading-relaxed mb-2 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                  {children}
                </div>
              )
            }

            // 題目區段落：支援折疊
            if (isInStem && shouldCollapseStem && !isStemExpanded) {
              // 折疊模式：只顯示前 100 字
              const text = String(children)
              // 移除 HTML 註釋後計算長度
              const cleanText = text.replace(/<!--[\s\S]*?-->/g, '')
              if (cleanText.length > 100) {
                return (
                  <div className="mb-3">
                    <p className="text-sm text-[#5C4033] leading-relaxed inline">
                      {cleanText.substring(0, 100)}...
                    </p>
                    <button
                      onClick={() => setIsStemExpanded(true)}
                      className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      展開全文
                    </button>
                  </div>
                )
              }
            }

            // 題目區：移除 HTML 註釋（不顯示註釋）
            if (isInStem) {
              let displayText = String(children)
              displayText = displayText.replace(/<!--[\s\S]*?-->/g, '') // 移除 HTML 註釋

              return (
                <p
                  data-anchor={dataAnchor}
                  className={`text-sm text-[#5C4033] leading-relaxed mb-3 transition-colors duration-300 ${isHighlighted ? 'bg-yellow-500/20 rounded px-2 py-1' : ''
                    }`}
                >
                  {displayText}
                  {shouldCollapseStem && isStemExpanded && (
                    <button
                      onClick={() => setIsStemExpanded(false)}
                      className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      收合
                    </button>
                  )}
                </p>
              )
            }

            // 詳解區：特殊樣式，突出正確答案說明
            if (isInExplanation) {
              // 檢查是否為「其他選項：」開頭的段落
              if (childrenText.startsWith('其他選項：') || childrenText.startsWith('其他選項:')) {
                return (
                  <p className="text-sm text-[#5C4033] leading-relaxed mb-4 ml-4 pl-4 border-l-2 border-[#E5E7EB]">
                    {children}
                  </p>
                )
              }
              // 一般詳解段落：稍微突出
              return (
                <p className="text-sm text-[#4B3425] leading-relaxed mb-3">
                  {children}
                </p>
              )
            }

            // 其他區域（解題技巧等）
            return (
              <p
                data-anchor={dataAnchor}
                className={`text-sm text-[#5C4033] leading-relaxed mb-3 transition-colors duration-300 ${isHighlighted ? 'bg-yellow-500/20 rounded px-2 py-1' : ''
                  }`}
              >
                {children}
              </p>
            )
          },
          // ul/ol: 列表（選項分析）
          ul: ({ children }) => (
            <ul className="space-y-2 mb-4 ml-4">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="space-y-2 mb-4 ml-4">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-[#5C4033] leading-relaxed">
              {children}
            </li>
          ),
          // blockquote: 引用原文（支援點擊跳轉）
          blockquote: ({ children, node }) => {
            // 從 HTML 註釋中提取 data-ref（格式：<!-- data-ref="p-2" -->）
            const childrenText = String(children)
            const dataRefMatch = childrenText.match(/<!--\s*data-ref=["']([^"']+)["']\s*-->/)
            const dataRef = dataRefMatch?.[1] || (node?.properties?.dataRef as string | undefined)

            return (
              <blockquote
                onClick={() => dataRef && handleQuoteClick(dataRef)}
                className={`border-l-4 border-blue-500/50 pl-4 py-2 my-3 bg-blue-500/10 rounded-r ${dataRef ? 'cursor-pointer hover:bg-blue-500/20 transition-colors' : ''
                  }`}
                data-ref={dataRef}
              >
                <div className="text-sm text-blue-200/90 italic">
                  {/* 移除 HTML 註釋 */}
                  {childrenText.replace(/<!--\s*data-ref=["'][^"']+["']\s*-->/g, '')}
                  {dataRef && (
                    <span className="ml-2 text-xs text-blue-300/60">點擊跳轉</span>
                  )}
                </div>
              </blockquote>
            )
          },
          // strong: 粗體（答案、關鍵詞）
          strong: ({ children }) => (
            <strong className="font-semibold text-[#4B3425]">
              {children}
            </strong>
          ),
          // em: 斜體（補充說明）
          em: ({ children }) => (
            <em className="italic text-[#5C4033]">
              {children}
            </em>
          ),
          // code: 行內程式碼（保留原樣）
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-[#F9FAFB] text-[#4B3425] text-xs font-mono">
              {children}
            </code>
          ),
          // hr: 分隔線
          hr: () => (
            <hr className="my-6 border-[#E5E7EB]" />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
