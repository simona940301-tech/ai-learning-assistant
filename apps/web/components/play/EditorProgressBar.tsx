'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface EditorProgressBarProps {
    current: number
    total: number
    className?: string
}

/**
 * EditorProgressBar - Animated progress tracking for Editor Mode
 * 
 * Features:
 * - Smooth progress animation with framer-motion
 * - Milestone markers at 25%, 50%, 75%, 100%
 * - Responsive design for mobile and desktop
 * - Accessible with ARIA labels
 * 
 * @example
 * <EditorProgressBar current={7} total={10} />
 */
export function EditorProgressBar({ current, total, className }: EditorProgressBarProps) {
    const percentage = Math.min((current / total) * 100, 100)
    const milestones = [25, 50, 75, 100]

    return (
        <div className={cn('w-full space-y-2', className)} role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total}>
            {/* Progress Text */}
            <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground/80">
                    填空進度
                </span>
                <span className="font-bold text-primary">
                    {current} / {total}
                </span>
            </div>

            {/* Progress Bar Container */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/30">
                {/* Animated Progress Fill */}
                <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1], // Smooth easing
                    }}
                />

                {/* Milestone Markers */}
                {milestones.map((milestone) => {
                    const isPassed = percentage >= milestone
                    const position = milestone

                    return (
                        <div
                            key={milestone}
                            className="absolute top-1/2 -translate-y-1/2 z-10"
                            style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: isPassed ? 1 : 0.8 }}
                                transition={{ duration: 0.3, delay: isPassed ? 0.1 : 0 }}
                                className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors',
                                    isPassed
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-muted-foreground/30 bg-background'
                                )}
                            >
                                {isPassed && <CheckCircle2 className="h-3 w-3" />}
                            </motion.div>
                        </div>
                    )
                })}
            </div>

            {/* Percentage Display (Optional, for desktop) */}
            <div className="hidden md:flex items-center justify-center">
                <motion.span
                    key={percentage}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-medium text-muted-foreground"
                >
                    {percentage.toFixed(0)}% 完成
                </motion.span>
            </div>
        </div>
    )
}
