'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { ChickSpeechBubble } from './ChickSpeechBubble'
import Image from 'next/image'
import { getChickImagePath } from './chickImage'

type ChickGuideProps = {
  targetSelector: string
  message: string
  persistent?: boolean
  priority?: 'low' | 'medium' | 'high'
  onDismiss?: () => void
}

export function ChickGuide({
  targetSelector,
  message,
  persistent = true,
  priority = 'medium',
  onDismiss,
}: ChickGuideProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)

  const origin = useMemo(
    () => ({
      x: typeof window !== 'undefined' ? window.innerWidth - 96 : 0,
      y: typeof window !== 'undefined' ? window.innerHeight - 180 : 0,
    }),
    []
  )

  useEffect(() => {
    setMounted(true)
    const update = () => {
      const el = document.querySelector(targetSelector)
      if (el) {
        setTargetRect(el.getBoundingClientRect())
      }
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [targetSelector])

  if (!mounted || !targetRect) return null

  const targetX = targetRect.left + targetRect.width / 2
  const targetY = targetRect.top + targetRect.height / 2

  const bubbleX = targetRect.left + targetRect.width / 2
  const bubbleY = Math.max(targetRect.top - 16, 24)

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Chick flying */}
      <motion.div
        initial={{ x: origin.x, y: origin.y, scale: 0.9, opacity: 0 }}
        animate={{ x: targetX, y: targetY, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        className="pointer-events-auto"
      >
        <div className="w-16 h-16 relative drop-shadow-lg">
          <Image
            src={getChickImagePath({ iq: 5, fatigue: 0, emotionState: 'normal' })}
            alt="Chick guide"
            fill
            className="object-contain"
          />
        </div>
      </motion.div>

      {/* Bubble anchored to target */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ position: 'fixed', left: bubbleX, top: bubbleY, transform: 'translate(-50%, -100%)' }}
        className="pointer-events-auto"
      >
        <ChickSpeechBubble
          message={message}
          visible
          onHide={() => onDismiss?.()}
          onDismiss={onDismiss}
          persistent={persistent}
          priority={priority}
          dismissLabel="知道了"
        />
      </motion.div>
    </div>,
    document.body
  )
}
