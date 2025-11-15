'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePlay } from '@/lib/play-context'
import { Clock, Trophy, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================
// Types
// ============================================

export interface Question {
  id: string
  questionText: string
  options: string[]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  difficulty: number
  timeLimit: number // 8-12 秒動態
  skillTags?: string[]
}

export interface BattleQuestionProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  onAnswer: (answer: 'A' | 'B' | 'C' | 'D') => void
  player1Score: number
  player2Score: number
  opponentName?: string
  opponentAnswered?: boolean // 對手是否已答題
  opponentAnswer?: 'A' | 'B' | 'C' | 'D' | null // 對手的答案（可選，用於顯示）
}

// ============================================
// Battle Question Component
// ============================================

export function BattleQuestion({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  player1Score,
  player2Score,
  opponentName = '對手',
  opponentAnswered = false,
  opponentAnswer = null,
}: BattleQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(question.timeLimit)
  const [isAnswered, setIsAnswered] = useState(false)

  // 重置狀態當題目改變時
  useEffect(() => {
    setSelectedAnswer(null)
    setIsAnswered(false)
    setTimeRemaining(question.timeLimit)
  }, [question.id, question.timeLimit])

  // 倒計時邏輯
  useEffect(() => {
    if (isAnswered || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsAnswered(true)
          // 時間到：如果還沒選擇，不自動提交（讓用戶看到時間到）
          // 如果需要自動提交，可以在這裡調用 onAnswer，但不設置 selectedAnswer
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, isAnswered])

  const handleAnswerSelect = useCallback(
    (answer: 'A' | 'B' | 'C' | 'D') => {
      if (isAnswered) return
      setSelectedAnswer(answer)
      setIsAnswered(true)
      setTimeout(() => onAnswer(answer), 300) // 短暫延遲以顯示選擇
    },
    [isAnswered, onAnswer]
  )

  const progress = ((questionIndex + 1) / totalQuestions) * 100
  const timePercentage = (timeRemaining / question.timeLimit) * 100

  // 移除題目文本中的題號（如 "7. " 或 "7."）
  const cleanQuestionText = question.questionText.replace(/^\d+[.\s]*/, '').trim()

  // 遊戲王風格的生命值條計算（根據答對題數）
  const maxLifePoints = totalQuestions
  const player1LifePoints = player1Score
  const player2LifePoints = player2Score
  const player1LifePercentage = (player1LifePoints / maxLifePoints) * 100
  const player2LifePercentage = (player2LifePoints / maxLifePoints) * 100

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      {/* Header: Progress & Life Points (遊戲王風格) */}
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Life Points Bar (遊戲王風格) */}
        <div className="space-y-3">
          {/* 玩家生命值條 */}
          <div className="relative">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400">你</span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {player1LifePoints} / {maxLifePoints}
              </span>
            </div>
            <div className="relative h-6 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 border-2 border-blue-500 shadow-lg">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(player1LifePercentage, 5)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-sm font-bold text-white drop-shadow-lg">
                  {player1LifePoints}
                </span>
              </div>
            </div>
          </div>

          {/* 對手生命值條 */}
          <div className="relative">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-bold text-purple-600 dark:text-purple-400">{opponentName}</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                {player2LifePoints} / {maxLifePoints}
              </span>
              {opponentAnswered && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400"
                >
                  ✓ 已答題
                </motion.span>
              )}
            </div>
            <div className="relative h-6 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800 border-2 border-purple-500 shadow-lg">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 via-purple-400 to-pink-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(player2LifePercentage, 5)}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-sm font-bold text-white drop-shadow-lg">
                  {player2LifePoints}
            </span>
          </div>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2">
          <Clock className={`h-5 w-5 ${timeRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
          <span className={`text-xl font-bold ${timeRemaining <= 3 ? 'text-red-500' : ''}`}>
            {timeRemaining}
          </span>
        </div>

        {/* Time Progress Bar */}
        <div className="relative h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={`h-full ${
              timeRemaining <= 3
                ? 'bg-red-500'
                : timeRemaining <= question.timeLimit * 0.5
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            initial={{ width: '100%' }}
            animate={{ width: `${timePercentage}%` }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </div>
      </div>

      {/* Question Card */}
      <Card className="border-2 p-6 shadow-lg">
        <h2 className="mb-6 text-xl font-semibold leading-relaxed">
          {cleanQuestionText}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const letter = (['A', 'B', 'C', 'D'] as const)[index]
            const isSelected = selectedAnswer === letter
            const isCorrect = question.correctAnswer === letter
            const isOpponentAnswer = opponentAnswer === letter

            return (
              <motion.button
                key={index}
                onClick={() => handleAnswerSelect(letter)}
                disabled={isAnswered}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all relative ${
                  isAnswered
                    ? isCorrect
                      ? 'border-green-500 bg-green-500/10'
                      : isSelected && !isCorrect
                      ? 'border-red-500 bg-red-500/10'
                      : 'border-muted bg-muted/50 opacity-60'
                    : isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-md'
                    : 'border-border bg-background hover:border-blue-300 hover:bg-accent'
                }`}
                whileHover={!isAnswered ? { scale: 1.02 } : {}}
                whileTap={!isAnswered ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold ${
                      isAnswered && isCorrect
                        ? 'bg-green-500 text-white'
                        : isAnswered && isSelected && !isCorrect
                        ? 'bg-red-500 text-white'
                        : isSelected
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {letter}
                  </div>
                  <span className="flex-1">{option}</span>
                  {isAnswered && isCorrect && (
                    <Trophy className="h-5 w-5 text-green-500" />
                  )}
                  {/* 對手答案指示器 */}
                  {isOpponentAnswer && !isAnswered && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-2 top-2 rounded-full bg-purple-500 px-2 py-1 text-xs font-bold text-white shadow-lg"
                    >
                      對手
                    </motion.div>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

