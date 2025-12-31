'use client'

import { motion } from 'framer-motion'

/**
 * UnifiedLoader - 統一的載入狀態組件
 * 使用脈衝動畫（類似 Onboarding 的原點脈衝）
 */

interface UnifiedLoaderProps {
    /** 顯示的訊息 */
    message?: string
    /** 是否為全屏模式 */
    fullScreen?: boolean
    /** 自定義樣式類名 */
    className?: string
    /** 點的數量 */
    dotCount?: number
}

export function UnifiedLoader({
    message,
    fullScreen = false,
    className = '',
    dotCount = 3
}: UnifiedLoaderProps) {
    const containerClass = fullScreen
        ? 'flex min-h-screen items-center justify-center bg-background'
        : 'flex items-center justify-center py-8'

    return (
        <div className={`${containerClass} ${className}`}>
            <div className="flex flex-col items-center gap-4">
                {/* 脈衝動畫點 */}
                <div className="flex items-center gap-2">
                    {Array.from({ length: dotCount }).map((_, i) => (
                        <motion.div
                            key={i}
                            className="h-3 w-3 rounded-full bg-primary"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                                ease: "easeInOut",
                            }}
                        />
                    ))}
                </div>

                {/* 訊息文字 */}
                {message && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-muted-foreground"
                    >
                        {message}
                    </motion.p>
                )}
            </div>
        </div>
    )
}

/**
 * PulseLoader - 簡化版脈衝載入器（用於小區域）
 */
export function PulseLoader({ className = '' }: { className?: string }) {
    return (
        <div className={`flex items-center gap-1.5 ${className}`}>
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-muted-foreground/50"
                    animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.4, 1, 0.4],
                    }}
                    transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut",
                    }}
                />
            ))}
        </div>
    )
}
