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
import { Slider } from '@/components/ui/slider'
import { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useChickStore } from '@/src/store/chickStore'
import { Utensils, Map, Coins, Gift, Heart, Battery, Brain, Sparkles, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ChickInteractionModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChickInteractionModal({ isOpen, onClose }: ChickInteractionModalProps) {
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
        <TooltipProvider delayDuration={200}>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md bg-[#1a1d21] text-white border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-300" />
                                小雞照護
                            </span>
                            <div className="flex items-center gap-2 ml-auto">
                                <TooltipRoot>
                                    <TooltipTrigger asChild>
                                        <button className="flex items-center gap-1 text-xs font-normal bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 hover:bg-purple-500/30 transition-colors cursor-pointer">
                                            <Brain className="w-3 h-3 text-purple-400" />
                                            <span>階段 {evolutionStage}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[200px]">
                                        <p className="text-xs">
                                            進化階段：目前為第 {evolutionStage} 階段
                                            {evolutionStage === 0 && '（初始階段）'}
                                            {evolutionStage > 0 && '（已進化）'}
                                        </p>
                                    </TooltipContent>
                                </TooltipRoot>
                                <TooltipRoot>
                                    <TooltipTrigger asChild>
                                        <button className="flex items-center gap-1 text-xs font-normal bg-white/10 px-2 py-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer">
                                            <Heart className="w-3 h-3 text-pink-400 fill-pink-400" />
                                            <span>等級 {currentLevel}</span>
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-[200px]">
                                        <p className="text-xs">
                                            親密度等級：目前為第 {currentLevel} 級
                                            <br />
                                            <span className="text-slate-400">親密度：{intimacy}/{(currentLevel) * 100}</span>
                                        </p>
                                    </TooltipContent>
                                </TooltipRoot>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            照顧你的學習夥伴。{evolutionVariant !== 'default' && `（${evolutionVariant.charAt(0).toUpperCase() + evolutionVariant.slice(1)} 變體）`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Result Animation Overlay */}
                    <AnimatePresence>
                        {resultAnimation === 'feed' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg"
                            >
                                <div className="relative">
                                    <motion.div
                                        initial={{ scale: 0.6, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", bounce: 0.4 }}
                                        className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl"
                                    >
                                        <Utensils className="w-10 h-10 text-white" />
                                    </motion.div>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [0, 1.1, 1] }}
                                        transition={{ delay: 0.2 }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-white/20" />
                                    </motion.div>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-4 text-center font-bold text-yellow-400 text-xl"
                                    >
                                        已餵食
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {claimResult ? (
                        <div className="py-8 text-center space-y-4">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="text-4xl"
                            >
                                <img src="/icon/gift.png" alt="獎勵" className="w-12 h-12 object-contain" />
                            </motion.div>
                            <h3 className="text-xl font-bold text-yellow-400">歡迎回來！</h3>
                            <p className="text-slate-300">
                                你的小雞帶回了 <span className="text-white font-bold">{claimResult.xpGained} 經驗值</span>！
                            </p>
                            {claimResult.gifts.length > 0 && (
                                <div className="flex justify-center gap-2 mt-2">
                                    {claimResult.gifts.map((gift, i) => (
                                        <span key={i} className="bg-white/10 px-2 py-1 rounded text-xs text-yellow-200 border border-yellow-500/30">
                                            {gift}
                                        </span>
                                    ))}
                                </div>
                            )}
                            <Button onClick={() => { setClaimResult(null); onClose(); }} className="w-full mt-4">
                                太棒了！
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Tabs */}
                            <div className="flex p-1 bg-black/20 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('feed')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'feed' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <Utensils className="w-4 h-4" />
                                    餵食
                                </button>
                                <button
                                    onClick={() => setActiveTab('explore')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 ${activeTab === 'explore' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    <Map className="w-4 h-4" />
                                    探索
                                </button>
                            </div>

                            {/* Content */}
                            <div className="min-h-[200px]">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'feed' ? (
                                        <motion.div
                                            key="feed"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-6"
                                        >
                                            {/* Hunger Bar */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">飢餓度</span>
                                                    <span className={`${hunger > 80 ? 'text-red-400' : 'text-green-400'}`}>
                                                        {hunger}%
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${hunger > 80 ? 'bg-red-500' : hunger > 50 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${hunger}%` }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    {hunger > 80 ? "我好餓！" : hunger > 50 ? "我可以吃點東西..." : "我吃飽了！"}
                                                </p>

                                                {/* Status Effects */}
                                                {hunger < 30 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg mt-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Sparkles className="w-4 h-4 text-green-400" />
                                                            <span className="text-sm text-green-300 font-medium">
                                                                飽足狀態：對戰 XP +10%，金幣 +10%
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {hunger > 80 && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg mt-2 animate-pulse"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                                            <span className="text-sm text-red-300 font-medium">
                                                                飢餓狀態：無法使用戰鬥技能
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Food Bowls Display & How to Get */}
                                            <div className="space-y-4">
                                                {/* Food Bowls Count */}
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2">
                                                    <div className="h-10 w-10 rounded-full bg-amber-200/20 border border-amber-300/40 flex items-center justify-center">
                                                        <Utensils className="w-5 h-5 text-amber-300" />
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-300">飼料</div>
                                                    <div className="text-2xl font-bold">{foodBowlsCount}</div>
                                                </div>

                                                {/* How to Get Food Bowls */}
                                                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-4 rounded-xl">
                                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                                        <Gift className="w-4 h-4 text-blue-400" />
                                                        如何獲得飼料？
                                                    </h4>
                                                    <ul className="space-y-1.5 text-xs text-slate-300">
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-green-400">✓</span>
                                                            <span>完成對戰：<span className="text-white font-medium">勝利 +3 份飼料</span>，失敗 +1 份飼料</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-green-400">✓</span>
                                                            <span>完成每日任務：<span className="text-white font-medium">+5 份飼料</span></span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-green-400">✓</span>
                                                            <span>複習錯題（每 5 題）：<span className="text-white font-medium">+1 份飼料</span></span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                {/* Feed Button */}
                                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center gap-2">
                                                    <div className="h-10 w-10 rounded-full bg-green-200/20 border border-green-300/40 flex items-center justify-center">
                                                        <Heart className="w-5 h-5 text-green-300" />
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-300">餵食小雞</div>
                                                    <div className="text-xs text-slate-500 text-center">
                                                        -20 飢餓度<br />+5 親密度
                                                    </div>
                                                    <Button
                                                        className="w-full mt-auto bg-green-600 hover:bg-green-700 text-white"
                                                        onClick={handleFeed}
                                                        disabled={foodBowlsCount < 1 || hunger === 0 || isProcessing}
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
                                            className="space-y-6"
                                        >
                                            {isExploring ? (
                                                <div className="text-center py-8 space-y-4">
                                                    <motion.div
                                                        animate={{ x: [0, 10, 0, -10, 0] }}
                                                        transition={{ repeat: Infinity, duration: 2 }}
                                                        className="flex items-center justify-center"
                                                    >
                                                        <Map className="w-10 h-10 text-blue-300" />
                                                    </motion.div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white">探索中...</h3>
                                                        <p className="text-sm text-slate-400">
                                                            開始時間：{new Date(explorationStartAt!).toLocaleTimeString()}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            零用錢：{explorationAllowance} 金幣
                                                        </p>
                                                    </div>
                                                    <Button
                                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                                        onClick={handleClaimExploration}
                                                        disabled={isProcessing}
                                                    >
                                                        召回並領取獎勵
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-sm text-blue-200">
                                                        讓你的小雞去圖書館或博物館探索吧！給他們零用錢可以帶回更好的獎勵。
                                                    </div>

                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm font-medium text-slate-300">零用錢</span>
                                                            <span className="text-yellow-400 font-bold flex items-center gap-1">
                                                                <Coins className="w-4 h-4" />
                                                                {allowance[0]}
                                                            </span>
                                                        </div>
                                                        <Slider
                                                            value={allowance}
                                                            onValueChange={setAllowance}
                                                            max={1000}
                                                            step={50}
                                                            min={0}
                                                            className="py-4"
                                                        />
                                                        <div className="flex justify-between text-xs text-slate-500">
                                                            <span>0</span>
                                                            <span>500（高機率）</span>
                                                            <span>1000</span>
                                                        </div>
                                                    </div>

                                                    <Button
                                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                                        onClick={handleStartExploration}
                                                        disabled={isProcessing}
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
    )
}
