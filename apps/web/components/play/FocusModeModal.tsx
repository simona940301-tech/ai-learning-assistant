'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Play, Pause, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'

interface FocusModeModalProps {
    isOpen: boolean
    onClose: () => void
}

const QUICK_TIME_OPTIONS = [15, 25, 30, 45, 60] as const
const MIN_DURATION = 5 // 最小 5 分鐘
const MAX_DURATION = 120 // 最大 120 分鐘
const DEFAULT_DURATION = 25 // 預設 25 分鐘

export function FocusModeModal({ isOpen, onClose }: FocusModeModalProps) {
    const [selectedMinutes, setSelectedMinutes] = useState(DEFAULT_DURATION)
    const [customMinutes, setCustomMinutes] = useState('')
    const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION * 60)
    const [initialDuration, setInitialDuration] = useState(DEFAULT_DURATION * 60)
    const [isActive, setIsActive] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [focusState, setFocusState] = useState<'idle' | 'running' | 'paused' | 'completed' | 'failed'>('idle')
    const [earnedXP, setEarnedXP] = useState(0)
    const [timeError, setTimeError] = useState('')

    const isRunningRef = useRef(false)
    const gracePeriodTimeout = useRef<NodeJS.Timeout | null>(null)

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

    // Visibility Change Logic (Grace Period Mode)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isRunningRef.current) {
                console.log('[FocusMode] Window hidden detected, starting grace period')
                toast.warning('專注模式將在 5 秒後失敗', {
                    description: '請立即回到頁面！',
                    duration: 5000,
                    id: 'focus-warning'
                })

                if (gracePeriodTimeout.current) clearTimeout(gracePeriodTimeout.current)

                gracePeriodTimeout.current = setTimeout(() => {
                    if (document.hidden && isRunningRef.current) {
                        console.log('[FocusMode] Grace period expired, failing session')
                        handleFail()
                    }
                }, 5000)
            } else {
                // Back to visible
                console.log('[FocusMode] Window visible again')
                if (gracePeriodTimeout.current) {
                    clearTimeout(gracePeriodTimeout.current)
                    gracePeriodTimeout.current = null
                    toast.dismiss('focus-warning')
                    toast.success('已回到專注模式', { duration: 2000 })
                }
            }
        }

        const handleBlur = () => {
            // Treat blur same as hidden for strictness, but share the grace logic
            // Actually, usually visibilitychange covers tab switching. Blur covers clicking outside iframe?
            // Let's rely mainly on visibilitychange for tab switching, but blur might trigger on some interactions.
            // To be safe, we can use the same logic or just ignore blur if we want to be lenient.
            // The requirement is "Window switching detection".
            // document.hidden is reliable for tab switching.
            // If user just alt-tabs, document.hidden might not trigger on all OS/Browsers immediately?
            // Actually it usually does.
            // Let's keep `handleBlur` but route it through the same grace logic if we want strictness.
            // However, strictly adhering to the plan: "Modify FocusModeModal to prevent immediate failure".
            // If I remove handleBlur immediate fail, and rely on the same grace period logic, it matches.

            if (isRunningRef.current && !document.hidden) {
                // If blurred but still "visible" (e.g. clicked browser bar), maybe we don't fail immediately?
                // Or we do. Let's apply the same logic.
                // checking document.hidden inside blur might be tricky.

                // Implementation Plan said: "On visibilitychange (hidden)..."
                // I will map blur to the same warning if not already hidden.
                if (!gracePeriodTimeout.current) {
                    handleVisibilityChange() // Re-use logic (assuming document.hidden might be true or we treat blur as hide)
                }
            }
        }

        // Simplified: Just use the same handler logic but we need to know if it's "away" or "back".
        // Blur = Away, Focus = Back.

        const onAway = () => {
            if (!isRunningRef.current) return

            console.log('[FocusMode] User away (blur/hidden)')
            toast.warning('專注模式將在 5 秒後失敗', {
                description: '請立即回到頁面！',
                duration: 5000,
                id: 'focus-warning'
            })

            if (gracePeriodTimeout.current) clearTimeout(gracePeriodTimeout.current)

            gracePeriodTimeout.current = setTimeout(() => {
                if (isRunningRef.current) {
                    handleFail()
                }
            }, 5000)
        }

        const onBack = () => {
            if (!isRunningRef.current) return

            console.log('[FocusMode] User back (focus/visible)')
            if (gracePeriodTimeout.current) {
                clearTimeout(gracePeriodTimeout.current)
                gracePeriodTimeout.current = null
                toast.dismiss('focus-warning')
                // toast.success('已回到專注模式', { duration: 1500 }) // Optional
            }
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) onAway()
            else onBack()
        })
        window.addEventListener('blur', onAway)
        window.addEventListener('focus', onBack)

        return () => {
            document.removeEventListener('visibilitychange', () => { })
            window.removeEventListener('blur', onAway)
            window.removeEventListener('focus', onBack)
            if (gracePeriodTimeout.current) clearTimeout(gracePeriodTimeout.current)
        }
    }, [])

    const validateAndSetTime = useCallback((minutes: number) => {
        if (minutes < MIN_DURATION) {
            setTimeError(`時間至少需要 ${MIN_DURATION} 分鐘`)
            return false
        }
        if (minutes > MAX_DURATION) {
            setTimeError(`時間最多 ${MAX_DURATION} 分鐘`)
            return false
        }
        setTimeError('')
        setSelectedMinutes(minutes)
        setCustomMinutes('')
        setTimeLeft(minutes * 60)
        return true
    }, [])

    const handleQuickTimeSelect = (minutes: number) => {
        validateAndSetTime(minutes)
    }

    const handleCustomTimeChange = (value: string) => {
        setCustomMinutes(value)
        setTimeError('')

        if (value === '') {
            return
        }

        const numValue = parseInt(value, 10)
        if (isNaN(numValue)) {
            setTimeError('請輸入數字')
            return
        }

        validateAndSetTime(numValue)
    }

    const handleStart = () => {
        if (timeError) {
            return
        }
        const finalMinutes = customMinutes ? parseInt(customMinutes, 10) : selectedMinutes
        if (finalMinutes < MIN_DURATION || finalMinutes > MAX_DURATION) {
            setTimeError(`時間必須在 ${MIN_DURATION}-${MAX_DURATION} 分鐘之間`)
            return
        }

        const finalSeconds = finalMinutes * 60
        setInitialDuration(finalSeconds)
        setTimeLeft(finalSeconds)
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
        setSelectedMinutes(DEFAULT_DURATION)
        setCustomMinutes('')
        setTimeLeft(DEFAULT_DURATION * 60)
        setInitialDuration(DEFAULT_DURATION * 60)
        setFocusState('idle')
        setTimeError('')
    }

    const handleComplete = async () => {
        setIsActive(false)
        setFocusState('completed')

        const elapsedTime = initialDuration - timeLeft

        try {
            const response = await fetch('/api/play/focus/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    duration: elapsedTime,
                    questionsCompleted: 0,
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
                setEarnedXP(50)
            }
        } catch (error) {
            console.error('[FocusMode] Error awarding XP:', error)
            setEarnedXP(50)
        }
    }

    const handleFail = () => {
        console.log('[FocusMode] Focus session failed - user switched windows')
        setIsActive(false)
        setIsPaused(false)
        setFocusState('failed')
        // 停止計時器
        setTimeLeft((prev) => prev)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const currentMinutes = customMinutes ? parseInt(customMinutes, 10) : selectedMinutes
    const isValidTime = !timeError && currentMinutes >= MIN_DURATION && currentMinutes <= MAX_DURATION

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#F9F5EF]/96 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="relative w-full max-w-md px-8"
            >
                <div className="bg-[#F9F5EF] text-center">
                    {/* 關閉按鈕 */}
                    <button
                        onClick={onClose}
                        className="absolute right-0 top-0 text-[#8C847C] hover:text-[#5A5248] transition-colors"
                        aria-label="關閉"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {/* 小雞插圖 - 根據狀態調整顯示 */}
                    <div className="mb-8 flex justify-center">
                        <div className={`relative h-24 w-24 ${focusState === 'failed'
                                ? 'opacity-100'
                                : focusState === 'running' || focusState === 'paused'
                                    ? 'opacity-70'
                                    : 'opacity-60'
                            }`}>
                            <Image
                                src={focusState === 'failed' ? '/chicks/statussick.png' : '/chicks/meditation.png'}
                                alt={focusState === 'failed' ? '生病小雞' : '專注小雞'}
                                fill
                                className={`object-contain ${focusState === 'failed'
                                        ? ''
                                        : 'grayscale-[20%]'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* 標題 - 根據狀態顯示 */}
                    {focusState === 'idle' && (
                        <h2 className="mb-12 text-base font-normal text-[#8C847C]">
                            準備修煉
                        </h2>
                    )}
                    {focusState === 'running' && (
                        <h2 className="mb-12 text-base font-normal text-[#8C847C]">
                            修煉中...
                        </h2>
                    )}
                    {focusState === 'paused' && (
                        <h2 className="mb-12 text-base font-normal text-[#8C847C]">
                            修煉暫停
                        </h2>
                    )}
                    {focusState === 'failed' && (
                        <h2 className="mb-12 text-base font-normal text-[#DC2626]">
                            修煉失敗
                        </h2>
                    )}
                    {focusState === 'completed' && (
                        <h2 className="mb-12 text-base font-normal text-[#4A3728]">
                            修煉完成！
                        </h2>
                    )}

                    {/* 計時器 - 畫面最大元素，周圍大量留白 */}
                    <div className="mb-20 text-7xl font-mono font-bold tracking-tight text-[#4A3728]">
                        {formatTime(timeLeft)}
                    </div>

                    {/* Idle 狀態：時間選擇 */}
                    {focusState === 'idle' && (
                        <div className="space-y-8">
                            {/* 快速選項 - 單列水平，統一按鈕樣式 */}
                            <div className="flex gap-3 justify-center">
                                {QUICK_TIME_OPTIONS.map((minutes) => {
                                    const isSelected = selectedMinutes === minutes && !customMinutes
                                    return (
                                        <button
                                            key={minutes}
                                            onClick={() => handleQuickTimeSelect(minutes)}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isSelected
                                                    ? 'bg-[#4A3728] text-white'
                                                    : 'border border-[#C8C2BB] bg-transparent text-[#5A5248] hover:border-[#8C847C]'
                                                }`}
                                        >
                                            {minutes}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* 自訂輸入 - 下劃線式 */}
                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="number"
                                    min={MIN_DURATION}
                                    max={MAX_DURATION}
                                    placeholder="輸入分鐘數"
                                    value={customMinutes}
                                    onChange={(e) => handleCustomTimeChange(e.target.value)}
                                    className="w-32 border-0 border-b border-[#C8C2BB] bg-transparent text-center text-sm text-[#5A5248] placeholder:text-[#C8C2BB]/40 focus:border-[#8C847C] focus:outline-none"
                                />
                                <span className="text-sm text-[#C8C2BB]">分鐘</span>
                            </div>

                            {/* 錯誤提示 */}
                            {timeError && (
                                <p className="text-xs text-[#DC2626]">{timeError}</p>
                            )}

                            {/* 開始按鈕 - 縮小15-20%，圓角8-12px，統一主色 */}
                            <div className="pt-4">
                                <button
                                    onClick={handleStart}
                                    disabled={!isValidTime}
                                    className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${isValidTime
                                            ? 'bg-[#4A3728] text-white hover:bg-[#5A5248]'
                                            : 'bg-[#C8C2BB] text-[#8C847C] cursor-not-allowed'
                                        }`}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <Play className="h-3.5 w-3.5" /> 開始專注
                                    </span>
                                </button>
                            </div>

                            {/* 提示文字 - 最底部，小字淡灰 */}
                            <p className="pt-8 text-xs text-[#C8C2BB]">
                                保持專注，切換視窗將導致修煉失敗
                            </p>
                        </div>
                    )}

                    {/* Running 狀態 */}
                    {focusState === 'running' && (
                        <div className="pt-8">
                            <button
                                onClick={handlePause}
                                className="w-full rounded-lg border border-[#C8C2BB] bg-transparent py-2.5 text-sm font-medium text-[#5A5248] transition-colors hover:border-[#8C847C]"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Pause className="h-3.5 w-3.5" /> 暫停
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Paused 狀態 */}
                    {focusState === 'paused' && (
                        <div className="flex gap-3 pt-8">
                            <button
                                onClick={handleReset}
                                className="flex-1 rounded-lg border border-[#C8C2BB] bg-transparent py-2.5 text-sm font-medium text-[#5A5248] transition-colors hover:border-[#8C847C]"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <RotateCcw className="h-3.5 w-3.5" /> 放棄
                                </span>
                            </button>
                            <button
                                onClick={handleResume}
                                className="flex-1 rounded-lg bg-[#4A3728] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5A5248]"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <Play className="h-3.5 w-3.5" /> 繼續
                                </span>
                            </button>
                        </div>
                    )}

                    {/* Completed 狀態 */}
                    {focusState === 'completed' && (
                        <div className="space-y-6 pt-8">
                            <div className="flex items-center justify-center gap-2 text-sm text-[#4A3728]">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="font-medium">獲得 +{earnedXP} XP</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full rounded-lg bg-[#4A3728] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5A5248]"
                            >
                                領取獎勵
                            </button>
                        </div>
                    )}

                    {/* Failed 狀態 */}
                    {focusState === 'failed' && (
                        <div className="space-y-6 pt-8">
                            <div className="flex items-center justify-center gap-2 text-sm text-[#DC2626]">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="font-medium">專注被打斷了</span>
                            </div>
                            <p className="text-xs text-[#8C847C]">
                                小雞感到很失望... 下次請堅持到底
                            </p>
                            <button
                                onClick={handleReset}
                                className="w-full rounded-lg border border-[#C8C2BB] bg-transparent py-2.5 text-sm font-medium text-[#5A5248] transition-colors hover:border-[#8C847C]"
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <RotateCcw className="h-3.5 w-3.5" /> 再試一次
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
