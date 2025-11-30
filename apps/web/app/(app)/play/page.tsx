'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { usePlay, type BattleState } from '@/lib/play-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Sparkles, Sword } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SystemBattleModal } from '@/components/play/SystemBattleModal'
import { CustomBattleModal } from '@/components/play/CustomBattleModal'
import { UGCContractModal } from '@/components/play/UGCContractModal'
import { BattleQuestionV3 } from '@/components/play/BattleQuestionV3'
import { BattleTransitionOverlay } from '@/components/play/BattleTransitionOverlay'
import {
  calculateBaseScore,
  calculateSpeedCoefficient,
  calculateComboCoefficient,
  calculateComboMilestoneBonus,
  generateRNGBonus,
} from '@/components/play/BattleQuestionV3'
import { BattleResultModal } from '@/components/play/BattleResultModal'
import { GamifiedMatchResultModal } from '@/components/play/GamifiedMatchResultModal'
import { useRouter, useSearchParams } from 'next/navigation'
import { normalizeBattleOptions, normalizeBattleText } from '@/lib/battle-text'
import { DailyMissionWidgetV2 } from '@/components/play/DailyMissionWidgetV2'
import { TamagotchiWidget } from '@/components/companion/tamagotchi-widget'
import { FocusModeModal } from '@/components/play/FocusModeModal'
import { Brain } from 'lucide-react'
import { useGuidance, useErrorCorrection } from '@/lib/guidance/useGuidance'
import { GameStatusBar } from '@/components/play/GameStatusBar'


// ============================================
// Shared Design Components
// ============================================

const glassCardClass =
  'rounded-[12px] bg-white/80 text-card-foreground shadow-xl backdrop-blur-[20px]'

// getTierLabel 已移除，等級 icon 將顯示在 profile 頁面頭像旁

// StatusCard 已移除，改用 GameStatusBar

function ModeCard({
  label,
  description,
  icon: Icon,
  onClick,
  accent,
  modeId,
  onRecordOperation,
  energyCost,
  estimatedTime,
}: {
  label: string
  description: string
  icon: React.ComponentType<any>
  onClick: () => void
  accent: string
  modeId: string
  onRecordOperation?: () => void
  energyCost?: number
  estimatedTime?: string
}) {
  const handleClick = () => {
    onRecordOperation?.() // 🎯 記錄操作，用於引導系統的冷卻計數
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-mode-card={modeId}
      className="flex w-full items-center gap-4 rounded-[24px] border border-border bg-card px-5 py-4 text-left text-card-foreground transition hover:-translate-y-0.5 hover:bg-accent"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="text-lg font-semibold tracking-tight">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {(energyCost !== undefined || estimatedTime) && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {energyCost !== undefined && (
              <span className="flex items-center gap-1">
                <img src="/feather.png" alt="羽毛" className="w-4 h-4 object-contain" />
                <span className="font-medium">{energyCost}</span>
              </span>
            )}
            {estimatedTime && (
              <span className="flex items-center gap-1">
                <span className="text-base">⏱️</span>
                <span>{estimatedTime}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ============================================
// Main Play Page Content
// ============================================

function PlayPageContent() {
  const router = useRouter()
  const {
    activeModal,
    closeModal,
    userStatus,
    isLoadingStatus,
    battleState,
    lobbyConfirmState,
    setLobbyConfirmState,
    sendWebSocketMessage,
    setBattleState,
    wsConnected,
    openSystemModal,
    openCustomModal,
    openUGCContractModal,
    progression,
    openChest,
    pveCountdown,
    setPveCountdown,
    isPveTransitioning,
    setIsPveTransitioning,
    startMatch,
    checkEnergy,
  } = usePlay()
  const [isChestModalOpen, setChestModalOpen] = useState(false)
  const [isFocusModalOpen, setFocusModalOpen] = useState(false)

  // 🎯 引導系統：自動檢測 T04 (Onboarding 完成後) 和 T01 (停留過久)
  const { recordOperation } = useGuidance({
    autoDetectT04: true,
    autoDetectT01: {
      enabled: true,
      delayMs: 10000,
    },
    page: 'play',
  })

  // 🎯 引導系統：T03 錯誤糾正 - 羽毛不足引導
  const { trackError: trackEnergyError } = useErrorCorrection('energy-insufficient', 1)



  // Auto-start onboarding match if mode=onboarding
  const searchParams = useSearchParams()
  const hasTriggeredOnboardingRef = useRef(false)

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'onboarding' && wsConnected && !battleState?.isInBattle && !hasTriggeredOnboardingRef.current) {
      console.log('[PlayPage] 🚀 Auto-starting ONBOARDING match')
      hasTriggeredOnboardingRef.current = true

        ; (async () => {
          const energy = await checkEnergy()
          if (!energy.success) {
            trackEnergyError() // 🎯 觸發引導: "體力用完了? 完成任務獲取體力!"
            alert(energy.message || '羽毛不足，無法開始新手戰')
            return
          }

          const confirmed =
            typeof window === 'undefined'
              ? true
              : window.confirm('這是新手戰，將消耗 1 點羽毛，確認開始嗎？')

          if (!confirmed) {
            return
          }

          setIsPveTransitioning(true)
          const result = await startMatch({
            type: 'PVE_TRAINING',
            subject: 'english',
            timeLimit: 15,
            origin: 'ONBOARDING',
          })

          if (!result.ok) {
            alert(result.error || '啟動失敗，請稍後再試')
            setIsPveTransitioning(false)
          }

          // Clear query param to avoid re-triggering on refresh
          const newParams = new URLSearchParams(searchParams.toString())
          newParams.delete('mode')
          router.replace(`/play?${newParams.toString()}`)
        })()
    }
  }, [searchParams, wsConnected, battleState?.isInBattle, startMatch, router, setIsPveTransitioning, checkEnergy])

  // 如果沒有用戶狀態，檢查是否應該跳過（Supabase 未配置時）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const skipAuthCheck = !supabaseUrl || !supabaseAnonKey

  // ⚠️ 重要：所有 Hook 必須在組件頂層，在任何條件返回之前
  // 注意：移除了重定向到 /onboarding，因為該頁面不存在
  // 如果沒有用戶狀態，將顯示提示而不是重定向

  // 對戰中：顯示題目
  // 診斷日誌：追蹤 battleState 狀態
  useEffect(() => {
    if (battleState) {
      const timestamp = new Date().toISOString()
      console.log(`[PlayPage] 📊 [${timestamp}] BattleState status:`, {
        isInBattle: battleState.isInBattle,
        matchId: battleState.matchId,
        questionListLength: battleState.questionList?.length || 0,
        currentQuestionIndex: battleState.currentQuestionIndex,
        willShowBattlePage: battleState.isInBattle && (battleState.questionList?.length || 0) > 0,
      })

      if (battleState.isInBattle && (battleState.questionList?.length || 0) === 0) {
        console.warn(`[PlayPage] ⚠️ [${timestamp}] BattleState.isInBattle=true but questionList is empty!`)
      }
    }
  }, [battleState])

  // PVE 倒數：阻擋 UI 並顯示轉場
  useEffect(() => {
    if (pveCountdown === null) return
    if (pveCountdown <= 0) {
      setPveCountdown(null)
      return
    }

    const timer = setTimeout(() => {
      setPveCountdown(prev => {
        if (!prev || prev <= 1) return null
        return prev - 1
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [pveCountdown, setPveCountdown])

  // 🎯 移除前端自動進題邏輯，完全依賴後端的 ROUND_STARTED 消息
  // 這樣可以避免前端 timer 和後端消息之間的競態條件
  // 後端會在 ROUND_RESOLVED 後自動發送下一題的 ROUND_STARTED

  // 如果正在載入，顯示載入狀態
  if (isLoadingStatus) {
    // Mobile-first: 較小 padding
    return (
      <main className="mx-auto max-w-2xl px-4 py-4 md:py-12">
        <div className="space-y-4">
          <div className={`${glassCardClass} p-6`}>
            <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
            <div className="mt-4 grid grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="h-10 animate-pulse rounded bg-muted/50" />
              ))}
            </div>
          </div>
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-16 rounded-[12px] bg-muted/30 backdrop-blur animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  // 如果沒有用戶狀態，顯示提示（不重定向，因為 onboarding 頁面不存在）
  if (!userStatus && !skipAuthCheck) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <Card className="border border-border bg-card/50 p-8 text-center backdrop-blur">
          <h2 className="mb-4 text-2xl font-semibold text-foreground">請先登入</h2>
          <p className="mb-6 text-sm text-muted-foreground">登入後即可開始挑戰知識對戰。</p>
          <Button onClick={() => router.push('/home')} className="bg-[#5B7CFF] text-white hover:bg-[#4a63d7]">
            返回首頁
          </Button>
          <Button
            onClick={() => router.push('/onboarding')}
            className="mt-4 w-full bg-gray-600 text-white hover:bg-gray-700"
          >
            登入或註冊
          </Button>
        </Card>
      </main>
    )
  }

  const showPveCountdownOverlay = typeof pveCountdown === 'number' && pveCountdown > 0

  // 🎯 新增：顯示 PVE 過渡動畫（從按下開始到收到 MATCH_FOUND）
  const showPveTransitionOverlay = isPveTransitioning && !battleState?.isInBattle

  // PVP 的轉場畫面（匹配成功後的等待畫面）
  const isPveMatch = !lobbyConfirmState || lobbyConfirmState?.skipUI === true
  const showMatchTransitionOverlay =
    !showPveCountdownOverlay &&
    !showPveTransitionOverlay && // 不與 PVE 過渡動畫重疊
    !isPveMatch && // 如果是 PVE，不顯示轉場
    Boolean(battleState?.matchId && !battleState?.isInBattle)

  const totalMatches = progression?.totalMatches || 0
  const canSkipCountdown = totalMatches >= 20


  const handleSkipCountdown = () => setPveCountdown(null)

  // 對戰中：顯示題目
  // 🎯 關鍵修復：使用 useMemo 確保 currentQuestion 始終從最新的 battleState 派生
  const currentQuestion = battleState?.isInBattle && battleState?.questionList?.length > 0
    ? battleState.questionList[battleState.currentQuestionIndex]
    : null

  if (battleState && battleState.isInBattle && battleState.questionList.length > 0) {
    // 🎯 關鍵診斷：記錄實際的 currentQuestionIndex 值
    const actualIndex = battleState.currentQuestionIndex

    console.log(`[PlayPage] ✅ Rendering battle page - question ${actualIndex + 1}/${battleState.questionList.length}`, {
      hasCurrentQuestion: !!currentQuestion,
      questionId: currentQuestion?.id,
      questionListLength: battleState.questionList.length,
      currentIndex: actualIndex,
      // 🎯 關鍵診斷：檢查所有索引的題目
      questionAtIndex0: battleState.questionList[0]?.id,
      questionAtIndex1: battleState.questionList[1]?.id,
      questionAtCurrentIndex: battleState.questionList[actualIndex]?.id,
      battleStateRef: battleState, // 用於檢查是否是同一個對象引用
    })

    // 🎯 關鍵修復：如果當前題目不存在，等待 ROUND_STARTED 更新
    // 不要渲染錯誤，而是顯示加載狀態或等待
    if (!currentQuestion) {
      console.warn(`[PlayPage] ⚠️ Question at index ${battleState.currentQuestionIndex} not found, waiting for ROUND_STARTED...`)
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-white/70">載入題目中...</p>
            <p className="mt-2 text-sm text-white/50">第 {battleState.currentQuestionIndex + 1} 題</p>
          </div>
        </div>
      )
    }

    if (currentQuestion) {
      const rawQuestionText = currentQuestion.question_text || currentQuestion.questionText || ''
      const cleanQuestionText = normalizeBattleText(rawQuestionText)

      const rawOptions: unknown[] = []
      if (Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
        currentQuestion.options.forEach((opt: any) => {
          if (typeof opt === 'string') {
            rawOptions.push(opt)
          } else if (opt && typeof opt === 'object') {
            // 處理對象格式選項 (UGC questions)
            rawOptions.push(opt.text || opt.label || opt.id || '')
          } else {
            rawOptions.push(opt ?? '')
          }
        })
      }

      const cleanOptions = normalizeBattleOptions(rawOptions)

      // 調試日誌
      if (cleanOptions.length < 2) {
        console.error('[PlayPage] Invalid options after cleaning:', {
          questionId: currentQuestion.id,
          rawOptions: currentQuestion.options,
          cleanOptions,
        })
      } else {
        console.log('[PlayPage] Valid options:', {
          questionId: currentQuestion.id,
          optionsCount: cleanOptions.length,
          options: cleanOptions,
        })
      }

      const question = {
        id: currentQuestion.id || `q-${battleState.currentQuestionIndex}`,
        questionText: cleanQuestionText,
        options: cleanOptions.length >= 2 ? cleanOptions : [], // 不提供預設值，讓組件處理錯誤
        correctAnswer: (currentQuestion.correct_answer || currentQuestion.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
        difficulty: currentQuestion.difficulty || 3,
        timeLimit: currentQuestion.time_limit || currentQuestion.timeLimit || 30,
        skillTags: currentQuestion.skill_tags || currentQuestion.skillTags,
      }

      const handleAnswer = (answer: 'A' | 'B' | 'C' | 'D' | null, timeRemaining: number) => {
        if (!battleState) return

        const upsertAnswerRecords = (prev: BattleState, userAnswer: 'A' | 'B' | 'C' | 'D' | null) => {
          const records = [...(prev.answerRecords ?? [])]
          const idx = records.findIndex(r => r.questionId === question.id)
          if (idx >= 0) {
            records[idx] = {
              ...records[idx],
              userAnswer,
            }
          } else {
            records.push({
              questionId: question.id,
              userAnswer,
              isCorrect: null,
            })
          }
          return records
        }

        if (!answer) {
          setBattleState(prev => {
            if (!prev) return prev
            return {
              ...prev,
              playerHasAnswered: true,
              answerRecords: upsertAnswerRecords(prev, null),
            }
          })
          return
        }

        // 檢查答案是否正確
        const isCorrect = answer === question.correctAnswer

        // 計算分數（前端預覽，實際分數由後端計算）
        const base = calculateBaseScore(question.difficulty)
        const speedCoef = calculateSpeedCoefficient(timeRemaining, question.timeLimit)
        const currentStreak = battleState.player1Streak || 0
        const newStreak = isCorrect ? currentStreak + 1 : 0
        const comboCoef = calculateComboCoefficient(newStreak)
        const comboMilestoneBonus = isCorrect ? calculateComboMilestoneBonus(newStreak) : 0

        // 生成 RNG（使用 matchId + questionIndex 作為種子）
        const seed = (battleState.matchId?.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0) + battleState.currentQuestionIndex
        const { bonus: rngBonus } = generateRNGBonus(base, seed)

        // 搶答加分（如果比對手先答對）
        const firstCorrectBonus = isCorrect && !battleState.opponentStatus ?
          Math.round(10 + question.difficulty * 3) : 0

        // 失誤懲罰
        let penalty = 0
        const wrongStreak = isCorrect ? 0 : (currentStreak < 0 ? Math.abs(currentStreak) + 1 : 1)
        if (!isCorrect) {
          if (battleState.hasShield && wrongStreak === 1) {
            // 使用保護盾
            penalty = -Math.round(base * 0.1)
          } else {
            penalty = -Math.round(base * 0.25)
            if (wrongStreak === 2) penalty -= 10
            if (wrongStreak >= 3) penalty -= 25
          }
        }

        // 計算最終分數
        const finalScore = isCorrect
          ? Math.round(base * speedCoef * comboCoef) + rngBonus + firstCorrectBonus + comboMilestoneBonus
          : penalty

        // 更新連擊數
        setBattleState(prev => {
          if (!prev) return prev
          return {
            ...prev,
            player1Streak: newStreak,
            player1Score: prev.player1Score + finalScore,
            playerHasAnswered: true,
            answerRecords: upsertAnswerRecords(prev, answer),
          }
        })

        // 發送答案到 WebSocket（如果連接且 matchId 存在）
        if (battleState.matchId && wsConnected) {
          console.log('[PlayPage] 📤 Sending SUBMIT_ANSWER:', answer)
          sendWebSocketMessage({
            type: 'SUBMIT_ANSWER',
            match_id: battleState.matchId,
            question_index: battleState.currentQuestionIndex,
            answer: answer,
            client_timestamp: Date.now(),
          })
        } else {
          console.warn('[PlayPage] Cannot send SUBMIT_ANSWER:', {
            hasMatchId: !!battleState.matchId,
            wsConnected,
          })
        }
      }

      return (
        <BattleQuestionV3
          key={`question-${battleState.matchId}-${battleState.currentQuestionIndex}`}
          question={question}
          questionIndex={battleState.currentQuestionIndex}
          totalQuestions={battleState.questionList.length}
          onAnswer={handleAnswer}
          player1Score={battleState.player1Score}
          player2Score={battleState.player2Score}
          player1Streak={battleState.player1Streak || 0}
          player2Streak={battleState.player2Streak || 0}
          opponentName="對手"
          opponentStatus={battleState.opponentStatus || 'idle'}
          opponentAnswer={battleState.opponentAnswer || null}
          playerPresetId={userStatus?.presetId}
        />
      )
    }
  }

  const modeCards = [
    {
      id: 'system',
      label: '系統對戰',
      description: 'AI 訓練、弱點會戰、排位賽',
      icon: Sword,
      onClick: openSystemModal,
      accent: 'bg-gradient-to-br from-blue-500/70 to-indigo-500/70 text-white',
      energyCost: 1,
      estimatedTime: '5-8 分鐘',
    },
    {
      id: 'custom',
      label: '自訂對戰',
      description: '創建房間、邀請好友',
      icon: Users,
      onClick: openCustomModal,
      accent: 'bg-gradient-to-br from-fuchsia-500/60 to-pink-500/60 text-white',
      energyCost: 2,
      estimatedTime: '8-12 分鐘',
    },
    {
      id: 'ugc',
      label: '內容貢獻',
      description: '創建題目、管理題目、發起挑戰',
      icon: Sparkles,
      onClick: openUGCContractModal,
      accent: 'bg-gradient-to-br from-amber-400/60 to-orange-500/60 text-white',
      energyCost: 0,
      estimatedTime: '自訂',
    },
    {
      id: 'practice',
      label: '無限練習',
      description: 'TikTok 式刷題，多人同樂',
      icon: Brain,
      onClick: async () => {
        // Create a new room with default settings (mixed subjects)
        try {
          const res = await fetch('/api/play/practice/create', {
            method: 'POST',
            body: JSON.stringify({ sourceType: 'MIXED' })
          })
          const data = await res.json()
          if (data.success) {
            router.push(`/play/practice/${data.room.room_code}`)
          } else {
            alert('無法建立練習室')
          }
        } catch (e) {
          console.error(e)
          alert('連線錯誤')
        }
      },
      accent: 'bg-gradient-to-br from-cyan-400/60 to-blue-500/60 text-white',
      energyCost: 0,
      estimatedTime: '無限制',
    },
    {
      id: 'focus',
      label: '專注修煉',
      description: '番茄鐘冥想，提升學習定力',
      icon: Brain,
      onClick: () => setFocusModalOpen(true),
      accent: 'bg-gradient-to-br from-emerald-400/60 to-teal-500/60 text-white',
      energyCost: 0,
      estimatedTime: '25 分鐘',
    },
  ]



  return (
    <>
      {/* Mobile-first: 減少 padding，確保在 360×800、390×844 等尺寸下完整顯示 */}
      <main className="mx-auto max-w-3xl px-4 py-4 pb-20 md:py-10 md:pb-24">
        <div className="space-y-4 md:space-y-6">
          <GameStatusBar />

          <div className="space-y-2 pt-2 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[36px] font-bold tracking-tight text-foreground"
            >
              知識對戰
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-[18px] text-muted-foreground"
            >
              選擇你的對戰模式，開始挑戰
            </motion.p>
          </div>



          <div className="mx-auto mt-6 flex w-full max-w-lg flex-col gap-3">
            <div data-widget="daily-mission">
              <DailyMissionWidgetV2 />
            </div>
            {modeCards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ModeCard {...card} modeId={card.id} onRecordOperation={recordOperation} />
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={isChestModalOpen} onOpenChange={setChestModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>寶箱背包</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {progression?.chests?.length ? (
              progression.chests.map((chest) => (
                <Card key={chest.id} className="border border-border bg-card p-3 text-card-foreground">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{chest.chestType} Chest</div>
                      <div className="text-xs text-muted-foreground">{chest.source}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => openChest(chest.id)}>
                      開啟
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {chest.rewards?.gold && <span>Gold +{chest.rewards.gold}</span>}
                    {chest.rewards?.xp && <span>XP +{chest.rewards.xp}</span>}
                    {chest.rewards?.buff && <span>Buff x{chest.rewards.buff.multiplier}</span>}
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground">目前沒有寶箱</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {activeModal === 'SYSTEM' && <SystemBattleModal onClose={closeModal} />}
        {activeModal === 'CUSTOM' && <CustomBattleModal onClose={closeModal} />}
        {activeModal === 'UGC_CONTRACT' && <UGCContractModal onClose={closeModal} />}
        {activeModal === 'BATTLE_RESULT' && (
          <GamifiedMatchResultModal onClose={closeModal} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPveCountdownOverlay && (
          <BattleTransitionOverlay
            key="pve-countdown"
            variant="pve-countdown"
            countdown={pveCountdown}
            matchId={battleState?.matchId ?? null}
            questionCount={battleState?.questionList.length || 0}
            enableSkip={canSkipCountdown}
            onSkipCountdown={handleSkipCountdown}
          />
        )}
        {!showPveCountdownOverlay && showPveTransitionOverlay && (
          <BattleTransitionOverlay
            key="pve-transition"
            variant="syncing"
            countdown={null}
            matchId={battleState?.matchId ?? null}
            questionCount={battleState?.questionList.length || 0}
            onSkipCountdown={() => setIsPveTransitioning(false)}
          />
        )}
        {!showPveCountdownOverlay && !showPveTransitionOverlay && showMatchTransitionOverlay && (
          <BattleTransitionOverlay
            key="sync-overlay"
            variant="syncing"
            countdown={lobbyConfirmState?.countdown ?? null}
            matchId={battleState?.matchId ?? lobbyConfirmState?.matchId ?? null}
            questionCount={battleState?.questionList.length || 0}
          />
        )}
      </AnimatePresence>

      {
        lobbyConfirmState && !lobbyConfirmState.skipUI && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <Card className="max-w-md space-y-4 bg-card p-6 text-card-foreground">
              <h3 className="text-xl font-semibold">確認對戰</h3>
              <p className="text-sm text-muted-foreground">對戰即將開始，倒數 {lobbyConfirmState.countdown} 秒</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (!lobbyConfirmState.matchId) return
                    sendWebSocketMessage({
                      type: 'CANCEL_LOBBY',
                      match_id: lobbyConfirmState.matchId,
                    })
                    setLobbyConfirmState(null)
                  }}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 bg-[#5B7CFF] text-white hover:bg-[#4a63d7]"
                  onClick={() => {
                    if (!lobbyConfirmState.matchId) return
                    sendWebSocketMessage({
                      type: 'CONFIRM_LOBBY',
                      match_id: lobbyConfirmState.matchId,
                    })
                  }}
                >
                  確認
                </Button>
              </div>
            </Card>
          </div>
        )
      }

      {/* 系統對戰不再顯示大廳確認UI，直接開始遊戲 */}

      <TamagotchiWidget />

      <AnimatePresence>
        {isFocusModalOpen && <FocusModeModal onClose={() => setFocusModalOpen(false)} />}
      </AnimatePresence>

    </>
  )
}

// ============================================
// Main Export
// ============================================

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    }>
      <PlayPageContent />
    </Suspense>
  )
}
