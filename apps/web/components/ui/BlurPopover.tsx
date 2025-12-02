'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BlurPopoverProps {
    isOpen: boolean
    onClose: () => void
    anchorRect?: { x: number; y: number; width: number; height: number } | null
    children: React.ReactNode
    className?: string
}

export function BlurPopover({
    isOpen,
    onClose,
    anchorRect,
    children,
    className,
}: BlurPopoverProps) {
    // Close on click outside (handled by backdrop usually, but here we want non-modal feel)
    // For this implementation, we'll use a transparent backdrop

    if (!anchorRect) return null

    // Calculate position: Center above the anchor
    const popoverWidth = 300 // Estimated width
    const left = anchorRect.x + anchorRect.width / 2 - popoverWidth / 2
    const top = anchorRect.y - 10 // 10px gap above

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Transparent Backdrop to handle click outside */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                            "fixed z-50 p-4 rounded-xl shadow-xl backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 border border-white/20 ring-1 ring-black/5",
                            className
                        )}
                        style={{
                            left: Math.max(10, Math.min(window.innerWidth - 310, left)), // Clamp to screen
                            top: Math.max(10, top - 100), // Ensure it doesn't go off top (simplified)
                            width: popoverWidth,
                        }}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
