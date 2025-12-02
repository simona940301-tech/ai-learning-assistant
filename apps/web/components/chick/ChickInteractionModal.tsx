'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ChickSlider } from './ChickSlider'
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useChickStore } from '@/src/store/chickStore'
import { useTheme } from '@/lib/theme'
import { Utensils, Map, Coins, Gift, Heart, Battery, Brain, Sparkles, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChickInteractionModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChickInteractionModal({ isOpen, onClose }: ChickInteractionModalProps) {
    const { theme } = useTheme()
    // Panel: only outer shell is translucent; inner cards are solid
    const panelBg = 'rgba(171, 137, 96, 0.26)'
    const panelBorder = 'rgba(171, 137, 96, 0.45)'
    const cardBg = '#FFF6E8'
    const cardBorder = '#E5D4BC'
    const cardShadow = '0 12px 28px rgba(17, 13, 10, 0.14)'
    // 提升文字對比度：使用更深的顏色確保可讀性
    const textStrong = '#1f1409' // 從 #3f2514 加深，提升對比度
    const textMedium = '#3d2818' // 從 #5b3a22 加深
    const textMuted = '#6b5238' // 從 #8c6a4b 加深，但仍保持層次
    const tabActiveBg = '#B48A57'
    const tabActiveText = '#FFF7E6'
    const trackBg = '#D8C7AD'
    const {
        hunger,
        intimacy,
        foodBowlsCount,
        explorationStartAt,
        explorationAllowance,
        evolutionStage,
        evolutionVariant,
        feed,
        startExploration,
        claimExploration,
        fetchStatus
    } = useChickStore()

    const [activeTab, setActiveTab] = useState<'feed' | 'explore'>('feed')
    const [allowance, setAllowance] = useState([100])
    const [isProcessing, setIsProcessing] = useState(false)
    const [claimResult, setClaimResult] = useState<{ xpGained: number; gifts: string[] } | null>(null)
    const [resultAnimation, setResultAnimation] = useState<'feed' | 'soothe' | null>(null)

    useEffect(() => {
        if (isOpen) {
            fetchStatus()
        }
    }, [isOpen, fetchStatus])

    // Debug: Log store state when modal opens
    useEffect(() => {
        if (isOpen) {
            console.log('[ChickInteractionModal] Store State:', {
                hunger,
                foodBowlsCount,
                intimacy,
                evolutionStage,
                evolutionVariant
            })
        }
    }, [isOpen, hunger, foodBowlsCount, intimacy, evolutionStage, evolutionVariant])

    const handleFeed = async () => {
        setIsProcessing(true)
        const success = await feed()
        if (success) {
            setResultAnimation('feed')
            setTimeout(() => {
                setResultAnimation(null)
                onClose()
            }, 1500)
        }
        setIsProcessing(false)
    }

    const handleStartExploration = async () => {
        setIsProcessing(true)
        const success = await startExploration(allowance[0])
        if (success) {
            onClose()
        }
        setIsProcessing(false)
    }

    const handleClaimExploration = async () => {
        setIsProcessing(true)
        const result = await claimExploration()
        if (result) {
            setClaimResult(result)
        }
        setIsProcessing(false)
    }

    const isExploring = !!explorationStartAt

    const currentLevel = Math.floor(intimacy / 100) + 1

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                    [data-radix-dialog-overlay] {
                        background-color: rgba(94, 64, 55, 0.4) !important;
                    }
                `
            }} />
            <TooltipProvider delayDuration={200}>
                <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                    <DialogContent 
                        className="max-w-md border p-4"
                        style={{
                            backgroundColor: panelBg,
                            borderColor: panelBorder,
                            color: textStrong,
                            backdropFilter: 'blur(16px)',
                            boxShadow: '0 24px 60px rgba(17, 13, 10, 0.24)',
                        }}
                    >
                    <DialogHeader>
                        <div
                            className="rounded-2xl px-3 py-2"
                            style={{
                                background: 'linear-gradient(to right, rgba(255, 246, 232, 0.9), rgba(245, 226, 200, 0.9))',
                                boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                            }}
                        >
                            <DialogTitle className="text-lg font-bold flex items-center gap-1.5" style={{ color: '#FFF7E6' }}>
                                <span className="flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" style={{ color: '#FED168' }} />
                                    小雞照護
                                </span>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <TooltipRoot>
                                        <TooltipTrigger asChild>
                                            <button 
                                                className="flex items-center gap-1 text-xs font-normal px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer"
                                                style={{
                                                    backgroundColor: 'rgba(254, 209, 104, 0.18)',
                                                    borderColor: 'rgba(254, 209, 104, 0.32)',
                                                    color: textStrong, // 使用更深的顏色提升對比度
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(254, 209, 104, 0.28)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(254, 209, 104, 0.18)'
                                                }}
                                            >
                                                <Brain className="w-3 h-3" style={{ color: '#D97706' }} />
                                                <span>階段 {evolutionStage}</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent 
                                            side="bottom" 
                                            className="max-w-[200px]"
                                            style={{
                                                backgroundColor: cardBg,
                                                borderColor: cardBorder,
                                                color: textStrong,
                                            }}
                                        >
                                            <p className="text-xs">
                                                進化階段：目前為第 {evolutionStage} 階段
                                                {evolutionStage === 0 && '（初始階段）'}
                                                {evolutionStage > 0 && '（已進化）'}
                                            </p>
                                        </TooltipContent>
                                    </TooltipRoot>
                                    <TooltipRoot>
                                        <TooltipTrigger asChild>
                                            <button 
                                                className="flex items-center gap-1 text-xs font-normal px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer"
                                                style={{
                                                    backgroundColor: 'rgba(254, 209, 104, 0.18)',
                                                    borderColor: 'rgba(254, 209, 104, 0.32)',
                                                    color: textStrong, // 使用更深的顏色提升對比度
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(254, 209, 104, 0.28)'
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(254, 209, 104, 0.18)'
                                                }}
                                            >
                                                <Heart className="w-3 h-3 fill-current" style={{ color: '#D97706' }} />
                                                <span>等級 {currentLevel}</span>
                                            </button>
                                        </TooltipTrigger>
                                        <TooltipContent 
                                            side="bottom" 
                                            className="max-w-[200px]"
                                            style={{
                                                backgroundColor: cardBg,
                                                borderColor: cardBorder,
                                                color: textStrong,
                                            }}
                                        >
                                            <p className="text-xs">
                                                親密度等級：目前為第 {currentLevel} 級
                                                <br />
                                                <span style={{ color: textMuted }}>親密度：{intimacy}/{(currentLevel) * 100}</span>
                                            </p>
                                        </TooltipContent>
                                    </TooltipRoot>
                                </div>
                            </DialogTitle>
                            <DialogDescription className="text-xs" style={{ color: textMedium }}>
                                照顧你的學習夥伴。{evolutionVariant !== 'default' && `（${evolutionVariant.charAt(0).toUpperCase() + evolutionVariant.slice(1)} 變體）`}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {/* Result Animation Overlay */}
                    <AnimatePresence>
                        {resultAnimation === 'feed' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm rounded-lg"
                                style={{ backgroundColor: 'rgba(94, 64, 55, 0.6)' }}
                            >
                                <div className="relative">
                                    <motion.div
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", bounce: 0.4 }}
                                        className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full shadow-xl"
                                        style={{ 
                                            background: 'linear-gradient(to bottom right, #FED168, #D97706)',
                                        }}
                                    >
                                        <Utensils className="w-10 h-10 text-white" />
                                    </motion.div>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [0, 1.1, 1] }}
                                        transition={{ delay: 0.2 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                    >
                                        <div className="w-10 h-10 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-4 text-center font-bold text-xl"
                                        style={{ color: '#FED168' }}
                                    >
                                        已餵食
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {claimResult ? (
                        <div className="py-4 text-center space-y-3">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-4xl"
                            >
                                <img src="/icon/gift.png" alt="獎勵" className="w-10 h-10 object-contain" />
                            </motion.div>
                            <h3 className="text-lg font-bold" style={{ color: '#FED168' }}>歡迎回來！</h3>
                            <p className="text-sm font-medium" style={{ color: textStrong }}>
                                你的小雞帶回了 <span className="font-bold text-lg" style={{ color: '#D97706' }}>{claimResult.xpGained}</span> <span className="font-semibold">經驗值</span>！
                            </p>
                            {claimResult.gifts.length > 0 && (
                                <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
                                    {claimResult.gifts.map((gift, i) => (
                                            <span 
                                                key={i} 
                                                className="px-2 py-1 rounded text-xs border font-medium"
                                                style={{
                                                    backgroundColor: 'rgba(254, 209, 104, 0.15)',
                                                    borderColor: 'rgba(254, 209, 104, 0.3)',
                                                    color: textStrong,
                                                }}
                                            >
                                                {gift}
                                            </span>
                                    ))}
                                </div>
                            )}
                            <Button 
                                onClick={() => { setClaimResult(null); onClose(); }} 
                                className="w-full mt-3 text-white text-sm py-2"
                                style={{
                                    backgroundColor: theme.accent,
                                    color: 'white',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.accentHover
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.accent
                                }}
                            >
                                太棒了！
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Tabs */}
                            <div 
                                className="flex p-0.5 rounded-lg border shadow-sm"
                                style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
                            >
                                <button
                                    onClick={() => setActiveTab('feed')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                                        activeTab === 'feed' 
                                            ? 'shadow-sm' 
                                            : ''
                                    }`}
                                    style={{
                                        backgroundColor: activeTab === 'feed' ? tabActiveBg : 'transparent',
                                        color: activeTab === 'feed' ? tabActiveText : textMuted,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== 'feed') {
                                            e.currentTarget.style.color = textMedium
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== 'feed') {
                                            e.currentTarget.style.color = textMuted
                                        }
                                    }}
                                >
                                    <Utensils className="w-3.5 h-3.5" />
                                    餵食
                                </button>
                                <button
                                    onClick={() => setActiveTab('explore')}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                                        activeTab === 'explore' 
                                            ? 'shadow-sm' 
                                            : ''
                                    }`}
                                    style={{
                                        backgroundColor: activeTab === 'explore' ? tabActiveBg : 'transparent',
                                        color: activeTab === 'explore' ? tabActiveText : textMuted,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (activeTab !== 'explore') {
                                            e.currentTarget.style.color = textMedium
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (activeTab !== 'explore') {
                                            e.currentTarget.style.color = textMuted
                                        }
                                    }}
                                >
                                    <Map className="w-3.5 h-3.5" />
                                    探索
                                </button>
                            </div>

                            {/* Content */}
                            <div className="min-h-[180px]">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'feed' ? (
                                        <motion.div
                                            key="feed"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-3"
                                        >
                                            {/* Hunger Bar */}
                                            <div 
                                                className="space-y-2 p-3 rounded-xl border shadow-sm"
                                                style={{ backgroundColor: cardBg, borderColor: cardBorder, boxShadow: cardShadow }}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-medium" style={{ color: textStrong }}>飢餓度</span>
                                                    <span className="text-sm font-bold" style={{ 
                                                        color: hunger > 80 ? theme.error : hunger > 50 ? '#D97706' : theme.success 
                                                    }}>
                                                        {hunger}%
                                                    </span>
                                                </div>
                                                <div 
                                                    className="h-2 rounded-full overflow-hidden"
                                                    style={{ backgroundColor: trackBg }}
                                                >
                                                    <div
                                                        className="h-full transition-all duration-500"
                                                        style={{ 
                                                            width: `${hunger}%`,
                                                            backgroundColor: hunger > 80 ? theme.error : hunger > 50 ? '#D97706' : theme.success
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-xs font-medium" style={{ color: textStrong }}>
                                                    {hunger > 80 ? "我好餓！" : hunger > 50 ? "我可以吃點東西..." : "我吃飽了！"}
                                                </p>

                                                {/* Status Effects */}
                                                {hunger < 30 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="p-2 rounded-lg mt-1.5 border"
                                                        style={{
                                                            backgroundColor: 'rgba(82, 133, 85, 0.1)',
                                                            borderColor: 'rgba(82, 133, 85, 0.3)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.success }} />
                                                            <span className="text-xs font-semibold" style={{ color: theme.success }}>
                                                                飽足狀態：對戰 XP +10%，金幣 +10%
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {hunger > 80 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="p-2 rounded-lg mt-1.5 border animate-pulse"
                                                        style={{
                                                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                                            borderColor: 'rgba(220, 38, 38, 0.3)',
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-1.5">
                                                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: theme.error }} />
                                                            <span className="text-xs font-semibold" style={{ color: theme.error }}>
                                                                飢餓狀態：無法使用戰鬥技能
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Food Bowls Display & How to Get */}
                                            <div className="space-y-2.5">
                                                {/* Food Bowls Count */}
                                                <div 
                                                    className="p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5"
                                                    style={{
                                                        backgroundColor: cardBg,
                                                        borderColor: cardBorder,
                                                        boxShadow: cardShadow,
                                                    }}
                                                >
                                                    <div 
                                                        className="h-8 w-8 rounded-full border flex items-center justify-center"
                                                        style={{
                                                            backgroundColor: 'rgba(254, 209, 104, 0.15)',
                                                            borderColor: 'rgba(254, 209, 104, 0.3)',
                                                        }}
                                                    >
                                                        <Utensils className="w-4 h-4" style={{ color: '#FED168' }} />
                                                    </div>
                                                    <div className="text-xs font-semibold" style={{ color: textStrong }}>飼料</div>
                                                    <div className="text-xl font-bold" style={{ color: textStrong }}>{foodBowlsCount}</div>
                                                </div>

                                                {/* How to Get Food Bowls */}
                                                <div 
                                                    className="border p-3 rounded-xl"
                                                    style={{
                                                        backgroundColor: cardBg,
                                                        borderColor: cardBorder,
                                                        boxShadow: cardShadow,
                                                    }}
                                                >
                                                    <h4 className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: textStrong }}>
                                                        <Gift className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#FED168' }} />
                                                        如何獲得飼料？
                                                    </h4>
                                                    <ul className="space-y-1 text-xs leading-relaxed" style={{ color: textStrong }}>
                                                        <li className="flex items-start gap-1.5">
                                                            <span className="flex-shrink-0 mt-0.5 font-bold" style={{ color: theme.success }}>✓</span>
                                                            <span>完成對戰：<span className="font-bold" style={{ color: textStrong }}>勝利 +3 份</span>，<span className="font-medium">失敗 +1 份</span></span>
                                                        </li>
                                                        <li className="flex items-start gap-1.5">
                                                            <span className="flex-shrink-0 mt-0.5 font-bold" style={{ color: theme.success }}>✓</span>
                                                            <span>完成每日任務：<span className="font-bold" style={{ color: textStrong }}>+5 份</span></span>
                                                        </li>
                                                        <li className="flex items-start gap-1.5">
                                                            <span className="flex-shrink-0 mt-0.5 font-bold" style={{ color: theme.success }}>✓</span>
                                                            <span>複習錯題（每 5 題）：<span className="font-bold" style={{ color: textStrong }}>+1 份</span></span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                {/* Feed Button */}
                                                <div 
                                                    className="p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5"
                                                    style={{
                                                        backgroundColor: cardBg,
                                                        borderColor: cardBorder,
                                                        boxShadow: cardShadow,
                                                    }}
                                                >
                                                    <div 
                                                        className="h-8 w-8 rounded-full border flex items-center justify-center"
                                                        style={{
                                                            backgroundColor: 'rgba(82, 133, 85, 0.15)',
                                                            borderColor: 'rgba(82, 133, 85, 0.3)',
                                                        }}
                                                    >
                                                        <Heart className="w-4 h-4" style={{ color: theme.success }} />
                                                    </div>
                                                    <div className="text-xs font-semibold" style={{ color: textStrong }}>餵食小雞</div>
                                                    <div className="text-xs text-center font-medium" style={{ color: textStrong }}>
                                                        <span className="font-bold">-20</span> 飢餓度 · <span className="font-bold">+5</span> 親密度
                                                    </div>
                                                    <Button
                                                        className="w-full mt-1 text-white text-sm py-2"
                                                        onClick={handleFeed}
                                                        disabled={foodBowlsCount < 1 || hunger === 0 || isProcessing}
                                                        style={{
                                                            backgroundColor: theme.accent,
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!e.currentTarget.disabled) {
                                                                e.currentTarget.style.backgroundColor = theme.accentHover
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = theme.accent
                                                        }}
                                                    >
                                                        餵食
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="explore"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-3"
                                        >
                                            {isExploring ? (
                                                <div className="text-center py-4 space-y-3">
                                                    <motion.div
                                                        animate={{ x: [0, 10, 0, -10, 0] }}
                                                        transition={{ repeat: Infinity, duration: 2 }}
                                                        className="flex items-center justify-center"
                                                    >
                                                        <Map className="w-8 h-8" style={{ color: '#FED168' }} />
                                                    </motion.div>
                                                    <div>
                                                        <h3 className="text-base font-bold" style={{ color: textStrong }}>探索中...</h3>
                                                        <p className="text-xs mt-1 font-medium" style={{ color: textStrong }}>
                                                            開始時間：<span className="font-semibold">{new Date(explorationStartAt!).toLocaleTimeString()}</span>
                                                        </p>
                                                        <p className="text-xs mt-1 font-medium" style={{ color: textStrong }}>
                                                            零用錢：<span className="font-bold">{explorationAllowance}</span> 金幣
                                                        </p>
                                                    </div>
                                                    <Button
                                                        className="w-full text-white text-sm py-2"
                                                        onClick={handleClaimExploration}
                                                        disabled={isProcessing}
                                                        style={{
                                                            backgroundColor: theme.accent,
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!e.currentTarget.disabled) {
                                                                e.currentTarget.style.backgroundColor = theme.accentHover
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = theme.accent
                                                        }}
                                                    >
                                                        召回並領取獎勵
                                                    </Button>
                                                </div>
                                            ) : (
                                                    <div className="space-y-3">
                                                <div 
                                                    className="border p-3 rounded-xl text-xs leading-relaxed"
                                                    style={{
                                                        backgroundColor: cardBg,
                                                        borderColor: cardBorder,
                                                        color: textStrong,
                                                        boxShadow: cardShadow,
                                                    }}
                                                >
                                                    讓你的小雞去圖書館或博物館探索吧！<span className="font-semibold">給零用錢可以帶回更好的獎勵。</span>
                                                </div>

                                                    <div className="space-y-2.5">
                                                <div className="flex justify-between items-center">
                                                            <span className="text-xs font-semibold" style={{ color: textStrong }}>零用錢</span>
                                                            <span className="font-bold flex items-center gap-1 text-sm" style={{ color: '#D97706' }}>
                                                                <Coins className="w-3.5 h-3.5" />
                                                                {allowance[0]}
                                                            </span>
                                                        </div>
                                                    <div className="py-2">
                                                        <ChickSlider
                                                            value={allowance}
                                                            onValueChange={setAllowance}
                                                            max={1000}
                                                                step={50}
                                                                min={0}
                                                            />
                                                        </div>
                                                        <div className="flex justify-between text-xs font-medium" style={{ color: textStrong }}>
                                                            <span>0</span>
                                                            <span>500（高機率）</span>
                                                            <span>1000</span>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        className="w-full text-white text-sm py-2"
                                                        onClick={handleStartExploration}
                                                        disabled={isProcessing}
                                                        style={{
                                                            backgroundColor: theme.accent,
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (!e.currentTarget.disabled) {
                                                                e.currentTarget.style.backgroundColor = theme.accentHover
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = theme.accent
                                                        }}
                                                    >
                                                        開始探索
                                                    </Button>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </TooltipProvider>
        </>
    )
}
