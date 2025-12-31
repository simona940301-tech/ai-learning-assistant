'use client'

import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo, useRef } from 'react'
import Image from 'next/image'
import { useChickStore } from '@/src/store/chickStore'
import { getChickImagePath } from '@/components/chick/chickImage'
import type { ChickState } from '@/packages/server/chick/types'
import { ChickSpeechBubble } from '@/components/chick/ChickSpeechBubble'
import { ChickInteractionModal } from '@/components/chick/ChickInteractionModal'
import { ChickInteractionManager } from '@/components/chick/ChickInteractionManager'
import { ChickStatusIndicators } from '@/components/chick/ChickStatusIndicators'
import { ChickParticles } from '@/components/chick/ChickParticles'
import type { ChickEmotion } from '@/packages/server/chick/types'

// ============================================
// Minimalist Animation Configuration
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
    shake?: {
        enabled: boolean
        intensity: number
    }
}

/**
 * State-driven animation configuration
 */
function getAnimationConfig(
    emotionState: ChickEmotion,
    fatigue: number,
    iq: number
): AnimationConfig {
    // Hibernate: Slow breathing, no floating
    if (emotionState === 'hibernate') {
        return {
            breathing: {
                scaleY: [1, 1.03, 1],
                scaleX: [1, 0.99, 1],
                duration: 4.5,
            },
            floating: {
                enabled: false,
                y: [0],
                rotate: [0],
                duration: 0,
            },
        }
    }

    // Cold: Shake effect
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
            shake: {
                enabled: true,
                intensity: 2,
            },
        }
    }

    // Tired: Slow breathing, reduced floating
    if (fatigue >= 2) {
        return {
            breathing: {
                scaleY: [1, 1.04, 1],
                scaleX: [1, 0.98, 1],
                duration: 3.5,
            },
            floating: {
                enabled: true,
                y: [0, -6, 0],
                rotate: [0, 1, -1, 0],
                duration: 5,
            },
        }
    }

    // Default (normal/happy/high IQ)
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
    }
}

// ============================================
// Minimalist Tamagotchi Widget
// ============================================

export function TamagotchiWidget({ forceState }: { forceState?: ChickEmotion }) {
    const {
        iq,
        fatigue,
        emotionState: storeEmotionState,
        streakDays,
        hasFetchedStatus,
        statusLoading,
        speechBubbleVisible,
        showSpeechBubble,
        hideSpeechBubble,
        getCurrentMessage,
        fetchStatus,
        interact,
        explorationStartAt,
        hunger,
        isExplorationFinished,
        feed,
    } = useChickStore((state) => ({
        iq: state.iq,
        fatigue: state.fatigue,
        emotionState: state.emotionState,
        streakDays: state.streakDays,
        hasFetchedStatus: state.hasFetchedStatus,
        statusLoading: state.statusLoading,
        speechBubbleVisible: state.speechBubbleVisible,
        showSpeechBubble: state.showSpeechBubble,
        hideSpeechBubble: state.hideSpeechBubble,
        getCurrentMessage: state.getCurrentMessage,
        fetchStatus: state.fetchStatus,
        interact: state.interact,
        explorationStartAt: state.explorationStartAt,
        hunger: state.hunger,
        isExplorationFinished: state.isExplorationFinished,
        feed: state.feed,
    }))

    const isWellFed = hunger < 30 // Simplified check for now, or use state.isWellFed if available
    const emotionState = forceState || storeEmotionState

    const [isHovered, setIsHovered] = useState(false)
    const [lastPokeTime, setLastPokeTime] = useState(0)
    const [showInteractionModal, setShowInteractionModal] = useState(false)
    const [idleAnimation, setIdleAnimation] = useState<'jump' | 'spin' | null>(null)
    const [particleTrigger, setParticleTrigger] = useState(0)
    const [flash, setFlash] = useState(false)
    const isMountedRef = useRef(false)
    const shakeControls = useAnimation()
    const idleControls = useAnimation()

    // Hide chick when exploring
    const isExploring = !!explorationStartAt
    const isReturned = isExploring && isExplorationFinished

    // Mark component as mounted
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    // Fetch status on mount
    useEffect(() => {
        if (!hasFetchedStatus && !statusLoading) {
            void fetchStatus()
        }
    }, [hasFetchedStatus, statusLoading, fetchStatus])

    // Session-aware streak check (once per day)
    useEffect(() => {
        const lastCheckDate = sessionStorage.getItem('chick_streak_check_date')
        const today = new Date().toDateString()

        if (lastCheckDate !== today) {
            // Delay to avoid blocking page load
            const timer = setTimeout(() => {
                void interact('check_streak')
                sessionStorage.setItem('chick_streak_check_date', today)
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [interact])

    // Auto idle reminder: show smart message after 30s of inactivity
    useEffect(() => {
        let idleTimer: NodeJS.Timeout

        const resetIdleTimer = () => {
            clearTimeout(idleTimer)
            idleTimer = setTimeout(() => {
                // Only show if no message is currently visible
                if (!speechBubbleVisible) {
                    // Randomly choose between battle encouragement and review reminder
                    const idleAction = Math.random() < 0.7 ? 'idle_battle' : 'idle_review'
                    void interact(idleAction as 'poke', {
                        lastInteraction: 0, // Force new message
                        inBattle: false
                    })
                }
            }, 30000) // 30 seconds
        }

        // Reset timer on user activity
        const handleActivity = () => resetIdleTimer()

        // Listen to various user activities
        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('keydown', handleActivity)
        window.addEventListener('scroll', handleActivity)
        window.addEventListener('click', handleActivity)

        // Start the timer
        resetIdleTimer()

        return () => {
            clearTimeout(idleTimer)
            window.removeEventListener('mousemove', handleActivity)
            window.removeEventListener('keydown', handleActivity)
            window.removeEventListener('scroll', handleActivity)
            window.removeEventListener('click', handleActivity)
        }
    }, [speechBubbleVisible, interact])

    // Random Idle Animations (Jump/Spin)
    useEffect(() => {
        if (isExploring || !isMountedRef.current) return

        const triggerIdleAnimation = async () => {
            if (!isMountedRef.current) return // Safety check
            
            const type = Math.random() > 0.5 ? 'jump' : 'spin'
            setIdleAnimation(type)

            if (type === 'jump') {
                await idleControls.start({
                    y: [0, -20, 0],
                    transition: { duration: 0.5, ease: "easeOut" }
                })
            } else {
                await idleControls.start({
                    rotate: [0, 360],
                    transition: { duration: 0.6, ease: "easeInOut" }
                })
            }

            setIdleAnimation(null)
        }

        const interval = setInterval(() => {
            // 10% chance every 5 seconds to trigger animation
            if (Math.random() < 0.2 && isMountedRef.current) {
                void triggerIdleAnimation()
            }
        }, 5000)

        return () => clearInterval(interval)
    }, [isExploring, idleControls])

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

    // Trigger flash on emotion change
    useEffect(() => {
        setFlash(true)
        const timer = setTimeout(() => setFlash(false), 500)
        return () => clearTimeout(timer)
    }, [imgSrc])

    // ============================================
    // Animation Variants
    // ============================================

    const containerVariants = {
        idle: {
            y: animConfig.floating.enabled ? animConfig.floating.y : [0],
            rotate: animConfig.floating.enabled ? animConfig.floating.rotate : [0],
            transition: {
                duration: animConfig.floating.duration,
                repeat: Infinity,
                ease: 'easeInOut',
            },
        },
        hover: {
            scale: 1.1,
            y: -16,
            transition: {
                type: 'spring',
                stiffness: 300,
                damping: 20,
            },
        },
        tap: {
            scale: 0.85,
            rotate: -5,
            transition: {
                type: 'spring',
                stiffness: 500,
                damping: 15,
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
                ease: [0.4, 0.0, 0.6, 1],
            },
        },
    }

    // Handle Clean/Heal Interaction
    const handleHeal = async (e: React.MouseEvent) => {
        e.stopPropagation()
        // Call soothe API which handles healing/cleaning
        await useChickStore.getState().soothe()
        // Force refresh status
        await fetchStatus()
    }

    // Don't render chick widget when exploring
    // if (isExploring) {
    //     return (
    //         <>
    //             <ChickInteractionManager />
    //             <ChickInteractionModal
    //                 isOpen={showInteractionModal}
    //                 onClose={() => setShowInteractionModal(false)}
    //             />
    //         </>
    //     )
    // }

    return (
        <>
            {/* 統一的互動管理器 */}
            <ChickInteractionManager />

            {/* Minimalist Floating Chick - No Background, No Buttons */}
            <div className="fixed bottom-[calc(var(--tab-bar-height,64px)+1.5rem)] right-6 z-40 pointer-events-none">
                {/* Speech Bubble - positioned outside button to prevent clipping */}
                <div className="absolute bottom-full right-0 mb-6 pointer-events-none">
                    {/* Status Indicators (Hunger / Exploring / Returned) */}
                    <ChickStatusIndicators
                        status={
                            isReturned ? 'returned' :
                                isExploring ? 'exploring' :
                                    hunger < 30 ? 'hungry' : null
                        }
                        onClick={() => setShowInteractionModal(true)}
                    />

                    {!isExploring && (
                        <ChickSpeechBubble
                            message={getCurrentMessage()?.text ?? null}
                            visible={speechBubbleVisible}
                            onHide={hideSpeechBubble}
                            persistent={getCurrentMessage()?.persistent}
                            priority={getCurrentMessage()?.priority}
                            onDismiss={hideSpeechBubble}
                            onClick={() => {
                                hideSpeechBubble()
                                setShowInteractionModal(true)
                            }}
                            cta={hunger < 30 ? {
                                label: '餵食',
                                onClick: async () => {
                                    hideSpeechBubble()
                                    setParticleTrigger(prev => prev + 1) // Trigger particles
                                    await feed()
                                }
                            } : undefined}
                        />
                    )}
                </div>

                {/* Streak Badge - shown in top-right corner */}
                {streakDays > 0 && (
                    <div className="absolute -top-1 -right-1 z-10 pointer-events-none">
                        <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-orange-400 to-red-500 rounded-full border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
                            <span className="text-[10px] font-bold text-white">
                                {streakDays}d
                            </span>
                        </div>
                    </div>
                )}

                {/* Subtle glow background */}
                <div
                    className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-200/12 via-transparent to-transparent blur-[32px]"
                    style={{ transform: 'scale(1.25)' }}
                />

                <motion.button
                    initial="idle"
                    animate={isHovered ? 'hover' : 'idle'}
                    whileTap="tap"
                    variants={containerVariants}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={(e) => {
                        // 單擊直接打開 Chick Care 頁面
                        e.stopPropagation()
                        setParticleTrigger(prev => prev + 1)
                        // Small delay to let particle animation start before modal opens
                        setTimeout(() => setShowInteractionModal(true), 150)
                    }}
                    className="pointer-events-auto relative flex h-28 w-28 items-center justify-center focus:outline-none cursor-pointer"
                    aria-label="Open Chick Companion"
                    style={{ willChange: 'transform' }}
                >
                    {/* Ground shadow */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/2 bottom-1 h-4 w-16 -translate-x-1/2 rounded-full bg-[rgba(60,40,20,0.06)] blur-lg" />
                    </div>

                    {/* Idle Animation Wrapper */}
                    <motion.div animate={idleControls} className="w-full h-full">

                        {/* Pure Chick Image with Breathing */}
                        <motion.div
                            variants={breathingVariants}
                            animate="idle"
                            className="relative h-full w-full"
                            style={{ willChange: 'transform', position: 'relative' }}
                        >
                            {/* Buff Halo (Well Fed) */}
                            {isWellFed && !isExploring && (
                                <motion.div
                                    animate={{ opacity: [0.12, 0.2, 0.12], scale: [1, 1.06, 1] }}
                                    transition={{ duration: 2.4, repeat: Infinity }}
                                    className="absolute inset-0 bg-yellow-300/25 rounded-full blur-xl -z-10"
                                />
                            )}

                            <motion.div animate={shakeControls} className="h-full w-full relative">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={imgSrc}
                                        initial={{ opacity: 0, scale: 0.9, filter: 'brightness(1.5)' }}
                                        animate={{ opacity: 1, scale: 1, filter: 'brightness(1)' }}
                                        exit={{ opacity: 0, scale: 1.1 }}
                                        transition={{ duration: 0.5 }}
                                        className="absolute inset-0"
                                    >
                                        <Image
                                            src={imgSrc}
                                            alt="Chick Companion"
                                            fill
                                            className="object-contain"
                                            priority
                                            quality={100}
                                            sizes="112px"
                                            style={{
                                                filter: 'brightness(1.02) contrast(1.05) drop-shadow(0 10px 18px rgba(58, 44, 24, 0.14)) drop-shadow(0 4px 10px rgba(214, 181, 120, 0.18))',
                                                mixBlendMode: 'normal',
                                            }}
                                        />
                                    </motion.div>
                                </AnimatePresence>
                            </motion.div>
                        </motion.div>

                        {/* Particles Layer */}
                        <ChickParticles trigger={particleTrigger} />

                        {/* Exploration Overlay (Signpost or Gift) */}
                        {isExploring && !isReturned && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-full">
                                {/* Icon is now handled by StatusIndicators, this is just a subtle dimming */}
                            </div>
                        )}

                        {/* Sick/Runaway Overlays */}
                        {(emotionState === 'sick' || emotionState === 'runaway') && !isExploring && (
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                                <button
                                    className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg hover:bg-green-600 active:scale-95"
                                >
                                    {emotionState === 'sick' ? '治療' : '召回'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </motion.button>
            </div>

            {/* Interaction Modal */}
            <ChickInteractionModal
                isOpen={showInteractionModal}
                onClose={() => setShowInteractionModal(false)}
            />
        </>
    )
}
