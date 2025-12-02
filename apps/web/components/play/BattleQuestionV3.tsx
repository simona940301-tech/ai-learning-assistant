'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pause, X } from 'lucide-react'
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
import { usePlay } from '@/lib/play-context'
import { normalizeBattleOptions, normalizeBattleText } from '@/lib/battle-text'
import { GameHaptics } from '@/lib/haptics'
import { BattleHeader } from './BattleHeader'
import { QuestionCard } from './QuestionCard'
import { OptionsList, type OptionLetter } from './OptionsList'
import type { OpponentStatus } from './AnimatedAvatar'

// 重新導出 OpponentStatus 以保持向後兼容
export type { OpponentStatus }

// ============================================
// Battle Scoring Functions
// ============================================

/**
 * Calculate base score based on question difficulty
 */
export function calculateBaseScore(difficulty: number): number {
  // Base score calculation: higher difficulty = higher base score
  // Difficulty typically ranges from 1-10
  const basePoints = Math.max(50, Math.min(200, 50 + difficulty * 15))
  return Math.round(basePoints)
}

/**
 * Calculate speed coefficient based on remaining time
 */
export function calculateSpeedCoefficient(timeRemaining: number, timeLimit: number): number {
  if (timeLimit <= 0) return 1.0
  
  const timeUsed = timeLimit - timeRemaining
  const timeRatio = timeUsed / timeLimit
  
  // Speed bonus: answering quickly gives higher multiplier
  // Linear interpolation from 1.5x (instant) to 0.8x (timeout)
  const speedBonus = Math.max(0.8, Math.min(1.5, 1.5 - (timeRatio * 0.7)))
  return Number(speedBonus.toFixed(2))
}

/**
 * Calculate combo coefficient based on streak
 */
export function calculateComboCoefficient(streak: number): number {
  if (streak <= 1) return 1.0
  
  // Combo multiplier: increases with streak but with diminishing returns
  // 2x = 1.1x, 3x = 1.2x, 5x = 1.3x, 8x = 1.4x, 10+ = 1.5x
  let multiplier = 1.0
  if (streak >= 2) multiplier += 0.1
  if (streak >= 3) multiplier += 0.1
  if (streak >= 5) multiplier += 0.1
  if (streak >= 8) multiplier += 0.1
  if (streak >= 10) multiplier += 0.1
  
  return Number(multiplier.toFixed(2))
}

/**
 * Calculate combo milestone bonus points
 */
export function calculateComboMilestoneBonus(streak: number): number {
  // Milestone bonuses for reaching certain streaks
  const milestones = {
    3: 50,
    5: 100,
    8: 200,
    10: 300,
    15: 500,
  }
  
  return milestones[streak as keyof typeof milestones] || 0
}

/**
 * Generate RNG bonus (placeholder for random bonus mechanics)
 */
export function generateRNGBonus(): number {
  // Simple random bonus: 0-20 points, 10% chance
  return Math.random() < 0.1 ? Math.floor(Math.random() * 21) : 0
}

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

export interface BattleQuestionV3Props {
  question: Question
  questionIndex: number
  totalQuestions: number
  onAnswer: (answer: 'A' | 'B' | 'C' | 'D' | null, timeRemaining: number) => void
  player1Score: number
  player2Score: number
  player1Streak: number
  player2Streak: number
  opponentName?: string
  opponentStatus?: OpponentStatus
  opponentAnswer?: 'A' | 'B' | 'C' | 'D' | null
  hideExitControls?: boolean
  playerPresetId?: string | null
}

// ============================================
// Main Component
// ============================================

export function BattleQuestionV3({
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
  hideExitControls = false,
  playerPresetId,
}: BattleQuestionV3Props) {
  const { wsConnected, battleState, sendWebSocketMessage, systemMode } = usePlay()

  // Determine if it's PVE (System Battle)
  const isPVE = systemMode === 'PVE_TRAINING' || systemMode === 'WEAKNESS_BATTLE'

  // UI State
  const [selectedAnswer, setSelectedAnswer] = useState<OptionLetter | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(() => {
    const expiresAt = battleState?.roundExpiresAt
    if (expiresAt) {
      return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
    }
    return question.timeLimit
  })
  const [isAnswered, setIsAnswered] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [showComboAlert, setShowComboAlert] = useState(false)

  // 判斷玩家狀態
  const playerStatus: OpponentStatus = isAnswered
    ? selectedAnswer === question.correctAnswer
      ? 'hit'
      : 'miss'
    : timeRemaining > 0
      ? 'thinking'
      : 'idle'

  // 判斷是否有翻盤獎勵
  const comebackActive = player2Score - player1Score >= 20

  // 局內狀態文字
  const getBattleStatusText = (): string => {
    if (isAnswered) {
      if (selectedAnswer === question.correctAnswer) {
        if (player1Streak > 1) {
          return `連續 ${player1Streak} 題答對 (+Combo)`
        }
        return '答題正確！'
      } else {
        return '答題錯誤'
      }
    }
    if (opponentAnswer) {
      return '對手已回答'
    }
    if (opponentStatus === 'thinking') {
      return '對手思考中...'
    }
    if (timeRemaining <= 3) {
      return '時間緊迫！'
    }
    return ''
  }

  const battleStatusText = getBattleStatusText()

  // 重置狀態當題目改變
  // 🎯 關鍵修復：當 questionIndex 或 question.id 改變時，重置組件狀態
  // 這樣可以確保進入下一題時，UI 正確重置
  useEffect(() => {
    console.log('[BattleQuestionV3] 🔄 Resetting state for question:', {
      questionIndex,
      questionId: question.id,
      timeLimit: question.timeLimit,
    })
    setSelectedAnswer(null)
    setIsAnswered(false)
    const expiresAt = battleState?.roundExpiresAt
    if (expiresAt) {
      setTimeRemaining(Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)))
    } else {
      setTimeRemaining(question.timeLimit)
    }
  }, [battleState?.roundExpiresAt, questionIndex, question.id, question.timeLimit])

  // 倒計時：以 server timestamp 為主，缺少時退回本地時間
  const roundStartTimeRef = useRef<number | null>(null)
  
  useEffect(() => {
    if (isAnswered) return

    // 🎯 初始化開始時間（只在題目改變時）
    if (!roundStartTimeRef.current || battleState?.roundExpiresAt) {
      if (battleState?.roundExpiresAt) {
        // 使用 server timestamp
        roundStartTimeRef.current = battleState.roundExpiresAt - question.timeLimit * 1000
      } else {
        // 使用本地時間（onboarding 場景）
        roundStartTimeRef.current = Date.now()
      }
    }

    const tick = () => {
      if (!roundStartTimeRef.current) return
      
      const elapsed = Date.now() - roundStartTimeRef.current
      const remainingSec = Math.max(0, Math.ceil((question.timeLimit * 1000 - elapsed) / 1000))
      
      setTimeRemaining((prev) => (prev !== remainingSec ? remainingSec : prev))

      if (remainingSec <= 0) {
        setIsAnswered(true)
        setSelectedAnswer(null) // 超時沒選答案
        onAnswer(null, 0)
      }
    }

    tick()
    const timer = setInterval(tick, 300)
    return () => clearInterval(timer)
  }, [battleState?.roundExpiresAt, isAnswered, onAnswer, question.timeLimit, questionIndex])
  
  // 🎯 重置開始時間當題目改變
  useEffect(() => {
    roundStartTimeRef.current = null
  }, [questionIndex, question.id])

  // Combo 里程碑提示
  useEffect(() => {
    if (player1Streak === 3 || player1Streak === 5 || player1Streak === 8) {
      setShowComboAlert(true)
      const timer = setTimeout(() => setShowComboAlert(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [player1Streak])

  // 處理答題
  const handleAnswerSelect = useCallback(
    (answer: OptionLetter) => {
      if (isAnswered || !wsConnected) return

      const isCorrect = answer === question.correctAnswer

      setSelectedAnswer(answer)
      setIsAnswered(true)

      // 觸覺反饋
      GameHaptics.buttonPress() // Selection haptic
      if (isCorrect) {
        GameHaptics.answerCorrect()
      } else {
        GameHaptics.answerWrong()
      }

      // 提交答案
      onAnswer(answer, timeRemaining)
    },
    [isAnswered, onAnswer, timeRemaining, question.correctAnswer, wsConnected]
  )

  // 鍵盤快捷鍵（1-4 / A-D）
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isAnswered || !wsConnected) return
      const key = event.key.toLowerCase()
      const mapping: Record<string, OptionLetter> = {
        '1': 'A',
        '2': 'B',
        '3': 'C',
        '4': 'D',
        'a': 'A',
        'b': 'B',
        'c': 'C',
        'd': 'D',
      }
      const mapped = mapping[key]
      if (mapped) {
        event.preventDefault()
        handleAnswerSelect(mapped)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleAnswerSelect, isAnswered, wsConnected])

  // 處理退出
  const handleLeaveBattle = () => {
    if (battleState?.matchId && wsConnected) {
      sendWebSocketMessage({
        type: 'LEAVE_BATTLE',
        match_id: battleState.matchId,
      })
    }
    setShowLeaveDialog(false)
  }

  // 清理題目文本
  const cleanQuestionText = useMemo(() => {
    const raw = question.questionText || ''
    const withoutIndex = raw.replace(/^\d+[.\s]*/, '')
    return normalizeBattleText(withoutIndex)
  }, [question.questionText])

  // 規範化選項
  const optionList = useMemo(() => {
    return normalizeBattleOptions(question.options || [])
  }, [question.options])

  // ============================================
  // Mobile-first Layout Structure
  // ============================================
  // 最外層: min-h-screen, flex, flex-col
  // - 上方 Header: shrink-0 固定高度
  // - 中間內容區: flex-1 佔滿剩餘空間
  //   - 題目卡片: max-h-[40vh], 內部 overflow-y-auto
  //   - 選項區: flex-1, 內部 overflow-y-auto
  // - 底部 TabBar (在 AppLayout): shrink-0 固定高度
  //
  // 📱 驗收測試建議 (Chrome DevTools):
  // 1. 切換到以下 viewport 測試：
  //    - 360 × 800 (常見 Android)
  //    - 390 × 844 (iPhone 12/13/14)
  //    - 414 × 896 (iPhone 11 Pro Max)
  // 2. 確認項目：
  //    ✅ Play 頁面本身不會上下捲動 (無 overflow)
  //    ✅ Header 和底部 TabBar 都固定在螢幕內
  //    ✅ 題目很短、選項只有 4 個時，全部內容都在一個畫面看得到
  //    ✅ 題目很多或選項很多時，也只是中間內容區局部捲動，不會讓底部 TabBar 消失
  //    ✅ 題目卡片內部可獨立捲動 (max-h-[40vh])
  //    ✅ 選項區內部可獨立捲動 (flex-1)

  return (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-gradient-to-br from-yellow-50 to-amber-100">
      {/* Dynamic Background - Pulse Red when time < 5s */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        animate={{
          backgroundColor: timeRemaining <= 5 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0)',
        }}
        transition={{ duration: 0.5 }}
      />

      {/* 退出按鈕 */}
      {!hideExitControls && (
        <>
          <div className="absolute right-2 top-2 z-50 md:right-4 md:top-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLeaveDialog(true)}
              className="h-8 w-8 rounded-full border border-amber-200/50 bg-amber-100/60 backdrop-blur-sm hover:bg-amber-200/70"
            >
              {isPVE ? <Pause className="h-4 w-4 text-amber-800" /> : <X className="h-4 w-4 text-amber-800" />}
            </Button>
          </div>

          <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>確認退出對戰？</AlertDialogTitle>
                <AlertDialogDescription>
                  退出對戰將被視為投降,可能會影響您的排名。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeaveBattle}
                  className="bg-red-500 hover:bg-red-600"
                >
                  確認退出
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* WebSocket 狀態 */}
      {!wsConnected && (
        <div className="absolute left-2 top-2 z-50 rounded-full border border-amber-400/50 bg-amber-400/20 px-2 py-1 text-[10px] font-semibold text-amber-800 md:left-4 md:top-4 md:px-3 md:text-xs">
          ⚠️ 連接中...
        </div>
      )}

      {/* Combo 里程碑提示 */}
      <AnimatePresence>
        {showComboAlert && (
          <motion.div
            className="absolute inset-x-2 top-16 z-50 mx-auto max-w-md rounded-2xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-center shadow-2xl md:inset-x-4 md:top-20 md:px-6 md:py-4"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
          >
            <p className="text-base font-black text-white md:text-lg">
              🔥 連擊 {player1Streak}x 達成！
            </p>
            <p className="text-xs font-medium text-white/90 md:text-sm">獲得額外分數加成！</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 頂部 Header - shrink-0 固定高度，不要捲動 */}
      <div className="shrink-0">
        <BattleHeader
          playerLabel="你"
          playerScore={player1Score}
          playerStatus="idle"
          playerPresetId={playerPresetId}
          playerStreak={player1Streak}
          opponentLabel={opponentName}
          opponentScore={player2Score}
          opponentStatus={opponentStatus}
          opponentStreak={player2Streak}
          currentRound={questionIndex + 1}
          totalRounds={totalQuestions}
        />
      </div>

      {/* 中間 Play 內容區 - flex-1 佔滿剩餘高度，內部可捲動 */}
      {/* 📱 Mobile First: 增加頂部 padding 預留相機空間 (pt-6)，題目和選項間距加大 (gap-6) */}
      <div className="flex flex-1 flex-col gap-6 overflow-hidden px-3 pt-6 pb-2 md:gap-8 md:px-4 md:pt-4 md:pb-3">
        {/* 局內狀態文字 - shrink-0 */}
        {battleStatusText && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 text-center"
          >
            <span className="text-xs font-medium text-amber-700/70">{battleStatusText}</span>
          </motion.div>
        )}

        {/* 題目卡片區 - max-h-[40vh]，當內容過多時內部可捲動 */}
        <div className="flex min-h-0 max-h-[40vh] shrink-0">
          <div className="w-full max-w-[390px] mx-auto">
            <QuestionCard
              questionText={cleanQuestionText}
              currentQuestion={questionIndex + 1}
              totalQuestions={totalQuestions}
              timeRemaining={timeRemaining}
              timeLimit={question.timeLimit}
            >
              {/* 翻盤獎勵提示 */}
              {comebackActive && !isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-800 md:px-4 md:py-2.5"
                >
                  🔥 翻盤獎勵啟動！下一題答對可獲得 x1.5 分數
                </motion.div>
              )}
            </QuestionCard>
          </div>
        </div>

        {/* 選項區 - flex-1，當選項很多時內部可捲動 */}
        <div className="flex min-h-0 flex-1 flex-col">
          <OptionsList
            options={optionList}
            selectedAnswer={selectedAnswer}
            correctAnswer={question.correctAnswer}
            isAnswered={isAnswered}
            opponentAnswer={opponentAnswer}
            showComboBonus={comebackActive}
            onSelectAnswer={handleAnswerSelect}
          />
        </div>
      </div>
    </div>
  )
}
