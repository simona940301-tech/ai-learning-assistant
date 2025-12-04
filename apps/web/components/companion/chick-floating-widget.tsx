'use client'

import { motion, useAnimation, AnimatePresence, useScroll } from 'framer-motion'
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
import { useEnergyStatus } from '@/lib/hooks/useEnergyStatus'

// ============================================
// 🎯 (D) Chick 行為引擎：從裝飾變成行為引導
// ============================================

/**
 * 根據 Chick 狀態和能量狀態生成行為提示
 */
function useChickBehaviorPrompts() {
  const { hunger, emotionState, iq, fatigue } = useChickStore()
  const { energy, maxEnergy } = useEnergyStatus()

  return useMemo(() => {
    const prompts: Array<{ condition: boolean; message: string; priority: 'high' | 'medium' | 'low' }> = []

    // 🔴 高優先級：餓了 → 提示去打對戰賺飼料
    if (hunger > 70) {
      prompts.push({
        condition: true,
        message: '我好餓... 去完成一場對戰來賺飼料吧！',
        priority: 'high'
      })
    }

    // 🟡 中優先級：心情差 → 提示去做錯題複習
    if (emotionState === 'sad' || emotionState === 'cold') {
      prompts.push({
        condition: true,
        message: '心情有點糟... 去做 5 題錯題複習讓我開心一點吧！',
        priority: 'medium'
      })
    }

    // 🟡 中優先級：能量不足警告
    if (energy <= 2 && energy > 0) {
      prompts.push({
        condition: true,
        message: '再打一場你就沒體力了，建議先休息或買能量包喔！',
        priority: 'medium'
      })
    }

    // 🟢 低優先級：能量滿了
    if (energy === maxEnergy) {
      prompts.push({
        condition: true,
        message: '能量滿了！趕快去對戰吧，不然就浪費了～',
        priority: 'low'
      })
    }

    // 根據優先級排序
    prompts.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })

    return prompts.filter(p => p.condition)[0] || null
  }, [hunger, emotionState, energy, maxEnergy])
}

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

function getAnimationConfig(
  emotionState: ChickEmotion,
  fatigue: number,
  iq: number
): AnimationConfig {
  if (emotionState === 'hibernate') {
    return {
      breathing: { scaleY: [1, 1.03, 1], scaleX: [1, 0.99, 1], duration: 4.5 },
      floating: { enabled: false, y: [0], rotate: [0], duration: 0 },
    }
  }

  if (emotionState === 'cold') {
    return {
      breathing: { scaleY: [1, 1.04, 1], scaleX: [1, 0.98, 1], duration: 2.5 },
      floating: { enabled: false, y: [0], rotate: [0], duration: 0 },
      shake: { enabled: true, intensity: 2 },
    }
  }

  if (fatigue >= 2) {
    return {
      breathing: { scaleY: [1, 1.04, 1], scaleX: [1, 0.98, 1], duration: 3.5 },
      floating: { enabled: true, y: [0, -6, 0], rotate: [0, 1, -1, 0], duration: 5 },
    }
  }

  return {
    breathing: { scaleY: [1, 1.05, 1], scaleX: [1, 0.98, 1], duration: 2.5 },
    floating: { enabled: true, y: [0, -12, 0], rotate: [0, 2, -2, 0], duration: 4 },
  }
}

// ============================================
// 🎯 Chick Floating Widget with Scroll Behavior
// ============================================

export function ChickFloatingWidget({ forceState }: { forceState?: ChickEmotion }) {
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

  const isWellFed = hunger < 30
  const emotionState = forceState || storeEmotionState

  // 🎯 Scroll behavior: 64px → 40px
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollY } = useScroll()

  useEffect(() => {
    return scrollY.on('change', (latest) => {
      setIsScrolled(latest > 100) // 滾動超過 100px 時縮小
    })
  }, [scrollY])

  const widgetSize = isScrolled ? 40 : 64
  const widgetSizePx = `${widgetSize}px`

  const [isHovered, setIsHovered] = useState(false)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [idleAnimation, setIdleAnimation] = useState<'jump' | 'spin' | null>(null)
  const [particleTrigger, setParticleTrigger] = useState(0)
  const [flash, setFlash] = useState(false)
  const isMountedRef = useRef(false)
  const shakeControls = useAnimation()
  const idleControls = useAnimation()

  // 🎯 行為提示系統
  const behaviorPrompt = useChickBehaviorPrompts()

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

  // Random Idle Animations
  useEffect(() => {
    if (isExploring || !isMountedRef.current || isScrolled) return

    const triggerIdleAnimation = async () => {
      if (!isMountedRef.current) return

      const type = Math.random() > 0.5 ? 'jump' : 'spin'
      setIdleAnimation(type)

      if (type === 'jump') {
        await idleControls.start({
          y: [0, -20, 0],
          transition: { duration: 0.5, ease: 'easeOut' },
        })
      } else {
        await idleControls.start({
          rotate: [0, 360],
          transition: { duration: 0.6, ease: 'easeInOut' },
        })
      }

      setIdleAnimation(null)
      if (isMountedRef.current) {
        idleControls.set({ y: 0, rotate: 0 })
      }
    }

    const interval = setInterval(() => {
      if (Math.random() < 0.2 && isMountedRef.current) {
        void triggerIdleAnimation()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [isExploring, isScrolled, idleControls])

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
    emotionState,
  }

  const imgSrc = getChickImagePath(chickState)

  // Trigger flash on emotion change
  useEffect(() => {
    setFlash(true)
    const timer = setTimeout(() => setFlash(false), 500)
    return () => clearTimeout(timer)
  }, [imgSrc])

  // Animation Variants
  const containerVariants = {
    idle: {
      y: animConfig.floating.enabled && !isScrolled ? animConfig.floating.y : [0],
      rotate: animConfig.floating.enabled && !isScrolled ? animConfig.floating.rotate : [0],
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

  // 🎯 優先顯示行為提示或系統訊息
  const displayMessage = behaviorPrompt?.message || getCurrentMessage()?.text || null
  const displayPriority = behaviorPrompt ? behaviorPrompt.priority : getCurrentMessage()?.priority || 'low'

  return (
    <>
      <ChickInteractionManager />

      {/* 🎯 Floating Widget - 滾動時縮小並移動到角落 */}
      <div
        className="fixed z-40 pointer-events-none transition-all duration-300 ease-out"
        style={{
          bottom: isScrolled
            ? 'calc(var(--tab-bar-height, 64px) + 0.75rem)' // 滾動時貼近 TabBar
            : 'calc(var(--tab-bar-height, 64px) + 1.5rem)', // 正常時有間距
          right: isScrolled ? '1rem' : '1.5rem', // 滾動時靠右
        }}
      >
        {/* Speech Bubble - 只在未滾動時顯示 */}
        {!isScrolled && (
          <div className="absolute bottom-full right-0 mb-6 pointer-events-none">
            <ChickStatusIndicators
              status={
                isReturned ? 'returned' : isExploring ? 'exploring' : hunger < 30 ? 'hungry' : null
              }
              onClick={() => setShowInteractionModal(true)}
            />

            {!isExploring && (
              <ChickSpeechBubble
                message={displayMessage}
                visible={speechBubbleVisible || !!behaviorPrompt}
                onHide={hideSpeechBubble}
                persistent={getCurrentMessage()?.persistent}
                priority={displayPriority as 'low' | 'medium' | 'high'}
                onDismiss={hideSpeechBubble}
                onClick={() => {
                  hideSpeechBubble()
                  setShowInteractionModal(true)
                }}
                cta={
                  hunger < 30
                    ? {
                        label: '餵食',
                        onClick: async () => {
                          hideSpeechBubble()
                          setParticleTrigger((prev) => prev + 1)
                          await feed()
                        },
                      }
                    : undefined
                }
              />
            )}
          </div>
        )}

        {/* Streak Badge - 只在未滾動時顯示 */}
        {streakDays > 0 && !isScrolled && (
          <div className="absolute -top-1 -right-1 z-10 pointer-events-none">
            <div className="flex items-center justify-center w-7 h-7 bg-gradient-to-br from-orange-400 to-red-500 rounded-full border-2 border-white shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
              <span className="text-[10px] font-bold text-white">{streakDays}d</span>
            </div>
          </div>
        )}

        {/* Subtle glow background - 滾動時移除 */}
        {!isScrolled && (
          <div
            className="absolute inset-0 rounded-full bg-gradient-radial from-yellow-200/12 via-transparent to-transparent blur-[32px]"
            style={{ transform: 'scale(1.25)' }}
          />
        )}

        <motion.button
          initial="idle"
          animate={isHovered && !isScrolled ? 'hover' : 'idle'}
          whileTap="tap"
          variants={containerVariants}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            e.stopPropagation()
            setParticleTrigger((prev) => prev + 1)
            setTimeout(() => setShowInteractionModal(true), 150)
          }}
          className="pointer-events-auto relative flex items-center justify-center focus:outline-none cursor-pointer transition-all duration-300"
          style={{
            width: widgetSizePx,
            height: widgetSizePx,
            willChange: 'transform',
          }}
          aria-label="Open Chick Companion"
        >
          {/* Ground shadow - 滾動時縮小 */}
          {!isScrolled && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 bottom-1 h-4 w-16 -translate-x-1/2 rounded-full bg-[rgba(60,40,20,0.06)] blur-lg" />
            </div>
          )}

          <motion.div animate={idleControls} className="w-full h-full">
            <motion.div
              variants={breathingVariants}
              animate="idle"
              className="relative h-full w-full"
              style={{ willChange: 'transform', position: 'relative' }}
            >
              {/* Buff Halo (Well Fed) - 滾動時移除 */}
              {isWellFed && !isExploring && !isScrolled && (
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
                      sizes={widgetSizePx}
                      style={{
                        filter:
                          'brightness(1.02) contrast(1.05) drop-shadow(0 10px 18px rgba(58, 44, 24, 0.14)) drop-shadow(0 4px 10px rgba(214, 181, 120, 0.18))',
                        mixBlendMode: 'normal',
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.div>

            {/* Particles Layer - 滾動時移除 */}
            {!isScrolled && <ChickParticles trigger={particleTrigger} />}

            {/* Exploration Overlay */}
            {isExploring && !isReturned && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-full" />
            )}

            {/* Sick/Runaway Overlays - 只在未滾動時顯示 */}
            {(emotionState === 'sick' || emotionState === 'runaway') && !isExploring && !isScrolled && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
                <button className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white shadow-lg hover:bg-green-600 active:scale-95">
                  {emotionState === 'sick' ? '治療' : '召回'}
                </button>
              </div>
            )}
          </motion.div>
        </motion.button>
      </div>

      {/* Interaction Modal */}
      <ChickInteractionModal isOpen={showInteractionModal} onClose={() => setShowInteractionModal(false)} />
    </>
  )
}
