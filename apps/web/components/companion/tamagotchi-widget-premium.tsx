'use client'

import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { useChickStore } from '@/src/store/chickStore'
import { getChickImagePath } from '@/components/chick/chickImage'
import type { ChickState } from '@/packages/server/chick/types'
// import { ChickBottomSheet } from '@/components/chick/ChickBottomSheet' // Temporarily disabled - missing store properties
import type { ChickEmotion } from '@/packages/server/chick/types'

// ============================================
// Animation Configuration System
// ============================================

type AnimationConfig = {
    breathing: {
        scaleY: number[]
        scaleX: number[]
        duration: number
    }
    floating: {
        enabled: boolean
        y: number[]
        rotate: number[]
        duration: number
    }
    glow: {
        opacity: number
        scale: number
    }
    yOffset: number
    shake?: {
        enabled: boolean
        intensity: number
    }
}

/**
 * State-driven animation configuration
 * Maps chick state to animation parameters
 */
function getAnimationConfig(
    emotionState: ChickEmotion,
    fatigue: number,
    iq: number
): AnimationConfig {
    // Hibernate: Slow breathing, no floating, dim glow
    if (emotionState === 'hibernate') {
        return {
            breathing: {
                scaleY: [1, 1.03, 1],
                scaleX: [1, 0.99, 1],
                duration: 4.5, // Very slow
            },
            floating: {
                enabled: false,
                y: [0],
                rotate: [0],
                duration: 0,
            },
            glow: {
                opacity: 0.15,
                scale: 0.9,
            },
            yOffset: 4, // Slightly lower
        }
    }

    // Cold: Normal breathing + shake effect
    if (emotionState === 'cold') {
        return {
            breathing: {
                scaleY: [1, 1.04, 1],
                scaleX: [1, 0.98, 1],
                duration: 2.5,
            },
            floating: {
                enabled: false,
                y: [0],
                rotate: [0],
                duration: 0,
            },
            glow: {
                opacity: 0.3,
                scale: 1,
            },
            yOffset: 0,
            shake: {
                enabled: true,
                intensity: 2,
            },
        }
    }

    // Tired: Slow breathing, reduced floating, lower position
    if (fatigue >= 2) {
        return {
            breathing: {
                scaleY: [1, 1.04, 1],
                scaleX: [1, 0.98, 1],
                duration: 3.5,
            },
            floating: {
                enabled: true,
                y: [0, -6, 0], // Reduced amplitude
                rotate: [0, 1, -1, 0],
                duration: 5, // Slower
            },
            glow: {
                opacity: 0.25,
                scale: 0.95,
            },
            yOffset: 8, // Sinking down
        }
    }

    // High IQ: Enhanced glow
    if (iq >= 8) {
        return {
            breathing: {
                scaleY: [1, 1.05, 1],
                scaleX: [1, 0.98, 1],
                duration: 2.5,
            },
            floating: {
                enabled: true,
                y: [0, -12, 0],
                rotate: [0, 2, -2, 0],
                duration: 4,
            },
            glow: {
                opacity: 0.7, // Brighter
                scale: 1.3,
            },
            yOffset: 0,
        }
    }

    // Default (normal/happy)
    return {
        breathing: {
            scaleY: [1, 1.05, 1],
            scaleX: [1, 0.98, 1],
            duration: 2.5,
        },
        floating: {
            enabled: true,
            y: [0, -12, 0],
            rotate: [0, 2, -2, 0],
            duration: 4,
        },
        glow: {
            opacity: 0.5,
            scale: 1.1,
        },
        yOffset: 0,
    }
}

// ============================================
// Premium Tamagotchi Widget Component
// ============================================

export function TamagotchiWidget() {
    const {
        iq,
        fatigue,
        emotionState,
        messagesUnreadCount,
        // bottomSheetOpen, // Temporarily disabled
        hasFetchedStatus,
        statusLoading,
        // openBottomSheet, // Temporarily disabled
        fetchStatus,
    } = useChickStore((state) => ({
        iq: state.iq,
        fatigue: state.fatigue,
        emotionState: state.emotionState,
        messagesUnreadCount: state.messagesUnreadCount,
        // bottomSheetOpen: state.bottomSheetOpen, // Temporarily disabled
        hasFetchedStatus: state.hasFetchedStatus,
        statusLoading: state.statusLoading,
        // openBottomSheet: state.openBottomSheet, // Temporarily disabled
        fetchStatus: state.fetchStatus,
    }))

    const [isHovered, setIsHovered] = useState(false)
    const shakeControls = useAnimation()

    // Fetch status on mount
    useEffect(() => {
        if (!hasFetchedStatus && !statusLoading) {
            void fetchStatus()
        }
    }, [hasFetchedStatus, statusLoading, fetchStatus])

    // Get current animation configuration
    const animConfig = useMemo(
        () => getAnimationConfig(emotionState, fatigue, iq),
        [emotionState, fatigue, iq]
    )

    // Shake animation for 'cold' state
    useEffect(() => {
        if (animConfig.shake?.enabled) {
            const runShake = async () => {
                await shakeControls.start({
                    x: [0, -animConfig.shake!.intensity, animConfig.shake!.intensity, -animConfig.shake!.intensity, 0],
                    transition: {
                        duration: 0.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                    },
                })
            }
            void runShake()
        } else {
            void shakeControls.start({ x: 0 })
        }
    }, [animConfig.shake, shakeControls])

    const chickState: ChickState = {
        iq,
        fatigue,
        emotionState
    }

    const imgSrc = getChickImagePath(chickState)

    // ============================================
    // Animation Variants
    // ============================================

    const containerVariants = {
        idle: {
            y: animConfig.floating.enabled
                ? animConfig.floating.y
                : [animConfig.yOffset],
            rotate: animConfig.floating.enabled ? animConfig.floating.rotate : [0],
            transition: {
                duration: animConfig.floating.duration,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
        hover: {
            scale: 1.15,
            y: -16,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
            },
        },
        tap: {
            scale: 0.85,
            rotate: -8,
            transition: {
                type: 'spring',
                stiffness: 400,
                damping: 17,
            },
        },
    }

    const breathingVariants = {
        idle: {
            scaleY: animConfig.breathing.scaleY,
            scaleX: animConfig.breathing.scaleX,
            transition: {
                duration: animConfig.breathing.duration,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.6, 1], // Custom cubic-bezier
            },
        },
    }

    const glowVariants = {
        idle: {
            opacity: animConfig.glow.opacity,
            scale: animConfig.glow.scale,
            transition: {
                duration: 3,
                repeat: Infinity,
                repeatType: 'reverse' as const,
            },
        },
        hover: {
            opacity: Math.min(animConfig.glow.opacity + 0.3, 1),
            scale: animConfig.glow.scale * 1.2,
            transition: {
                duration: 0.3,
            },
        },
    }

    return (
        <>
            <div className="fixed bottom-[calc(var(--tab-bar-height)+1rem)] right-4 z-50 flex flex-col items-end pointer-events-none">
                {/* Interactive Container */}
                <motion.button
                    initial="idle"
                    animate={isHovered ? 'hover' : 'idle'}
                    whileTap="tap"
                    variants={containerVariants}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={() => {/* openBottomSheet() - Temporarily disabled */}}
                    className="pointer-events-auto relative flex h-24 w-24 items-center justify-center focus:outline-none"
                    aria-label="Open Chick Companion"
                    style={{ willChange: 'transform' }}
                >
                    {/* Premium Glow Effect */}
                    <motion.div
                        variants={glowVariants}
                        className="absolute inset-0 -z-10 rounded-full bg-yellow-400/40 blur-3xl"
                    />

                    {/* Glassmorphism Background */}
                    <div
                        className={`
              absolute inset-0 rounded-full 
              bg-gradient-to-br from-white/15 to-white/5 
              backdrop-blur-xl border border-white/25 
              shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]
              transition-all duration-300
              ${isHovered ? 'bg-white/20 border-white/40 shadow-2xl' : ''}
            `}
                    />

                    {/* Chick Image with Breathing */}
                    <motion.div
                        variants={breathingVariants}
                        animate="idle"
                        className="relative h-16 w-16 overflow-hidden rounded-full"
                        style={{ willChange: 'transform' }}
                    >
                        <motion.div animate={shakeControls}>
                            <Image
                                src={imgSrc}
                                alt="Chick Companion"
                                fill
                                className="object-contain"
                                priority
                                quality={95}
                                style={{ mixBlendMode: 'multiply' }}
                            />
                        </motion.div>
                    </motion.div>

                    {/* Unread Badge */}
                    <AnimatePresence>
                        {messagesUnreadCount > 0 && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg ring-2 ring-white/30"
                            >
                                <span className="text-[11px] font-bold text-white">
                                    {messagesUnreadCount > 9 ? '9+' : messagesUnreadCount}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Active State Ring */}
                    {/* Temporarily disabled
                    {bottomSheetOpen && (
                        <motion.div
                            layoutId="active-ring"
                            className="absolute inset-0 rounded-full ring-2 ring-yellow-400/70 ring-offset-2 ring-offset-transparent"
                            transition={{ duration: 0.3 }}
                        />
                    )}
                    */}
                </motion.button>
            </div>

            {/* Bottom Sheet Component */}
            {/* <ChickBottomSheet /> */} {/* Temporarily disabled - missing store properties */}
        </>
    )
}
