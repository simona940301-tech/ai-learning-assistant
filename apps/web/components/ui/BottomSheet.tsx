'use client'

import * as React from 'react'
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
    minHeight?: string
    maxHeight?: string
}

export function BottomSheet({
    isOpen,
    onClose,
    children,
    className,
    minHeight = '40vh',
    maxHeight = '90vh',
}: BottomSheetProps) {
    const controls = useAnimation()

    // Drag end handler
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 100 // Drag down threshold to close
        if (info.offset.y > threshold) {
            onClose()
        } else {
            // Snap back to open
            controls.start({ y: 0 })
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={0.2}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            "fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-[20px] shadow-2xl flex flex-col",
                            className
                        )}
                        style={{ maxHeight }}
                    >
                        {/* Handle Bar */}
                        <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none">
                            <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-4 pb-8">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
