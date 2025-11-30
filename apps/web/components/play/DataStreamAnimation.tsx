'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * 🎮 Super Mario 風格數據流動畫
 *
 * 特色:
 * - 金幣/星星粒子流動
 * - 數字矩陣滾動
 * - 像素化數據條
 * - 彈跳進場動畫
 */

interface DataStreamAnimationProps {
  /** 是否播放 */
  active?: boolean
  /** 數據條數量 */
  streamCount?: number
  /** 顏色主題 */
  theme?: 'gold' | 'blue' | 'purple'
}

const themeConfig = {
  gold: {
    primary: '#FFD700',
    secondary: '#FFC727',
    particles: ['💰', '⭐', '🪙'],
  },
  blue: {
    primary: '#87CEEB',
    secondary: '#5CB3FF',
    particles: ['💎', '🔷', '✨'],
  },
  purple: {
    primary: '#9C27B0',
    secondary: '#BA68C8',
    particles: ['🌟', '💫', '⚡'],
  },
}

export function DataStreamAnimation({ active = true, streamCount = 6, theme = 'gold' }: DataStreamAnimationProps) {
  const colors = themeConfig[theme]

  const streams = useMemo(
    () =>
      Array.from({ length: streamCount }).map((_, i) => ({
        id: i,
        delay: (i / streamCount) * 2,
        offset: (i / streamCount) * 100,
        particle: colors.particles[i % colors.particles.length],
      })),
    [streamCount, colors.particles]
  )

  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 背景數字矩陣 */}
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 5 }).map((_, row) => (
          <motion.div
            key={`matrix-row-${row}`}
            className="flex gap-4 font-mono text-xs"
            style={{ color: colors.primary }}
            initial={{ x: row % 2 === 0 ? '-100%' : '100%' }}
            animate={{ x: row % 2 === 0 ? '100%' : '-100%' }}
            transition={{
              duration: 15 + row * 2,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {Array.from({ length: 30 }).map((_, col) => (
              <span key={`digit-${col}`} className="whitespace-nowrap">
                {Math.floor(Math.random() * 10)}
              </span>
            ))}
          </motion.div>
        ))}
      </div>

      {/* 粒子流 */}
      {streams.map((stream) => (
        <motion.div
          key={`stream-${stream.id}`}
          className="absolute"
          style={{
            left: `${stream.offset}%`,
            top: -20,
          }}
          initial={{ y: -50, opacity: 0 }}
          animate={{
            y: ['0vh', '110vh'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: stream.delay,
            ease: 'linear',
          }}
        >
          <div className="flex flex-col gap-8">
            {/* 頂部粒子 */}
            <motion.div
              className="text-2xl"
              animate={{
                scale: [1, 1.3, 1],
                rotate: [0, 15, -15, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {stream.particle}
            </motion.div>

            {/* 數據條 */}
            <div className="flex flex-col gap-1">
              {Array.from({ length: 3 }).map((_, barIndex) => (
                <motion.div
                  key={`bar-${barIndex}`}
                  className="h-1 rounded-full"
                  style={{
                    width: Math.random() * 30 + 20,
                    background: `linear-gradient(90deg, ${colors.secondary}, ${colors.primary})`,
                    boxShadow: `0 0 8px ${colors.primary}`,
                  }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: [0, 1, 0] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: barIndex * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ))}

      {/* 中央數據脈衝 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="flex items-center gap-2 rounded-full border-2 px-4 py-2 font-mono text-sm font-bold backdrop-blur-sm"
          style={{
            borderColor: colors.primary,
            background: `${colors.primary}20`,
            color: colors.primary,
            boxShadow: `0 0 20px ${colors.primary}40`,
          }}
          animate={{
            scale: [1, 1.05, 1],
            boxShadow: [
              `0 0 20px ${colors.primary}40`,
              `0 0 30px ${colors.primary}60`,
              `0 0 20px ${colors.primary}40`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ⚙️
          </motion.span>
          <span>分析中</span>
          <motion.span
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            🔄
          </motion.span>
        </motion.div>
      </div>

      {/* 像素化掃描線 */}
      <motion.div
        className="absolute inset-x-0 h-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors.primary}, transparent)`,
          boxShadow: `0 0 10px ${colors.primary}`,
        }}
        animate={{
          top: ['0%', '100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )
}

/**
 * 📊 進度式數據流 (顯示百分比)
 */
export function ProgressDataStream({
  progress = 0,
  label = '載入中',
  theme = 'blue',
}: {
  progress: number
  label?: string
  theme?: 'gold' | 'blue' | 'purple'
}) {
  const colors = themeConfig[theme]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold" style={{ color: colors.primary }}>
          {label}
        </span>
        <motion.span
          className="font-mono font-bold"
          style={{ color: colors.primary }}
          key={progress}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          {Math.round(progress)}%
        </motion.span>
      </div>

      <div className="relative h-6 overflow-hidden rounded-full border-2" style={{ borderColor: colors.primary, background: `${colors.primary}10` }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${colors.secondary}, ${colors.primary})`,
            boxShadow: `0 0 10px ${colors.primary}`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* 閃光效果 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
            }}
            animate={{
              x: ['-100%', '200%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>

        {/* 粒子軌跡 */}
        {progress > 0 && progress < 100 && (
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 text-lg"
            style={{ left: `${progress}%` }}
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 360],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            ⭐
          </motion.div>
        )}
      </div>
    </div>
  )
}
