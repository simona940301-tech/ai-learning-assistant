'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'

export interface ExplainCardContentData {
  question: string
  answer: string
  reasoning: string
  counterpoints?: Record<string, string>
  note?: string
}

interface ExplainCardContentProps {
  data: ExplainCardContentData
}

/**
 * ExplainCardContent - 極簡垂直詳解卡 UI 組件
 * 
 * 設計原則：
 * - 垂直資訊流，無橫向干擾
 * - 答案優先，理由次之，錯誤選項可展開
 * - 深色模式，極簡設計
 * - 適配短文或長文題都穩定
 */
export default function ExplainCardContent({ data }: ExplainCardContentProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 text-[#f2f2f2] space-y-6">
      {/* 題幹 */}
      <div>
        <p className="text-base font-medium text-[#f2f2f2] leading-relaxed line-clamp-2">
          {data.question}
        </p>
      </div>

      {/* 分隔線 */}
      <div className="border-t border-[#333]" />

      {/* 正解區 */}
      <div className="flex items-start gap-3">
        <Check className="text-[#10b981] w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <p className="text-base font-semibold text-[#10b981]">
            {data.answer}
          </p>
          <p className="text-sm text-[#9ca3af] leading-relaxed">
            {data.reasoning}
          </p>
        </div>
      </div>

      {/* 錯誤選項區（可展開） */}
      {data.counterpoints && Object.keys(data.counterpoints).length > 0 && (
        <div className="border-t border-[#333] pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#f2f2f2] transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
            <span>{isExpanded ? '收起選項解析' : '展開選項解析'}</span>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="mt-4 space-y-3"
              >
                {Object.entries(data.counterpoints).map(([key, value]) => {
                  // 注意：ExplainCardContent 沒有 options 資料，需要從其他地方獲取
                  // 這裡先保持原樣，如果需要的話可以擴展 props
                  return (
                    <div
                      key={key}
                      className="pl-4 border-l-2 border-[#374151] hover:bg-neutral-900/40 transition-colors rounded-r"
                    >
                      <p className="text-sm text-[#9ca3af] leading-relaxed">
                        <span className="text-[#f2f2f2] font-medium">({key})</span>{' '}
                        {value}
                      </p>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 延伸補充（可摺疊） */}
      {data.note && (
        <details className="mt-4 text-sm text-[#9ca3af] italic">
          <summary className="cursor-pointer text-[#9ca3af] hover:text-[#f2f2f2] transition-colors list-none">
            <span className="inline-flex items-center gap-2">
              <span>📘</span>
              <span>延伸補充</span>
            </span>
          </summary>
          <p className="mt-3 ml-6 leading-relaxed text-[#9ca3af]">
            {data.note}
          </p>
        </details>
      )}
    </div>
  )
}

