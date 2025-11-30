'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GameHaptics } from '@/lib/haptics'

/**
 * 🎮 Super Mario 風格匹配小遊戲
 *
 * 3秒快問快答,不計分,純消磨等待時間
 *
 * 遊戲類型:
 * - 反應測試 (點擊金幣)
 * - 記憶挑戰 (記住順序)
 * - 簡單問答 (常識題)
 */

interface MiniGameProps {
  /** 是否顯示 */
  visible: boolean
  /** 遊戲結束回調 */
  onComplete?: () => void
}

type GameType = 'coin-collect' | 'memory' | 'trivia'

const triviaQuestions = [
  { q: '1+1=?', options: ['1', '2', '3'], correct: 1 },
  { q: '太陽從哪升起?', options: ['東', '西', '南'], correct: 0 },
  { q: '一天幾小時?', options: ['12', '24', '48'], correct: 1 },
  { q: '彩虹幾種顏色?', options: ['5', '7', '9'], correct: 1 },
  { q: '地球是什麼形狀?', options: ['方形', '圓形', '三角'], correct: 1 },
]

export function MatchmakingMiniGame({ visible, onComplete }: MiniGameProps) {
  const [gameType] = useState<GameType>('coin-collect') // 暫時固定金幣收集
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(3)
  const [coins, setCoins] = useState<Array<{ id: number; x: number; y: number }>>([])
  const [isActive, setIsActive] = useState(false)

  // 倒數計時
  useEffect(() => {
    if (!visible || !isActive) return

    if (timeLeft <= 0) {
      setIsActive(false)
      onComplete?.()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [visible, isActive, timeLeft, onComplete])

  // 開始遊戲
  useEffect(() => {
    if (visible) {
      setIsActive(true)
      setScore(0)
      setTimeLeft(3)
    }
  }, [visible])

  // 金幣生成
  useEffect(() => {
    if (!isActive || gameType !== 'coin-collect') return

    const interval = setInterval(() => {
      setCoins((prev) => [
        ...prev,
        {
          id: Date.now(),
          x: Math.random() * 80 + 10, // 10-90%
          y: Math.random() * 70 + 10, // 10-80%
        },
      ])
    }, 800)

    return () => clearInterval(interval)
  }, [isActive, gameType])

  // 清理過期金幣
  useEffect(() => {
    if (coins.length > 8) {
      setCoins((prev) => prev.slice(-8))
    }
  }, [coins])

  const handleCoinClick = useCallback((id: number) => {
    setCoins((prev) => prev.filter((coin) => coin.id !== id))
    setScore((prev) => prev + 1)
    GameHaptics.collectCoin()
  }, [])

  if (!visible) return null

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#87CEEB] to-[#5CB3FF] p-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="relative h-full w-full max-w-2xl">
        {/* 標題 */}
        <div className="absolute left-1/2 top-8 -translate-x-1/2 text-center">
          <motion.h2
            className="text-4xl font-black text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.3)]"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🎮 小遊戲時間!
          </motion.h2>
          <p className="mt-2 text-lg font-bold text-white/90">點擊金幣越多越好!</p>
        </div>

        {/* 倒數 & 分數 */}
        <div className="absolute right-8 top-8 flex flex-col gap-3">
          <motion.div
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white/50 bg-white/20 text-3xl font-black text-white shadow-lg backdrop-blur"
            animate={{ scale: timeLeft <= 1 ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5, repeat: timeLeft <= 1 ? Infinity : 0 }}
          >
            {timeLeft}
          </motion.div>
          <div className="flex items-center gap-2 rounded-2xl border-4 border-yellow-400/50 bg-yellow-500/90 px-4 py-2 shadow-lg">
            <span className="text-2xl">💰</span>
            <span className="text-2xl font-black text-white drop-shadow">{score}</span>
          </div>
        </div>

        {/* 金幣收集遊戲 */}
        {gameType === 'coin-collect' && (
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence>
              {coins.map((coin) => (
                <motion.button
                  key={coin.id}
                  className="absolute cursor-pointer text-5xl"
                  style={{ left: `${coin.x}%`, top: `${coin.y}%` }}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{
                    scale: 1,
                    rotate: [0, 360],
                  }}
                  exit={{ scale: 0, y: -50, opacity: 0 }}
                  transition={{
                    rotate: { duration: 1, repeat: Infinity, ease: 'linear' },
                    exit: { duration: 0.3 },
                  }}
                  onClick={() => handleCoinClick(coin.id)}
                  whileTap={{ scale: 1.5 }}
                >
                  <img src="/icon/coin.png" alt="金幣" className="w-6 h-6 object-contain" />
                </motion.button>
              ))}
            </AnimatePresence>

            {/* 背景雲朵 */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={`cloud-${i}`}
                className="absolute text-6xl opacity-40"
                style={{ top: `${20 + i * 25}%` }}
                animate={{ x: ['100%', '-20%'] }}
                transition={{
                  duration: 10 + i * 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                ☁️
              </motion.div>
            ))}
          </div>
        )}

        {/* 完成提示 */}
        {!isActive && timeLeft === 0 && (
          <motion.div
            className="absolute inset-x-8 top-1/2 -translate-y-1/2 rounded-3xl border-4 border-white/50 bg-white/90 p-8 text-center shadow-2xl backdrop-blur"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="text-6xl flex justify-center"><img src="/icon/congrats.png" alt="太棒了" className="w-16 h-16 object-contain" /></div>
            <h3 className="mt-4 text-3xl font-black text-gray-800">太棒了!</h3>
            <p className="mt-2 text-xl font-bold text-gray-600">收集了 {score} 個金幣!</p>
            <p className="mt-4 text-sm text-gray-500">正在匹配對手...</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * 🧠 記憶挑戰遊戲
 */
export function MemoryMiniGame({ visible, onComplete }: MiniGameProps) {
  const [sequence, setSequence] = useState<number[]>([])
  const [userInput, setUserInput] = useState<number[]>([])
  const [isShowing, setIsShowing] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (visible) {
      const newSequence = Array.from({ length: 3 }, () => Math.floor(Math.random() * 4))
      setSequence(newSequence)
      setUserInput([])
      setIsShowing(true)
      setCurrentIndex(0)

      const timer = setTimeout(() => setIsShowing(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [visible])

  const handleTileClick = (index: number) => {
    if (isShowing) return

    const newInput = [...userInput, index]
    setUserInput(newInput)

    if (newInput[newInput.length - 1] !== sequence[newInput.length - 1]) {
      GameHaptics.answerWrong()
      onComplete?.()
      return
    }

    if (newInput.length === sequence.length) {
      GameHaptics.celebrate()
      if (onComplete) {
        setTimeout(onComplete, 800)
      }
    } else {
      GameHaptics.collectCoin()
    }
  }

  if (!visible) return null

  return (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-purple-600 to-purple-800 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <h2 className="mb-4 text-3xl font-black text-white">記住順序!</h2>
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((index) => {
            const isHighlighted = isShowing && sequence[currentIndex] === index
            return (
              <motion.button
                key={index}
                className="h-24 w-24 rounded-2xl border-4 font-black text-white shadow-lg"
                style={{
                  background: isHighlighted ? '#FFD700' : '#9C27B0',
                  borderColor: 'white',
                }}
                onClick={() => handleTileClick(index)}
                disabled={isShowing}
                animate={{ scale: isHighlighted ? [1, 1.2, 1] : 1 }}
                whileTap={{ scale: 0.9 }}
              >
                {index + 1}
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
