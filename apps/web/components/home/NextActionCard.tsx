'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, TrendingDown, BookOpen, Clock } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { BackpackFile } from '@/lib/types'

type Recommendation = {
  type: string
  concept?: string
  reason: string
  action: string
  link?: string
}

type PredictionResponse = {
  recommendations?: Recommendation[]
}

type ErrorBookItem = {
  id: string
  last_attempted_at?: string | null
  created_at: string
  knowledge_tags?: string[] | null
  pack_questions?: {
    packs?: { subject?: string | null } | { subject?: string | null }[]
  } | null
  packs?: { subject?: string | null } | { subject?: string | null }[]
}

type NextActionView = {
  concept: string
  riskPercent: number
  daysSince: number
  retention?: number
  detail: string
  sourceLabel: string
  href: string
  ctaLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  subtitle?: string
}

type LoadState = {
  loading: boolean
  action?: NextActionView
  error?: string
}

const FALLBACK_ACTION: NextActionView = {
  concept: '核心知識點',
  riskPercent: 20,
  daysSince: 1,
  retention: 0.8,
  detail: '立即複習可避免流失既有成果',
  sourceLabel: '系統建議',
  href: '/play',
  ctaLabel: '立即搶救記憶',
  secondaryHref: '/backpack',
  secondaryLabel: '查看筆記',
  subtitle: '強化弱項概念，延長記憶半衰期',
}

function computeSrsRisk(dateString?: string | null, opts?: { difficulty?: number | null; easeFactor?: number | null }) {
  if (!dateString) {
    return { riskPercent: 24, daysSince: 0, retention: 0.76 }
  }

  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) {
    return { riskPercent: 24, daysSince: 0, retention: 0.76 }
  }

  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24))
  )

  const difficulty = Math.min(Math.max((opts?.difficulty ?? 3), 1), 5)
  const easeFactor = Math.min(Math.max((opts?.easeFactor ?? 2.4), 1.3), 3.0)

  // Stability mirrors srs-scheduler approach: interval scaled by ease and difficulty
  const stability = Math.max(1.2, 1.5 * (easeFactor / 2.5) * (1 + difficulty / 3))
  const retention = Math.exp(-diffDays / stability)
  const riskPercent = Math.min(98, Math.max(10, Math.round((1 - retention) * 100)))

  return { riskPercent, daysSince: diffDays, retention }
}

type NextActionCache = {
  date: string
  action: NextActionView
}

const CACHE_KEY = 'nextActionCache'

function getTodayKey() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function readCache(): NextActionView | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as NextActionCache
    if (parsed?.date !== getTodayKey() || !parsed.action) return null
    return parsed.action
  } catch {
    return null
  }
}

function writeCache(action: NextActionView) {
  if (typeof window === 'undefined') return
  try {
    const payload: NextActionCache = { date: getTodayKey(), action }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore cache errors
  }
}

function getSubject(item: ErrorBookItem) {
  const pack = (item as any).packs
  if (Array.isArray(pack)) {
    return pack[0]?.subject || null
  }
  if (pack?.subject) return pack.subject

  const nested = item.pack_questions?.packs as any
  if (Array.isArray(nested)) {
    return nested[0]?.subject || null
  }
  return nested?.subject || null
}

function pickErrorAction(items: ErrorBookItem[], preferredConcept?: string) {
  if (!items?.length) return null

  const lowered = preferredConcept?.toLowerCase().trim()
  return items
    .map((item) => {
      const tags = Array.isArray(item.knowledge_tags) ? item.knowledge_tags : []
      const matchedTag = lowered
        ? tags.find((tag) => tag.toLowerCase().includes(lowered))
        : undefined
      const concept = matchedTag || tags[0] || preferredConcept || '弱項概念'
      const difficulty = (item as any)?.pack_questions?.difficulty ?? null
      const { riskPercent, daysSince, retention } = computeSrsRisk(
        item.last_attempted_at || item.created_at,
        { difficulty }
      )
      const score = riskPercent + (matchedTag ? 50 : 0) + (preferredConcept ? 10 : 0)
      return { item, concept, riskPercent, daysSince, retention, score, subject: getSubject(item) }
    })
    .sort((a, b) => b.score - a.score)[0]
}

function pickNoteAction(notes: (BackpackFile & { tags?: string[] | null })[], concept?: string) {
  if (!notes?.length) return null
  const lowered = concept?.toLowerCase().trim()

  const scored = notes
    .map((note) => {
      const tags = Array.isArray(note.tags) ? note.tags : []
      const matchedTag = lowered
        ? tags.find((tag) => tag.toLowerCase().includes(lowered))
        : undefined
      const { riskPercent, daysSince, retention } = computeSrsRisk(note.updated_at, {
        difficulty: 2,
      })
      const score = (matchedTag ? 60 : 0) + riskPercent + (note.is_notebook_entry ? 10 : 0)
      return {
        note,
        concept: matchedTag || tags[0] || concept || '重點',
        riskPercent,
        daysSince,
        retention,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)

  return scored[0]
}

function relativeTime(days: number) {
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days} 天前`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} 週前`
  const months = Math.floor(days / 30)
  return `${months || 1} 個月前`
}

export function NextActionCard() {
  const [state, setState] = useState<LoadState>({ loading: true })

  useEffect(() => {
    let cancelled = false

    const cached = readCache()
    if (cached) {
      setState({ loading: false, action: cached })
      return () => {
        cancelled = true
      }
    }

    async function load() {
      try {
        const [predictionRes, errorBookRes, backpackRes] = await Promise.allSettled([
          fetch('/api/dashboard/prediction', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/error-book?status=active', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/backpack', { credentials: 'include', cache: 'no-store' }),
        ])

        const prediction: PredictionResponse | null =
          predictionRes.status === 'fulfilled' && predictionRes.value.ok
            ? await predictionRes.value.json()
            : null

        const errorItems: ErrorBookItem[] =
          errorBookRes.status === 'fulfilled' && errorBookRes.value.ok
            ? ((await errorBookRes.value.json()) as any).items || []
            : []

        const backpackItems: (BackpackFile & { tags?: string[] | null })[] =
          backpackRes.status === 'fulfilled' && backpackRes.value.ok
            ? ((await backpackRes.value.json()) as any).items || []
            : []

        const notebookEntries = backpackItems.filter((item) => item.is_notebook_entry || item.type === 'text')

        const focusConcept =
          prediction?.recommendations?.find((rec) => rec.concept)?.concept ||
          errorItems.find((item) => Array.isArray(item.knowledge_tags) && item.knowledge_tags.length)?.knowledge_tags?.[0]

        const noteAction = pickNoteAction(notebookEntries, focusConcept)
        const errorAction = pickErrorAction(errorItems, focusConcept)

        let action: NextActionView = FALLBACK_ACTION
        if (noteAction) {
          action = {
            concept: noteAction.concept,
            riskPercent: noteAction.riskPercent,
            daysSince: noteAction.daysSince,
            retention: noteAction.retention,
            detail: `筆記《${noteAction.note.title || '未命名筆記'}》 · ${noteAction.note.subject}`,
            sourceLabel: '背包筆記',
            href: `/backpack?type=note&subject=${noteAction.note.subject}&noteId=${noteAction.note.id}`,
            ctaLabel: '打開筆記複習',
            secondaryHref: '/play',
            secondaryLabel: '開啟練習',
            subtitle: '從你的筆記開始復習，立即阻止遺忘',
          }
        } else if (errorAction) {
          action = {
            concept: errorAction.concept,
            riskPercent: errorAction.riskPercent,
            daysSince: errorAction.daysSince,
            retention: errorAction.retention,
            detail: `錯題本 · ${errorAction.subject || '通用科目'} · 上次練習 ${relativeTime(errorAction.daysSince)}`,
            sourceLabel: '錯題本',
            href: `/error-book/${errorAction.item.id}`,
            ctaLabel: '搶救這題',
            secondaryHref: '/play',
            secondaryLabel: '直接對戰',
            subtitle: '優先處理最容易遺忘的錯題，補齊知識縫隙',
          }
        } else if (prediction?.recommendations?.length) {
          const rec = prediction.recommendations[0]
          action = {
            concept: focusConcept || '弱項概念',
            riskPercent: 28,
            daysSince: 2,
            retention: 0.72,
            detail: rec.reason,
            sourceLabel: '學習預測',
            href: rec.link || '/play',
            ctaLabel: rec.action || '立即練習',
            secondaryHref: '/backpack',
            secondaryLabel: '翻出筆記',
            subtitle: '依照預測補強弱項，避免失分',
          }
        }

        if (cancelled) return
        setState({ loading: false, action })
        writeCache(action)
      } catch (error) {
        if (cancelled) return
        setState({
          loading: false,
          action: FALLBACK_ACTION,
          error: '無法載入個人化建議，請稍後再試',
        })
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  if (state.loading) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="overflow-hidden">
          <div className="p-4 space-y-3 animate-pulse">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-6 w-3/5 bg-muted rounded" />
            <div className="h-4 w-2/5 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded" />
          </div>
        </Card>
      </motion.div>
    )
  }

  const action = state.action || FALLBACK_ACTION

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="border-l-4 border-l-orange-500">
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-orange-100 dark:bg-orange-950 p-2 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-muted-foreground">{action.sourceLabel}</span>
                </div>
                <h3 className="font-semibold text-base text-foreground mb-1">
                  {action.concept} 記憶流失風險
                </h3>
                <p className="text-sm text-muted-foreground">
                  {action.subtitle || '立即複習避免失去已掌握的分數。'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span>預估遺忘 {action.riskPercent}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>上次複習 {relativeTime(action.daysSince)}</span>
                </div>
                {action.detail && (
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[200px]">{action.detail}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Link href={action.href} className="flex-1">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                    {action.ctaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                {action.secondaryHref && action.secondaryLabel && (
                  <Link href={action.secondaryHref} className="flex-1">
                    <Button variant="outline" className="w-full">
                      {action.secondaryLabel}
                    </Button>
                  </Link>
                )}
              </div>

              {state.error && (
                <p className="text-xs text-destructive/80">{state.error}</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
