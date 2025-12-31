'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useCompanion } from '@/lib/companion-context'
import { useState, useEffect } from 'react'

export function TamagotchiWidget() {
    const { mood, interact } = useCompanion()
    const [isHovered, setIsHovered] = useState(false)
    const [isRefusing, setIsRefusing] = useState(false)
    const [showRefusalMessage, setShowRefusalMessage] = useState(false)

    // Check if chick should be refusing interaction
    // In a real implementation, this would come from the chick store
    const shouldRefuse = mood === 'sleep' || false // Add hunger > 80 check when available

    useEffect(() => {
        setIsRefusing(shouldRefuse)
    }, [shouldRefuse])

    const handleInteract = () => {
        if (isRefusing) {
            // Show refusal animation and message
            setShowRefusalMessage(true)
            setTimeout(() => setShowRefusalMessage(false), 3000)
            return
        }
        interact()
    }

    // Animation variants
    const variants = {
        idle: {
            y: [0, -10, 0],
            scale: [1, 1.05, 1],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
            }
        },
        happy: {
            y: [0, -20, 0, -10, 0],
            rotate: [0, -10, 10, -5, 5, 0],
            scale: [1, 1.2, 1],
            transition: {
                duration: 0.8,
                ease: "backOut"
            }
        },
        sleep: {
            y: 0,
            scale: [1, 0.95, 1],
            opacity: 0.8,
            transition: {
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
            }
        },
        hover: {
            scale: 1.1,
            rotate: [0, -5, 5, 0],
            transition: {
                duration: 0.3
            }
        },
        refuse: {
            rotateY: 180,
            transition: {
                duration: 0.4,
                ease: "easeInOut"
            }
        }
    }

    return (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 transform pointer-events-none">
            {/* Container to capture clicks but allow pass-through for layout */}
            <div className="pointer-events-auto cursor-pointer" onClick={handleInteract} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                <motion.div
                    animate={isRefusing && showRefusalMessage ? "refuse" : mood}
                    variants={variants}
                    whileHover={isRefusing ? undefined : "hover"}
                    className="relative flex h-16 w-16 items-center justify-center"
                >
                    {/* Body */}
                    <div className="absolute h-14 w-14 rounded-full bg-companion shadow-[0_0_15px_var(--companion-glow)] transition-colors duration-300">
                        {/* Face Container */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                            {/* Eyes */}
                            <div className="flex gap-3">
                                <motion.div
                                    className="h-2 w-2 rounded-full bg-companion-foreground"
                                    animate={mood === 'sleep' ? { scaleY: 0.1 } : { scaleY: 1 }}
                                />
                                <motion.div
                                    className="h-2 w-2 rounded-full bg-companion-foreground"
                                    animate={mood === 'sleep' ? { scaleY: 0.1 } : { scaleY: 1 }}
                                />
                            </div>

                            {/* Mouth */}
                            <div className="mt-1">
                                {mood === 'happy' && (
                                    <div className="h-2 w-3 rounded-b-full bg-companion-foreground/80" />
                                )}
                                {mood === 'idle' && (
                                    <div className="h-1 w-2 rounded-full bg-companion-foreground/80" />
                                )}
                                {mood === 'sleep' && (
                                    <div className="h-1 w-2 rounded-full bg-companion-foreground/50" />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Zzz Animation for Sleep */}
                    <AnimatePresence>
                        {mood === 'sleep' && (
                            <motion.div
                                initial={{ opacity: 0, x: 10, y: -10 }}
                                animate={{ opacity: 1, x: 20, y: -30 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute right-0 top-0 text-xs font-bold text-companion-foreground"
                            >
                                Zzz
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Heart Animation for Happy */}
                    <AnimatePresence>
                        {mood === 'happy' && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0, y: 0 }}
                                animate={{ opacity: 1, scale: 1, y: -30 }}
                                exit={{ opacity: 0 }}
                                className="absolute top-0 text-red-500"
                            >
                                ❤️
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Refusal Message */}
                    <AnimatePresence>
                        {showRefusalMessage && (
                            <motion.div
                                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.8 }}
                                transition={{ duration: 0.3 }}
                                className="absolute -top-20 left-1/2 -translate-x-1/2 min-w-[120px] pointer-events-none"
                            >
                                <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                                    <div className="text-center">我不舒服...</div>
                                    <div className="text-center opacity-75">不想理你...</div>
                                    {/* Speech bubble tail */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Action Buttons for Refusing State */}
            <AnimatePresence>
                {isRefusing && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto"
                    >
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                // In a real implementation, this would call heal/feed API
                                console.log('Healing chick...')
                            }}
                            className="bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1 rounded-full shadow-lg transition-colors"
                        >
                            {mood === 'sleep' ? '治療' : '餵食'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
