/**
 * Past Paper Mini Explanation Card
 *
 * Compact explanation card for past paper questions.
 * Features:
 * - Summary + 3 steps + confidence/difficulty badges
 * - "Add to Backpack" CTA
 * - Swipe-down gesture to close (mobile)
 * - Max height ≤ 2/3 viewport
 * - Maintains scroll position on close
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { X, Save, TrendingUp } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import type { Difficulty } from './ExplanationCard'

export interface PastPaperDetail {
  id: string
  stem: string
  summary: string
  steps: string[] // Max 3 steps
  confidence?: number // 0-1
  difficulty?: Difficulty
  tags: string[]
}

interface PastPaperMiniCardProps {
  paper: PastPaperDetail | null
  onClose: () => void
  onSave?: (paperId: string) => void
}

export default function PastPaperMiniCard({
  paper,
  onClose,
  onSave,
}: PastPaperMiniCardProps) {
  const { theme, isDark } = useTheme()
  const cardRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Lock body scroll when card is open
  useEffect(() => {
    if (paper) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [paper])

  if (!paper) return null

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false)

    // If dragged down more than 100px, close
    if (info.offset.y > 100) {
      onClose()
    }
  }

  const getDifficultyBadge = () => {
    if (!paper.difficulty) return null

    const badges = {
      easy: { label: '基礎', color: isDark ? 'text-green-400' : 'text-green-600' },
      medium: { label: '中等', color: isDark ? 'text-yellow-400' : 'text-yellow-600' },
      hard: { label: '進階', color: isDark ? 'text-red-400' : 'text-red-600' },
    }

    const badge = badges[paper.difficulty]
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}
        style={{
          backgroundColor: theme.badgeBg,
          borderColor: theme.badgeBorder,
          border: '1px solid',
        }}
      >
        {badge.label}
      </span>
    )
  }

  const getConfidenceBadge = () => {
    if (paper.confidence === undefined) return null

    const percentage = Math.round(paper.confidence * 100)
    const color =
      paper.confidence >= 0.8
        ? isDark
          ? 'text-green-400'
          : 'text-green-600'
        : paper.confidence >= 0.6
        ? isDark
          ? 'text-yellow-400'
          : 'text-yellow-600'
        : isDark
        ? 'text-orange-400'
        : 'text-orange-600'

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}
        style={{
          backgroundColor: theme.badgeBg,
          borderColor: theme.badgeBorder,
          border: '1px solid',
        }}
      >
        <TrendingUp className="h-3 w-3" />
        {percentage}%
      </span>
    )
  }

  return (
    <AnimatePresence>
      {paper && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Mini Card */}
          <motion.div
            ref={cardRef}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-h-[66vh] overflow-y-auto rounded-[24px] border p-5 shadow-2xl sm:max-w-xl"
            style={{
              backgroundColor: theme.miniCardBg,
              borderColor: theme.miniCardBorder,
              boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Drag indicator (mobile) */}
            <div className="mb-4 flex justify-center sm:hidden">
              <div
                className="h-1 w-12 rounded-full"
                style={{ backgroundColor: theme.border }}
              />
            </div>

            {/* Header */}
            <div className="mb-4 flex items-start justify-between">
              <div className="flex-1 pr-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {getConfidenceBadge()}
                  {getDifficultyBadge()}
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: theme.text }}
                >
                  {paper.stem}
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 rounded-full p-2 transition hover:opacity-70"
                style={{
                  backgroundColor: theme.badgeBg,
                  color: theme.textSecondary,
                }}
                aria-label="關閉"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tags */}
            {paper.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {paper.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium"
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

            {/* Summary */}
            <div className="mb-4">
              <h4
                className="mb-2 text-xs uppercase tracking-wider"
                style={{ color: theme.textTertiary }}
              >
                概念總結
              </h4>
              <p
                className="text-sm leading-relaxed"
                style={{ color: theme.text }}
              >
                {paper.summary}
              </p>
            </div>

            {/* Steps (max 3) */}
            <div className="mb-4">
              <h4
                className="mb-2 text-xs uppercase tracking-wider"
                style={{ color: theme.textTertiary }}
              >
                解題步驟
              </h4>
              <ol className="space-y-2 pl-5 text-sm" style={{ listStyleType: 'decimal' }}>
                {paper.steps.slice(0, 3).map((step, idx) => (
                  <li key={idx} style={{ color: theme.textSecondary }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* CTA */}
            <button
              onClick={() => onSave && onSave(paper.id)}
              className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition hover:opacity-90"
              style={{
                backgroundColor: theme.accent,
                color: isDark ? '#FFFFFF' : '#FFFFFF',
              }}
            >
              <Save className="h-4 w-4" />
              存入書包
            </button>

            {/* Swipe hint (mobile only) */}
            <p
              className="mt-3 text-center text-xs sm:hidden"
              style={{ color: theme.textTertiary }}
            >
              向下滑動關閉
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
