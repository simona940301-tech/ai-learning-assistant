/**
 * ExplanationCard V2: Theme-aware & Mobile-optimized
 *
 * Features:
 * - Dark/light theme support
 * - Mobile-friendly Past Papers section (tap-based, no hover)
 * - Mini explanation cards for past papers
 * - Always visible Past Papers header with empty state
 * - Smooth transitions and animations
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RefreshCw, Save, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme'
import PastPaperMiniCard, { type PastPaperDetail } from './PastPaperMiniCard'

export interface GrammarRow {
  category: string
  description: string
  example: string
}

export interface PastPaper {
  id: string
  stem: string
  tags: string[]
}

export type Difficulty = 'easy' | 'medium' | 'hard'

interface ExplanationCardV2Props {
  question: string
  conceptLabel: string
  summary: string
  steps: string[]
  grammarRows: GrammarRow[]
  encouragement: string
  onSave: () => void
  onRetry: () => void
  onNext?: () => void
  isSaving: boolean
  isRetrying: boolean
  isNextLoading?: boolean
  savedStatus: 'idle' | 'saved'
  isLastStep?: boolean
  // Contract v2 props
  confidence?: number // 0-1
  difficulty?: Difficulty
  pastPapers?: PastPaper[]
  // Callbacks
  onPastPaperClick?: (paperId: string) => Promise<PastPaperDetail>
  onPastPaperSave?: (paperId: string) => void
}

const ExplanationCardV2 = ({
  question,
  conceptLabel,
  summary,
  steps,
  grammarRows,
  encouragement,
  onSave,
  onRetry,
  onNext,
  isSaving,
  isRetrying,
  isNextLoading = false,
  savedStatus,
  isLastStep = false,
  confidence,
  difficulty,
  pastPapers = [],
  onPastPaperClick,
  onPastPaperSave,
}: ExplanationCardV2Props) => {
  const { theme, isDark } = useTheme()
  const [pastPapersExpanded, setPastPapersExpanded] = useState(false)
  const [selectedPaper, setSelectedPaper] = useState<PastPaperDetail | null>(null)
  const [loadingPaperId, setLoadingPaperId] = useState<string | null>(null)

  // Handle past paper click
  const handlePastPaperClick = async (paperId: string) => {
    if (!onPastPaperClick) return

    setLoadingPaperId(paperId)
    try {
      const paperDetail = await onPastPaperClick(paperId)
      setSelectedPaper(paperDetail)
    } catch (error) {
      console.error('Failed to load past paper:', error)
    } finally {
      setLoadingPaperId(null)
    }
  }

  // Difficulty badge helper
  const getDifficultyBadge = (diff?: Difficulty) => {
    if (!diff) return null

    const badges = {
      easy: { label: '基礎', color: isDark ? 'text-green-400' : 'text-green-600' },
      medium: { label: '中等', color: isDark ? 'text-yellow-400' : 'text-yellow-600' },
      hard: { label: '進階', color: isDark ? 'text-red-400' : 'text-red-600' },
    }

    const badge = badges[diff]
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${badge.color}`}
        style={{
          backgroundColor: theme.badgeBg,
          borderColor: theme.badgeBorder,
        }}
      >
        {badge.label}
      </span>
    )
  }

  // Confidence badge helper
  const getConfidenceBadge = (conf?: number) => {
    if (conf === undefined) return null

    const percentage = Math.round(conf * 100)
    const color =
      conf >= 0.8
        ? isDark
          ? 'text-green-400'
          : 'text-green-600'
        : conf >= 0.6
        ? isDark
          ? 'text-yellow-400'
          : 'text-yellow-600'
        : isDark
        ? 'text-orange-400'
        : 'text-orange-600'

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${color}`}
        style={{
          backgroundColor: theme.badgeBg,
          borderColor: theme.badgeBorder,
        }}
      >
        信心度 {percentage}%
      </span>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="rounded-[24px] border p-6 shadow-xl sm:p-8"
        style={{
          backgroundColor: theme.card,
          borderColor: theme.border,
          boxShadow: theme.shadow,
        }}
      >
        {/* Header */}
        <header className="mb-6 space-y-2">
          <div className="flex items-start justify-between">
            <div
              className="text-xs uppercase tracking-[0.35em]"
              style={{ color: theme.textTertiary }}
            >
              目前題目
            </div>
            {/* Badges: Confidence & Difficulty */}
            <div className="flex gap-2">
              {getConfidenceBadge(confidence)}
              {getDifficultyBadge(difficulty)}
            </div>
          </div>
          <p
            className="rounded-[18px] px-4 py-3 text-sm leading-relaxed"
            style={{
              backgroundColor: theme.miniCardBg,
              color: theme.text,
            }}
          >
            {question}
          </p>
          <div
            className="inline-flex items-center gap-2 rounded-full border px-4 py-1 text-xs"
            style={{
              borderColor: theme.badgeBorder,
              backgroundColor: theme.badgeBg,
              color: theme.accent,
            }}
          >
            考點：{conceptLabel}
          </div>
        </header>

        {/* Summary */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0 }}
          className="space-y-3"
        >
          <h3
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: theme.textTertiary }}
          >
            ✅ 一句話總結考點
          </h3>
          <p
            className="text-base leading-relaxed"
            style={{ color: theme.text }}
          >
            {summary}
          </p>
        </motion.section>

        {/* Steps */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="mt-6 space-y-3"
        >
          <h3
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: theme.textTertiary }}
          >
            🔍 解題步驟
          </h3>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
            {steps.map((step, index) => (
              <li key={index} style={{ color: theme.textSecondary }}>
                {step}
              </li>
            ))}
          </ol>
        </motion.section>

        {/* Grammar Table */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="mt-6 space-y-3"
        >
          <h3
            className="text-xs uppercase tracking-[0.3em]"
            style={{ color: theme.textTertiary }}
          >
            🧩 文法統整表
          </h3>
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ borderColor: theme.border }}
          >
            <table className="w-full border-collapse text-sm">
              <thead
                className="text-xs uppercase tracking-[0.2em]"
                style={{
                  backgroundColor: theme.miniCardBg,
                  color: theme.textSecondary,
                }}
              >
                <tr>
                  <th className="px-4 py-3 text-left font-medium">類別</th>
                  <th className="px-4 py-3 text-left font-medium">說明</th>
                  <th className="px-4 py-3 text-left font-medium">範例</th>
                </tr>
              </thead>
              <tbody>
                {grammarRows.map((row, index) => (
                  <tr
                    key={`${row.category}-${index}`}
                    style={{
                      backgroundColor: index % 2 === 0 ? theme.miniCardBg : 'transparent',
                    }}
                  >
                    <td
                      className="whitespace-pre-line px-4 py-3"
                      style={{ color: theme.text }}
                    >
                      {row.category}
                    </td>
                    <td
                      className="whitespace-pre-line px-4 py-3"
                      style={{ color: theme.textSecondary }}
                    >
                      {row.description}
                    </td>
                    <td
                      className="whitespace-pre-line px-4 py-3"
                      style={{ color: theme.textSecondary }}
                    >
                      {row.example || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* Past Papers Section - ALWAYS VISIBLE */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="mt-6"
        >
          {/* Header (always visible, tap to toggle) */}
          <button
            onClick={() => setPastPapersExpanded(!pastPapersExpanded)}
            className="flex w-full items-center justify-between rounded-[16px] border px-4 py-3 text-left transition active:scale-[0.98]"
            style={{
              backgroundColor: theme.miniCardBg,
              borderColor: theme.border,
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-xs uppercase tracking-[0.3em]"
                style={{ color: theme.textTertiary }}
              >
                📘 歷屆試題
              </span>
              {pastPapers.length > 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: theme.badgeBg,
                    color: theme.accent,
                  }}
                >
                  {pastPapers.length}
                </span>
              )}
            </div>
            {pastPapersExpanded ? (
              <ChevronUp className="h-4 w-4" style={{ color: theme.textSecondary }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: theme.textSecondary }} />
            )}
          </button>

          {/* Expanded content */}
          <AnimatePresence>
            {pastPapersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  {pastPapers.length === 0 ? (
                    /* Empty state */
                    <div
                      className="rounded-[14px] border px-4 py-6 text-center text-sm"
                      style={{
                        backgroundColor: theme.miniCardBg,
                        borderColor: theme.border,
                        color: theme.textSecondary,
                      }}
                    >
                      暫無相似歷屆（之後會隨你的練習持續補齊 🧠）
                    </div>
                  ) : (
                    /* Past papers list */
                    pastPapers.slice(0, 3).map((paper, index) => (
                      <motion.button
                        key={paper.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handlePastPaperClick(paper.id)}
                        disabled={loadingPaperId === paper.id}
                        className="flex w-full flex-col gap-2 rounded-[14px] border p-3 text-left transition active:scale-[0.98]"
                        style={{
                          backgroundColor: theme.miniCardBg,
                          borderColor: theme.border,
                        }}
                      >
                        <p
                          className="text-sm leading-relaxed"
                          style={{ color: theme.text }}
                        >
                          {paper.stem.length > 100
                            ? `${paper.stem.substring(0, 100)}...`
                            : paper.stem}
                        </p>
                        {paper.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {paper.tags.map((tag, tagIdx) => (
                              <span
                                key={tagIdx}
                                className="rounded-full px-2 py-0.5 text-[10px]"
                                style={{
                                  backgroundColor: theme.badgeBg,
                                  color: theme.accent,
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {loadingPaperId === paper.id && (
                          <div className="flex items-center gap-2 text-xs" style={{ color: theme.textTertiary }}>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            載入中...
                          </div>
                        )}
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Encouragement */}
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.36 }}
          className="mt-6 text-xs"
          style={{ color: theme.textSecondary }}
        >
          {encouragement}
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.42 }}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"
        >
          <button
            onClick={onSave}
            disabled={isSaving}
            className={cn(
              'inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold shadow-lg transition active:scale-[0.98]',
              isSaving && 'opacity-70'
            )}
            style={{
              borderColor: theme.badgeBorder,
              backgroundColor: theme.badgeBg,
              color: theme.accent,
            }}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            存入書包
            {savedStatus === 'saved' && <span className="text-[11px]">已儲存 ✓</span>}
          </button>

          {onNext && (
            <button
              onClick={onNext}
              disabled={isNextLoading}
              className={cn(
                'inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold shadow-lg transition active:scale-[0.98]',
                isNextLoading && 'opacity-70'
              )}
              style={{
                borderColor: theme.border,
                backgroundColor: theme.miniCardBg,
                color: theme.text,
              }}
            >
              {isNextLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {isLastStep ? '回到列表' : '下一題'}
            </button>
          )}

          <button
            onClick={onRetry}
            disabled={isRetrying}
            className={cn(
              'inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold shadow-lg transition active:scale-[0.98]',
              isRetrying && 'opacity-70'
            )}
            style={{
              borderColor: theme.border,
              backgroundColor: theme.miniCardBg,
              color: theme.text,
            }}
          >
            {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            再練一題
          </button>
        </motion.div>
      </motion.div>

      {/* Mini Explanation Card for Past Papers */}
      <PastPaperMiniCard
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
        onSave={onPastPaperSave}
      />
    </>
  )
}

export default ExplanationCardV2
