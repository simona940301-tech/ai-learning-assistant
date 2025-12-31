'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Clock, Gift, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

interface TodayTaskCardProps {
    onStartTask: () => void
    onDismiss: () => void
}

/**
 * Prominent card for first-time users on /play page
 * Shows after completing onboarding to bridge to daily engagement
 * 
 * Visibility Logic:
 * - Show if: onboarding_completed = true AND today's task not completed AND first visit to /play
 * - Hide after: User clicks either CTA
 * - Store preference in localStorage
 */
export function TodayTaskCard({ onStartTask, onDismiss }: TodayTaskCardProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Check if user has dismissed this card before
        const dismissed = localStorage.getItem('todayTaskCard_dismissed')
        const dismissedDate = dismissed ? new Date(dismissed) : null
        const today = new Date().toDateString()

        // Show card if not dismissed today
        if (!dismissedDate || dismissedDate.toDateString() !== today) {
            setIsVisible(true)
        }
    }, [])

    const handleDismiss = () => {
        // Store dismissal with today's date
        localStorage.setItem('todayTaskCard_dismissed', new Date().toISOString())
        setIsVisible(false)
        onDismiss()
    }

    const handleStartTask = () => {
        localStorage.setItem('todayTaskCard_dismissed', new Date().toISOString())
        setIsVisible(false)
        onStartTask()
    }

    if (!isVisible) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="mb-6"
        >
            <div className="relative overflow-hidden rounded-[24px] border border-primary/20 bg-gradient-to-br from-primary to-primaryWarm dark:from-primary/30 dark:to-primaryWarm/30 p-6 md:p-8 shadow-lg">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primaryWarm blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-primary blur-3xl" />
                </div>

                {/* Content */}
                <div className="relative">
                    {/* Badge */}
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 dark:bg-primary/20 px-3 py-1 text-xs font-semibold text-primary dark:text-primaryWarm">
                        <Sparkles className="h-3 w-3" />
                        <span>新手專屬</span>
                    </div>

                    {/* Title */}
                    <h3 className="mb-2 text-2xl font-bold text-foreground">
                        今天的起步任務
                    </h3>

                    {/* Description */}
                    <p className="mb-6 text-foreground/80">
                        根據你的訓練戰結果，我們為你準備了 4 題專屬任務
                    </p>

                    {/* Stats */}
                    <div className="mb-6 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                            <Clock className="h-4 w-4 text-primaryWarm dark:text-primary" />
                            <span>預計 5 分鐘</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-foreground/80">
                            <Gift className="h-4 w-4 text-primaryWarm dark:text-primary" />
                            <span>+50 XP + <img src="/icon/gift.png" alt="隨機獎勵" className="w-4 h-4 inline object-contain" /> 隨機獎勵</span>
                        </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                            onClick={handleStartTask}
                            className="flex-1 h-12 bg-primaryWarm hover:bg-primary text-foreground font-semibold rounded-xl shadow-md transition-all"
                        >
                            先完成今日任務
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            variant="ghost"
                            className="flex-1 h-12 text-foreground/80 hover:bg-card/50 dark:hover:bg-card/20 rounded-xl transition-all"
                        >
                            我想先逛逛
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}

/**
 * Hook to check if user should see the Today's Task Card
 */
export function useShouldShowTodayTaskCard(
    onboardingCompleted: boolean,
    todayTaskCompleted: boolean
): boolean {
    const [shouldShow, setShouldShow] = useState(false)

    useEffect(() => {
        if (!onboardingCompleted) {
            setShouldShow(false)
            return
        }

        if (todayTaskCompleted) {
            setShouldShow(false)
            return
        }

        // Check localStorage
        const dismissed = localStorage.getItem('todayTaskCard_dismissed')
        const dismissedDate = dismissed ? new Date(dismissed) : null
        const today = new Date().toDateString()

        if (!dismissedDate || dismissedDate.toDateString() !== today) {
            setShouldShow(true)
        } else {
            setShouldShow(false)
        }
    }, [onboardingCompleted, todayTaskCompleted])

    return shouldShow
}
