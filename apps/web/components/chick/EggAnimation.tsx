'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

interface EggAnimationProps {
    onHatched: () => void
    requiredClicks?: number // 5-8 clicks, randomized
}

export function EggAnimation({ onHatched, requiredClicks }: EggAnimationProps) {
    const [clicks, setClicks] = useState(0)
    const [targetClicks] = useState(requiredClicks || Math.floor(Math.random() * 4) + 5) // 5-8
    const [isHatching, setIsHatching] = useState(false)
    const [showBurst, setShowBurst] = useState(false)

    const progress = clicks / targetClicks
    const crackLevel = Math.min(Math.floor(progress * 4), 3) // 0-3 crack levels

    const handleClick = () => {
        if (isHatching) return

        const newClicks = clicks + 1
        setClicks(newClicks)

        // Haptic feedback on mobile
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(50)
        }

        if (newClicks >= targetClicks) {
            setIsHatching(true)
            setTimeout(() => {
                setShowBurst(true)
                setTimeout(() => {
                    onHatched()
                }, 800)
            }, 500)
        }
    }

    return (
        <div className="relative flex flex-col items-center justify-center min-h-[400px]">
            {/* Progress indicator */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 mb-8">
                <div className="flex gap-1.5">
                    {Array.from({ length: targetClicks }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-2 w-2 rounded-full transition-all duration-300 ${i < clicks
                                    ? 'bg-[#FFB01A] scale-110'
                                    : 'bg-[#E7E5E4]'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Egg container */}
            <motion.button
                onClick={handleClick}
                disabled={isHatching}
                className="relative w-48 h-56 cursor-pointer focus:outline-none disabled:cursor-default"
                animate={{
                    rotate: isHatching ? [0, -5, 5, -5, 5, 0] : clicks > 0 ? [0, -3, 3, -3, 3, 0] : 0,
                    scale: isHatching ? [1, 1.05, 0.95, 1.1, 0.9, 0] : 1,
                }}
                transition={{
                    duration: isHatching ? 0.8 : 0.3,
                    ease: 'easeInOut',
                }}
            >
                {/* Egg base */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFFBF0] via-[#FFF8E1] to-[#FFE082] rounded-[50%] shadow-2xl border-4 border-[#E0D0B8]" />

                {/* Egg spots pattern */}
                <div className="absolute inset-0 rounded-[50%] overflow-hidden">
                    <div className="absolute top-8 left-12 w-8 h-10 bg-[#FFD54F]/30 rounded-full blur-sm" />
                    <div className="absolute top-20 right-10 w-6 h-8 bg-[#FFD54F]/30 rounded-full blur-sm" />
                    <div className="absolute bottom-16 left-16 w-10 h-12 bg-[#FFD54F]/30 rounded-full blur-sm" />
                </div>

                {/* Glow effect */}
                <motion.div
                    className="absolute inset-0 rounded-[50%] bg-gradient-radial from-[#FFB01A]/20 to-transparent"
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />

                {/* Crack overlays */}
                <AnimatePresence>
                    {crackLevel >= 1 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0"
                        >
                            {/* First crack - top */}
                            <svg className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32" viewBox="0 0 100 100">
                                <path
                                    d="M 50 10 L 48 25 L 52 35 L 50 45"
                                    stroke="#8B6F47"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </motion.div>
                    )}

                    {crackLevel >= 2 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0"
                        >
                            {/* Second crack - diagonal left */}
                            <svg className="absolute top-20 left-8 w-32 h-32" viewBox="0 0 100 100">
                                <path
                                    d="M 60 30 L 50 40 L 45 50 L 40 65"
                                    stroke="#8B6F47"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </motion.div>
                    )}

                    {crackLevel >= 3 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0"
                        >
                            {/* Third crack - diagonal right */}
                            <svg className="absolute top-20 right-8 w-32 h-32" viewBox="0 0 100 100">
                                <path
                                    d="M 40 30 L 50 40 L 55 50 L 60 65"
                                    stroke="#8B6F47"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Light burst effect */}
                <AnimatePresence>
                    {showBurst && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: [0, 1, 0], scale: [0, 2, 3] }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0 bg-gradient-radial from-[#FFB01A] via-[#FFD54F]/50 to-transparent rounded-full blur-xl"
                        />
                    )}
                </AnimatePresence>
            </motion.button>

            {/* Instruction text */}
            <motion.p
                className="mt-8 text-base text-[#57534E] font-medium text-center"
                animate={{
                    opacity: isHatching ? 0 : 1,
                }}
            >
                {clicks === 0 ? '輕觸蛋殼，喚醒你的夥伴' : `繼續加油！還需要 ${targetClicks - clicks} 次`}
            </motion.p>

            {/* Particle effects on click */}
            <AnimatePresence>
                {clicks > 0 && !isHatching && (
                    <motion.div
                        key={clicks}
                        initial={{ opacity: 1, scale: 1 }}
                        animate={{ opacity: 0, scale: 2, y: -50 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                        <div className="w-4 h-4 bg-[#FFB01A] rounded-full" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
