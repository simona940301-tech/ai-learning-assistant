'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import type { SharedPassagePayload, OptionDetail } from '@/lib/explain/types'

interface SharedPassageExplainProps {
  data: SharedPassagePayload
}

/**
 * 長文共用題幹專用組件 - 優化版
 *
 * 設計原則：
 * 1. 長文預設收合，可展開
 * 2. 答案速覽卡 - 一眼看到所有答案
 * 3. 每題顯示正確答案原因（預設展開）
 * 4. 其他選項詳解預設收合（保持完整的單字/文法題解析）
 */
export function SharedPassageExplain({ data }: SharedPassageExplainProps) {
  const [passageExpanded, setPassageExpanded] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set())

  // 提取所有答案用於速覽卡
  const answers = data.questions.map((q, idx) => {
    const answerMatch = q.explanation.answer.match(/^\(?\d+\)?\s*([A-E])/i) ||
                       q.explanation.answer.match(/^([A-E])/i)
    return {
      index: idx + 1,
      key: answerMatch ? answerMatch[1].toUpperCase() : '?',
    }
  })

  const toggleQuestion = (index: number) => {
    const newSet = new Set(expandedQuestions)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setExpandedQuestions(newSet)
  }

  // 解析選項詳解（支持單字題和文法題格式）
  const parseCounterpoint = (key: string, text: string, optionDetails?: Record<string, OptionDetail>) => {
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

    // 檢查 optionDetails（單字題結構化資料）
    if (optionDetails && (optionDetails[key]?.pos || optionDetails[key]?.translation)) {
      return {
        type: 'vocabulary' as const,
        pos: optionDetails[key]?.pos,
        translation: optionDetails[key]?.translation,
        whyNot: text,
      }
    }

    // 檢查是否包含文法錯誤格式（文法題）
    const grammarErrorMatch = text.match(/^(時態錯誤|語態錯誤|語序錯誤|搭配錯誤|主詞動詞一致性錯誤|介系詞錯誤|關係代名詞錯誤|片語搭配|關係副詞)[：:]\s*(.+)/)
    if (grammarErrorMatch) {
      return {
        type: 'grammar' as const,
        errorType: grammarErrorMatch[1],
        explanation: grammarErrorMatch[2]?.trim() || text,
      }
    }

    // 預設：一般文字格式
    return {
      type: 'general' as const,
      explanation: text,
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. 長文題幹（可展開/收合） */}
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 overflow-hidden">
        <button
          onClick={() => setPassageExpanded(!passageExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-400">📋 題幹</span>
            <span className="text-xs text-zinc-500">
              ({passageExpanded ? '點擊收合' : '點擊展開完整文章'})
            </span>
          </div>
          {passageExpanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          )}
        </button>

        <AnimatePresence>
          {passageExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="px-4 pb-4"
            >
              <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {data.sharedPassage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 收合狀態下顯示文章前 3 行預覽 */}
        {!passageExpanded && (
          <div className="px-4 pb-4">
            <div className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
              {data.sharedPassage}
            </div>
          </div>
        )}
      </div>

      {/* 2. 答案速覽卡 */}
      <div className="rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium text-blue-300">✅ 答案速覽</span>
          <span className="text-xs text-blue-400/60">一眼掌握所有答案</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {answers.map(({ index, key }) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/20 border border-blue-500/40"
            >
              <span className="text-xs text-blue-300 font-medium">({index})</span>
              <span className="text-sm font-bold text-blue-100">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 題目詳解列表 */}
      <div className="space-y-3">
        {data.questions.map((q, idx) => {
          const questionNumber = idx + 1
          const isExpanded = expandedQuestions.has(idx)

          // 提取正確答案
          const answerMatch = q.explanation.answer.match(/^\(?\d+\)?\s*([A-E])/i) ||
                             q.explanation.answer.match(/^([A-E])/i)
          const correctAnswerKey = answerMatch ? answerMatch[1].toUpperCase() : null

          // 找到正確答案的選項文字
          const correctOption = q.options.find(opt => {
            const key = opt.match(/^\(([A-E])\)/i)?.[1]?.toUpperCase()
            return key === correctAnswerKey
          })?.replace(/^\([A-E]\)\s*/i, '').trim()

          // 統計其他選項數量
          const counterpointCount = q.explanation.counterpoints
            ? Object.keys(q.explanation.counterpoints).length
            : 0

          return (
            <div
              key={idx}
              className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 overflow-hidden"
            >
              {/* 題號 + 正確答案 + 原因（預設展開） */}
              <div className="p-4 space-y-3">
                {/* 題號 */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-400">
                    ({questionNumber})
                  </span>
                  {counterpointCount > 0 && (
                    <span className="text-xs text-zinc-500">
                      {counterpointCount} 個選項需排除
                    </span>
                  )}
                </div>

                {/* 正確答案 */}
                {correctAnswerKey && (
                  <div className="flex items-start gap-3 rounded-lg bg-green-500/10 border border-green-500/30 p-3">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-green-300 mb-1">
                        ({correctAnswerKey}) {correctOption}
                      </div>
                      <div className="text-xs text-zinc-300 leading-relaxed">
                        {q.explanation.reasoning}
                      </div>
                    </div>
                  </div>
                )}

                {/* 其他選項詳解（可展開） */}
                {q.explanation.counterpoints && Object.keys(q.explanation.counterpoints).length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleQuestion(idx)}
                      className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
                    >
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      <span>
                        {isExpanded ? '收起其他選項分析' : '展開其他選項分析'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 space-y-2"
                        >
                          {Object.entries(q.explanation.counterpoints).map(([key, text]) => {
                            const parsed = parseCounterpoint(key, text, q.explanation.optionDetails)

                            return (
                              <div
                                key={key}
                                className="pl-3 border-l-2 border-zinc-700/50 py-2"
                              >
                                <div className="text-xs text-zinc-300">
                                  <span className="font-medium text-zinc-200">({key})</span>{' '}

                                  {/* 單字題格式 */}
                                  {parsed.type === 'vocabulary' && (
                                    <div className="mt-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        {parsed.pos && (
                                          <span className="text-xs text-zinc-400">
                                            詞性: <span className="text-zinc-300">{parsed.pos}</span>
                                          </span>
                                        )}
                                        {parsed.translation && (
                                          <span className="text-xs text-zinc-400">
                                            | 中文: <span className="text-zinc-300">{parsed.translation}</span>
                                          </span>
                                        )}
                                      </div>
                                      {parsed.whyNot && (
                                        <div className="text-xs text-zinc-400 mt-1">
                                          {parsed.whyNot}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* 文法題格式 */}
                                  {parsed.type === 'grammar' && (
                                    <div className="mt-1">
                                      <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300">
                                        {parsed.errorType}
                                      </span>
                                      <div className="text-xs text-zinc-400 mt-1">
                                        {parsed.explanation}
                                      </div>
                                    </div>
                                  )}

                                  {/* 一般格式 */}
                                  {parsed.type === 'general' && (
                                    <span className="text-xs text-zinc-400">{parsed.explanation}</span>
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

                {/* 解題技巧（如果有） */}
                {q.tips && (
                  <div className="flex items-start gap-2 mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <Lightbulb className="w-3 h-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-xs text-yellow-300">{q.tips}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 4. 延伸補充（如果有） */}
      {data.note && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-xs font-medium text-zinc-400 mb-2">📘 延伸補充</div>
          <div className="text-sm text-zinc-300 leading-relaxed">{data.note}</div>
        </div>
      )}
    </div>
  )
}
