/**
 * Offline Banner Component
 * 
 * Displays a banner when user goes offline
 */

'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus'
import { motion, AnimatePresence } from 'framer-motion'

export function OfflineBanner() {
    const { isOnline, wasOffline } = useOnlineStatus()
    const [showBanner, setShowBanner] = useState(false)
    const [showReconnected, setShowReconnected] = useState(false)

    useEffect(() => {
        if (!isOnline) {
            // Show offline banner after a short delay
            const timer = setTimeout(() => {
                setShowBanner(true)
            }, 1000)
            return () => clearTimeout(timer)
        } else if (wasOffline) {
            // Show reconnected message
            setShowBanner(false)
            setShowReconnected(true)

            // Hide reconnected message after 3 seconds
            const timer = setTimeout(() => {
                setShowReconnected(false)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [isOnline, wasOffline])

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white px-4 py-3 shadow-lg"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <WifiOff className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">
                            您目前處於離線狀態 - 部分功能可能無法使用
                        </p>
                    </div>
                </motion.div>
            )}

            {showReconnected && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-3 shadow-lg"
                >
                    <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
                        <Wifi className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">
                            已重新連線！正在同步資料...
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
