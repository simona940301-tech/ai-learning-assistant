'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChickStore } from '@/src/store/chickStore'
import { getChickImagePath } from '@/components/chick/chickImage'
import type { ChickState } from '@/packages/server/chick/types'
import Image from 'next/image'
import { toast } from 'sonner'
import { usePlay } from '@/lib/play-context'

interface ChickInteractionModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChickInteractionModal({ isOpen, onClose }: ChickInteractionModalProps) {
    const {
        hunger,
        foodBowlsCount,
        feed,
        iq,
        fatigue,
        emotionState,
        explorationStartAt,
        explorationAllowance,
        startExploration,
        claimExploration,
        isExplorationFinished
    } = useChickStore()

    const { userStatus, openSystemModal } = usePlay()
    const walletBalance = userStatus?.walletBalance ?? 0
    const [allowance, setAllowance] = useState(100)

    // Use stored state for image
    const chickState: ChickState = { iq, fatigue, emotionState }

    // Determine image source: if very hungry (>=90), show 'sick' state to indicate weakness
    const effectiveEmotion = hunger >= 90 ? 'sick' : emotionState
    const imgSrc = getChickImagePath({ ...chickState, emotionState: effectiveEmotion })

    const [activeTab, setActiveTab] = useState<'care' | 'explore'>('care')

    // Dynamic Tone-of-Voice & Bubble
    let bubbleText = "Master..."
    if (hunger >= 80) bubbleText = "Master... 沒力氣了..."
    else if (hunger >= 50) bubbleText = "肚子有點餓..."
    else bubbleText = "I feel great!"

    // Handle Actions
    const handleFeed = async () => {
        if (foodBowlsCount > 0) {
            await feed()
            toast.success("Yummy! 體力恢復了！", {
                icon: '🍗',
                style: { background: '#AED581', color: '#1B5E20', border: 'none' }
            })
        } else {
            toast("沒有飼料了...", { description: "快去對戰賺取飼料吧！" })
        }
    }

    const handleGoToBattle = () => {
        onClose()
        openSystemModal()
    }

    const handleStartExploration = async () => {
        if (walletBalance < allowance) {
            toast.error("金幣不足", { description: `需要 ${allowance} 金幣` })
            return
        }
        await startExploration(allowance)
        toast.success("小雞出發探索了！", { icon: '🗺️' })
    }

    const handleClaimExploration = async () => {
        const result = await claimExploration()
        if (result) {
            toast.success(`探索完成！獲得 ${result.xpGained} XP`, { icon: '🎉' })
        }
    }

    // Check if exploration is ready to claim
    const isExploringNow = !!explorationStartAt
    const canClaim = isExploringNow && isExplorationFinished

    // Tabs - "Segmented Control" style
    const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`
                relative px-6 py-1.5 text-sm font-bold transition-all rounded-full z-10
                ${activeTab === id ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'}
            `}
        >
            {activeTab === id && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white shadow-sm rounded-full -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
            )}
            {label}
        </button>
    )

    // Portal logic
    const [mounted, setMounted] = useState(false)
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    // Portal the entire AnimatePresence to document.body
    // Using Flexbox centering is more robust than absolute positioning
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center isolate pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop - restores pointer events */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                        />

                        {/* Modal Card - Relative positioning within Flex container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative z-10 w-[90%] max-w-[380px] overflow-hidden rounded-[32px] bg-[#F2F1ED] shadow-2xl p-6 flex flex-col items-center gap-4 pointer-events-auto"
                        >
                            {/* 1. Header (Tabs & Close) */}
                            <div className="flex w-full items-center justify-between">
                                {/* Segmented Control */}
                                <div className="flex items-center bg-slate-200/50 p-1 rounded-full">
                                    <TabButton id="care" label="小雞" />
                                    <TabButton id="explore" label="探索" />
                                </div>

                                {/* Close X */}
                                <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* 2. The Stage (Hero Section) */}
                            <div className="relative flex flex-col items-center justify-center w-full">
                                {/* Speech Bubble */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-4 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm border border-slate-100 relative"
                                >
                                    {bubbleText}
                                    <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white border-b border-r border-slate-100"></div>
                                </motion.div>

                                {/* Chick Image */}
                                <div className="relative h-32 w-32 filter drop-shadow-xl">
                                    <Image
                                        src={imgSrc}
                                        alt="Chick"
                                        fill
                                        className={`object-contain ${hunger >= 90 ? 'grayscale-[0.3]' : ''}`}
                                        priority
                                    />
                                </div>

                                {/* Slim Hunger Bar */}
                                <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-6 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${hunger > 80 ? 'bg-orange-400' : 'bg-green-400'}`}
                                        style={{ width: `${100 - hunger}%` }}
                                    />
                                </div>
                            </div>

                            {/* 3. Content Section with Title */}
                            <div className="w-full space-y-3">
                                {activeTab === 'care' ? (
                                    <>
                                        {/* Title */}
                                        <h3 className="text-sm font-bold text-slate-700 text-center">照顧小雞</h3>

                                        <div className="flex items-center gap-3">
                                            {/* Inventory Count */}
                                            <button
                                                className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-95 transition-transform"
                                                onClick={() => {
                                                    if (foodBowlsCount === 0) {
                                                        toast("贏得對戰 +3 / 每日任務 +5", {
                                                            style: { background: 'rgba(0,0,0,0.8)', color: 'white', border: 'none' },
                                                            position: 'top-center'
                                                        })
                                                    }
                                                }}
                                            >
                                                <span className="text-xl">🍗</span>
                                                <span className={`text-[10px] font-black ${foodBowlsCount === 0 ? 'text-red-400' : 'text-slate-600'}`}>
                                                    {foodBowlsCount}
                                                </span>
                                            </button>

                                            {/* Main Action Button */}
                                            {foodBowlsCount > 0 ? (
                                                <Button
                                                    onClick={handleFeed}
                                                    className="flex-1 h-14 rounded-2xl bg-amber-400 text-amber-950 font-black text-base shadow-[0_4px_0_#D97706] hover:bg-amber-300 active:translate-y-[2px] active:shadow-[0_0px_0_#D97706] transition-all"
                                                >
                                                    餵食 (-20餓)
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={handleGoToBattle}
                                                    className="flex-1 h-14 rounded-2xl bg-slate-800 text-white font-bold text-base shadow-[0_4px_0_#000] hover:bg-slate-700 active:translate-y-[2px] active:shadow-[0_0px_0_#000] transition-all"
                                                >
                                                    去對戰賺飼料 ➔
                                                </Button>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Title */}
                                        <h3 className="text-sm font-bold text-slate-700 text-center">給零用錢去探索</h3>

                                        {isExploringNow ? (
                                            <div className="space-y-3">
                                                <div className="text-center py-4">
                                                    <p className="text-sm text-slate-600 mb-1">探索中...</p>
                                                    <p className="text-xs text-slate-400">零用錢: {explorationAllowance} 金幣</p>
                                                </div>
                                                <Button
                                                    onClick={handleClaimExploration}
                                                    disabled={!canClaim}
                                                    className="w-full h-12 rounded-2xl bg-emerald-500 text-white font-bold shadow-[0_4px_0_#059669] hover:bg-emerald-400 active:translate-y-[2px] active:shadow-[0_0px_0_#059669] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {canClaim ? '領取獎勵 🎁' : '探索中...'}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* Coin Balance Display */}
                                                <div className="flex items-center justify-between px-3 py-2 bg-white/50 rounded-xl">
                                                    <span className="text-xs text-slate-600">你的金幣</span>
                                                    <div className="flex items-center gap-1">
                                                        <Coins className="h-4 w-4 text-amber-500" />
                                                        <span className="text-sm font-bold text-slate-800">{walletBalance}</span>
                                                    </div>
                                                </div>

                                                {/* Allowance Slider */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between px-1">
                                                        <span className="text-xs text-slate-600">零用錢</span>
                                                        <span className="text-sm font-bold text-slate-800">{allowance}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max={Math.min(1000, walletBalance)}
                                                        step="50"
                                                        value={allowance}
                                                        onChange={(e) => setAllowance(Number(e.target.value))}
                                                        className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500 [&::-webkit-slider-thumb]:cursor-pointer"
                                                    />
                                                </div>

                                                {/* Start Button */}
                                                <Button
                                                    onClick={handleStartExploration}
                                                    disabled={allowance === 0 || walletBalance < allowance}
                                                    className="w-full h-12 rounded-2xl bg-blue-500 text-white font-bold shadow-[0_4px_0_#2563EB] hover:bg-blue-400 active:translate-y-[2px] active:shadow-[0_0px_0_#2563EB] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    開始探索 🗺️
                                                </Button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>,
        document.body
    )

}
