'use client'

import { motion } from 'framer-motion'

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

interface ProgressIndicatorProps {
    currentStep: OnboardingStep
    className?: string
}

const stepLabels = {
    1: '目標設定',
    2: '遊戲測驗',
    3: '獎勵',
    4: '頭像設定',
    5: '學習習慣問卷',
    6: '完成',
} as const

/**
 * Unified Progress Indicator for Onboarding Flow
 * 
 * 新流程步驟：
 * - Step 1: 目標設定 (Goal)
 * - Step 2: 遊戲測驗 (Challenge)
 * - Step 3: 獎勵 (Reward)
 * - Step 4: 頭像設定 (Avatar)
 * - Step 5: 學習習慣問卷 (Habits)
 * - Step 6: 完成 (Complete)
 */
export function ProgressIndicator({ currentStep, className = '' }: ProgressIndicatorProps) {
    const totalSteps = 6
    const progress = (currentStep / totalSteps) * 100

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Step Counter */}
            <div className="text-center">
                <p className="text-sm font-medium text-[#8B6F47]">
                    Step {currentStep}/{totalSteps} · {stepLabels[currentStep as keyof typeof stepLabels] || '進行中'}
                </p>
            </div>

            {/* Progress Bar */}
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#E0D0B8]">
                <motion.div
                    className="absolute left-0 top-0 h-full bg-[#528555]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                />
            </div>

            {/* Step Dots */}
            <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5, 6].map((step) => (
                    <motion.div
                        key={step}
                        className={`rounded-full transition-all ${step === currentStep
                            ? 'h-2 w-8 bg-[#528555]'
                            : step < currentStep
                                ? 'h-2 w-2 bg-[#528555]/60'
                                : 'h-2 w-2 bg-[#E0D0B8]'
                            }`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: step * 0.1 }}
                    />
                ))}
            </div>
        </div>
    )
}

/**
 * Helper function to determine current step based on page route
 * 根據新的統一流程映射步驟
 */
export function getStepFromRoute(pathname: string): OnboardingStep {
    // Step 1: 目標設定
    if (pathname.includes('/goal')) {
        return 1
    }
    // Step 2: 遊戲測驗
    if (pathname.includes('/challenge')) {
        return 2
    }
    // Step 3: 獎勵
    if (pathname.includes('/reward')) {
        return 3
    }
    // Step 4: 頭像設定
    if (pathname.includes('/avatar')) {
        return 4
    }
    // Step 5: 學習習慣問卷
    if (pathname.includes('/habits')) {
        return 5
    }
    // Step 6: 完成
    if (pathname.includes('/complete')) {
        return 6
    }
    // 默認返回步驟 1
    return 1
}
