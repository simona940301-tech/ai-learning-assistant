'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { usePlay } from '@/lib/play-context'
import { TempoPresenter } from '@/components/battle/TempoPresenter'
import { Clock, Trophy, Lock, Zap, Shield, Star, AlertCircle, Sparkles, Flame, Snowflake, TrendingUp, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ============================================
// Types
// ============================================

export interface Question {
  id: string
  questionText: string
  options: string[]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  difficulty: number
  timeLimit: number
  skillTags?: string[]
}

export type OpponentStatus = 'idle' | 'thinking' | 'locked' | 'hit' | 'miss'

export interface ScoreBreakdown {
  base: number
  speedCoef: number
  comboCoef: number
  rngBonus: number
  firstCorrectBonus: number
  comboMilestoneBonus: number
  penalty: number
  events: string[]
  finalScore: number
}

export interface BattleQuestionProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  onAnswer: (answer: 'A' | 'B' | 'C' | 'D', timeRemaining: number) => void
  player1Score: number
  player2Score: number
  player1Streak: number
  player2Streak: number
  opponentName?: string
  opponentStatus?: OpponentStatus
  opponentAnswer?: 'A' | 'B' | 'C' | 'D' | null
  ddaBand?: 'low' | 'target' | 'high' // DDA 難度區間（來自後端或前端推斷）
}

// ============================================
// Score Calculation Utilities
// ============================================

export function calculateBaseScore(difficulty: number): number {
  const baseMap: Record<number, number> = {
    1: 60,
    2: 80,
    3: 100,
    4: 120,
    5: 140,
  }
  return baseMap[difficulty] || 100
}

export function calculateSpeedCoefficient(timeRemaining: number, timeLimit: number): number {
  // speed_coef = 0.8 + 0.2 * (剩餘秒數 / 10)
  // 最後 3 秒上限降到 0.95
  const normalized = timeRemaining / timeLimit
  const baseSpeed = 0.8 + 0.2 * normalized
  const finalSpeed = timeRemaining <= 3 ? Math.min(baseSpeed, 0.95) : baseSpeed
  return Math.max(0.8, Math.min(1.0, finalSpeed))
}

export function calculateComboCoefficient(streak: number): number {
  // combo_coef = 1 + min(0.12 * (n-1), 0.6)
  if (streak <= 1) return 1.0
  return 1 + Math.min(0.12 * (streak - 1), 0.6)
}

export function calculateComboMilestoneBonus(streak: number): number {
  if (streak === 3) return 15
  if (streak === 5) return 35
  if (streak === 8) return 60
  return 0
}

export function generateRNGBonus(base: number, seed: number): { bonus: number; event: string | null } {
  // 使用種子生成可重現的隨機數
  const rng = seededRandom(seed)
  const normalValue = rng() * 2 - 1 // -1 to 1
  const rngBonus = Math.round(base * 0.05 * normalValue)
  
  // 特殊事件
  const eventRoll = rng()
  if (eventRoll < 0.1) {
    // 10% Lucky Star
    return { bonus: Math.round(base * 0.15), event: 'Lucky Star' }
  }
  if (eventRoll < 0.16) {
    // 6% Heavy Mind
    return { bonus: Math.round(-base * 0.1), event: 'Heavy Mind' }
  }
  if (eventRoll < 0.19) {
    // 3% Double or Drop (在結算時處理)
    return { bonus: rngBonus, event: 'Double or Drop' }
  }
  
  return { bonus: rngBonus, event: null }
}

function seededRandom(seed: number): () => number {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

// ============================================
// Status Badge Component
// ============================================

function StatusBadge({ status }: { status: OpponentStatus }) {
  const config = {
    idle: { icon: null, text: '', color: '', show: false },
    thinking: {
      icon: '...',
      text: '思考中',
      color: 'bg-yellow-500/30 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-500',
      show: true,
    },
    locked: {
      icon: Lock,
      text: '已鎖定',
      color: 'bg-blue-500/30 text-blue-700 dark:text-blue-300 border-2 border-blue-500',
      show: true,
    },
    hit: {
      icon: Trophy,
      text: '答對！',
      color: 'bg-green-500/30 text-green-700 dark:text-green-300 border-2 border-green-500',
      show: true,
    },
    miss: {
      icon: AlertCircle,
      text: '答錯',
      color: 'bg-red-500/30 text-red-700 dark:text-red-300 border-2 border-red-500',
      show: true,
    },
  }

  const { icon: Icon, text, color, show } = config[status]

  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`absolute -top-3 -right-3 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-bold shadow-2xl ${color}`}
    >
      {typeof Icon === 'string' ? (
        <motion.span
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xl"
        >
          {Icon}
        </motion.span>
      ) : Icon ? (
        <Icon className="h-4 w-4" />
      ) : null}
      <span>{text}</span>
    </motion.div>
  )
}

// ============================================
// Energy Bar Component (縱向能量條)
// ============================================

function EnergyBar({
  score,
  maxScore,
  streak,
  label,
  isPlayer,
  status,
}: {
  score: number
  maxScore: number
  streak: number
  label: string
  isPlayer: boolean
  status?: OpponentStatus
}) {
  const percentage = Math.min((score / maxScore) * 100, 100)
  const color = isPlayer
    ? 'from-blue-500 via-blue-400 to-cyan-400'
    : 'from-purple-500 via-purple-400 to-pink-400'
  
  // 分數變化追蹤
  const [prevScore, setPrevScore] = useState(score)
  const [scoreChange, setScoreChange] = useState<number | null>(null)
  
  useEffect(() => {
    if (score !== prevScore) {
      const change = score - prevScore
      setScoreChange(change)
      setPrevScore(score)
      // 2秒後清除變化提示
      const timer = setTimeout(() => setScoreChange(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [score, prevScore])
  
  return (
    <div className="flex flex-col items-center gap-2">
      {/* 頭像 + 狀態 */}
      <div className="relative">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${
            isPlayer
              ? 'border-blue-500 bg-blue-500/20'
              : 'border-purple-500 bg-purple-500/20'
          }`}
        >
          <span className="text-xl font-bold">{label.charAt(0)}</span>
        </div>
        {status && status !== 'idle' && <StatusBadge status={status} />}
      </div>
      
      {/* 能量條容器 */}
      <div className="relative h-64 w-12 overflow-hidden rounded-lg border-2 bg-gray-200 dark:bg-gray-800 shadow-lg">
        {/* 能量條（自下而上） */}
        <motion.div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${color}`}
          initial={{ height: 0 }}
          animate={{ height: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        
        {/* 分數顯示（帶動畫） */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
          <motion.span
            key={score} // 當分數改變時觸發動畫
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="font-mono text-lg font-bold text-white drop-shadow-lg"
          >
            {score}
          </motion.span>
          
          {/* 分數變化提示 */}
          {scoreChange !== null && scoreChange !== 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: -20, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.8 }}
              className={`absolute -top-8 text-sm font-bold drop-shadow-lg ${
                scoreChange > 0 ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {scoreChange > 0 ? '+' : ''}{scoreChange}
            </motion.div>
          )}
        </div>
      </div>
      
      {/* 連擊徽章 */}
      {streak > 1 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-1 rounded-full bg-orange-500/20 px-2 py-1 text-xs font-bold text-orange-600"
        >
          <Zap className="h-3 w-3" />
          <span>{streak}x</span>
        </motion.div>
      )}
      
      {/* 標籤 */}
      <span className="text-sm font-semibold">{label}</span>
    </div>
  )
}

// ============================================
// Score Breakdown Modal
// ============================================

function ScoreBreakdownModal({
  breakdown,
  onClose,
}: {
  breakdown: ScoreBreakdown
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border-2 bg-background p-6 shadow-2xl"
        >
          <h3 className="mb-4 text-xl font-bold">計分詳情</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">基礎分</span>
              <span className="font-mono font-bold">+{breakdown.base}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">速度係數</span>
              <span className="font-mono font-bold">×{breakdown.speedCoef.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">連擊係數</span>
              <span className="font-mono font-bold">×{breakdown.comboCoef.toFixed(2)}</span>
            </div>
            
            {breakdown.rngBonus !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">隨機調整</span>
                <span className={`font-mono font-bold ${breakdown.rngBonus > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {breakdown.rngBonus > 0 ? '+' : ''}{breakdown.rngBonus}
                </span>
              </div>
            )}
            
            {breakdown.firstCorrectBonus > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">搶答加分</span>
                <span className="font-mono font-bold text-green-500">+{breakdown.firstCorrectBonus}</span>
              </div>
            )}
            
            {breakdown.comboMilestoneBonus > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">連擊里程碑</span>
                <span className="font-mono font-bold text-orange-500">+{breakdown.comboMilestoneBonus}</span>
              </div>
            )}
            
            {breakdown.penalty < 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">失誤懲罰</span>
                <span className="font-mono font-bold text-red-500">{breakdown.penalty}</span>
              </div>
            )}
            
            {breakdown.events.length > 0 && (
              <div className="mt-4 space-y-2 border-t pt-3">
                <span className="text-sm font-semibold text-muted-foreground">特殊事件</span>
                {breakdown.events.map((event, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {event === 'Lucky Star' && <Star className="h-4 w-4 text-yellow-500" />}
                    {event === 'Heavy Mind' && <AlertCircle className="h-4 w-4 text-red-500" />}
                    {event === 'Double or Drop' && <Sparkles className="h-4 w-4 text-purple-500" />}
                    <span className="text-sm">{event}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4 flex justify-between border-t pt-3">
              <span className="text-lg font-bold">總分</span>
              <span className="font-mono text-2xl font-bold text-green-500">
                {breakdown.finalScore > 0 ? '+' : ''}{breakdown.finalScore}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            關閉
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ============================================
// Main Battle Question Component
// ============================================

export function BattleQuestion({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  player1Score,
  player2Score,
  player1Streak,
  player2Streak,
  opponentName = '對手',
  opponentStatus = 'idle',
  opponentAnswer = null,
  ddaBand,
}: BattleQuestionProps) {
  const { wsConnected, tempoHint, arousalLevel, sendWebSocketMessage, battleState } = usePlay()
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(question.timeLimit)
  const [isAnswered, setIsAnswered] = useState(false)
  const [answerTime, setAnswerTime] = useState<number | null>(null)
  const [wrongAnswerFeedback, setWrongAnswerFeedback] = useState<string | null>(null)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  // 生成答錯文案（根據分數差距、連擊、DDA 狀態）
  const generateWrongAnswerFeedback = useCallback((isCorrect: boolean, scoreDiff: number, streak: number, dda?: 'low' | 'target' | 'high', arousal?: number) => {
    if (isCorrect) {
      setWrongAnswerFeedback(null)
      return
    }

    const isBehind = scoreDiff < 0
    const gapLarge = Math.abs(scoreDiff) > 100
    const isLowStreak = streak === 0
    const isHighArousal = (arousal || 0) > 0.7

    // 根據情況生成不同強度的文案
    if (isBehind && gapLarge) {
      setWrongAnswerFeedback('⚠️ 對手正在拉開差距！集中注意力，還有機會！')
    } else if (isBehind && !gapLarge) {
      setWrongAnswerFeedback('💪 差距不大！下一題就能追回來！')
    } else if (!isBehind && scoreDiff > 50) {
      setWrongAnswerFeedback('🎯 保持優勢！專注每一題！')
    } else {
      if (isLowStreak && dda === 'low') {
        setWrongAnswerFeedback('🔄 系統已為你降低難度，相信自己，下一題會更好！')
      } else if (isHighArousal) {
        setWrongAnswerFeedback('⚡ 你的專注度很高！調整節奏，穩住！')
      } else {
        setWrongAnswerFeedback('💡 別灰心！再對一題就能逆轉！')
      }
    }
  }, [])

  // 清理答錯文案（4 秒後自動清除）
  useEffect(() => {
    if (!wrongAnswerFeedback) return
    
    const timer = setTimeout(() => {
      setWrongAnswerFeedback(null)
    }, 4000)

    return () => clearTimeout(timer)
  }, [wrongAnswerFeedback])

  // Debug: 追蹤對手狀態變化
  useEffect(() => {
    console.log('[BattleQuestionV2] 🤖 Opponent status changed:', opponentStatus)
  }, [opponentStatus])

  // 重置狀態當題目改變時
  useEffect(() => {
    setSelectedAnswer(null)
    setIsAnswered(false)
    setTimeRemaining(question.timeLimit)
    setAnswerTime(null)
  }, [question.id, question.timeLimit])

  // 確保沒有預設選項被選中（防護措施）
  useEffect(() => {
    if (selectedAnswer && !isAnswered) {
      // 如果選項被意外設置，重置它
      const timer = setTimeout(() => {
        if (!isAnswered) {
          setSelectedAnswer(null)
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [selectedAnswer, isAnswered])

  // 倒計時邏輯 + 時間到自動提交
  useEffect(() => {
    if (isAnswered || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // 時間到，自動提交空答案
          setIsAnswered(true)
          setAnswerTime(0)
          onAnswer(null, 0) // 提交空答案，剩餘時間為 0
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining, isAnswered, onAnswer])

  const handleAnswerSelect = useCallback(
    (answer: 'A' | 'B' | 'C' | 'D') => {
      if (isAnswered) return
      const isCorrect = answer === question.correctAnswer
      const scoreDiff = player1Score - player2Score
      
      setSelectedAnswer(answer)
      setIsAnswered(true)
      setAnswerTime(timeRemaining)
      
      // 生成答錯文案
      if (!isCorrect) {
        generateWrongAnswerFeedback(false, scoreDiff, player1Streak, ddaBand, arousalLevel)
      } else {
        setWrongAnswerFeedback(null)
      }
      
      // 立即提交，傳遞剩餘時間用於計分
      onAnswer(answer, timeRemaining)
    },
    [isAnswered, onAnswer, timeRemaining, question.correctAnswer, player1Score, player2Score, player1Streak, ddaBand, arousalLevel, generateWrongAnswerFeedback]
  )

  const handleLeaveBattle = () => {
    if (battleState?.matchId && wsConnected) {
      sendWebSocketMessage({
        type: 'LEAVE_BATTLE',
        match_id: battleState.matchId,
      })
    }
    setShowLeaveDialog(false)
  }

  const progress = ((questionIndex + 1) / totalQuestions) * 100
  const timePercentage = (timeRemaining / question.timeLimit) * 100
  
  // 移除題目文本中的題號
  const cleanQuestionText = question.questionText.replace(/^\d+[.\s]*/, '').trim()
  
  // 估算最大可能分數（用於能量條）
  const estimatedMaxScore = calculateBaseScore(question.difficulty) * 1.0 * 1.6 + 100 // 基礎 * 速度 * 連擊 + 獎勵

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* 退出按鈕 */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowLeaveDialog(true)}
          className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-destructive/10 hover:border-destructive/50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 退出確認對話框 */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>確認退出對戰？</AlertDialogTitle>
            <AlertDialogDescription>
              退出對戰將被視為投降，可能會影響您的 Elo 排名和獎勵。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveBattle}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              確認退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* WebSocket 連接狀態指示器 */}
      {!wsConnected && (
        <div className="absolute top-2 right-14 z-50 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 border border-yellow-500/50">
          ⚠️ WebSocket 未連接
        </div>
      )}
      
      {/* 頂部進度條 */}
      <div className="relative h-2 overflow-hidden bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* 主內容區：左右對戰佈局 */}
      <div className="flex flex-1 items-center justify-between gap-4 p-4">
        {/* 左側：玩家能量條 */}
        <EnergyBar
          score={player1Score}
          maxScore={estimatedMaxScore * totalQuestions}
          streak={player1Streak}
          label="你"
          isPlayer={true}
        />

        {/* 中央：題目區域 */}
        <div className="flex flex-1 flex-col items-center justify-center space-y-6">
          <TempoPresenter tempoHint={tempoHint} arousalLevel={arousalLevel}>
            <div className="flex flex-col items-center gap-6">
              {/* 倒數計時器 */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Clock
                    className={`h-6 w-6 ${
                      timeRemaining <= 3 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'
                    }`}
                  />
                  <span
                    className={`text-3xl font-bold ${
                      timeRemaining <= 3 ? 'text-red-500' : ''
                    }`}
                  >
                    {timeRemaining}
                  </span>
                </div>
                
                {/* 時間進度條 */}
                <div className="relative h-2 w-64 overflow-hidden rounded-full bg-muted">
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

              {/* 題目卡片 */}
              <Card className="w-full max-w-2xl border-2 p-6 shadow-lg">
                {/* DDA 難度標籤 */}
                {(ddaBand || questionIndex > 0) && (
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ddaBand === 'low' ? (
                        <div className="flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          <Snowflake className="h-3 w-3" />
                          <span>難度已調整（較易）</span>
                        </div>
                      ) : ddaBand === 'high' ? (
                        <div className="flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 border border-red-500/30">
                          <Flame className="h-3 w-3" />
                          <span>難度已調整（較難）</span>
                        </div>
                      ) : questionIndex > 0 ? (
                        <div className="flex items-center gap-1 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
                          <TrendingUp className="h-3 w-3" />
                          <span>系統正在為你調整難度</span>
                        </div>
                      ) : null}
                    </div>
                    {/* 難度星星顯示 */}
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < question.difficulty
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <h2 className="mb-6 text-xl font-semibold leading-relaxed">
                  {cleanQuestionText}
                </h2>

                {/* 答錯提示文案 */}
                {wrongAnswerFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 rounded-lg bg-orange-500/10 border border-orange-500/30 px-4 py-3 text-sm font-medium text-orange-700 dark:text-orange-400 backdrop-blur-sm"
                  >
                    {wrongAnswerFeedback}
                  </motion.div>
                )}

                {/* 選項 */}
                <div className="space-y-3">
                  {question.options.map((option, index) => {
                    const letter = (['A', 'B', 'C', 'D'] as const)[index]
                    const isSelected = selectedAnswer === letter && selectedAnswer !== null // 確保不是 null
                    const isCorrect = question.correctAnswer === letter
                    const isOpponentAnswer = opponentAnswer === letter && opponentAnswer !== null

                    return (
                      <motion.button
                        key={`${question.id}-${index}`}
                        onClick={() => handleAnswerSelect(letter)}
                        disabled={isAnswered}
                        type="button" // 明確指定按鈕類型，避免表單提交
                        className={`relative w-full rounded-lg border-2 p-4 text-left transition-all ${
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
                        whileHover={!isAnswered && !isSelected ? { scale: 1.02 } : {}}
                        whileTap={!isAnswered && !isSelected ? { scale: 0.98 } : {}}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold transition-colors ${
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
          </TempoPresenter>
        </div>

        {/* 右側：對手能量條 */}
        <EnergyBar
          score={player2Score}
          maxScore={estimatedMaxScore * totalQuestions}
          streak={player2Streak}
          label={opponentName}
          isPlayer={false}
          status={opponentStatus}
        />
      </div>
    </div>
  )
}
