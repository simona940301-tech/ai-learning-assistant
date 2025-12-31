'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface SidePanelProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    side?: 'left' | 'right'
    className?: string
    title?: string
}

export function SidePanel({
    isOpen,
    onClose,
    children,
    side = 'left',
    className,
    title
}: SidePanelProps) {
    // Animation variants
    const variants = {
        closed: {
            x: side === 'left' ? '-100%' : '100%',
            opacity: 0.5
        },
        open: {
            x: 0,
            opacity: 1
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
                        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial="closed"
                        animate="open"
                        exit="closed"
                        variants={variants}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className={cn(
                            "fixed top-0 bottom-0 z-50 w-full max-w-[320px] bg-[#FAF9F6] shadow-2xl flex flex-col border-r border-[#E0E0E0]",
                            side === 'left' ? "left-0" : "right-0",
                            className
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]/60 bg-white/50 backdrop-blur-sm">
                            <h2 className="text-lg font-semibold text-[#4A4A4A] tracking-tight">
                                {title || 'Menu'}
                            </h2>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-[#EAEAEA]"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-200">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
