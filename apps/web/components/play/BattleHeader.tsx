'use client'

import { motion } from 'framer-motion'
import { AnimatedAvatar, type OpponentStatus } from './AnimatedAvatar'

// ============================================
// Types
// ============================================

export interface PlayerPillProps {
  side: 'left' | 'right'
  label: string
  score: number
  status: OpponentStatus
  presetId?: string | null
  streak?: number
}

export interface RoundProgressBarProps {
  currentRound: number
  totalRounds: number
}

export interface BattleHeaderProps {
  playerLabel: string
  playerScore: number
  playerStatus: OpponentStatus
  playerPresetId?: string | null
  opponentLabel: string
  opponentScore: number
  opponentStatus: OpponentStatus
  currentRound: number
  totalRounds: number
  playerStreak?: number
  opponentStreak?: number
  timeRemaining?: number
  timeLimit?: number
}

// ============================================
// PlayerPill Component - 極簡玩家卡片
// ============================================

function PlayerPill({ side, label, score, status, presetId, streak = 0, isPlayer = false }: PlayerPillProps & { isPlayer?: boolean }) {
  const isLeft = side === 'left'

  // 狀態顏色映射
  const statusColors: Record<OpponentStatus, string> = {
    idle: 'bg-amber-600/20',
    thinking: 'bg-amber-500/40 animate-pulse',
    locked: 'bg-amber-400/40',
    hit: 'bg-amber-300/60',
    miss: 'bg-orange-500/40',
  }

  // 狀態文字
  const statusText: Record<OpponentStatus, string> = {
    idle: '',
    thinking: '思考中',
    locked: '',
    hit: '✓',
    miss: '✗',
  }

  return (
    <motion.div
      className={`flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 px-2.5 py-1.5 ${isLeft ? 'flex-row' : 'flex-row-reverse'
        }`}
      initial={{ opacity: 0, x: isLeft ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Streak Glow Effect - Minimalist */}
      {streak > 1 && (
        <motion.div
          className="absolute inset-0 rounded-full bg-amber-400/30 blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Avatar - 縮小glow */}
      <div className="relative">
        <AnimatedAvatar status={status} size="sm" presetId={presetId} isPlayer={isPlayer} />
      </div>

      {/* Score - 極簡（移除 label） */}
      <div className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}>
        <span className="text-sm font-bold text-amber-900 leading-tight">{score}</span>
        {streak > 1 && (
          <motion.span
            className="text-[8px] font-bold text-amber-600"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            {streak}x
          </motion.span>
        )}
      </div>

      {/* Status Indicator */}
      {status !== 'idle' && (
        <motion.div
          className={`absolute ${isLeft ? 'left-0.5' : 'right-0.5'} bottom-0.5 h-1.5 w-1.5 rounded-full ${statusColors[status]
            }`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}

      {/* Status Text (for hit/miss only) */}
      {(status === 'hit' || status === 'miss') && (
        <motion.span
          className="text-[8px] font-semibold text-amber-800/80"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {statusText[status]}
        </motion.span>
      )}
    </motion.div>
  )
}

// ============================================
// RoundProgressBar - 回合進度條
// ============================================

function RoundProgressBar({ currentRound, totalRounds }: RoundProgressBarProps) {
  const progress = (currentRound / totalRounds) * 100

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Round Text */}
      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/70">
        Round {currentRound}/{totalRounds}
      </span>

      {/* Progress Bar with Marks */}
      <div className="relative h-1 w-28 overflow-hidden rounded-full bg-amber-200/30">
        {/* 刻度標記 */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: totalRounds }).map((_, idx) => (
            <div
              key={idx}
              className={`h-full ${idx < currentRound
                ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400'
                : 'bg-transparent'
                }`}
              style={{ width: `${100 / totalRounds}%` }}
            >
              {/* 刻度點 */}
              <div
                className={`h-full w-full ${idx < currentRound
                  ? 'bg-amber-600/40'
                  : idx === currentRound - 1
                    ? 'bg-amber-700/60'
                    : 'bg-amber-300/20'
                  }`}
              />
            </div>
          ))}
        </div>

        {/* 進度填充 */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

// ============================================
// BattleHeader - 主頭部組件
// ============================================

export function BattleHeader({
  playerLabel,
  playerScore,
  playerStatus,
  playerPresetId,
  opponentLabel,
  opponentScore,
  opponentStatus,
  currentRound,
  totalRounds,
  playerStreak = 0,
  opponentStreak = 0,
  timeRemaining = 0,
  timeLimit = 30,
  opponentPresetId,
}: BattleHeaderProps & { opponentPresetId?: string | null }) {
  // 🎯 Phase C: HUD 一條搞定 - 極簡 Sticky Bar + Avatar
  // 左邊：玩家Avatar + 分數，中間：時間，右邊：對手Avatar + 分數
  const isTimeWarning = timeRemaining <= 5
  const timePercentage = (timeRemaining / timeLimit) * 100

  return (
    <div className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-amber-200/30 bg-gradient-to-r from-amber-50 to-yellow-50/95 backdrop-blur-sm px-3 py-2.5 md:px-4">
      {/* 左邊：玩家 Avatar + 分數/連擊 */}
      <div className="flex items-center gap-2">
        {/* 玩家 Avatar */}
        <div className="relative">
          <AnimatedAvatar status={playerStatus} size="sm" presetId={playerPresetId} isPlayer={true} />
          {/* Streak Glow */}
          {playerStreak > 1 && (
            <motion.div
              className="absolute inset-0 rounded-full bg-amber-400/30 blur-md -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
        
        {/* 分數/連擊 */}
        <div className="flex items-center gap-1.5 rounded-full bg-white/60 border border-amber-200 px-2.5 py-1">
          <span className="text-sm font-bold text-amber-900 tabular-nums">{playerScore}</span>
          {playerStreak > 1 && (
            <motion.span
              className="text-xs font-bold text-amber-600"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {playerStreak}x
            </motion.span>
          )}
        </div>
      </div>

      {/* 中間：倒數時間 */}
      <div className="flex items-center gap-2">
        <motion.div
          className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
            isTimeWarning
              ? 'bg-orange-100/80 border-orange-300'
              : 'bg-white/60 border-amber-200'
          }`}
          animate={{
            scale: isTimeWarning ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 0.8,
            repeat: isTimeWarning ? Infinity : 0,
          }}
        >
          <motion.span
            className={`text-sm font-bold tabular-nums ${
              isTimeWarning ? 'text-orange-600' : 'text-amber-900'
            }`}
          >
            {timeRemaining}s
          </motion.span>
          {/* 小進度條 */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-200/30 overflow-hidden">
            <motion.div
              className={isTimeWarning ? 'bg-orange-500' : 'bg-amber-400'}
              initial={{ width: '100%' }}
              animate={{ width: `${timePercentage}%` }}
              transition={{ duration: 1, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>

      {/* 右邊：對手 Avatar + 分數/連擊 */}
      <div className="flex items-center gap-2 flex-row-reverse">
        {/* 對手 Avatar */}
        <div className="relative">
          <AnimatedAvatar status={opponentStatus} size="sm" presetId={opponentPresetId} isPlayer={false} />
          {/* Streak Glow */}
          {opponentStreak > 1 && (
            <motion.div
              className="absolute inset-0 rounded-full bg-purple-400/30 blur-md -z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
        
        {/* 分數/連擊 */}
        <div className="flex items-center gap-1.5 rounded-full bg-white/60 border border-purple-200 px-2.5 py-1">
          <span className="text-sm font-bold text-purple-900 tabular-nums">{opponentScore}</span>
          {opponentStreak > 1 && (
            <motion.span
              className="text-xs font-bold text-purple-600"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              {opponentStreak}x
            </motion.span>
          )}
        </div>
      </div>
    </div>
  )
}
