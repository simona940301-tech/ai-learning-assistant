'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, AlertTriangle } from 'lucide-react'
import type {
  SharedPassagePayload,
  IndependentListPayload,
} from '@/lib/explain/types'
import {
  isSharedPayload,
  isIndependentList,
} from '@/lib/explain/types'

export interface ExplainCardV3Props {
  data: SharedPassagePayload | IndependentListPayload
  warnings?: string[]
}

/**
 * 極簡垂直詳解卡 v3（性能優化版）
 * 
 * 設計原則：
 * - 垂直資訊流，無橫向干擾
 * - 答案優先，理由次之，錯誤選項可展開
 * - 深色模式，極簡設計
 * - 支援兩種資料格式：sharedPassage + questions[] 或獨立題陣列
 * - 欄位缺失不報錯，缺 tips 就不顯示該區塊
 * - 如有 note 或警告，卡片底部以小灰字顯示
 * - 性能優化：React.memo + useMemo + 延遲渲染非關鍵內容
 */
export const ExplainCardV3 = React.memo(function ExplainCardV3({
  data,
  warnings = [],
}: ExplainCardV3Props) {
  // ✅ 緩存資料格式判斷結果
  const { isShared, sharedPassageData, questionsArray } = useMemo(() => {
    const shared = isSharedPayload(data)
    return {
      isShared: shared,
      sharedPassageData: shared ? data : null,
      questionsArray: shared ? data.questions : isIndependentList(data) ? data : [],
    }
  }, [data])

  // ✅ 緩存 hasMissingMarker 計算結果
  const hasMissingMarker = useMemo(() => {
    const inWarnings = warnings.some((w) => w.includes('MISSING:'))
    const inShared = sharedPassageData?.note?.includes('MISSING:') ?? false
    // Note: explanation 中沒有 note 屬性，只檢查 warnings 和 sharedPassageData
    return inWarnings || inShared
  }, [warnings, sharedPassageData])

  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set()
  )
  const [isPassageExpanded, setIsPassageExpanded] = useState(false)
  
  // ✅ 延遲渲染警告（不阻塞首屏）
  const [showWarnings, setShowWarnings] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShowWarnings(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const toggleQuestion = (idx: number) => {
    const newSet = new Set(expandedQuestions)
    if (newSet.has(idx)) {
      newSet.delete(idx)
    } else {
      newSet.add(idx)
    }
    setExpandedQuestions(newSet)
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 text-[#f2f2f2] space-y-6">
      {/* 共用題幹（可展開） */}
      {sharedPassageData && (
        <>
          <div>
            <button
              onClick={() => setIsPassageExpanded(!isPassageExpanded)}
              className="flex items-center gap-2 text-base font-medium text-[#f2f2f2] hover:text-[#10b981] transition-colors w-full text-left"
            >
              <span>題幹</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-150 ${
                  isPassageExpanded ? 'rotate-180' : ''
                }`}
              />
              {!isPassageExpanded && (
                <span className="text-xs text-[#9ca3af] ml-auto">
                  展開全文
                </span>
              )}
            </button>

            <AnimatePresence>
              {isPassageExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="mt-3"
                >
                  <p className="text-sm text-[#9ca3af] leading-relaxed whitespace-pre-wrap">
                    {sharedPassageData.sharedPassage}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="border-t border-[#333]" />
        </>
      )}

      {/* 逐題渲染 */}
      {questionsArray.map((question, idx) => {
        const isExpanded = expandedQuestions.has(idx)
        const hasOptions = question.options && question.options.length > 0
        const hasCounterpoints =
          question.explanation?.counterpoints &&
          Object.keys(question.explanation.counterpoints).length > 0

        return (
          <div key={idx} className="space-y-4">
            {/* 題號（多題時顯示） */}
            {questionsArray.length > 1 && (
              <div className="text-sm font-medium text-[#9ca3af]">
                第 {idx + 1} 題
              </div>
            )}

            {/* 獨立題的題幹 */}
            {!sharedPassageData && question.question && (
              <div>
                <p className="text-base font-medium text-[#f2f2f2] leading-relaxed">
                  {question.question}
                </p>
              </div>
            )}

            {/* 選項列 */}
            {hasOptions && (
              <div className="space-y-2">
                {question.options.map((option, optIdx) => (
                  <div
                    key={optIdx}
                    className="text-sm text-[#9ca3af] leading-relaxed"
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}

            {/* 正解區 */}
            {question.explanation && (
              <>
                <div className="flex items-start gap-3">
                  <Check className="text-[#10b981] w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    {question.explanation.answer && (
                      <p className="text-base font-semibold text-[#10b981]">
                        {question.explanation.answer}
                      </p>
                    )}
                    {question.explanation.reasoning && (
                      <p className="text-sm text-[#9ca3af] leading-relaxed">
                        {question.explanation.reasoning}
                      </p>
                    )}
                  </div>
                </div>

                {/* 錯誤選項區（可展開） */}
                {hasCounterpoints && (
                  <div className="border-t border-[#333] pt-4">
                    <button
                      onClick={() => toggleQuestion(idx)}
                      className="flex items-center gap-2 text-sm text-[#9ca3af] hover:text-[#f2f2f2] transition-colors"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-150 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      <span>
                        {isExpanded ? '收起選項解析' : '展開選項解析'}
                      </span>
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
                          {Object.entries(
                            question.explanation.counterpoints || {}
                          ).map(([key, value]) => (
                            <div
                              key={key}
                              className="pl-4 border-l-2 border-[#374151] hover:bg-neutral-900/40 transition-colors rounded-r"
                            >
                              <p className="text-sm text-[#9ca3af] leading-relaxed">
                                <span className="text-[#f2f2f2] font-medium">
                                  ({key})
                                </span>{' '}
                                {value}
                              </p>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Tips（可選，缺就不顯示） */}
                {question.tips && (
                  <div className="border-t border-[#333] pt-4">
                    <p className="text-xs font-medium text-[#9ca3af] mb-2">
                      💡 解題技巧
                    </p>
                    <p className="text-sm text-[#9ca3af] leading-relaxed">
                      {question.tips}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* 分隔線（最後一題不顯示） */}
            {idx < questionsArray.length - 1 && (
              <div className="border-t border-[#333]" />
            )}
          </div>
        )
      })}

      {/* 共用題幹的 note（統一在最後顯示） */}
      {sharedPassageData?.note && (
        <div className="border-t border-[#333] pt-4">
          <details className="text-sm text-[#9ca3af]">
            <summary className="cursor-pointer hover:text-[#f2f2f2] transition-colors list-none">
              <span className="inline-flex items-center gap-2">
                <span>📘</span>
                <span>延伸補充</span>
              </span>
            </summary>
            <p className="mt-3 ml-6 leading-relaxed text-[#9ca3af]">
              {sharedPassageData.note}
            </p>
          </details>
        </div>
      )}

      {/* 警告提示（卡片底部，延遲渲染） */}
      {showWarnings && (warnings.length > 0 || hasMissingMarker) && (
        <div className="border-t border-[#333] pt-4">
          <div className="flex items-start gap-2 text-xs text-[#9ca3af]">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              {hasMissingMarker && (
                <p>⚠️ 本題資料部分缺失，已盡可能顯示可用內容</p>
              )}
              {warnings.length > 0 && (
                <div>
                  <p className="font-medium mb-1">警告：</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})
