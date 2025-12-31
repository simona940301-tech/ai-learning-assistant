'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Lightbulb } from 'lucide-react'
import type { QuestionItem, OptionDetail } from '@/lib/explain/types'

interface UnifiedExplainProps {
  question: string
  options: string[]
  answer: string
  reasoning: string
  counterpoints?: Record<string, string>
  optionDetails?: Record<string, OptionDetail>
  tips?: string
}

/**
 * 統一詳解組件 - 符合新格式要求
 * 1. 題目在第一個欄位
 * 2. 水平的選項
 * 3. 正確選項和選擇原因
 * 4. 其他每個選項的詳解（英文單字題需詞性和翻譯）
 */
export function UnifiedExplain({
  question,
  options,
  answer,
  reasoning,
  counterpoints = {},
  optionDetails = {},
  tips,
}: UnifiedExplainProps) {
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())

  // 提取正確答案的字母（例如 "B among others" -> "B"）
  const answerMatch = answer.match(/^\(?\d+\)?\s*([A-E])/i) || answer.match(/^([A-E])/i)
  const correctAnswerKey = answerMatch ? answerMatch[1].toUpperCase() : null

  // 解析選項詳解（支持單字題和文法題格式）
  const parseCounterpoint = (key: string, text: string) => {
    // 檢查是否包含 "詞性：" 和 "中文：" 格式（單字題）
    const posMatch = text.match(/詞性[：:]\s*([^|]+)/)
    const translationMatch = text.match(/中文[：:]\s*([^|]+)/)
    const whyNotMatch = text.match(/為什麼不能選[：:]\s*(.+)/)

    if (posMatch || translationMatch) {
      return {
        type: 'vocabulary' as const,
        pos: posMatch?.[1]?.trim(),
        translation: translationMatch?.[1]?.trim(),
        whyNot: whyNotMatch?.[1]?.trim() || text.split('|').pop()?.trim() || text,
      }
    }

    // 檢查是否包含文法錯誤格式（文法題）
    const grammarErrorMatch = text.match(/^(時態錯誤|語態錯誤|語序錯誤|搭配錯誤|主詞動詞一致性錯誤|介系詞錯誤|關係代名詞錯誤)[：:]\s*(.+)/)
    if (grammarErrorMatch) {
      return {
        type: 'grammar' as const,
        errorType: grammarErrorMatch[1],
        explanation: grammarErrorMatch[2]?.trim() || text,
      }
    }

    // 如果沒有特殊格式，檢查 optionDetails（單字題結構化資料）
    if (optionDetails[key]?.pos || optionDetails[key]?.translation) {
      return {
        type: 'vocabulary' as const,
        pos: optionDetails[key]?.pos,
        translation: optionDetails[key]?.translation,
        whyNot: text,
      }
    }

    // 預設：一般文字格式
    return {
      type: 'general' as const,
      explanation: text,
    }
  }

  const toggleOption = (key: string) => {
    const newSet = new Set(expandedOptions)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setExpandedOptions(newSet)
  }

  return (
    <div className="space-y-6">
      {/* 1. 題目欄位 */}
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-400 mb-2">題目</div>
        <div className="text-base text-zinc-200 leading-relaxed whitespace-pre-wrap">
          {question}
        </div>
      </div>

      {/* 2. 選項列表（簡潔一行顯示） */}
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-400 mb-2">選項</div>
        <div className="text-sm text-zinc-300 leading-relaxed">
          {options.join('  ')}
        </div>
      </div>

      {/* 3. 正確答案（簡潔版） */}
      {correctAnswerKey && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-base font-semibold text-green-300 mb-2">
                ({correctAnswerKey}) {options.find(opt => {
                  const key = opt.match(/^\(([A-E])\)/i)?.[1]?.toUpperCase()
                  return key === correctAnswerKey
                })?.replace(/^\([A-E]\)\s*/i, '').trim()}
              </div>
              <div className="text-sm text-zinc-300 leading-relaxed">
                {reasoning}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. 其他選項詳解（可展開） */}
      {Object.keys(counterpoints).length > 0 && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <button
            onClick={() => {
              const allKeys = Object.keys(counterpoints)
              if (expandedOptions.size === allKeys.length) {
                setExpandedOptions(new Set())
              } else {
                setExpandedOptions(new Set(allKeys))
              }
            }}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors mb-4"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                expandedOptions.size > 0 ? 'rotate-180' : ''
              }`}
            />
            <span>{expandedOptions.size > 0 ? '收起選項解析' : '展開選項解析'}</span>
          </button>

          <AnimatePresence>
            {expandedOptions.size > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {Object.entries(counterpoints).map(([key, text]) => {
                  const parsed = parseCounterpoint(key, text)

                  return (
                    <div
                      key={key}
                      className="pl-4 border-l-2 border-zinc-700/50 hover:bg-zinc-800/30 transition-colors rounded-r p-3"
                    >
                      <div className="text-sm text-zinc-300 leading-relaxed">
                        <span className="font-medium text-zinc-200">({key})</span>{' '}

                        {/* 單字題格式 */}
                        {parsed.type === 'vocabulary' && (
                          <div className="mt-2 space-y-1">
                            {parsed.pos && (
                              <div className="text-xs text-zinc-400">
                                詞性：<span className="text-zinc-300">{parsed.pos}</span>
                              </div>
                            )}
                            {parsed.translation && (
                              <div className="text-xs text-zinc-400">
                                中文：<span className="text-zinc-300">{parsed.translation}</span>
                              </div>
                            )}
                            {parsed.whyNot && (
                              <div className="text-sm text-zinc-300 mt-2">
                                {parsed.whyNot}
                              </div>
                            )}
                          </div>
                        )}

                        {/* 文法題格式 */}
                        {parsed.type === 'grammar' && (
                          <div className="mt-2">
                            <div className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300 mb-2">
                              {parsed.errorType}
                            </div>
                            <div className="text-sm text-zinc-300">
                              {parsed.explanation}
                            </div>
                          </div>
                        )}

                        {/* 一般格式 */}
                        {parsed.type === 'general' && (
                          <span className="text-sm">{parsed.explanation}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 5. 解題技巧（可選） */}
      {tips && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-medium text-yellow-400 mb-2">💡 解題技巧</div>
              <div className="text-sm text-zinc-300 leading-relaxed">{tips}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


