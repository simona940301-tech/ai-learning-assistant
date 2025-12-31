'use client'

import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'

// ============================================
// Types
// ============================================

export interface QuestionCardProps {
  questionText: string
  currentQuestion: number
  totalQuestions: number
  timeRemaining: number
  timeLimit: number
  children?: React.ReactNode
}

// ============================================
// QuestionCard - 極簡題目卡片
// ============================================

export function QuestionCard({
  questionText,
  currentQuestion,
  totalQuestions,
  timeRemaining,
  timeLimit,
  children,
}: QuestionCardProps) {
  // 計算時間進度百分比
  const timePercentage = (timeRemaining / timeLimit) * 100

  // 時間警告狀態
  const isTimeWarning = timeRemaining <= 3
  const isTimeHalfway = timeRemaining <= timeLimit * 0.5

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* 主要題目卡片 - 內部可捲動 */}
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-lg border border-amber-200/50">
        {/* 左側時間進度條（替代大時間顯示） */}
        <div className="absolute left-0 top-0 bottom-0 z-10 w-1">
          <motion.div
            className={`h-full ${isTimeWarning
                ? 'bg-red-500'
                : isTimeHalfway
                  ? 'bg-orange-400'
                  : 'bg-emerald-400'
              }`}
            initial={{ height: '100%' }}
            animate={{ height: `${timePercentage}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>

        {/* 內容區域 - mobile-first: 較小 padding，內容過多時可捲動 */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-4 pb-4 md:px-5 md:pt-5 md:pb-6">
          {/* 🎯 Phase C: 頂部資訊行 - 移除時間（改由 HUD 顯示） */}
          <div className="mb-3 shrink-0 flex items-center justify-between md:mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600/80">
              Focus Zone
            </span>
            <span className="text-xs font-medium text-amber-700/60">
              {currentQuestion} / {totalQuestions}
            </span>
          </div>

          {/* 🎯 Phase C: 題幹文字 - +1 級字體、semibold、拉開層級 */}
          <p className={`flex-1 leading-relaxed text-amber-900 transition-all duration-300 mb-8 ${questionText.length < 50
              ? 'text-3xl md:text-4xl font-semibold'
              : questionText.length < 100
                ? 'text-2xl md:text-3xl font-semibold'
                : 'text-xl md:text-2xl font-semibold'
            }`}>
            {questionText}
          </p>

          {/* 額外內容插槽 (例如:翻盤獎勵提示) - shrink-0 */}
          {children && <div className="mt-3 shrink-0 md:mt-4">{children}</div>}
        </div>
      </div>
    </div>
  )
}
