'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDetectiveStore } from '@/lib/detective/store'
import { useDetectiveTelemetry } from '@/lib/detective/telemetry'
import { AlertTriangle, Lock } from 'lucide-react'

export function DashboardWidget() {
    const { currentQuota, currentBudget } = useDetectiveStore()
    const { trackQuotaWarning } = useDetectiveTelemetry()
    const [isLowQuota, setIsLowQuota] = useState(false)

    useEffect(() => {
        if (currentQuota <= 1 && currentQuota > 0) {
            setIsLowQuota(true)
            trackQuotaWarning(currentQuota)
            // Trigger haptic feedback if available
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([100, 50, 100])
            }
        } else {
            setIsLowQuota(false)
        }
    }, [currentQuota, trackQuotaWarning])

    return (
        <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-2xl">
            {/* Quota Counter */}
            <motion.div
                className="relative flex items-center justify-center w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600"
                animate={isLowQuota ? {
                    scale: [1, 1.2, 1],
                    borderColor: ['#475569', '#ef4444', '#475569'],
                    rotate: [0, -5, 5, 0]
                } : {}}
                transition={isLowQuota ? {
                    duration: 0.5,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut" // Damping feel
                } : {}}
            >
                {currentQuota === 0 ? (
                    <Lock className="w-5 h-5 text-red-500" />
                ) : (
                    <span className={`text-lg font-bold ${isLowQuota ? 'text-red-400' : 'text-white'}`}>
                        {currentQuota}
                    </span>
                )}

                {/* Warning Icon for Low Quota */}
                <AnimatePresence>
                    {isLowQuota && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1"
                        >
                            <AlertTriangle className="w-3 h-3 text-white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Budget Display */}
            <div className="flex flex-col px-2">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Budget</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-sm text-green-400 font-mono">¥</span>
                    <motion.span
                        key={currentBudget}
                        initial={{ color: '#ef4444' }}
                        animate={{ color: '#ffffff' }}
                        className="text-lg font-bold font-mono"
                    >
                        {currentBudget}
                    </motion.span>
                </div>
            </div>
        </div>
    )
}
