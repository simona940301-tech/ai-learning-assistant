'use client'

import { motion } from 'framer-motion'

/**
 * 🎮 Super Mario 風格雷達波紋動畫
 *
 * 特色:
 * - 三層同心圓波紋
 * - 彈跳式擴散 (bouncy easing)
 * - 金色/天空藍漸層
 * - 像素化邊框效果
 */

interface RadarWaveAnimationProps {
  /** 是否播放動畫 */
  active?: boolean
  /** 顏色主題 */
  theme?: 'gold' | 'blue' | 'green'
  /** 波紋數量 */
  waveCount?: number
  /** 尺寸 */
  size?: number
}

const themeConfig = {
  gold: {
    primary: '#FFD700',
    secondary: '#FFC727',
    shadow: 'rgba(255, 215, 0, 0.3)',
  },
  blue: {
    primary: '#87CEEB',
    secondary: '#5CB3FF',
    shadow: 'rgba(135, 206, 235, 0.3)',
  },
  green: {
    primary: '#7EC850',
    secondary: '#4CAF50',
    shadow: 'rgba(126, 200, 80, 0.3)',
  },
}

export function RadarWaveAnimation({
  active = true,
  theme = 'blue',
  waveCount = 3,
  size = 200,
}: RadarWaveAnimationProps) {
  const colors = themeConfig[theme]

  if (!active) return null

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {/* 中心脈衝點 */}
      <motion.div
        className="absolute z-10 rounded-full"
        style={{
          width: size * 0.15,
          height: size * 0.15,
          background: `radial-gradient(circle, ${colors.primary}, ${colors.secondary})`,
          boxShadow: `0 0 20px ${colors.shadow}, inset 0 0 10px rgba(255, 255, 255, 0.5)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* 波紋層 */}
      {Array.from({ length: waveCount }).map((_, index) => (
        <motion.div
          key={`wave-${index}`}
          className="absolute rounded-full"
          style={{
            border: `4px solid ${colors.primary}`,
            boxShadow: `0 0 15px ${colors.shadow}, inset 0 0 10px ${colors.shadow}`,
          }}
          initial={{ width: 0, height: 0, opacity: 0 }}
          animate={{
            width: [0, size * 0.5, size * 1.2],
            height: [0, size * 0.5, size * 1.2],
            opacity: [0, 0.8, 0],
            borderWidth: ['4px', '3px', '1px'],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: index * 0.8,
            ease: [0.68, -0.55, 0.265, 1.55], // Mario bouncy
          }}
        />
      ))}

      {/* 像素化網格效果 */}
      <motion.div
        className="absolute"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          backgroundImage: `
            linear-gradient(0deg, transparent 48%, ${colors.primary}20 48%, ${colors.primary}20 52%, transparent 52%),
            linear-gradient(90deg, transparent 48%, ${colors.primary}20 48%, ${colors.primary}20 52%, transparent 52%)
          `,
          backgroundSize: '20px 20px',
        }}
        animate={{
          rotate: [0, 360],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
          opacity: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* 掃描線 */}
      <motion.div
        className="absolute origin-center"
        style={{
          width: 2,
          height: size * 0.4,
          background: `linear-gradient(180deg, transparent, ${colors.primary}, transparent)`,
          boxShadow: `0 0 10px ${colors.primary}`,
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* 星星粒子 (Mario風格) */}
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index / 8) * Math.PI * 2
        const distance = size * 0.35
        return (
          <motion.div
            key={`star-${index}`}
            className="absolute"
            style={{
              width: 8,
              height: 8,
              background: colors.primary,
              clipPath:
                'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            }}
            initial={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 0,
            }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.25,
              ease: 'easeOut',
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * 📡 緊湊型雷達指示器 (用於小空間)
 */
export function CompactRadarIndicator({ active = true, theme = 'blue' }: Pick<RadarWaveAnimationProps, 'active' | 'theme'>) {
  const colors = themeConfig[theme]

  if (!active) return null

  return (
    <div className="relative inline-flex h-6 w-6 items-center justify-center">
      <motion.div
        className="absolute h-full w-full rounded-full"
        style={{
          border: `2px solid ${colors.primary}`,
        }}
        animate={{
          scale: [1, 1.5],
          opacity: [0.8, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <div
        className="h-2 w-2 rounded-full"
        style={{
          background: colors.primary,
          boxShadow: `0 0 8px ${colors.primary}`,
        }}
      />
    </div>
  )
}
