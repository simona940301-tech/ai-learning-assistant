'use client'

import { motion } from 'framer-motion'

interface ThinkingShimmerProps {
  message?: string
  className?: string
}

/**
 * 極簡主義思考動畫組件
 * 用於計算階段，表示 AI 正在思考
 * 
 * 設計原則：
 * - 柔和的動畫，不干擾注意力
 * - 清晰但不搶眼的視覺反饋
 * - 傳達「正在處理」的狀態
 */
export function ThinkingShimmer({ message = '正在分析...', className = '' }: ThinkingShimmerProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Wave dots animation */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-zinc-400"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Message text */}
      <span className="text-sm text-zinc-400 font-light">{message}</span>
    </div>
  )
}

/**
 * Shimmer effect for loading states
 * Subtle wave animation for background elements
 */
export function ShimmerWave({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent ${className}`}
      animate={{
        x: ['-100%', '200%'],
      }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{
        transform: 'skewX(-20deg)',
      }}
    />
  )
}

