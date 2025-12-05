'use client'

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDetectiveStore } from '@/lib/detective/store'
import { cn } from '@/lib/utils'

export function NarrativeFeedback() {
    const { narrativeLog } = useDetectiveStore()
    const latestLog = narrativeLog[0] // Get the most recent log
    const prevLogRef = useRef<string | null>(null)

    useEffect(() => {
        if (latestLog && latestLog.id !== prevLogRef.current) {
            // Play typewriter sound or notification sound here
            prevLogRef.current = latestLog.id
        }
    }, [latestLog])

    if (!latestLog) return null

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4 pointer-events-none">
            <AnimatePresence mode="wait">
                <motion.div
                    key={latestLog.id}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                        "relative p-4 rounded-lg shadow-2xl backdrop-blur-xl border pointer-events-auto",
                        latestLog.speaker === 'Old Detective'
                            ? "bg-slate-900/90 border-slate-700 text-slate-200"
                            : "bg-blue-950/90 border-blue-800 text-blue-100"
                    )}
                >
                    {/* Avatar / Speaker Label */}
                    <div className="flex items-center gap-3 mb-2 border-b border-white/10 pb-2">
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                            latestLog.speaker === 'Old Detective' ? "bg-amber-700" : "bg-blue-700"
                        )}>
                            {latestLog.speaker === 'Old Detective' ? 'OD' : 'SYS'}
                        </div>
                        <span className="text-xs font-mono uppercase tracking-widest opacity-70">
                            {latestLog.speaker}
                        </span>
                        <span className="ml-auto text-[10px] opacity-50 font-mono">
                            {new Date(latestLog.timestamp).toLocaleTimeString()}
                        </span>
                    </div>

                    {/* Message with Typewriter Effect (Simulated via CSS/Animation) */}
                    <p className="font-serif text-lg leading-snug">
                        {latestLog.message}
                    </p>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
