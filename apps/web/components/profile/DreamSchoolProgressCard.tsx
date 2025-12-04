"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    AlertCircle,
    GraduationCap,
    BookOpen,
    TrendingUp,
    Target,
    Percent,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { BottomSheet } from '@/components/ui/BottomSheet'

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

interface DreamSchoolProgressCardProps {
    streakDays?: number
    eloRank?: number
    targetUniversity?: string | null
    targetDepartment?: string | null
}

export function DreamSchoolProgressCard({
    streakDays,
    eloRank,
    targetUniversity,
    targetDepartment,
}: DreamSchoolProgressCardProps) {
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
        return <Skeleton className="w-full h-52 rounded-2xl" />
    }

    if (error || !data) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Could not load Dream School progress.</AlertDescription>
            </Alert>
        )
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
                        你的 Academic Ready Score 目前為{' '}
                        <span className="font-semibold">
                            {academicScore.toFixed(1)}
                        </span>
                        ，等同於模擬級分{' '}
                        <span className="font-semibold">
                            {(data.currentGrade ?? skill?.grade ?? 0).toFixed(1)}
                        </span>
                        {' / '}
                        {(data.requiredGrade ?? 13).toFixed(1)}。
                    </p>
                    <p className="text-sm text-[#4A3728]/80">
                        準確率是依照題目難度加權計算的。所有英文題目中，你目前的難度加權準確率約為{' '}
                        <span className="font-semibold">
                            {(vocabAccuracy * 100).toFixed(0)}%
                        </span>
                        。題量不足時（少於 30 題），分數會被自動壓低，避免少量題目造成高估。
                    </p>
                    <p className="text-sm text-[#4A3728]/80">
                        Ready Score 的計算邏輯：
                    </p>
                    <ul className="list-disc pl-5 text-sm text-[#4A3728]/80 space-y-1">
                        <li>先將難度加權準確率映射到 1–15 級的模擬級分。</li>
                        <li>再以校系的門檻級分為基準，轉換成 0–100 分的單科 Ready Score。</li>
                        <li>平均答題時間過慢時（超過 30–45 秒），最高會扣到約 8% 分數。</li>
                    </ul>
                    <p className="text-sm text-[#4A3728]/80">
                        優先改善方式：穩定完成完整題組，確保題量足夠，並在維持正確率的前提下降低思考時間。
                    </p>
                </div>
            )
        }

        if (activeMetric === 'behavior') {
            return (
                <div className="space-y-3 pb-4">
                    <h2 className="text-base font-semibold text-[#4A3728]">行為加成（Behavior）</h2>
                    <p className="text-sm text-[#4A3728]/80">
                        目前的行為加成為{' '}
                        <span className="font-semibold">
                            +{behaviorBoost.toFixed(1)} 分
                        </span>
                        ，上限為 10 分。
                    </p>
                    <p className="text-sm text-[#4A3728]/80">
                        此分數同時考慮兩個面向：
                    </p>
                    <ul className="list-disc pl-5 text-sm text-[#4A3728]/80 space-y-1">
                        <li>連續學習天數（streak）：1、5、10、20 天檻值會給予不同等級的加成。</li>
                        <li>ELO 排名：以英文對戰的實際表現推估相對於其他學生的百分位。</li>
                    </ul>
                    <p className="text-sm text-[#4A3728]/80">
                        目前系統紀錄的連續學習天數約為{' '}
                        <span className="font-semibold">{currentStreak}</span>
                        {' '}天，整體 ELO 約為{' '}
                        <span className="font-semibold">{currentElo}</span>
                        {' '}（數值越高代表實戰穩定度越好）。
                    </p>
                    <p className="text-sm text-[#4A3728]/80">
                        提升方式：保持每日至少一場有效練習，避免 streak 中斷，同時在戰鬥或練習模式中維持穩定正確率，而不是只追求短時間突增。
                    </p>
                </div>
            )
        }

        if (activeMetric === 'vocab') {
            return (
                <div className="space-y-3 pb-4">
                    <h2 className="text-base font-semibold text-[#4A3728]">字彙表現（Vocab）</h2>
                    <p className="text-sm text-[#4A3728]/80">
                        目前的字彙難度加權準確率約為{' '}
                        <span className="font-semibold">
                            {(vocabAccuracy * 100).toFixed(0)}%
                        </span>
                        。系統會根據每一題的難度（1–5）給予不同權重，難度越高，對分數的影響越大。
                    </p>
                    <p className="text-sm text-[#4A3728]/80">
                        所有英文答題會被匯總到一個總體表現：正確且高難度的題目能快速拉高整體評分，反之，低難度題目反覆錯誤會拖累評估。
                    </p>
                    <p className="text-sm text-[#4A3728]/80">
                        提升方式：
                    </p>
                    <ul className="list-disc pl-5 text-sm text-[#4A3728]/80 space-y-1">
                        <li>先把基礎難度的題目穩定做到高正確率，再逐步增加難題比例。</li>
                        <li>針對常錯單字，利用錯題本或重複出現題目集中復習。</li>
                    </ul>
                </div>
            )
        }

        // mock
        return (
            <div className="space-y-3 pb-4">
                <h2 className="text-base font-semibold text-[#4A3728]">模考調整（Mock Adj）</h2>
                <p className="text-sm text-[#4A3728]/80">
                    目前的模考調整因子為{' '}
                    <span className="font-semibold">
                        {mockAdjPct >= 0 ? '+' : ''}
                        {mockAdjPct.toFixed(1)}%
                    </span>
                    。這個比例會直接套用在學科分數上，反映「模考表現是否與平時練習一致」。
                </p>
                <p className="text-sm text-[#4A3728]/80">
                    系統會比較你在 App 內的模擬級分，和你在模考中自評或紀錄的級分差距：
                </p>
                <ul className="list-disc pl-5 text-sm text-[#4A3728]/80 space-y-1">
                    <li>如果模考表現明顯高於平時練習，會給予最多約 +5% 的加成。</li>
                    <li>如果模考表現明顯低於平時練習，會給予最多約 -5% 的調整。</li>
                    <li>沒有模考資料時，調整因子維持在 0%（不加不減）。</li>
                </ul>
                <p className="text-sm text-[#4A3728]/80">
                    建議：定期完成模考並更新自評程度，讓系統能以較可靠的資料評估你的真實考場表現，而不是只看練習環境的成績。
                </p>
            </div>
        )
    }

    const getProgressColor = (pct: number) => {
        if (pct >= 100) return 'text-emerald-600'
        if (pct >= 80) return 'text-[#D19A3A]'
        if (pct >= 60) return 'text-amber-600'
        return 'text-neutral-500'
    }

    const progressColor = getProgressColor(data.readyPct)

    return (
        <>
            <Card className="w-full rounded-2xl border border-[#4A3728]/10 bg-white/90 shadow-[0_8px_20px_rgba(0,0,0,0.03)] p-5">
                {/* Header with Icon & Target */}
                <div className="mb-4 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-[#4A3728] opacity-80" />
                        <h3 className="text-base font-semibold text-[#4A3728]">
                            Dream School Ready
                        </h3>
                    </div>
                    <p className="text-xs text-[#7A6A57]">
                        目標：
                        <span className="font-medium">
                            {targetUniversity || '尚未設定學校'}
                        </span>
                        {targetDepartment && (
                            <>
                                {' · '}
                                <span className="font-medium">{targetDepartment}</span>
                            </>
                        )}
                    </p>
                </div>

                {/* Main KPI */}
                <div className="mb-4 flex items-end justify-between">
                    <div>
                        <div className={cn('text-4xl font-bold tracking-tight', progressColor)}>
                            {data.readyPct.toFixed(1)}%
                        </div>
                        <p className="mt-1 text-xs text-[#7A6A57]">
                            目標 Ready Score：{data.targetMinScore.toFixed(1)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-[#7A6A57]">
                            綜合分數：
                            <span className="font-semibold text-[#4A3728]">
                                {data.userFinalScore.toFixed(1)}
                            </span>
                        </p>
                        <p className="text-xs text-[#7A6A57]">
                            學科基礎：
                            <span className="font-semibold text-[#4A3728]">
                                {academicScore.toFixed(1)}
                            </span>
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="relative h-2 w-full rounded-full bg-[#E8E1D7] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-[#E3C08C] via-[#D19A3A] to-[#B87A1E] transition-all duration-500"
                            style={{ width: `${Math.min(100, data.readyPct)}%` }}
                        />
                    </div>
                </div>

                {/* Metrics Grid - Minimal interactive cards */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Academic */}
                    <button
                        type="button"
                        onClick={() => handleMetricClick('academic')}
                        className="flex flex-col items-start rounded-2xl border border-[#4A3728]/12 bg-white/80 px-3 py-3 text-left shadow-[0_4px_10px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    >
                        <div className="mb-1.5 flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-[#4A3728]/80" />
                            <span className="text-[11px] font-medium text-[#7A6A57]">
                                Academic
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-semibold text-[#4A3728]">
                                {academicScore.toFixed(1)}
                            </span>
                            <span className="text-[11px] text-[#A1968A]">/ 100</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#938575]">
                            以難度加權的英文答題表現。
                        </p>
                    </button>

                    {/* Behavior */}
                    <button
                        type="button"
                        onClick={() => handleMetricClick('behavior')}
                        className="flex flex-col items-start rounded-2xl border border-[#4A3728]/12 bg-white/80 px-3 py-3 text-left shadow-[0_4px_10px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    >
                        <div className="mb-1.5 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-[#4A3728]/80" />
                            <span className="text-[11px] font-medium text-[#7A6A57]">
                                Behavior
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-semibold text-[#4A3728]">
                                +{behaviorBoost.toFixed(1)}
                            </span>
                            <span className="text-[11px] text-[#A1968A]">分</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#938575]">
                            連續學習與 ELO 排名加成。
                        </p>
                    </button>

                    {/* Vocabulary */}
                    <button
                        type="button"
                        onClick={() => handleMetricClick('vocab')}
                        className="flex flex-col items-start rounded-2xl border border-[#4A3728]/12 bg-white/80 px-3 py-3 text-left shadow-[0_4px_10px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    >
                        <div className="mb-1.5 flex items-center gap-2">
                            <Target className="h-4 w-4 text-[#4A3728]/80" />
                            <span className="text-[11px] font-medium text-[#7A6A57]">
                                Vocab
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-semibold text-[#4A3728]">
                                {(vocabAccuracy * 100).toFixed(0)}%
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#938575]">
                            依照題目難度加權的字彙準確率。
                        </p>
                    </button>

                    {/* Mock Adj */}
                    <button
                        type="button"
                        onClick={() => handleMetricClick('mock')}
                        className="flex flex-col items-start rounded-2xl border border-[#4A3728]/12 bg-white/80 px-3 py-3 text-left shadow-[0_4px_10px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                    >
                        <div className="mb-1.5 flex items-center gap-2">
                            <Percent className="h-4 w-4 text-[#4A3728]/80" />
                            <span className="text-[11px] font-medium text-[#7A6A57]">
                                Mock Adj
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-semibold text-[#4A3728]">
                                {mockAdjPct >= 0 ? '+' : ''}
                                {mockAdjPct.toFixed(1)}%
                            </span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#938575]">
                            模考表現與平時練習之間的微調。
                        </p>
                    </button>
                </div>
            </Card>

            <BottomSheet
                isOpen={metricSheetOpen}
                onClose={() => setMetricSheetOpen(false)}
                className="bg-[#FFFBF5]"
                maxHeight="80vh"
            >
                {renderMetricSheetContent()}
            </BottomSheet>
        </>
    )
}
