'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import TypewriterMarkdown from './TypewriterMarkdown'
import type { ExplainResult } from '@/lib/solve-types'

export interface ExplainCardModel {
  focus: string
  summary: string
  steps: string[]
  details: string[]
}

interface ExplainCardProps {
  card?: ExplainCardModel | null
  result?: ExplainResult | null
  isDetailsExpanded?: boolean
  onToggleDetails?: () => void
}

/**
 * ExplainCard with ChatGPT-like loading skeleton and animation
 */
export default function ExplainCard({ card, result, isDetailsExpanded, onToggleDetails }: ExplainCardProps) {
  // 轉換 ExplainResult 為 ExplainCardModel
  const normalizedCard: ExplainCardModel | null = card || (result ? {
    focus: result.focus || '',
    summary: result.summary || '',
    steps: result.steps || [],
    details: result.details || [],
  } : null)

  // Guard: If card is null/undefined, show loading skeleton
  if (!normalizedCard) {
    return <LoadingSkeleton />
  }

  // Guard: Block MCQ options (solver mode only)
  if ((normalizedCard as any).options) {
    console.error('[ExplainCard] MCQ options detected — blocking render')
    return (
      <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400">
        ❌ MCQ options not allowed in solver mode
      </div>
    )
  }

  return <AnimatedCard card={normalizedCard} isDetailsExpanded={isDetailsExpanded} onToggleDetails={onToggleDetails} />
}

/**
 * Loading skeleton with pulse animation (暖黃色調)
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-lg bg-card border border-border p-4 space-y-2 shadow-sm"
        >
          <div className="h-3 w-20 bg-primary/20 rounded animate-pulse" />
          <div className="h-4 w-full bg-primary/10 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-primary/10 rounded animate-pulse" />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Animated card with typewriter effect
 */
function AnimatedCard({ 
  card, 
  isDetailsExpanded, 
  onToggleDetails 
}: { 
  card: ExplainCardModel
  isDetailsExpanded?: boolean
  onToggleDetails?: () => void
}) {
  const sections = [
    { icon: '📘', title: '考點', content: card.focus || '' },
    { icon: '💡', title: '一句話解析', content: card.summary || '' },
    { icon: '🧩', title: '解題步驟', content: (card.steps || []).join('\n') },
    { icon: '📖', title: '詳細說明', content: (card.details || []).join('\n\n') },
  ].filter((s) => s.content.trim())

  const [visibleCount, setVisibleCount] = useState(0)
  const [showDetails, setShowDetails] = useState(isDetailsExpanded !== false)

  useEffect(() => {
    if (visibleCount >= sections.length) return
    const timer = setTimeout(() => setVisibleCount((n: number) => n + 1), 500)
    return () => clearTimeout(timer)
  }, [visibleCount, sections.length])

  // 當 isDetailsExpanded 改變時更新本地狀態
  useEffect(() => {
    if (isDetailsExpanded !== undefined) {
      setShowDetails(isDetailsExpanded)
    }
  }, [isDetailsExpanded])

  const handleToggleDetails = () => {
    const newValue = !showDetails
    setShowDetails(newValue)
    onToggleDetails?.()
  }

  return (
    <div className="space-y-3">
      {sections.slice(0, visibleCount).map((section, i) => {
        const isDetailsSection = section.title === '詳細說明'
        const shouldShowContent = !isDetailsSection || showDetails

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="rounded-lg bg-card border border-border p-4 shadow-sm"
          >
            <div className={`flex items-center ${isDetailsSection && onToggleDetails ? 'justify-between' : 'gap-2'} mb-2 text-sm text-foreground/70`}>
              <div className="flex items-center gap-2">
                <span>{section.icon}</span>
                <span className="font-medium">{section.title}</span>
              </div>
              {isDetailsSection && onToggleDetails && (
                <button
                  onClick={handleToggleDetails}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {showDetails ? '收起' : '展開'}
                </button>
              )}
            </div>
            {shouldShowContent && <TypewriterMarkdown content={section.content} />}
          </motion.div>
        )
      })}
    </div>
  )
}

