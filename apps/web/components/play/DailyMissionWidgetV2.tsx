'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Gift, Loader2, Sparkles, Sword, BookOpen, Heart, Brain, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface BonusItem {
    type: string
    name: string
    rarity: string
    description: string
}

interface Mission {
    id: string
    type: string
    subtype: string
    title: string
    description: string
    target_count: number
    current_count: number
    is_completed: boolean
    reward: {
        xp: number
        gold: number
        bonus_item?: BonusItem
    }
    metadata?: {
        status_icon?: string
        action_button?: string
        tracking_event?: string
    }
}

interface DailyMissionData {
    missions: Mission[]
    all_completed: boolean
    rewards_claimed: boolean
}

export function DailyMissionWidgetV2() {
    const [data, setData] = useState<DailyMissionData | null>(null)
    const [loading, setLoading] = useState(true)
    const [claiming, setClaiming] = useState(false)

    useEffect(() => {
        fetchMissions()
    }, [])

    const fetchMissions = async () => {
        try {
            const res = await fetch('/api/missions/daily')
            if (res.ok) {
                const json = await res.json()
                setData(json)
            }
        } catch (error) {
            console.error('Failed to fetch missions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleClaim = async () => {
        if (!data) return
        setClaiming(true)
        try {
            const res = await fetch('/api/missions/daily', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'claim' })
            })

            if (res.ok) {
                const result = await res.json()

                // Check for bonus items
                const bonusItems = data.missions
                    .filter(m => m.reward.bonus_item)
                    .map(m => m.reward.bonus_item?.name)
                    .filter(Boolean)

                const bonusText = bonusItems.length > 0
                    ? ` + ${bonusItems.join(', ')}`
                    : ''

                toast.success(
                    `領取成功！獲得 ${result.rewards.xp} XP 和 ${result.rewards.gold} 金幣${bonusText}`,
                    {
                        duration: 4000,
                        style: {
                            background: 'hsl(42, 98%, 70%)',
                            color: 'hsl(14, 26%, 29%)',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: '600'
                        }
                    }
                )
                setData(prev => prev ? { ...prev, rewards_claimed: true } : null)
            } else {
                toast.error('領取失敗，請稍後再試')
            }
        } catch (error) {
            toast.error('發生錯誤')
        } finally {
            setClaiming(false)
        }
    }

    if (loading) {
        return (
            <div className="rounded-[24px] border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                    </div>
                </div>
            </div>
        )
    }

    // Show "Come back tomorrow" message if no data or rewards claimed
    if (!data || data.rewards_claimed) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[24px] border border-border/50 bg-card/50 p-5"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50">
                        <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">
                            {data?.rewards_claimed ? '今日任務已完成！' : '每日任務'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {data?.rewards_claimed ? '明天再來挑戰新任務' : '載入中...'}
                        </p>
                    </div>
                </div>
            </motion.div>
        )
    }

    const allCompleted = data.missions.every(m => m.is_completed)
    const progress = (data.missions.filter(m => m.is_completed).length / data.missions.length) * 100

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`
                relative overflow-hidden rounded-[24px] border p-5 shadow-lg
                transition-all duration-500
                ${allCompleted
                    ? 'border-primary bg-gradient-to-br from-card via-primary/5 to-card animate-pulse-glow'
                    : 'border-border/50 bg-card'
                }
            `}
        >
            {/* Golden Glow Effect when All Completed */}
            {allCompleted && (
                <motion.div
                    className="absolute inset-0 rounded-[24px] opacity-30"
                    animate={{
                        boxShadow: [
                            '0 0 20px hsl(42, 98%, 70%)',
                            '0 0 40px hsl(42, 98%, 70%)',
                            '0 0 20px hsl(42, 98%, 70%)',
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            )}

            {/* Header */}
            <div className="relative z-10 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <motion.div
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20"
                        animate={allCompleted ? {
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                        } : {}}
                        transition={{
                            duration: 2,
                            repeat: allCompleted ? Infinity : 0,
                            ease: 'easeInOut'
                        }}
                    >
                        <Sparkles className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div>
                        <h3 className="text-base font-bold text-foreground">今日任務</h3>
                        <p className="text-xs text-muted-foreground">
                            {allCompleted ? '✨ 全部完成！領取獎勵' : '完成所有任務領取大獎'}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-sm font-bold transition-colors ${
                        allCompleted ? 'text-accent' : 'text-primary'
                    }`}>
                        {Math.round(progress)}%
                    </div>
                </div>
            </div>

            {/* Progress Bar with Enhanced Animation */}
            <div className="relative mb-4">
                <Progress
                    value={progress}
                    className="h-2.5 bg-muted/50"
                    indicatorClassName={`transition-all duration-700 ${
                        allCompleted
                            ? 'bg-gradient-to-r from-primary via-accent to-primary'
                            : 'bg-primary'
                    }`}
                />
                {allCompleted && (
                    <motion.div
                        className="absolute inset-0 h-2.5 rounded-full bg-primary/30"
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                )}
            </div>

            {/* Missions List */}
            <div className="relative z-10 space-y-3">
                {data.missions.map((mission, index) => (
                    <motion.div
                        key={mission.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`
                            flex items-center justify-between rounded-xl p-3 shadow-sm
                            transition-all duration-300
                            ${mission.is_completed
                                ? 'bg-accent/10 border border-accent/20'
                                : 'bg-card border border-border/30'
                            }
                        `}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            {/* Icon with Enhanced Styling */}
                            <motion.div
                                className={`
                                    flex h-11 w-11 items-center justify-center rounded-xl
                                    transition-all duration-300
                                    ${mission.is_completed
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'bg-muted/50 text-muted-foreground'
                                    }
                                `}
                                animate={mission.is_completed ? { scale: [1, 1.1, 1] } : {}}
                                transition={{ duration: 0.5 }}
                            >
                                {getMissionIcon(mission.type, mission.metadata?.status_icon)}
                            </motion.div>

                            {/* Mission Details */}
                            <div className="flex-1">
                                <p className={`text-sm font-semibold ${
                                    mission.is_completed ? 'text-foreground' : 'text-muted-foreground'
                                }`}>
                                    {mission.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-xs text-muted-foreground">
                                        {mission.current_count}/{mission.target_count}
                                    </p>
                                    {/* Rewards Preview */}
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <div className="flex items-center gap-1.5 text-xs">
                                        <span className="text-primary font-medium">
                                            {mission.reward.xp} XP
                                        </span>
                                        <span className="text-muted-foreground">+</span>
                                        <span className="text-accent font-medium">
                                            {mission.reward.gold} 金幣
                                        </span>
                                        {mission.reward.bonus_item && (
                                            <>
                                                <span className="text-muted-foreground">+</span>
                                                <span className="text-destructive font-medium flex items-center gap-0.5">
                                                    <Star className="h-3 w-3" />
                                                    稀有
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Completion Check */}
                        {mission.is_completed && (
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 200 }}
                            >
                                <CheckCircle2 className="h-6 w-6 text-accent" />
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Claim Button with Enhanced Animation */}
            <AnimatePresence>
                {allCompleted && !data.rewards_claimed && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.4 }}
                        className="relative z-10"
                    >
                        <Button
                            onClick={handleClaim}
                            disabled={claiming}
                            className="
                                w-full h-12
                                bg-gradient-to-r from-primary via-primary to-accent
                                text-primary-foreground font-bold text-base
                                hover:from-primary/90 hover:to-accent/90
                                shadow-lg hover:shadow-xl
                                transition-all duration-300
                                relative overflow-hidden
                            "
                        >
                            {/* Shimmer Effect */}
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 1
                                }}
                            />

                            {claiming ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Gift className="mr-2 h-5 w-5" />
                            )}
                            <span className="relative z-10">
                                {claiming ? '領取中...' : '領取今日獎勵'}
                            </span>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

function getMissionIcon(type: string, statusIcon?: string) {
    // Use emoji if provided
    if (statusIcon) {
        return <span className="text-lg">{statusIcon}</span>
    }

    // Default icons based on type
    switch (type) {
        case 'play_battle':
        case 'WEAKNESS_TRAINING':
            return <Brain className="h-5 w-5" />
        case 'feed_chick':
        case 'ENGAGEMENT_SOCIAL':
            return <Heart className="h-5 w-5" />
        case 'review_error':
        case 'RETENTION_STREAK':
            return <Star className="h-5 w-5" />
        case 'win_battle':
            return <Sword className="h-5 w-5" />
        default:
            return <Sparkles className="h-5 w-5" />
    }
}
