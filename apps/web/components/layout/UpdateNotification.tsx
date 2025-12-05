/**
 * Update Notification Component
 * 
 * Displays a minimalist toast notification when a new app version is available.
 * Follows the app's design system with clean aesthetics.
 * 
 * @module UpdateNotification
 */

'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

interface UpdateNotificationProps {
    onRefresh: () => void
    onDismiss?: () => void
}

/**
 * Update notification toast
 * 
 * Appears at the bottom-center of the screen with a refresh button.
 * Auto-dismisses after 30 seconds if user doesn't interact.
 * 
 * @example
 * ```tsx
 * <UpdateNotification 
 *   onRefresh={() => window.location.reload()} 
 *   onDismiss={() => setShowNotification(false)}
 * />
 * ```
 */
export function UpdateNotification({ onRefresh, onDismiss }: UpdateNotificationProps) {
    const [isVisible, setIsVisible] = useState(true)

    // Auto-dismiss after 30 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            onDismiss?.()
        }, 30000)

        return () => clearTimeout(timer)
    }, [onDismiss])

    const handleDismiss = () => {
        setIsVisible(false)
        onDismiss?.()
    }

    const handleRefresh = () => {
        setIsVisible(false)
        onRefresh()
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 md:bottom-8"
                >
                    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
                        {/* Icon */}
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                            <RefreshCw className="h-5 w-5 text-blue-500" />
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-0.5">
                            <p className="text-sm font-semibold text-foreground">新版本可用</p>
                            <p className="text-xs text-muted-foreground">點擊刷新以獲取最新功能</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleRefresh}
                                className="h-8 bg-blue-500 px-4 text-xs font-medium text-white hover:bg-blue-600"
                            >
                                刷新
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDismiss}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

/**
 * Compact version for mobile
 */
export function UpdateNotificationCompact({ onRefresh, onDismiss }: UpdateNotificationProps) {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false)
            onDismiss?.()
        }, 30000)

        return () => clearTimeout(timer)
    }, [onDismiss])

    const handleDismiss = () => {
        setIsVisible(false)
        onDismiss?.()
    }

    const handleRefresh = () => {
        setIsVisible(false)
        onRefresh()
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed bottom-20 left-4 right-4 z-[100] md:hidden"
                >
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="h-5 w-5 text-blue-500" />
                            <p className="text-sm font-medium text-foreground">新版本可用</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                onClick={handleRefresh}
                                className="h-8 bg-blue-500 px-3 text-xs text-white hover:bg-blue-600"
                            >
                                刷新
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleDismiss}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
