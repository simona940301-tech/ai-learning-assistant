'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export interface ExplainCardModel {
  focus: string
  summary: string
  steps: string[]
  details: string[]
}

interface ExplainCardProps {
  card?: ExplainCardModel | null
}

/**
 * ExplainCard with ChatGPT-like loading skeleton and animation
 */
export default function ExplainCard({ card }: ExplainCardProps) {
  // Guard: If card is null/undefined, show loading skeleton
  if (!card) {
    return <LoadingSkeleton />
  }

  // Guard: Block MCQ options (solver mode only)
  if ((card as any).options) {
    console.error('[ExplainCard] MCQ options detected — blocking render')
    return (
      <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm text-rose-400">
        ❌ MCQ options not allowed in solver mode
      </div>
    )
  }

  return <AnimatedCard card={card} />
}

/**
 * Loading skeleton with pulse animation
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
          className="rounded-lg bg-zinc-800/50 p-4 space-y-2"
        >
          <div className="h-3 w-20 bg-zinc-700/50 rounded animate-pulse" />
          <div className="h-4 w-full bg-zinc-700/30 rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-zinc-700/30 rounded animate-pulse" />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Animated card with typewriter effect
 */
function AnimatedCard({ card }: { card: ExplainCardModel }) {
  const sections = [
    { icon: '📘', title: '考點', content: card.focus || '' },
    { icon: '💡', title: '一句話解析', content: card.summary || '' },
    { icon: '🧩', title: '解題步驟', content: (card.steps || []).join('\n') },
    { icon: '📖', title: '詳細說明', content: (card.details || []).join('\n\n') },
  ].filter((s) => s.content.trim())

  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (visibleCount >= sections.length) return
    const timer = setTimeout(() => setVisibleCount((n) => n + 1), 500)
    return () => clearTimeout(timer)
  }, [visibleCount, sections.length])

  return (
    <div className="space-y-3">
      {sections.slice(0, visibleCount).map((section, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4"
        >
          <div className="flex items-center gap-2 mb-2 text-sm text-zinc-400">
            <span>{section.icon}</span>
            <span className="font-medium">{section.title}</span>
          </div>
          <Typewriter text={section.content} />
        </motion.div>
      ))}
    </div>
  )
}

/**
 * Typewriter effect
 */
function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState(0)

  useEffect(() => {
    if (displayed >= text.length) return
    const timer = setTimeout(() => setDisplayed((n) => n + 1), 12)
    return () => clearTimeout(timer)
  }, [displayed, text.length])

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
      {text.slice(0, displayed)}
      {displayed < text.length && (
        <span className="inline-block w-1 h-4 bg-zinc-300 animate-pulse ml-0.5" />
      )}
    </div>
  )
}
