"use client"

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getChickImagePath } from './chickImage'
import type { ChickState, ChickEmotion } from '@/packages/server/chick/types'
import { useChickStore } from '@/src/store/chickStore'
import { motion, useAnimation } from 'framer-motion'
import { ChickInteractionModal } from './ChickInteractionModal'

export function ChickAvatar() {
  const {
    iq,
    fatigue,
    emotionState,
    messagesUnreadCount,
    hasFetchedStatus,
    statusLoading,
    fetchStatus,
    soothe,
    tempReaction,
  } = useChickStore(state => ({
    iq: state.iq,
    fatigue: state.fatigue,
    emotionState: state.emotionState,
    messagesUnreadCount: state.messagesUnreadCount,
    hasFetchedStatus: state.hasFetchedStatus,
    statusLoading: state.statusLoading,
    fetchStatus: state.fetchStatus,
    soothe: state.soothe,
    tempReaction: state.tempReaction,
  }))

  const [showModal, setShowModal] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)
  const controls = useAnimation()

  useEffect(() => {
    if (!hasFetchedStatus && !statusLoading) {
      void fetchStatus()
    }
  }, [hasFetchedStatus, statusLoading, fetchStatus])

  const chickState: ChickState = {
    iq,
    fatigue,
    emotionState: (tempReaction?.emotion as ChickEmotion) || emotionState,
  }

  const src = getChickImagePath(chickState)

  const handleInteraction = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowModal(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInteraction}
        className="relative inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 p-1 shadow-lg backdrop-blur-sm transition hover:bg-white/10"
        aria-label="Soothe chick"
      >
        <motion.div
          animate={{
            rotate: [0, -2, 0, 2, 0],
            y: [0, -1, 0, -1, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <Image
            src={src}
            alt="Chick avatar"
            width={48}
            height={48}
            className="h-10 w-10 object-contain filter saturate-[0.85] brightness-[0.95] drop-shadow-[0_0_8px_rgba(255,255,255,0.15)]"
            priority
          />
        </motion.div>

        {messagesUnreadCount > 0 && (
          <span className="absolute right-0 top-0 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
            {messagesUnreadCount > 9 ? '9+' : messagesUnreadCount}
          </span>
        )}
      </button>

      <ChickInteractionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
