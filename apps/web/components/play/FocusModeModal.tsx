'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, Pause, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Image from 'next/image'
import { useChickStore } from '@/src/store/chickStore'

interface FocusModeModalProps {
    onClose: () => void
}

export function FocusModeModal({ onClose }: FocusModeModalProps) {
    const [timeLeft, setTimeLeft] = useState(25 * 60) // 25 minutes
    const [isActive, setIsActive] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [focusState, setFocusState] = useState<'idle' | 'running' | 'paused' | 'completed' | 'failed'>('idle')
    const [earnedXP, setEarnedXP] = useState(0)

    // Use a ref to track if we should fail on visibility change
    // We only want to fail if the timer is actively running (not paused, not idle)
    const isRunningRef = useRef(false)

    useEffect(() => {
        isRunningRef.current = focusState === 'running'
    }, [focusState])

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isActive && !isPaused && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prev) => prev - 1)
            }, 1000)
        } else if (timeLeft === 0 && isActive) {
            handleComplete()
        }

        return () => clearInterval(interval)
    }, [isActive, isPaused, timeLeft])

    // Visibility Change Logic (Strict Mode)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isRunningRef.current) {
                handleFail()
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])

    const handleStart = () => {
        setIsActive(true)
        setIsPaused(false)
        setFocusState('running')
    }

    const handlePause = () => {
        setIsPaused(true)
        setFocusState('paused')
    }

    const handleResume = () => {
        setIsPaused(false)
        setFocusState('running')
    }

    const handleReset = () => {
        setIsActive(false)
        setIsPaused(false)
        setTimeLeft(25 * 60)
        setFocusState('idle')
    }

    const handleComplete = async () => {
        setIsActive(false)
        setFocusState('completed')

        // Calculate elapsed time
        const initialDuration = 25 * 60 // 25 minutes in seconds
        const elapsedTime = initialDuration - timeLeft

        // Award XP via API
        try {
            const response = await fetch('/api/play/focus/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duration: elapsedTime,
                    questionsCompleted: 0, // Not applicable for timer-based focus mode
                    correctAnswers: 0,
                }),
            })

            if (response.ok) {
                const data = await response.json()
                const xpAwarded = data.data?.xpAwarded || 50
                setEarnedXP(xpAwarded)
                console.log('[FocusMode] XP awarded:', xpAwarded)
            } else {
                console.error('[FocusMode] Failed to award XP:', await response.text())
                setEarnedXP(50) // Fallback
            }
        } catch (error) {
            console.error('[FocusMode] Error awarding XP:', error)
            setEarnedXP(50) // Fallback
        }
    }

    const handleFail = () => {
        setIsActive(false)
        setFocusState('failed')
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative w-full max-w-md p-6"
            >
                <Card className="overflow-hidden border-white/10 bg-black/40 p-8 text-center backdrop-blur-xl shadow-2xl">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 text-white/50 hover:text-white"
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <div className="mb-8 flex justify-center">
                        <div className="relative h-48 w-48">
                            {/* Glow Effect */}
                            <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl animate-pulse" />

                            <Image
                                src={focusState === 'failed' ? '/chicks/statussick.png' : '/chicks/meditation.png'}
                                alt="Focus Chick"
                                fill
                                className="object-contain drop-shadow-[0_0_15px_rgba(100,200,255,0.5)]"
                            />
                        </div>
                    </div>

                    <h2 className="mb-2 text-2xl font-bold text-white">
                        {focusState === 'idle' && '準備修煉'}
                        {focusState === 'running' && '修煉中...'}
                        {focusState === 'paused' && '修煉暫停'}
                        {focusState === 'completed' && '修煉完成！'}
                        {focusState === 'failed' && '修煉失敗'}
                    </h2>

                    <div className="mb-8 text-6xl font-mono font-bold tracking-wider text-white">
                        {formatTime(timeLeft)}
                    </div>

                    {focusState === 'idle' && (
                        <div className="space-y-4">
                            <p className="text-sm text-white/60">
                                保持專注，切換視窗將導致修煉失敗。
                            </p>
                            <Button
                                size="lg"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-lg h-14 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                                onClick={handleStart}
                            >
                                <Play className="mr-2 h-5 w-5" /> 開始專注
                            </Button>
                        </div>
                    )}

                    {focusState === 'running' && (
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 text-white h-14 rounded-xl"
                                onClick={handlePause}
                            >
                                <Pause className="mr-2 h-5 w-5" /> 暫停
                            </Button>
                        </div>
                    )}

                    {focusState === 'paused' && (
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                size="lg"
                                className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 text-white h-14 rounded-xl"
                                onClick={handleReset}
                            >
                                <RotateCcw className="mr-2 h-5 w-5" /> 放棄
                            </Button>
                            <Button
                                size="lg"
                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-14 rounded-xl"
                                onClick={handleResume}
                            >
                                <Play className="mr-2 h-5 w-5" /> 繼續
                            </Button>
                        </div>
                    )}

                    {focusState === 'completed' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-green-400">
                                <CheckCircle2 className="h-6 w-6" />
                                <span className="font-bold">獲得 +{earnedXP} XP</span>
                            </div>
                            <Button
                                size="lg"
                                className="w-full bg-green-600 hover:bg-green-500 text-white h-14 rounded-xl"
                                onClick={onClose}
                            >
                                領取獎勵
                            </Button>
                        </div>
                    )}

                    {focusState === 'failed' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-red-400">
                                <AlertTriangle className="h-6 w-6" />
                                <span className="font-bold">專注被打斷了！</span>
                            </div>
                            <p className="text-sm text-white/60">
                                Chick 感到很失望... 下次請堅持到底。
                            </p>
                            <Button
                                variant="outline"
                                size="lg"
                                className="w-full border-white/20 bg-white/5 hover:bg-white/10 text-white h-14 rounded-xl"
                                onClick={handleReset}
                            >
                                <RotateCcw className="mr-2 h-5 w-5" /> 再試一次
                            </Button>
                        </div>
                    )}
                </Card>
            </motion.div>
        </div>
    )
}
