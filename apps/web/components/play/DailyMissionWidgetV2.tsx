'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Gift, Loader2, Sparkles, Sword, BookOpen, Heart, Brain, Star, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import Image from 'next/image'
import { useChickStore } from '@/src/store/chickStore'
import { getChickImagePath } from '@/components/chick/chickImage'
import type { ChickState } from '@/packages/server/chick/types'
import { ChickInteractionModal } from '@/components/chick/ChickInteractionModal'
import { ChickInteractionManager } from '@/components/chick/ChickInteractionManager'

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

import { useAuth } from '@/lib/auth-context'
import { usePlay } from '@/lib/play-context'

export function DailyMissionWidgetV2() {
    const { user } = useAuth()
    const { userStatus } = usePlay()
    const [data, setData] = useState<DailyMissionData | null>(null)
    const [loading, setLoading] = useState(true)
    const [claiming, setClaiming] = useState(false)
    const [showBubble, setShowBubble] = useState(false)
    const [bubbleText, setBubbleText] = useState('')
    const [isInteractionOpen, setIsInteractionOpen] = useState(false)

    // Chick Store
    const { iq, fatigue, emotionState, hunger, interact } = useChickStore()
    const chickState: ChickState = { iq, fatigue, emotionState }
    const imgSrc = getChickImagePath(chickState)

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
                // Trigger chick happy jump
                void interact('poke')
            } else {
                toast.error('領取失敗，請稍後再試')
            }
        } catch (error) {
            toast.error('發生錯誤')
        } finally {
            setClaiming(false)
        }
    }

    // Dynamic Greeting based on time of day
    const getGreeting = () => {
        const hour = new Date().getHours()
        let greeting = '早安'
        if (hour >= 5 && hour < 12) greeting = '早安'
        else if (hour >= 12 && hour < 18) greeting = '午安'
        else if (hour >= 18 && hour < 22) greeting = '晚安'
        else greeting = '夜深了'

        const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0]
        return userName ? `${greeting}，${userName}` : greeting
    }

    // Dynamic Default Text based on state
    const defaultText = useMemo(() => {
        if (data?.all_completed && !data?.rewards_claimed) return "太棒了！"
        if (data?.rewards_claimed) return "明天繼續加油"
        if (hunger < 30) return "我好餓..."
        return getGreeting()
    }, [data?.all_completed, data?.rewards_claimed, hunger, user])

    const handleChickClick = () => {
        // Open Interaction Modal
        setIsInteractionOpen(true)

        // Also show a quick happy bubble
        setBubbleText("Cheep cheep!")
        setShowBubble(true)
        setTimeout(() => setShowBubble(false), 2000)
    }

    if (loading) {
        return (
            <div className="rounded-[20px] bg-[#FFF9EB] p-5 h-64 animate-pulse" />
        )
    }

    if (!data) return null

    const allCompleted = data.missions.every(m => m.is_completed)
    const progress = (data.missions.filter(m => m.is_completed).length / data.missions.length) * 100

    // Format Date: Dec 09, Mon
    const today = new Date()
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', weekday: 'short' })

    return (
        <div
            className="relative overflow-hidden rounded-[20px]"
            style={{
                background: '#FFFCF5',
                padding: '16px 16px 20px'
            }}
        >
            <ChickInteractionManager />
            <ChickInteractionModal
                isOpen={isInteractionOpen}
                onClose={() => setIsInteractionOpen(false)}
            />

            {/* 1. Header Area - Dashboard Style */}
            <div className="relative mb-5 flex justify-between items-start z-10">
                {/* Left: Info */}
                <div className="flex flex-col">
                    {/* Greeting + Progress */}
                    <div className="flex items-baseline gap-2 mb-1">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={defaultText}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[15px] font-normal text-[#8B7355]"
                            >
                                {defaultText}
                            </motion.span>
                        </AnimatePresence>
                        <span className="text-[13px] font-medium text-[#B88C55]/60">
                            {Math.round(progress)}% 完成
                        </span>
                    </div>

                    {/* Title & Gold Coins Row */}
                    <div className="flex items-center gap-3">
                        <h3 className="text-[20px] font-semibold text-[#4A2E05] leading-tight">
                            今日任務
                        </h3>

                        {/* Minimalist Gold Coin Display */}
                        <div className="flex items-center gap-1 bg-[#F5E6CC]/40 px-2 py-0.5 rounded-full border border-[#E6D0A0]/30">
                            <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 shadow-sm text-[8px] font-bold text-white">
                                $
                            </div>
                            <span className="text-[11px] font-medium text-[#8B5E3C] tabular-nums leading-none">
                                {userStatus?.walletBalance?.toLocaleString() || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: The Stage for Chick */}
                <div className="relative h-[100px] w-[90px] mr-2">
                    {/* Shadow Base - Contact Shadow */}
                    <div className="absolute bottom-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-[100%] bg-[#8B5E3C] opacity-20 blur-[1px]" />

                    {/* Chick with Sticker Effect */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleChickClick}
                        className="relative h-full w-full cursor-pointer"
                        style={{
                            filter: 'drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 4px 6px rgba(0,0,0,0.05))'
                        }}
                    >
                        <Image
                            src={imgSrc}
                            alt="Chick Commander"
                            fill
                            className="object-contain"
                            priority
                        />
                    </motion.div>

                    {/* Interactive Toast Bubble */}
                    <AnimatePresence>
                        {showBubble && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className="absolute -left-20 bottom-20 z-20 whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#4A2E05] shadow-md border border-[#FAEAD3]"
                            >
                                {bubbleText}
                                <div className="absolute -bottom-1 right-8 h-2 w-2 rotate-45 bg-white border-b border-r border-[#FAEAD3]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 2. Body Area - 3 Column Grid with "Tile" Style */}
            <div className="relative z-10">
                <div className="grid grid-cols-3 gap-3">
                    {data.missions.map((mission, index) => (
                        <motion.div
                            key={mission.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`
                                flex flex-col items-center justify-center gap-2 aspect-[4/5] rounded-[16px] transition-all relative overflow-hidden
                                ${mission.is_completed
                                    ? 'bg-[#F2F8F2] border border-green-200/50'
                                    : 'bg-white border border-[rgba(189,164,123,0.22)] shadow-[0_4px_10px_rgba(85,61,41,0.05)]'
                                }
                            `}
                        >
                            {/* Mission Icon */}
                            <div className={`
                                flex h-9 w-9 shrink-0 items-center justify-center rounded-full mb-1
                                ${mission.is_completed
                                    ? 'bg-green-100/80 text-green-600'
                                    : 'bg-[#FFF9EB] text-[#D4A057]'
                                }
                            `}>
                                {getMissionIcon(mission.type, mission.metadata?.status_icon)}
                            </div>

                            {/* Info */}
                            <div className="flex flex-col items-center text-center gap-0.5 px-1">
                                <span className={`text-[12px] font-bold leading-tight ${mission.is_completed ? 'text-green-800' : 'text-[#5D4037]'}`}>
                                    {mission.title}
                                </span>
                                <div className="text-[10px] text-[#9A8C76] font-medium">
                                    {mission.is_completed ? (
                                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                                    ) : (
                                        <span>{mission.current_count}/{mission.target_count}</span>
                                    )}
                                </div>
                            </div>

                            {/* XP Reward Badge - Minimal Line Style */}
                            {!mission.is_completed && (
                                <div className="absolute top-2 right-2 flex items-center justify-center h-4 px-1.5 rounded-md border border-[#D4A057]/30 bg-white/50 text-[9px] font-medium text-[#B88C55]/70">
                                    +{mission.reward.xp}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Claim Button Area */}
                <AnimatePresence>
                    {allCompleted && !data.rewards_claimed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        >
                            <Button
                                onClick={handleClaim}
                                disabled={claiming}
                                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FFB300] to-[#FF6F00] text-white font-bold shadow-lg shadow-orange-200/50 hover:shadow-xl active:scale-98 transition-all"
                            >
                                {claiming ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Gift className="mr-2 h-4 w-4" />
                                )}
                                {claiming ? '領取中...' : '領取今日大獎'}
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function getMissionIcon(type: string, statusIcon?: string) {
    if (statusIcon) return <span className="text-xl">{statusIcon}</span>
    switch (type) {
        case 'play_battle': return <Sword className="h-4 w-4" />
        case 'feed_chick': return <Heart className="h-4 w-4" />
        default: return <Sparkles className="h-4 w-4" />
    }
}
