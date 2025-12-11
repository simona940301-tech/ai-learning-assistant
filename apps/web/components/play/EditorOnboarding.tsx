'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EditorOnboardingProps {
    onComplete: () => void
    onSkip: () => void
}

/**
 * EditorOnboarding - Progressive disclosure onboarding for Editor Mode
 * 
 * Features:
 * - Step-by-step guidance with spotlight effect
 * - localStorage persistence (shown only once)
 * - Skip option for returning users
 * - Accessible keyboard navigation
 * 
 * Design Philosophy:
 * - Progressive disclosure: Show only what's needed at each step
 * - Non-intrusive: Semi-transparent overlay, easy to dismiss
 * - Mobile-first: Works on all screen sizes
 */
export function EditorOnboarding({ onComplete, onSkip }: EditorOnboardingProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    const steps = [
        {
            title: '歡迎來到實習編輯部!',
            description: '你的任務是從右側選擇正確的單字,拖放到文章中的空格處。',
            targetSelector: null, // No specific target, just intro
        },
        {
            title: '選擇單字',
            description: '點擊或拖動右側的單字選項。',
            targetSelector: '[data-chip-pool]',
        },
        {
            title: '填入空格',
            description: '將單字拖放到文章中標記的空格處。',
            targetSelector: '[data-dropzone]',
        },
        {
            title: '提交答案',
            description: '完成所有空格後,點擊提交按鈕查看結果。',
            targetSelector: '[data-submit-button]',
        },
    ]

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleComplete()
        }
    }

    const handleComplete = () => {
        setIsVisible(false)
        // Mark as completed in localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('editor-onboarding-completed', 'true')
        }
        onComplete()
    }

    const handleSkipNow = () => {
        setIsVisible(false)
        if (typeof window !== 'undefined') {
            localStorage.setItem('editor-onboarding-completed', 'true')
        }
        onSkip()
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isVisible) return

            if (e.key === 'Escape') {
                handleSkipNow()
            } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
                handleNext()
            } else if (e.key === 'ArrowLeft' && currentStep > 0) {
                setCurrentStep(currentStep - 1)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isVisible, currentStep])

    if (!isVisible) return null

    const currentStepData = steps[currentStep]

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
                onClick={handleSkipNow}
            >
                {/* Onboarding Card */}
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative mx-4 max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 rounded-full"
                        onClick={handleSkipNow}
                    >
                        <X className="h-4 w-4" />
                    </Button>

                    {/* Step Indicator */}
                    <div className="mb-4 flex gap-1.5">
                        {steps.map((_, index) => (
                            <div
                                key={index}
                                className={cn(
                                    'h-1.5 flex-1 rounded-full transition-colors',
                                    index <= currentStep ? 'bg-primary' : 'bg-muted'
                                )}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-foreground">
                                {currentStepData.title}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {currentStepData.description}
                            </p>
                        </div>

                        {/* Navigation */}
                        <div className="flex items-center justify-between pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleSkipNow}
                                className="text-muted-foreground"
                            >
                                跳過教學
                            </Button>

                            <Button onClick={handleNext} size="sm" className="gap-2">
                                {currentStep < steps.length - 1 ? (
                                    <>
                                        下一步
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                ) : (
                                    '開始挑戰'
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Keyboard Hints */}
                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span>← → 切換步驟</span>
                        <span>Enter 下一步</span>
                        <span>Esc 跳過</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

/**
 * Hook to check if onboarding should be shown
 */
export function useEditorOnboarding() {
    const [shouldShow, setShouldShow] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const completed = localStorage.getItem('editor-onboarding-completed')
            setShouldShow(!completed)
        }
    }, [])

    return { shouldShow, setShouldShow }
}
