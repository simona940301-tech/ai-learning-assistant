'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { getChickImagePath } from '@/components/chick/chickImage'

interface FirstFeedTutorialProps {
    chickName: string
    onComplete: () => void
}

export function FirstFeedTutorial({ chickName, onComplete }: FirstFeedTutorialProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [burgerPosition, setBurgerPosition] = useState({ x: 0, y: 0 })
    const [isFed, setIsFed] = useState(false)
    const [showParticles, setShowParticles] = useState(false)

    const handleDragStart = () => {
        setIsDragging(true)
    }

    const handleDrag = (event: any, info: any) => {
        setBurgerPosition({ x: info.offset.x, y: info.offset.y })

        // Check if burger is near chick (center of screen)
        const distance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2)
        if (distance < 80 && !isFed) {
            // Trigger feeding
            setIsFed(true)
            setShowParticles(true)

            // Haptic feedback
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate([50, 100, 50])
            }

            setTimeout(() => {
                onComplete()
            }, 2000)
        }
    }

    const handleDragEnd = () => {
        if (!isFed) {
            // Reset burger position if not fed
            setBurgerPosition({ x: 0, y: 0 })
        }
        setIsDragging(false)
    }

    return (
        <div className="relative w-full h-full min-h-[500px] flex flex-col items-center justify-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-radial from-[#FFFBF0] via-[#FFF8E1] to-[#FFFBF0]" />

            {/* Instruction text */}
            <AnimatePresence mode="wait">
                {!isFed ? (
                    <motion.div
                        key="instruction"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-8 text-center px-4"
                    >
                        <h3 className="text-xl font-bold text-[#1C1917] mb-2">
                            第一次餵食
                        </h3>
                        <p className="text-sm text-[#57534E]">
                            拖曳食物到 {chickName} 的嘴邊
                        </p>
                    </motion.div>
                ) : (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute top-8 text-center px-4"
                    >
                        <h3 className="text-2xl font-bold text-[#FFB01A]">
                            太棒了！
                        </h3>
                        <p className="text-sm text-[#57534E] mt-2">
                            {chickName} 很開心
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chick */}
            <motion.div
                className="relative w-32 h-32 mb-8"
                animate={{
                    scale: isFed ? [1, 1.1, 1] : 1,
                    rotate: isFed ? [0, -5, 5, -5, 5, 0] : 0,
                }}
                transition={{
                    duration: isFed ? 0.6 : 0,
                }}
            >
                <Image
                    src={getChickImagePath({ iq: 5, fatigue: 0, emotionState: 'normal' })}
                    alt={chickName}
                    fill
                    className="object-contain"
                    priority
                />

                {/* Hungry indicator (before feeding) */}
                {!isFed && (
                    <motion.div
                        className="absolute -top-2 -right-2 w-8 h-8 bg-[#FFB01A] rounded-full flex items-center justify-center shadow-lg"
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.8, 1, 0.8],
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                        }}
                    >
                        <span className="text-white text-xs font-bold">!</span>
                    </motion.div>
                )}
            </motion.div>

            {/* Draggable Burger */}
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0.1}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
                animate={{
                    x: burgerPosition.x,
                    y: burgerPosition.y,
                    scale: isDragging ? 1.1 : 1,
                    opacity: isFed ? 0 : 1,
                }}
                transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                }}
                className="relative cursor-grab active:cursor-grabbing"
                style={{
                    touchAction: 'none',
                }}
            >
                {/* Burger Icon (custom SVG, no emoji) */}
                <div className="w-20 h-20 bg-gradient-to-b from-[#D4A574] to-[#B8935F] rounded-full shadow-xl border-4 border-[#E0D0B8] flex items-center justify-center">
                    {/* Top bun */}
                    <div className="absolute top-2 w-14 h-4 bg-[#D4A574] rounded-t-full" />
                    {/* Lettuce */}
                    <div className="absolute top-6 w-14 h-2 bg-[#7CB342]" />
                    {/* Patty */}
                    <div className="absolute top-8 w-14 h-3 bg-[#8B4513] rounded-sm" />
                    {/* Cheese */}
                    <div className="absolute top-11 w-14 h-2 bg-[#FFD54F]" />
                    {/* Bottom bun */}
                    <div className="absolute bottom-2 w-14 h-4 bg-[#B8935F] rounded-b-full" />
                </div>

                {/* Drag hint (pulsing glow) */}
                {!isDragging && !isFed && (
                    <motion.div
                        className="absolute inset-0 rounded-full bg-[#FFB01A]/30 blur-xl"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                        }}
                    />
                )}
            </motion.div>

            {/* Feeding particles */}
            <AnimatePresence>
                {showParticles && (
                    <>
                        {Array.from({ length: 12 }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    opacity: 1,
                                    scale: 1,
                                    x: 0,
                                    y: 0,
                                }}
                                animate={{
                                    opacity: 0,
                                    scale: 0,
                                    x: Math.cos((i / 12) * Math.PI * 2) * 100,
                                    y: Math.sin((i / 12) * Math.PI * 2) * 100,
                                }}
                                exit={{ opacity: 0 }}
                                transition={{
                                    duration: 1,
                                    delay: i * 0.05,
                                }}
                                className="absolute top-1/2 left-1/2 w-3 h-3 bg-[#FFB01A] rounded-full"
                            />
                        ))}
                    </>
                )}
            </AnimatePresence>

            {/* Helper text */}
            {!isFed && (
                <motion.p
                    className="absolute bottom-8 text-xs text-[#A8A29E] text-center px-4"
                    animate={{
                        opacity: isDragging ? 0 : 1,
                    }}
                >
                    按住食物並拖曳到小雞附近
                </motion.p>
            )}
        </div>
    )
}
