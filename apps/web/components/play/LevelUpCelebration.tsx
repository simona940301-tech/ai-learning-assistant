'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Trophy, Star } from 'lucide-react'

interface LevelUpCelebrationProps {
  level: number
  onComplete: () => void
}

export function LevelUpCelebration({ level, onComplete }: LevelUpCelebrationProps) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false)
      setTimeout(onComplete, 500) // 等待退出動畫完成
    }, 2500) // 2.5 秒後自動關閉

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-900/95 via-purple-900/95 to-pink-900/95 backdrop-blur-md"
        >
          {/* 背景粒子效果 */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-yellow-400/60"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 8 + 4}px`,
                  height: `${Math.random() * 8 + 4}px`,
                }}
                animate={{
                  y: [0, -100, -200],
                  opacity: [1, 0.8, 0],
                  scale: [1, 1.5, 0],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                  repeat: Infinity,
                }}
              />
            ))}
          </div>

          {/* 主要內容 */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative z-10 text-center"
          >
            {/* 等級數字 */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-8"
            >
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                  className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 drop-shadow-2xl"
                >
                  {level}
                </motion.div>
                <div className="absolute inset-0 text-9xl font-black text-yellow-400/20 blur-2xl">
                  {level}
                </div>
              </div>
            </motion.div>

            {/* 標題 */}
            <motion.h1
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3"
            >
              <Trophy className="w-12 h-12 text-yellow-400" />
              <span>等級提升</span>
              <Trophy className="w-12 h-12 text-yellow-400" />
            </motion.h1>

            {/* 副標題 */}
            <motion.p
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-xl text-white/80"
            >
              恭喜進入 Lv {level}！
            </motion.p>

            {/* 裝飾圖標 */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="mt-8 flex justify-center gap-4"
            >
              {[Sparkles, Star, Sparkles].map((Icon, i) => (
                <motion.div
                  key={i}
                  animate={{
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    delay: i * 0.2,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                >
                  <Icon className="w-8 h-8 text-yellow-400" />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

