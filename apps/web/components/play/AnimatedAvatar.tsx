'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { getAvatarPreset, getDefaultAvatar } from '@/lib/avatar/presets'

// 導出 OpponentStatus 類型供其他組件使用
export type OpponentStatus = 'idle' | 'thinking' | 'locked' | 'hit' | 'miss'

/**
 * 🎮 Super Mario 風格動畫頭像
 *
 * 特色:
 * - CSS Sprite 式表情切換
 * - 彈跳/縮放動畫
 * - 狀態驅動表情
 * - 粒子效果反饋
 */

interface AnimatedAvatarProps {
  /** 玩家名稱 */
  name?: string
  /** 當前狀態 */
  status: OpponentStatus
  /** 頭像尺寸 */
  size?: 'sm' | 'md' | 'lg'
  /** 是否顯示狀態徽章 */
  showBadge?: boolean
  /** Avatar preset ID (精靈頭像ID) */
  presetId?: string
  /** 是否為玩家自己（true=用戶頭像, false=對手狐狸頭像） */
  isPlayer?: boolean
}

const sizeConfig = {
  sm: { container: 'h-14 w-14', emoji: 'text-2xl', badge: 'text-[10px] px-2 py-0.5' }, // 放大：從 h-9 w-9 改為 h-14 w-14
  md: { container: 'h-16 w-16', emoji: 'text-3xl', badge: 'text-[11px] px-2.5 py-0.5' }, // 放大：從 h-12 w-12 改為 h-16 w-16
  lg: { container: 'h-24 w-24', emoji: 'text-5xl', badge: 'text-sm px-3 py-1' }, // 放大：從 h-20 w-20 改為 h-24 w-24
}

/** 表情映射 */
// 🦊 狐狸表情映射（對手使用）
const foxExpressionMap: Record<OpponentStatus, { face: string; color: string; imageUrl?: string }> = {
  idle: { face: '🦊', color: '#87CEEB', imageUrl: '/opponents/fox-idle.png' },
  thinking: { face: '🤔', color: '#FFC727', imageUrl: '/opponents/fox-thinking.png' },
  locked: { face: '😼', color: '#9C27B0', imageUrl: '/opponents/fox-locked.png' },
  hit: { face: '😄', color: '#7EC850', imageUrl: '/opponents/fox-hit.png' },
  miss: { face: '😰', color: '#FF4444', imageUrl: '/opponents/fox-miss.png' },
}

// 玩家表情映射
const playerExpressionMap: Record<OpponentStatus, { face: string; color: string }> = {
  idle: { face: '🙂', color: '#87CEEB' },
  thinking: { face: '🤔', color: '#FFC727' },
  locked: { face: '😼', color: '#9C27B0' },
  hit: { face: '😄', color: '#7EC850' },
  miss: { face: '😰', color: '#FF4444' },
}

export function AnimatedAvatar({ name, status, size = 'md', showBadge = true, presetId, isPlayer = false }: AnimatedAvatarProps) {
  const config = sizeConfig[size]
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  // 🎯 如果是玩家且沒有預設頭像，自動使用月光精靈 (白色精靈 - 適合 onboarding)
  const effectivePresetId = isPlayer && !presetId ? 'fairy-white' : presetId

  // Get preset avatar if presetId is provided
  const preset = effectivePresetId ? getAvatarPreset(effectivePresetId) : null

  // 🎯 根據 isPlayer 選擇不同的表情映射
  // ✅ 修復：使用明確的類型標註以避免聯合類型推斷問題
  const foxExpression = foxExpressionMap[status]
  const playerExpression = playerExpressionMap[status]
  const expression = isPlayer ? playerExpression : foxExpression

  // 答對/答錯時生成粒子
  useEffect(() => {
    if (status === 'hit' || status === 'miss') {
      const newParticles = Array.from({ length: 6 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => setParticles([]), 1000)
      return () => clearTimeout(timer)
    }
  }, [status])

  // 狀態動畫配置
  const avatarAnimation = {
    idle: { scale: 1, rotate: 0 },
    thinking: { scale: [1, 1.05, 1], rotate: [-2, 2, -2, 0] },
    locked: { scale: 1.1, rotate: 0 },
    hit: { scale: [1, 1.3, 1.1], rotate: [0, 10, -10, 0] },
    miss: { scale: [1, 0.9, 1.05, 1], rotate: [0, -5, 5, 0] },
  }

  const containerAnimation = avatarAnimation[status]

  return (
    <div className="relative inline-block">
      {/* 主頭像容器 */}
      <motion.div
        className={`relative flex ${config.container} items-center justify-center overflow-hidden rounded-2xl border-4 shadow-lg`}
        style={{
          borderColor: expression.color,
          background: preset ? 'transparent' : `linear-gradient(135deg, ${expression.color}20, ${expression.color}10)`,
        }}
        animate={containerAnimation}
        transition={{
          duration: status === 'thinking' ? 1.5 : 0.5,
          repeat: status === 'thinking' ? Infinity : 0,
          ease: status === 'hit' || status === 'miss' ? [0.68, -0.55, 0.265, 1.55] : 'easeInOut',
        }}
      >
        {/* 背景光暈 (hit/miss時) */}
        <AnimatePresence>
          {(status === 'hit' || status === 'miss') && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: `radial-gradient(circle, ${expression.color}60, transparent)`,
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 2, opacity: [0, 0.8, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>

        {/* 頭像內容 */}
        {preset ? (
          <motion.div
            className="relative flex h-full w-full items-center justify-center"
            key={status}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <img
              src={preset.imageUrl}
              alt={preset.name}
              className="h-full w-full object-contain rounded-xl"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.emoji-fallback');
                if (fallback) {
                  (fallback as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div className={`emoji-fallback absolute inset-0 flex items-center justify-center ${config.emoji}`} style={{ display: 'none' }}>
              {preset.emoji}
            </div>
          </motion.div>
        ) : !isPlayer && foxExpression.imageUrl ? (
          // 🎯 對手使用 fox 系列 PNG 圖片 - 放大容器顯示頭部
          <motion.div
            className="relative flex items-center justify-center overflow-hidden"
            key={`fox-${status}`}
            style={{
              width: '140%', // 放大整個容器 1.4 倍
              height: '140%',
              margin: '-20%', // 負邊距讓放大後的容器居中
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <img
              src={foxExpression.imageUrl}
              alt="Fox Opponent"
              className="h-full w-full rounded-xl"
              style={{
                objectFit: 'cover',
                objectPosition: 'center 30%', // 定位到頭部區域（顯示更多頭部內容）
              }}
              onError={(e) => {
                // Fallback to emoji if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.parentElement?.querySelector('.emoji-fallback');
                if (fallback) {
                  (fallback as HTMLElement).style.display = 'flex';
                }
              }}
            />
            <div className={`emoji-fallback absolute inset-0 flex items-center justify-center ${config.emoji}`} style={{ display: 'none' }}>
              {expression.face}
            </div>
          </motion.div>
        ) : (
          // 🎯 玩家顯示 emoji
          <motion.div
            className={config.emoji}
            key={`${status}-${isPlayer ? 'player' : 'fox'}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {expression.face}
          </motion.div>
        )}

        {/* 思考中的省略號動畫 */}
        {status === 'thinking' && (
          <motion.div
            className="absolute bottom-1 right-1 flex gap-0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-white/80"
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* 粒子爆發 (答對/答錯) */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: particle.x,
              y: particle.y,
              scale: status === 'hit' ? 1.5 : 0.8,
              opacity: 0,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{
                background: status === 'hit' ? '#7EC850' : '#FF4444',
                boxShadow: `0 0 8px ${status === 'hit' ? '#7EC850' : '#FF4444'}`,
              }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 狀態徽章 */}
      {showBadge && status !== 'idle' && status !== 'locked' && (
        <motion.div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 font-bold shadow-md ${config.badge}`}
          style={{
            borderColor: expression.color,
            background: `${expression.color}E6`,
            color: status === 'thinking' ? '#2C1810' : 'white',
          }}
          initial={{ y: 10, opacity: 0, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 10, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {status === 'thinking' && '思考中'}
          {status === 'hit' && '答對!'}
          {status === 'miss' && '答錯'}
        </motion.div>
      )}

      {/* 玩家名稱標籤 */}
      {name && (
        <div className="mt-2 text-center text-xs font-semibold text-white/80">
          {name}
        </div>
      )}
    </div>
  )
}

/**
 * 🎯 對戰雙頭像組 (你 vs 對手)
 */
export function BattleAvatarPair({
  playerName = '你',
  opponentName = '對手',
  playerStatus = 'idle',
  opponentStatus = 'idle',
}: {
  playerName?: string
  opponentName?: string
  playerStatus?: OpponentStatus
  opponentStatus?: OpponentStatus
}) {
  return (
    <div className="flex items-center justify-center gap-8">
      {/* 玩家頭像 */}
      <div className="flex flex-col items-center gap-2">
        <AnimatedAvatar name={playerName} status={playerStatus} size="lg" />
        <div className="rounded-full border-2 border-blue-400 bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-100">
          Player 1
        </div>
      </div>

      {/* VS 標識 */}
      <motion.div
        className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/30 bg-gradient-to-br from-yellow-400 to-orange-500 text-2xl font-black text-white shadow-lg"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        VS
      </motion.div>

      {/* 對手頭像 */}
      <div className="flex flex-col items-center gap-2">
        <AnimatedAvatar name={opponentName} status={opponentStatus} size="lg" />
        <div className="rounded-full border-2 border-red-400 bg-red-500/20 px-3 py-1 text-xs font-bold text-red-100">
          Player 2
        </div>
      </div>
    </div>
  )
}
