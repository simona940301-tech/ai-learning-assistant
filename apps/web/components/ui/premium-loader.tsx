'use client'

import { motion } from 'framer-motion'

interface PremiumLoaderProps {
  message?: string
  className?: string
}

/**
 * 頂尖極簡載入狀態組件
 * - 呼吸式脈衝動畫（三個圓點，交錯動畫）
 * - 微妙漸變與透明度變化
 * - 流暢的緩動曲線（ease-in-out）
 * - 無 emoji，純幾何設計
 * - 優雅的間距與排版
 */
export function PremiumLoader({ message, className = '' }: PremiumLoaderProps) {
  return (
    <div className={`flex min-h-screen items-center justify-center bg-[#FAF6E9] ${className}`}>
      <div className="text-center">
        {/* 主載入指示器 - 三個呼吸式圓點 */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="h-1.5 w-1.5 rounded-full bg-[#5D4037]"
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.3, 0.9, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.25,
                ease: [0.4, 0, 0.6, 1], // 優雅的緩動曲線
              }}
            />
          ))}
        </div>

        {/* 文字提示 */}
        {message && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4, ease: [0.4, 0, 0.6, 1] }}
            className="text-sm font-medium text-[#8B6F47] tracking-wide"
          >
            {message}
          </motion.p>
        )}
      </div>
    </div>
  )
}

