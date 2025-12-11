'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Sparkles, TrendingUp, Award } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import confetti from 'canvas-confetti'

interface EditorCelebrationProps {
    score: number
    total: number
    xpGained?: number
    coinsGained?: number
    leveledUp?: boolean
    newLevel?: number
    onClose: () => void
}

/**
 * EditorCelebration - Multi-stage celebration animation for Editor Mode
 * 
 * Celebration Stages:
 * 1. Correct answers pulse (0.5s)
 * 2. Score counting animation (1s)
 * 3. Confetti + rewards display (2s)
 * 4. Level up explosion (if applicable)
 * 
 * Design Philosophy:
 * - Celebrate achievements without being overwhelming
 * - Smooth, premium animations using framer-motion
 * - Confetti for perfect scores (100%)
 * 
 * @example
 * <EditorCelebration score={8} total={10} xpGained={120} coinsGained={50} onClose={() => {}} />
 */
export function EditorCelebration({
    score,
    total,
    xpGained = 0,
    coinsGained = 0,
    leveledUp = false,
    newLevel,
    onClose,
}: EditorCelebrationProps) {
    const [stage, setStage] = useState<'score' | 'rewards' | 'levelup'>('score')
    const [displayScore, setDisplayScore] = useState(0)
    const confettiTriggered = useRef(false)

    const percentage = Math.round((score / total) * 100)
    const isPerfect = percentage === 100
    const isGood = percentage >= 80

    // Stage 1: Score counting animation
    useEffect(() => {
        const duration = 1000 // 1 second
        const steps = 30
        const increment = score / steps
        const stepDuration = duration / steps

        let currentStep = 0
        const interval = setInterval(() => {
            currentStep++
            setDisplayScore(Math.min(Math.round(currentStep * increment), score))

            if (currentStep >= steps) {
                clearInterval(interval)
                // Move to rewards stage after score animation
                setTimeout(() => setStage('rewards'), 300)
            }
        }, stepDuration)

        return () => clearInterval(interval)
    }, [score])

    // Stage 2: Confetti for perfect/good scores
    useEffect(() => {
        if (stage === 'rewards' && !confettiTriggered.current) {
            confettiTriggered.current = true

            if (isPerfect) {
                // Perfect score: Gold confetti explosion
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#FFD700', '#FFA500', '#FF8C00'],
                })
            } else if (isGood) {
                // Good score: Moderate confetti
                confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#4CAF50', '#8BC34A', '#CDDC39'],
                })
            }

            // Check for level up
            if (leveledUp) {
                setTimeout(() => setStage('levelup'), 1500)
            }
        }
    }, [stage, isPerfect, isGood, leveledUp])

    // Stage 3: Level up explosion
    useEffect(() => {
        if (stage === 'levelup') {
            // Massive confetti explosion for level up
            const duration = 3000
            const end = Date.now() + duration

            const frame = () => {
                confetti({
                    particleCount: 3,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
                })
                confetti({
                    particleCount: 3,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'],
                })

                if (Date.now() < end) {
                    requestAnimationFrame(frame)
                }
            }

            frame()
        }
    }, [stage])

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.8, y: 50 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.8, y: 50 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="relative mx-4 max-w-md w-full rounded-3xl border-2 border-border bg-gradient-to-br from-card via-card to-card/80 p-8 shadow-2xl"
                >
                    {/* Stage 1 & 2: Score Display */}
                    {(stage === 'score' || stage === 'rewards') && (
                        <>
                            {/* Trophy Icon */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.2 }}
                                className={cn(
                                    'mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full',
                                    isPerfect && 'bg-gradient-to-br from-yellow-400 to-yellow-600',
                                    isGood && !isPerfect && 'bg-gradient-to-br from-green-400 to-green-600',
                                    !isGood && 'bg-gradient-to-br from-blue-400 to-blue-600'
                                )}
                            >
                                <Trophy className="h-12 w-12 text-white" />
                            </motion.div>

                            {/* Title */}
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mb-2 text-center text-3xl font-bold"
                            >
                                {isPerfect && '完美!'}
                                {isGood && !isPerfect && '做得好!'}
                                {!isGood && '繼續加油!'}
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="mb-6 text-center text-muted-foreground"
                            >
                                你的編輯準確率為 {percentage}%
                            </motion.p>

                            {/* Score Display */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="mb-6 rounded-2xl bg-muted/50 p-6 text-center"
                            >
                                <div className="text-6xl font-black text-primary">
                                    {displayScore}
                                    <span className="text-2xl text-muted-foreground font-medium"> / {total}</span>
                                </div>
                            </motion.div>

                            {/* Rewards (Stage 2) */}
                            {stage === 'rewards' && (xpGained > 0 || coinsGained > 0) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="space-y-3 mb-6"
                                >
                                    {xpGained > 0 && (
                                        <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-4">
                                            <div className="flex items-center gap-3">
                                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                                                <span className="font-medium text-emerald-900 dark:text-emerald-100">XP 獲得</span>
                                            </div>
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', delay: 0.3 }}
                                                className="text-2xl font-bold text-emerald-600"
                                            >
                                                +{xpGained}
                                            </motion.span>
                                        </div>
                                    )}

                                    {coinsGained > 0 && (
                                        <div className="flex items-center justify-between rounded-xl bg-yellow-50 dark:bg-yellow-950/30 p-4">
                                            <div className="flex items-center gap-3">
                                                <Sparkles className="h-5 w-5 text-yellow-600" />
                                                <span className="font-medium text-yellow-900 dark:text-yellow-100">金幣獲得</span>
                                            </div>
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', delay: 0.4 }}
                                                className="text-2xl font-bold text-yellow-600"
                                            >
                                                +{coinsGained}
                                            </motion.span>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Close Button */}
                            {stage === 'rewards' && !leveledUp && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                >
                                    <Button onClick={onClose} size="lg" className="w-full">
                                        完成
                                    </Button>
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* Stage 3: Level Up */}
                    {stage === 'levelup' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center"
                        >
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 10, -10, 0],
                                }}
                                transition={{
                                    duration: 0.6,
                                    repeat: Infinity,
                                    repeatDelay: 1,
                                }}
                                className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 via-pink-500 to-red-500"
                            >
                                <Award className="h-16 w-16 text-white" />
                            </motion.div>

                            <h2 className="mb-4 text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                                升級!
                            </h2>

                            <p className="mb-6 text-xl text-muted-foreground">
                                恭喜達到 Level {newLevel}
                            </p>

                            <Button onClick={onClose} size="lg" className="w-full">
                                太棒了!
                            </Button>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
