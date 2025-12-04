'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  GraduationCap,
  BookOpen,
  TrendingUp,
  Target,
  Percent,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { motion } from 'framer-motion'

interface DreamSchoolResult {
  readyPct: number
  userFinalScore: number
  targetMinScore: number
  academicReadyScore: number
  currentGrade?: number
  requiredGrade?: number
  breakdown: {
    adjFactor: number
    behaviorBoost: number
    skillDetails: {
      skill: string
      accuracy: number
      score?: number
      grade?: number
    }[]
  }
}

type MetricKey = 'academic' | 'behavior' | 'vocab' | 'mock'

interface CompactDreamSchoolCardProps {
  streakDays?: number
  eloRank?: number
  targetUniversity?: string | null
  targetDepartment?: string | null
}

export function CompactDreamSchoolCard({
  streakDays,
  eloRank,
  targetUniversity,
  targetDepartment,
}: CompactDreamSchoolCardProps) {
  const [data, setData] = useState<DreamSchoolResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null)
  const [metricSheetOpen, setMetricSheetOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/profile/dream-school-progress', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch data')
        const json = await res.json()
        setData(json)
      } catch (err) {
        console.error(err)
        setError('Failed to load progress')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return <Skeleton className="w-full h-44 rounded-2xl" />
  }

  if (error || !data) {
    return null
  }

  const vocabAccuracy =
    data.breakdown.skillDetails.length > 0
      ? data.breakdown.skillDetails.reduce((sum, skill) => sum + (skill.accuracy || 0), 0) /
        data.breakdown.skillDetails.length
      : 0

  const academicScore = data.academicReadyScore
  const behaviorBoost = data.breakdown.behaviorBoost
  const mockAdjPct = (data.breakdown.adjFactor - 1) * 100

  const handleMetricClick = (metric: MetricKey) => {
    setActiveMetric(metric)
    setMetricSheetOpen(true)
  }

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'text-emerald-600'
    if (pct >= 80) return 'text-[#D19A3A]'
    if (pct >= 60) return 'text-amber-600'
    return 'text-neutral-500'
  }

  const progressColor = getProgressColor(data.readyPct)

  const renderMetricSheetContent = () => {
    if (!activeMetric || !data) return null

    const skill = data.breakdown.skillDetails[0]
    const currentStreak = streakDays ?? 0
    const currentElo = eloRank ?? 0

    if (activeMetric === 'academic') {
      return (
        <div className="space-y-3 pb-4">
          <h2 className="text-base font-semibold text-[#4A3728]">學科基礎（Academic）</h2>
          <p className="text-sm text-[#4A3728]/80">
            Academic Ready Score：
            <span className="font-semibold">{academicScore.toFixed(1)}</span>
            ，模擬級分：
            <span className="font-semibold">
              {(data.currentGrade ?? skill?.grade ?? 0).toFixed(1)}
            </span>
            {' / '}
            {(data.requiredGrade ?? 13).toFixed(1)}
          </p>
          <p className="text-sm text-[#4A3728]/80">
            難度加權準確率約 <span className="font-semibold">{(vocabAccuracy * 100).toFixed(0)}%</span>。
            題量不足時分數會被壓低。
          </p>
          <p className="text-sm text-[#4A3728]/80">
            提升方式：穩定完成題組，維持正確率並降低思考時間。
          </p>
        </div>
      )
    }

    if (activeMetric === 'behavior') {
      return (
        <div className="space-y-3 pb-4">
          <h2 className="text-base font-semibold text-[#4A3728]">行為加成（Behavior）</h2>
          <p className="text-sm text-[#4A3728]/80">
            行為加成：<span className="font-semibold">+{behaviorBoost.toFixed(1)} 分</span>（上限 10 分）
          </p>
          <p className="text-sm text-[#4A3728]/80">
            連續學習天數：<span className="font-semibold">{currentStreak}</span> 天
            ，ELO：<span className="font-semibold">{currentElo}</span>
          </p>
          <p className="text-sm text-[#4A3728]/80">
            提升方式：每日至少一場有效練習，避免中斷連勝。
          </p>
        </div>
      )
    }

    if (activeMetric === 'vocab') {
      return (
        <div className="space-y-3 pb-4">
          <h2 className="text-base font-semibold text-[#4A3728]">字彙表現（Vocab）</h2>
          <p className="text-sm text-[#4A3728]/80">
            難度加權準確率：<span className="font-semibold">{(vocabAccuracy * 100).toFixed(0)}%</span>
          </p>
          <p className="text-sm text-[#4A3728]/80">
            提升方式：先穩定基礎難度，再逐步增加難題比例。
          </p>
        </div>
      )
    }

    // mock
    return (
      <div className="space-y-3 pb-4">
        <h2 className="text-base font-semibold text-[#4A3728]">模考調整（Mock Adj）</h2>
        <p className="text-sm text-[#4A3728]/80">
          調整因子：
          <span className="font-semibold">
            {mockAdjPct >= 0 ? '+' : ''}{mockAdjPct.toFixed(1)}%
          </span>
        </p>
        <p className="text-sm text-[#4A3728]/80">
          模考表現高於平時最多 +5%，低於平時最多 -5%。
        </p>
        <p className="text-sm text-[#4A3728]/80">
          建議：定期完成模考並更新自評。
        </p>
      </div>
    )
  }

  const metrics = [
    {
      key: 'academic' as MetricKey,
      icon: BookOpen,
      label: 'Academic',
      value: academicScore.toFixed(1),
      suffix: '/100',
    },
    {
      key: 'behavior' as MetricKey,
      icon: TrendingUp,
      label: 'Behavior',
      value: `+${behaviorBoost.toFixed(1)}`,
      suffix: '分',
    },
    {
      key: 'vocab' as MetricKey,
      icon: Target,
      label: 'Vocab',
      value: `${(vocabAccuracy * 100).toFixed(0)}%`,
      suffix: '',
    },
    {
      key: 'mock' as MetricKey,
      icon: Percent,
      label: 'Mock',
      value: `${mockAdjPct >= 0 ? '+' : ''}${mockAdjPct.toFixed(1)}%`,
      suffix: '',
    },
  ]

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="rounded-2xl bg-white/90 shadow-sm p-5">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-5 h-5 text-[#4A3728] opacity-80" />
            <h3 className="text-base font-semibold text-[#4A3728]">Dream School Ready</h3>
          </div>

          {/* Target */}
          <p className="text-xs text-[#7A6A57] mb-3">
            目標：
            <span className="font-medium">{targetUniversity || '尚未設定'}</span>
            {targetDepartment && <> · <span className="font-medium">{targetDepartment}</span></>}
          </p>

          {/* Main KPI */}
          <div className="flex items-end justify-between mb-3">
            <div className={cn('text-3xl font-bold tracking-tight', progressColor)}>
              {data.readyPct.toFixed(1)}%
            </div>
            <div className="text-right text-xs text-[#7A6A57]">
              <p>目標分數：{data.targetMinScore.toFixed(1)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="relative h-2 w-full rounded-full bg-[#E8E1D7] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, data.readyPct)}%` }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="h-full rounded-full bg-gradient-to-r from-[#E3C08C] via-[#D19A3A] to-[#B87A1E]"
              />
            </div>
          </div>

          {/* Compact 4-Column Metrics */}
          <div className="grid grid-cols-4 gap-2">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <button
                  key={metric.key}
                  type="button"
                  onClick={() => handleMetricClick(metric.key)}
                  className="flex flex-col items-center p-2 rounded-xl bg-[#FAF6E9] hover:bg-[#F5F0E0] transition-colors active:scale-95"
                >
                  <Icon className="h-3.5 w-3.5 text-[#7A6A57] mb-1" />
                  <span className="text-[10px] text-[#7A6A57]">{metric.label}</span>
                  <span className="text-sm font-semibold text-[#4A3728]">{metric.value}</span>
                </button>
              )
            })}
          </div>
        </Card>
      </motion.div>

      <BottomSheet
        isOpen={metricSheetOpen}
        onClose={() => setMetricSheetOpen(false)}
        className="bg-[#FFFBF5]"
        maxHeight="60vh"
      >
        {renderMetricSheetContent()}
      </BottomSheet>
    </>
  )
}

