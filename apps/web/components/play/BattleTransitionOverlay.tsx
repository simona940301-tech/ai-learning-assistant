'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { usePlay } from '@/lib/play-context'

interface BattleTransitionOverlayProps {
  variant: 'pve-countdown' | 'syncing'
  countdown?: number | null
  matchId?: string | null
  questionCount?: number
  enableSkip?: boolean
  onSkipCountdown?: () => void
}

const mantraSequence = [
  { title: '深呼吸', detail: '放鬆肩頸，準備進入節奏' },
  { title: '專注', detail: '視線鎖定題幹與關鍵字' },
  { title: '衝刺', detail: '手指就位，準備鎖定答案' },
]

export function BattleTransitionOverlay({
  variant,
  countdown,
  matchId,
  questionCount,
  enableSkip,
  onSkipCountdown,
}: BattleTransitionOverlayProps) {
  const { systemMode } = usePlay()
  const displayCountdown = typeof countdown === 'number' && countdown > 0 ? countdown : 0

  // 判斷是否為系統對戰（PVE、RANKED、WEAKNESS_BATTLE）
  const isSystemBattle = useMemo(() => {
    return (
      systemMode === 'PVE_TRAINING' ||
      systemMode === 'RANKED' ||
      systemMode === 'WEAKNESS_BATTLE' ||
      variant === 'pve-countdown'
    )
  }, [systemMode, variant])

  const mantraIndex = useMemo(() => {
    return Math.min(mantraSequence.length - 1, Math.max(0, mantraSequence.length - displayCountdown))
  }, [displayCountdown])
  const activeMantra = mantraSequence[mantraIndex] || mantraSequence[mantraSequence.length - 1]

  // 空白鍵跳過倒數
  useEffect(() => {
    if (!enableSkip || !onSkipCountdown) return
    const handler = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        onSkipCountdown()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enableSkip, onSkipCountdown])

  // 系統對戰自動開始（不需要等待太久）
  // 但不要立即關閉，給玩家一點心理準備時間
  useEffect(() => {
    if (variant === 'syncing' && isSystemBattle && onSkipCountdown && matchId) {
      // 系統對戰時，有 matchId 後才自動進入（表示已匹配成功）
      const timer = setTimeout(() => {
        onSkipCountdown()
      }, 800) // 0.8秒後自動進入，給予極簡視覺反饋
      return () => clearTimeout(timer)
    }
  }, [variant, isSystemBattle, onSkipCountdown, matchId])

  // Syncing 變體（匹配完成後的極簡準備畫面）
  if (variant === 'syncing') {
    return (
      <motion.div
        className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-[#030711] via-[#050b1c] to-[#0c0f24] text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(91,124,255,0.35), transparent 70%)' }} />
        </div>

        <motion.div
          className="relative z-10 flex flex-col items-center gap-6 text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* High-end Minimalist "Portal" Animation */}
          <div className="relative h-32 w-32">
            {/* Outer Ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-[1px] border-white/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            {/* Middle Ring - Counter rotating */}
            <motion.div
              className="absolute inset-2 rounded-full border-[1px] border-blue-500/30"
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            {/* Inner Core - Pulsing */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="h-16 w-16 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 blur-md"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 0.9, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="absolute h-12 w-12 rounded-full bg-white"
                animate={{
                  scale: [0.8, 1, 0.8],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.2,
                }}
                style={{ mixBlendMode: 'overlay' }}
              />
            </div>

            {/* Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-blue-400"
                animate={{
                  x: [0, Math.cos(i * 60 * (Math.PI / 180)) * 50],
                  y: [0, Math.sin(i * 60 * (Math.PI / 180)) * 50],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>

          <div>
            <motion.h2
              className="text-3xl font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-white/80"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {isSystemBattle ? 'ENTERING' : 'MATCHING'}
            </motion.h2>
            <p className="mt-3 text-xs uppercase tracking-[0.3em] text-blue-300/60">
              {isSystemBattle ? 'System Link Established' : 'Searching for Opponent'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  // PVE Countdown 變體（保持原有的倒數功能）
  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-gradient-to-br from-[#030711] via-[#050b1c] to-[#0c0f24] text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(91,124,255,0.35), transparent 45%)' }} />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 80% 0%, rgba(92,225,230,0.25), transparent 55%)' }} />
      </div>

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-xl">
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Get Ready</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight">{activeMantra.title}</h2>
          <p className="mt-2 text-base text-white/60">{activeMantra.detail}</p>
        </div>

        <motion.div
          className="flex items-baseline gap-4 text-8xl font-black tracking-widest"
          key={displayCountdown}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {displayCountdown || 1}
          <span className="text-2xl text-white/50">秒</span>
        </motion.div>

        <div className="w-full max-w-md">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-purple-500"
              initial={{ width: '100%' }}
              animate={{ width: `${Math.max(5, (displayCountdown / (countdown || 1)) * 100)}%` }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-4 text-xs text-white/50">
            {enableSkip && '按空白鍵跳過 · '}即將開始對戰
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
