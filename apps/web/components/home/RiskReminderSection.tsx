'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, BookOpen, FileText, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface ErrorBookItem {
  id: string
  last_attempted_at?: string | null
  created_at: string
  knowledge_tags?: string[] | null
  pack_questions?: {
    packs?: { subject?: string | null } | { subject?: string | null }[]
  } | null
}

interface BackpackNote {
  id: string
  title?: string
  subject?: string
  updated_at?: string
  tags?: string[] | null
  is_notebook_entry?: boolean
  type?: string
}

interface RiskItem {
  id: string
  type: 'error' | 'note'
  title: string
  subtitle: string
  riskPercent: number
  daysUntilExpiry: number
  href: string
}

function computeSrsRisk(dateString?: string | null) {
  if (!dateString) {
    return { riskPercent: 24, daysSince: 0 }
  }

  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) {
    return { riskPercent: 24, daysSince: 0 }
  }

  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24))
  )

  // 黃金複習期 7 天
  const goldenPeriod = 7
  const daysRemaining = Math.max(0, goldenPeriod - diffDays)
  
  // SRS 風險計算
  const stability = 1.5
  const retention = Math.exp(-diffDays / stability)
  const riskPercent = Math.min(98, Math.max(10, Math.round((1 - retention) * 100)))

  return { riskPercent, daysSince: diffDays, daysRemaining }
}

export function RiskReminderSection() {
  const [risks, setRisks] = useState<RiskItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchRisks() {
      try {
        const [errorBookRes, backpackRes] = await Promise.allSettled([
          fetch('/api/error-book?status=active', { credentials: 'include', cache: 'no-store' }),
          fetch('/api/backpack', { credentials: 'include', cache: 'no-store' }),
        ])

        const errorItems: ErrorBookItem[] =
          errorBookRes.status === 'fulfilled' && errorBookRes.value.ok
            ? ((await errorBookRes.value.json()) as { items?: ErrorBookItem[] }).items || []
            : []

        const backpackItems: BackpackNote[] =
          backpackRes.status === 'fulfilled' && backpackRes.value.ok
            ? ((await backpackRes.value.json()) as { items?: BackpackNote[] }).items || []
            : []

        if (cancelled) return

        const riskItems: RiskItem[] = []

        // 處理錯題本風險
        if (errorItems.length > 0) {
          // 找出最緊急的錯題
          const urgentErrors = errorItems
            .map((item) => {
              const { riskPercent, daysSince, daysRemaining } = computeSrsRisk(
                item.last_attempted_at || item.created_at
              )
              return { item, riskPercent, daysRemaining: daysRemaining ?? 7 - daysSince }
            })
            .filter((e) => e.daysRemaining <= 5)
            .sort((a, b) => a.daysRemaining - b.daysRemaining)

          if (urgentErrors.length > 0) {
            const totalUrgent = urgentErrors.length
            const mostUrgent = urgentErrors[0]
            
            riskItems.push({
              id: 'error-book',
              type: 'error',
              title: `錯題即將過期！`,
              subtitle: `${totalUrgent} 題快過黃金複習期（剩餘 ${mostUrgent.daysRemaining} 天）`,
              riskPercent: mostUrgent.riskPercent,
              daysUntilExpiry: mostUrgent.daysRemaining,
              href: '/backpack?tab=mistakes',
            })
          }
        }

        // 處理筆記風險
        const notebookEntries = backpackItems.filter(
          (item) => item.is_notebook_entry || item.type === 'text'
        )
        
        if (notebookEntries.length > 0) {
          const urgentNotes = notebookEntries
            .map((note) => {
              const { riskPercent, daysSince, daysRemaining } = computeSrsRisk(note.updated_at)
              return { 
                note, 
                riskPercent, 
                daysRemaining: daysRemaining ?? 7 - daysSince,
                subject: note.subject || '筆記'
              }
            })
            .filter((n) => n.riskPercent >= 40)
            .sort((a, b) => b.riskPercent - a.riskPercent)

          if (urgentNotes.length > 0) {
            const mostUrgent = urgentNotes[0]
            
            riskItems.push({
              id: 'backpack-note',
              type: 'note',
              title: `${mostUrgent.subject} 記憶流失風險`,
              subtitle: `從你的筆記開始複習，立即阻止遺忘`,
              riskPercent: mostUrgent.riskPercent,
              daysUntilExpiry: mostUrgent.daysRemaining,
              href: `/backpack?type=note&subject=${mostUrgent.subject}&noteId=${mostUrgent.note.id}`,
            })
          }
        }

        setRisks(riskItems)
      } catch (error) {
        console.error('[RiskReminderSection] Error:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRisks()

    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-2xl bg-white/50 animate-pulse" />
        ))}
      </div>
    )
  }

  if (risks.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="space-y-2"
    >
      {risks.map((risk, index) => {
        const isUrgent = risk.daysUntilExpiry <= 2
        const bgColor = isUrgent ? 'bg-red-50' : 'bg-amber-50'
        const borderColor = isUrgent ? 'border-red-200' : 'border-amber-200'
        const iconColor = isUrgent ? 'text-red-500' : 'text-amber-600'
        const textColor = isUrgent ? 'text-red-700' : 'text-amber-800'

        return (
          <motion.div
            key={risk.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + index * 0.05 }}
          >
            <Link href={risk.href}>
              <div
                className={`flex items-center gap-3 p-4 rounded-2xl ${bgColor} border ${borderColor} hover:shadow-sm transition-shadow`}
              >
                <div className={`p-2 rounded-xl bg-white/60 ${iconColor}`}>
                  {risk.type === 'error' ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#7A6A57]">
                      {risk.type === 'error' ? '錯題本' : '背包筆記'}
                    </span>
                  </div>
                  <h4 className={`text-sm font-semibold ${textColor} truncate`}>
                    ⚠️ {risk.title}
                  </h4>
                  <p className="text-xs text-[#7A6A57] truncate">{risk.subtitle}</p>
                </div>

                <Button
                  size="sm"
                  className={`${isUrgent ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'} text-white rounded-xl text-xs px-3`}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1" />
                  複習
                </Button>
              </div>
            </Link>
          </motion.div>
        )
      })}
    </motion.div>
  )
}

