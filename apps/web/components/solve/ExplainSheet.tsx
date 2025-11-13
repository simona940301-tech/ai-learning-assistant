'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import type { QuestionExplanation, SharedPassageExplanation } from '@/lib/ai/universal-explainer'

interface ExplainSheetProps {
  questions?: QuestionExplanation[]
  sharedPassage?: SharedPassageExplanation
}

/**
 * ExplainSheet - 多題詳解容器
 * 支持兩種模式：
 * 1. 獨立題目：questions 數組
 * 2. 共用題幹：sharedPassage（優先使用）
 */
export default function ExplainSheet({ questions, sharedPassage }: ExplainSheetProps) {
  // 優先使用共用題幹格式
  if (sharedPassage && sharedPassage.sharedPassage && sharedPassage.questions?.length > 0) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* 共用題幹（只顯示一次） */}
        <SharedPassageCard passage={sharedPassage.sharedPassage} />
        
        {/* 各題的選項和詳解 */}
        {sharedPassage.questions.map((q, idx) => (
          <ExplainQuestionCard 
            key={idx} 
            index={idx + 1} 
            data={q} 
            showQuestion={false} // 不顯示題幹，因為已經在共用題幹中顯示
          />
        ))}

        {/* 延伸補充（統一在題組最後顯示） */}
        {sharedPassage.note && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
            <div className="text-sm font-medium text-neutral-400 mb-3">💡 延伸補充</div>
            <div className="text-sm text-neutral-500 italic leading-relaxed whitespace-pre-wrap">
              {sharedPassage.note}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 獨立題目格式
  if (questions && questions.length > 0) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {questions.map((q, idx) => (
          <ExplainQuestionCard key={idx} index={idx + 1} data={q} showQuestion={true} />
        ))}
      </div>
    )
  }

  return null
}

/**
 * SharedPassageCard - 共用題幹卡片
 */
function SharedPassageCard({ passage }: { passage: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isLongPassage = passage.length > 200

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
      <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">題幹</div>
      <div className="text-lg leading-relaxed text-neutral-100 whitespace-pre-wrap">
        {isLongPassage && !isExpanded ? (
          <>
            <span>{passage.substring(0, 200)}...</span>
            <button
              onClick={() => setIsExpanded(true)}
              className="ml-2 text-sm text-blue-400 hover:text-blue-300 underline"
            >
              展開全文
            </button>
          </>
        ) : (
          <>
            {passage}
            {isLongPassage && isExpanded && (
              <button
                onClick={() => setIsExpanded(false)}
                className="ml-2 text-sm text-blue-400 hover:text-blue-300 underline"
              >
                收合
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

interface ExplainQuestionCardProps {
  index: number
  data: QuestionExplanation
  showQuestion?: boolean // 是否顯示題幹（共用題幹時為 false）
}

/**
 * ExplainQuestionCard - 單題詳解卡片（優化版）
 * 
 * 設計特點：
 * - 題目 text-lg（長文自動折疊）
 * - 選項 text-base（短選項 → inline grid，長選項 → 單列）
 * - 詳解 text-sm text-neutral-500
 * - 必須展示原始選項
 * - 垂直展開，資訊層級清楚
 */
function ExplainQuestionCard({ index, data, showQuestion = true }: ExplainQuestionCardProps) {
  const [openWrong, setOpenWrong] = useState(false)
  const [openNote, setOpenNote] = useState(false)
  const [openTips, setOpenTips] = useState(false)
  const [isQuestionExpanded, setIsQuestionExpanded] = useState(false)

  // 判斷是否為長文題（>200 字符）
  const isLongPassage = useMemo(() => {
    return showQuestion && data.question && data.question.length > 200
  }, [showQuestion, data.question])

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-neutral-200 space-y-5">
      {/* 題號 */}
      <div className="text-sm font-medium text-neutral-400">第 {index} 題</div>

      {/* 題幹：text-lg（長文自動折疊，僅在 showQuestion=true 時顯示，保留原始格式） */}
      {showQuestion && data.question && (
        <div>
          <div className="text-lg leading-relaxed text-neutral-100 whitespace-pre-wrap">
            {isLongPassage && !isQuestionExpanded ? (
              <>
                <span>{data.question.substring(0, 200)}...</span>
                <button
                  onClick={() => setIsQuestionExpanded(true)}
                  className="ml-2 text-sm text-blue-400 hover:text-blue-300 underline"
                >
                  展開全文
                </button>
              </>
            ) : (
              <>
                {data.question}
                {isLongPassage && isQuestionExpanded && (
                  <button
                    onClick={() => setIsQuestionExpanded(false)}
                    className="ml-2 text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    收合
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 選項：統一在同一行顯示（flex-wrap） */}
      {Array.isArray(data.options) && data.options.length > 0 && (
        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">選項</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-base text-neutral-300">
            {data.options.map((opt, i) => (
              <span key={i} className="whitespace-pre-wrap">{opt}</span>
            ))}
          </div>
        </div>
      )}

      {/* 分隔線 */}
      <div className="border-t border-neutral-800" />

      {/* 正解 + 理由：統一顯示在同一行，相同樣式 */}
      <div className="flex items-start gap-3">
        <Check className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-emerald-400 font-semibold text-base leading-relaxed">
            {data.explanation?.answer || ''}
            {data.explanation?.reasoning && (
              <span className="ml-2 text-emerald-400 font-normal">
                {data.explanation.reasoning}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 錯誤選項解析（垂直展開） */}
      {data.explanation?.counterpoints && Object.keys(data.explanation.counterpoints).length > 0 && (
        <section className="border-t border-neutral-800 pt-4">
          <button
            onClick={() => setOpenWrong(v => !v)}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <ChevronDown 
              className={`w-4 h-4 transition-transform duration-150 ${openWrong ? 'rotate-180' : ''}`} 
            />
            <span>{openWrong ? '收起選項解析' : '展開選項解析'}</span>
          </button>

          <AnimatePresence>
            {openWrong && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="mt-3 space-y-2"
              >
                {Object.entries(data.explanation.counterpoints).map(([k, v]) => (
                  <div
                    key={k}
                    className="pl-4 border-l-2 border-neutral-700 text-sm text-neutral-400 leading-relaxed"
                  >
                    <span className="text-neutral-300 font-medium">({k})</span>{' '}
                    {v}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 延伸補充（可選） */}
      {data.explanation?.note && (
        <section className="border-t border-neutral-800 pt-4">
          <button
            onClick={() => setOpenNote(v => !v)}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {openNote ? '收起延伸補充' : '📘 延伸補充'}
          </button>

          <AnimatePresence>
            {openNote && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="mt-2 text-sm text-neutral-500 italic leading-relaxed"
              >
                {data.explanation.note}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 解題技巧（具體才顯示） */}
      {data.tips && (
        <section className="border-t border-neutral-800 pt-4">
          <button
            onClick={() => setOpenTips(v => !v)}
            className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {openTips ? '收起解題技巧' : '💡 解題技巧'}
          </button>

          <AnimatePresence>
            {openTips && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: 'easeInOut' }}
                className="mt-2 text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap"
              >
                {data.tips}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  )
}

