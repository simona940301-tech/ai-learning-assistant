'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * 🎮 Super Mario 風格數字跳動動畫
 *
 * 特色:
 * - 逐幀數字增長
 * - 彈跳/縮放動畫
 * - 支援前綴/後綴
 * - 可自訂緩動函數
 */

interface CountUpProps {
  /** 結束值 */
  end: number
  /** 起始值 */
  start?: number
  /** 動畫時長 (毫秒) */
  duration?: number
  /** 延遲 (毫秒) */
  delay?: number
  /** 小數位數 */
  decimals?: number
  /** 前綴 (如 +, $) */
  prefix?: string
  /** 後綴 (如 分, 元) */
  suffix?: string
  /** 緩動函數 */
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'bounce'
  /** 完成回調 */
  onComplete?: () => void
  /** 自訂樣式 */
  className?: string
  /** 是否啟用彈跳動畫 */
  bounce?: boolean
}

/**
 * 緩動函數
 */
const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  bounce: (t: number) => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) {
      return n1 * t * t
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375
    }
  },
}

export function CountUp({
  end,
  start = 0,
  duration = 1500,
  delay = 0,
  decimals = 0,
  prefix = '',
  suffix = '',
  easing = 'easeOut',
  onComplete,
  className = '',
  bounce = true,
}: CountUpProps) {
  const [count, setCount] = useState(start)
  const [isComplete, setIsComplete] = useState(false)
  const frameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  useEffect(() => {
    const startTime = Date.now() + delay
    startTimeRef.current = startTime

    const animate = () => {
      const now = Date.now()
      const elapsed = now - startTime

      if (elapsed < 0) {
        frameRef.current = requestAnimationFrame(animate)
        return
      }

      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easingFunctions[easing](progress)
      const currentCount = start + (end - start) * easedProgress

      setCount(currentCount)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setCount(end)
        setIsComplete(true)
        onComplete?.()
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [end, start, duration, delay, easing, onComplete])

  const displayValue = count.toFixed(decimals)

  return (
    <motion.span
      className={`inline-block ${className}`}
      initial={bounce ? { scale: 0.8, opacity: 0 } : {}}
      animate={
        bounce
          ? {
              scale: isComplete ? [1, 1.2, 1] : 1,
              opacity: 1,
            }
          : { opacity: 1 }
      }
      transition={
        bounce
          ? {
              scale: { duration: 0.4, ease: [0.68, -0.55, 0.265, 1.55] },
              opacity: { duration: 0.3 },
            }
          : { duration: 0.3 }
      }
    >
      {prefix}
      {displayValue}
      {suffix}
    </motion.span>
  )
}

/**
 * 🪙 金幣計數器 (Mario風格)
 */
export function CoinCounter({ amount, onChange }: { amount: number; onChange?: (value: number) => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border-4 border-yellow-400/50 bg-gradient-to-r from-yellow-400 to-yellow-500 px-4 py-2 shadow-lg">
      <motion.span
        className="text-2xl"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <img src="/icon/coin.png" alt="金幣" className="w-8 h-8 object-contain" />
      </motion.span>
      <CountUp
        end={amount}
        duration={800}
        className="text-2xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]"
        bounce
        onComplete={() => onChange?.(amount)}
      />
    </div>
  )
}

/**
 * ⭐ 經驗值計數器
 */
export function XPCounter({ xp }: { xp: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border-4 border-blue-400/50 bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-2 shadow-lg">
      <motion.span
        className="text-2xl"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 15, -15, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        ⭐
      </motion.span>
      <CountUp
        end={xp}
        duration={1000}
        prefix="+"
        suffix=" XP"
        className="text-xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]"
        bounce
      />
    </div>
  )
}

/**
 * 📊 分數計數器 (對戰用)
 */
export function ScoreCounter({ score, label, color = 'blue' }: { score: number; label?: string; color?: 'blue' | 'red' | 'green' }) {
  const colorConfig = {
    blue: { border: 'border-blue-400', bg: 'from-blue-500 to-blue-600', text: 'text-blue-100' },
    red: { border: 'border-red-400', bg: 'from-red-500 to-red-600', text: 'text-red-100' },
    green: { border: 'border-green-400', bg: 'from-green-500 to-green-600', text: 'text-green-100' },
  }

  const config = colorConfig[color]

  return (
    <div className={`inline-flex flex-col items-center gap-1 rounded-2xl border-4 ${config.border} bg-gradient-to-b ${config.bg} px-6 py-3 shadow-lg`}>
      {label && <span className={`text-xs font-bold uppercase tracking-wider ${config.text} opacity-80`}>{label}</span>}
      <CountUp end={score} duration={800} className={`text-4xl font-black text-white drop-shadow-[0_3px_0_rgba(0,0,0,0.3)]`} bounce easing="bounce" />
    </div>
  )
}

/**
 * 🎯 Elo 變化顯示
 */
export function EloChange({ oldElo, newElo }: { oldElo: number; newElo: number }) {
  const diff = newElo - oldElo
  const isPositive = diff > 0

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-white/70">
        <span>{oldElo}</span>
        <motion.span
          animate={{ x: [0, 5, 0] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          →
        </motion.span>
        <span>{newElo}</span>
      </div>
      <div
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-lg font-black ${
          isPositive ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
        }`}
      >
        <span>{isPositive ? '↗' : '↘'}</span>
        <CountUp
          end={Math.abs(diff)}
          duration={1000}
          prefix={isPositive ? '+' : '-'}
          className="font-mono"
          bounce
          easing="bounce"
        />
      </div>
    </div>
  )
}
