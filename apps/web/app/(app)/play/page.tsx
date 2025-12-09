'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { usePlay, type BattleState } from '@/lib/play-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Users, Sparkles, Sword, Music, FileText, Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// 🚀 SOTA: 智能預取工具
import { preloadOnInteraction, preloadOnIdle } from '@/lib/preloadable-dynamic'
import { modalOptimization } from '@/lib/utils/css-optimization'
import { cn } from '@/lib/utils'

// 🚀 SOTA: 模態框 - 交互預取（觸摸/懸停時預加載）
const SystemBattleModal = preloadOnInteraction(
  () => import('@/components/play/SystemBattleModal').then(m => ({ default: m.SystemBattleModal })),
  { ssr: false }
)

const CustomBattleModal = preloadOnInteraction(
  () => import('@/components/play/CustomBattleModal').then(m => ({ default: m.CustomBattleModal })),
  { ssr: false }
)

const UGCContractModal = preloadOnInteraction(
  () => import('@/components/play/UGCContractModal').then(m => ({ default: m.UGCContractModal })),
  { ssr: false }
)

const EditorGameModal = preloadOnInteraction(
  () => import('@/components/play/EditorGameModal').then(m => ({ default: m.EditorGameModal })),
  { ssr: false }
)

const PracticeSourceModal = preloadOnInteraction(
  () => import('@/components/play/PracticeSourceModal').then(m => ({ default: m.PracticeSourceModal })),
  { ssr: false }
)

// 🚧 未實現的組件 - 臨時佔位
const ChestModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => null
const EditorModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => null
const PracticeSetupModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => null

const BattleResultModal = preloadOnInteraction(
  () => import('@/components/play/BattleResultModal').then(m => ({ default: m.BattleResultModal })),
  { ssr: false }
)

const GamifiedMatchResultModal = preloadOnInteraction(
  () => import('@/components/play/GamifiedMatchResultModal').then(m => ({ default: m.GamifiedMatchResultModal })),
  { ssr: false }
)

const FocusModeModal = preloadOnInteraction(
  () => import('@/components/play/FocusModeModal').then(m => ({ default: m.FocusModeModal })),
  { ssr: false }
)

const PracticeRoomSetupModal = preloadOnInteraction(
  () => import('@/components/play/PracticeRoomSetupModal').then(m => ({ default: m.PracticeRoomSetupModal })),
  { ssr: false }
)

// 🚀 SOTA: 非關鍵組件 - 空閒預取
const DailyMissionWidgetV2 = preloadOnIdle(
  () => import('@/components/play/DailyMissionWidgetV2').then(m => ({ default: m.DailyMissionWidgetV2 })),
  { ssr: false }
)



// WsStatusIndicator removed


// 靜態導入（不需要預取）
import { BattleQuestionV3 } from '@/components/play/BattleQuestionV3'
import { BattleTransitionOverlay } from '@/components/play/BattleTransitionOverlay'
import { PVEResultModal } from '@/components/play/PVEResultModal'
import { useRouter, useSearchParams } from 'next/navigation'
import { normalizeBattleOptions, normalizeBattleText } from '@/lib/battle-text'
import { useGuidance, useErrorCorrection } from '@/lib/guidance/useGuidance'
import { AppBar } from '@/components/layout/app-bar'
import { isGameModeEnabled } from '@/lib/feature-flags'

import {
  calculateBaseScore,
  calculateSpeedCoefficient,
  calculateComboCoefficient,
  calculateComboMilestoneBonus,
  generateRNGBonus,
} from '@/components/play/BattleQuestionV3'
import { useAIOpponent } from '@/hooks/useAIOpponent'

// ============================================
// Shared Design Components
// ============================================

const glassCardClass =
  'rounded-[12px] bg-white/80 text-card-foreground shadow-xl backdrop-blur-[20px]'

// getTierLabel 已移除，等級 icon 將顯示在 profile 頁面頭像旁

// StatusCard 已移除

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

  // 格式化顯示字串
  const costDisplay = energyCost !== undefined ? `🪶 ${energyCost}` : ''
  const timeDisplay = estimatedTime === '無限' || estimatedTime === '無限制'
    ? <span className="text-[11px] font-normal text-muted-foreground/50">∞ 無時間限制</span>
    : estimatedTime ? `⏱ ${estimatedTime}` : ''

  return (
    <button
      type="button"
      onClick={handleClick}
      data-mode-card={modeId}
      className="group relative flex w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[18px] border border-border/40 bg-card px-4 py-5 transition-all active:scale-[0.98] hover:border-border/60"
    >
      {/* Top: Icon - Centered, Smaller & Lighter */}
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" strokeWidth={1.5} />
      </div>

      {/* Middle: Title & Description - Centered */}
      <div className="flex flex-col items-center gap-0.5 text-center">
        <p className="text-[16px] font-semibold text-foreground/90">{label}</p>
        <p className="text-[11px] font-normal text-muted-foreground/60 line-clamp-1">{description}</p>
      </div>

      {/* Bottom: Info - Centered, Outline Style */}
      <div className="mt-1 flex items-center justify-center gap-2.5 text-[11px]">
        {costDisplay && (
          <span className="font-medium border border-border/30 px-1.5 py-0.5 rounded-md text-muted-foreground/70">{costDisplay}</span>
        )}
        {timeDisplay && (
          <div className="flex items-center">
            {timeDisplay}
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
    setBattleState,
    openSystemModal,
    openCustomModal,
    openUGCContractModal,
    progression,
    openChest,
    pveCountdown,
    setPveCountdown,

    startMatch,
    checkEnergy,
    advancePveRound
  } = usePlay()
  const [isChestModalOpen, setChestModalOpen] = useState(false)
  const [isFocusModalOpen, setFocusModalOpen] = useState(false)
  const [isEditorModalOpen, setEditorModalOpen] = useState(false)
  const [isPracticeSourceModalOpen, setIsPracticeSourceModalOpen] = useState(false)
  const [isPracticeSetupModalOpen, setPracticeSetupModalOpen] = useState(false)
  const [showPVEResult, setShowPVEResult] = useState(false)


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
    if (mode === 'onboarding' && !battleState?.isInBattle && !hasTriggeredOnboardingRef.current) {
      console.log('[PlayPage] 🚀 Auto-starting ONBOARDING match')
      hasTriggeredOnboardingRef.current = true

        ; (async () => {
          const energy = await checkEnergy()
          if (!energy.success) {
            trackEnergyError() // 🎯 觸發引導: \"體力用完了? 完成任務獲取體力!\"
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

          // setIsPveTransitioning(true) - Removed for direct start
          const result = await startMatch({
            type: 'PVE_TRAINING',
            subject: 'english',
            timeLimit: 15,
            origin: 'ONBOARDING',
          })

          if (!result.ok) {
            alert(result.error || '啟動失敗，請稍後再試')
            // setIsPveTransitioning(false) - Removed for direct start
          }

          // Clear query param to avoid re-triggering on refresh
          const newParams = new URLSearchParams(searchParams.toString())
          newParams.delete('mode')
          router.replace(`/play?${newParams.toString()}`)
        })()
    }
  }, [searchParams, battleState?.isInBattle, startMatch, router, checkEnergy, trackEnergyError])


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

  // 🎯 Use AI Opponent Hook for PVE battles
  const aiCurrentQuestion = battleState?.isInBattle && battleState?.questionList?.length > 0
    ? battleState.questionList[battleState.currentQuestionIndex]
    : null

  const isPVEActive = Boolean(
    battleState?.isInBattle &&
    battleState?.matchType === 'PVE_TRAINING' &&
    aiCurrentQuestion &&
    !battleState?.playerHasAnswered &&
    !battleState?.opponentAnswer
  )

  const aiOpponent = useAIOpponent(
    aiCurrentQuestion?.id,
    (aiCurrentQuestion?.correct_answer || aiCurrentQuestion?.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
    aiCurrentQuestion?.difficulty || 3,
    isPVEActive,
    {
      minDelayMs: 8000,
      randomDelayMs: 8000,
      correctRate: 0.65,
    }
  )

  // Update battle state when AI opponent status/answer changes
  useEffect(() => {
    if (!isPVEActive) return
    if (!battleState) return

    // Update opponent status and answer
    setBattleState(prev => {
      if (!prev) return prev

      const updates: Partial<BattleState> = {}
      const isPlayerDone = prev.playerHasAnswered

      // 🎯 Fog of War Logic:
      // If AI has a result but player hasn't answered, mask the status as 'locked' (Ready)
      // This hides the 'hit'/'miss' result and prevents score leaks
      let exposedStatus = aiOpponent.status
      if (!isPlayerDone && (aiOpponent.status === 'hit' || aiOpponent.status === 'miss')) {
        exposedStatus = 'locked'
      }

      // Update status if changed
      if (prev.opponentStatus !== exposedStatus) {
        updates.opponentStatus = exposedStatus
      }

      // Update answer if changed (BattleQuestionV3 handles masking the specific letter)
      if (aiOpponent.answer && prev.opponentAnswer !== aiOpponent.answer) {
        updates.opponentAnswer = aiOpponent.answer
      }

      // Update score ONLY if status is revealed (hit/miss)
      // This prevents players from guessing the result based on score changes
      if (aiOpponent.score > 0 && (exposedStatus === 'hit' || exposedStatus === 'miss')) {
        // We need to ensure we don't add the score multiple times
        // Check if we already processed this question's score?
        // Actually, we can check if the previous status was 'locked' or 'thinking'
        // If it was already 'hit'/'miss', we assume score was added.
        // BUT, since we use `prev.opponentStatus`, this check is safe:
        // If prev was 'locked' and now 'hit', we add score.
        // If prev was 'hit' and now 'hit', we don't enter this block (if we checked keys).
        // Wait, the block below runs even if status didn't change?
        // No, we should couple score update with status change to be safe, or check if score makes sense.
        // Better yet: Only add score if `prev.opponentStatus` was NOT hit/miss
        const wasRevealed = prev.opponentStatus === 'hit' || prev.opponentStatus === 'miss'

        if (!wasRevealed) {
          const isCorrect = aiOpponent.status === 'hit' // Use real status for score calc
          updates.player2Score = prev.player2Score + aiOpponent.score
          updates.player2Streak = isCorrect ? (prev.player2Streak || 0) + 1 : 0
        }
      }

      // Only update if there are changes
      if (Object.keys(updates).length === 0) return prev

      return { ...prev, ...updates }
    })
  }, [aiOpponent.status, aiOpponent.answer, aiOpponent.score, isPVEActive, battleState?.playerHasAnswered])

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
          <div className="space-y-2">
            <Button onClick={() => router.push('/home')} className="w-full bg-[#5B7CFF] text-white hover:bg-[#4a63d7]">
              返回首頁
            </Button>
            <Button
              onClick={() => {
                // 🎯 FIX: 嘗試重新獲取用戶狀態
                if (checkEnergy) {
                  checkEnergy().catch(console.error)
                }
                router.push('/auth/login')
              }}
              className="w-full bg-gray-600 text-white hover:bg-gray-700"
            >
              登入或註冊
            </Button>
            {/* 🎯 FIX: 添加診斷按鈕（僅在開發環境顯示） */}
            {process.env.NODE_ENV === 'development' && (
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/play/user/status', { credentials: 'include' })
                    const data = await response.json()
                    console.log('[PlayPage Debug] API Response:', { status: response.status, data })
                    alert(`API Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`)
                  } catch (error) {
                    console.error('[PlayPage Debug] API Error:', error)
                    alert(`API Error: ${error}`)
                  }
                }}
                className="mt-2 w-full text-xs"
              >
                🔍 診斷 API 連線
              </Button>
            )}
          </div>
        </Card>
      </main>
    )
  }

  const showPveCountdownOverlay = typeof pveCountdown === 'number' && pveCountdown > 0



  // PVP 的轉場畫面（匹配成功後的等待畫面）
  const isPveMatch = true // Always PVE since we removed PVP
  const showMatchTransitionOverlay =
    !showPveCountdownOverlay &&
    // !showPveTransitionOverlay && // 不與 PVE 過渡動畫重疊
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

        const upsertAnswerRecords = (prev: BattleState, userAnswer: 'A' | 'B' | 'C' | 'D' | null, isCorrect: boolean) => {
          const records = [...(prev.answerRecords ?? [])]
          const idx = records.findIndex(r => r.questionId === question.id)
          if (idx >= 0) {
            records[idx] = {
              ...records[idx],
              userAnswer,
              isCorrect,
            }
          } else {
            records.push({
              questionId: question.id,
              userAnswer,
              isCorrect,
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
              answerRecords: upsertAnswerRecords(prev, null, false),
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
        const rngBonus = generateRNGBonus()

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

        // 🚀 SOTA: Zero-Wait Protocol - Instant Resolve AI
        // 如果 AI 還沒回答，強制它立即結算 ("Speed Blitz")
        let currentAiScore = battleState.player2Score
        let currentAiStreak = battleState.player2Streak || 0

        if (aiOpponent.status === 'thinking' && !battleState.opponentAnswer) {
          console.log('[PlayPage] ⚡️ SPEED BLITZ! Forcing AI to answer immediately.')
          aiOpponent.resolveNow()

          // 注意：因為 State Update 是非同步的，這裡的 aiOpponent.score 可能還是舊的
          // 在下一次 render 會同步，但為了即時計算，我們這裡不做額外加分操作
          // 而是在上面的 useEffect 監聽 aiOpponent 變化時處理
          // 但為了讓 UX 感覺是「同時」的，我們相信 useAIOpponent 的內部狀態更新會很快反映
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
            answerRecords: upsertAnswerRecords(prev, answer, isCorrect),
          }
        })

        // PVE: Check if this was the last question
        // 🎯 FIX: Ensure correct index calculation (length - 1 is the last index)
        const totalQuestions = battleState.questionList.length
        const currentIdx = battleState.currentQuestionIndex
        const isLastQuestion = currentIdx >= totalQuestions - 1

        console.log('[PlayPage] 🏁 Checking end game:', {
          currentIdx,
          totalQuestions,
          isLastQuestion
        })

        if (isLastQuestion) {
          // Show result modal immediately (Zero-Wait)
          console.log('[PlayPage] 🏆 Match finished (local), show result')
          setTimeout(() => {
            // 🎯 FIX: End battle state to allow result modal to show
            setBattleState(prev => prev ? { ...prev, isInBattle: false } : null)
            setShowPVEResult(true)
          }, 1500) // 縮短等待時間 (2s -> 1.5s)
        } else {
          // 🚀 Zero-Wait: 加速進入下一題 (2s -> 1.2s)
          // 給予玩家足夠時間看到 AI 的結果（因為被強制顯示了），然後迅速下一題
          console.log('[PlayPage] ⏭️ Advancing to next question (Turbo)')
          setTimeout(() => {
            // Double check validation before advancing
            if (currentIdx < totalQuestions - 1) {
              advancePveRound()
            }
          }, 1200)
        }

        // 背景提交答案（樂觀更新，不等待結果）
        fetch('/api/play/pve/submit-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: battleState.matchId,
            questionId: question.id,
            answer,
            isCorrect,
            timeRemaining,
            score: finalScore,
            // 🎯 For Ready Score calculation
            difficulty: question.difficulty,
            subject: 'english' // PVE currently defaults to english, or user selected subject
          })
        }).catch(err => console.error('[PlayPage] Background submit error:', err))
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
          playerPresetId={userStatus?.presetId ?? undefined}
        />
      )
    }
  }

  // Define all available mode cards
  // 🎯 MVP 階段：只保留三個核心入口
  const allModeCards = [
    {
      id: 'system',
      flagId: 'SYSTEM_BATTLE' as const,
      label: 'AI 對戰',
      description: '與 AI 進行知識挑戰',
      icon: Sword,
      onClick: openSystemModal,
      accent: 'bg-gradient-to-br from-blue-500/70 to-indigo-500/70 text-white',
      energyCost: 1,
      estimatedTime: '3-5 分鐘',
    },
    {
      id: 'lyrical-flow',
      flagId: 'LYRICAL_FLOW' as const,
      label: '單字滑卡',
      description: '跟著音樂節奏，沈浸式單字記憶',
      icon: Music,
      onClick: () => router.push('/play/lyrical-flow'),
      accent: 'bg-gradient-to-br from-pink-500/70 to-rose-500/70 text-white',
      energyCost: 0,
      estimatedTime: '無限',
    },
    {
      id: 'focus',
      flagId: 'FOCUS_MODE' as const,
      label: '專注模式',
      description: '番茄鐘冥想，提升學習定力',
      icon: Brain,
      onClick: () => setFocusModalOpen(true),
      accent: 'bg-gradient-to-br from-emerald-400/60 to-teal-500/60 text-white',
      energyCost: 0,
      estimatedTime: '25 分鐘',
    },
    // ⏸️ 以下功能暫時關閉（由 feature flags 控制）
    {
      id: 'custom',
      flagId: 'CUSTOM_BATTLE' as const,
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
      flagId: 'UGC_MODE' as const,
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
      flagId: 'PRACTICE_MODE' as const,
      label: '無限練習',
      description: 'TikTok 式刷題，可使用我的題本',
      icon: Brain,
      onClick: () => setIsPracticeSourceModalOpen(true),
      accent: 'bg-gradient-to-br from-cyan-400/60 to-blue-500/60 text-white',
      energyCost: 0,
      estimatedTime: '無限制',
    },
    {
      id: 'detective',
      flagId: 'DETECTIVE_MODE' as const,
      label: '偵探檔案',
      description: '碎片閱讀、證據判讀、邏輯推理',
      icon: FileText,
      onClick: () => router.push('/play/detective/case-001'),
      accent: 'bg-gradient-to-br from-slate-700 to-slate-900 text-amber-400 border border-amber-500/30',
      energyCost: 2,
      estimatedTime: '15-20 分鐘',
    },
    {
      id: 'editor',
      flagId: 'EDITOR_MODE' as const,
      label: '實習編輯',
      description: '找錯、修稿、主旨判斷',
      icon: FileText,
      onClick: () => setEditorModalOpen(true),
      accent: 'bg-gradient-to-br from-purple-400/60 to-indigo-500/60 text-white',
      energyCost: 1,
      estimatedTime: '5 分鐘',
    },
  ]

  // Filter mode cards based on feature flags
  const modeCards = allModeCards.filter((card) => isGameModeEnabled(card.flagId))

  // Use first 3 modes for the rhythm grid layout
  const gridModes = modeCards.slice(0, 3)

  return (
    // Magazine Layout Background: Beige Gradient
    <main
      className="min-h-screen w-full bg-gradient-to-b from-[#EBE5D5] to-[#F5F2EA]"
      style={{
        // 🎯 SOTA Mobile Fix: 使用 CSS 变量动态计算底部留白，适配所有设备
        paddingBottom: 'var(--content-bottom-padding)',
      }}
    >
      <div className="mx-auto max-w-md px-4 pt-2">
        {/* Hero: Daily Mission (Dashboard) */}
        <section className="mb-6">
          <DailyMissionWidgetV2 />
        </section>

        {/* Tools: Rhythm Grid (2 Squares + 1 Rectangle) */}
        <section className="grid grid-cols-2 gap-3">
          {gridModes.map((mode, index) => {
            const isFullWidth = index === 2 // The 3rd item (Focus) is full width
            return (
              <div key={mode.id} className={isFullWidth ? "col-span-2" : "col-span-1"}>
                <ModeCard
                  label={mode.label}
                  description={mode.description}
                  icon={mode.icon}
                  onClick={mode.onClick}
                  accent={mode.accent}
                  modeId={mode.id}
                  onRecordOperation={recordOperation}
                  energyCost={mode.energyCost}
                  estimatedTime={mode.estimatedTime}
                />
              </div>
            )
          })}
        </section>

        {/* PVE Result Modal */}
        <PVEResultModal
          isOpen={showPVEResult}
          onClose={() => {
            setShowPVEResult(false)
            setBattleState(null)
          }}
          onPlayAgain={() => {
            setShowPVEResult(false)
            setBattleState(null)
            // 重新開始 PVE 對戰 - 觸發 Focus 模式
            setFocusModalOpen(true)
          }}
        />

        {/* Battle Modals - Controlled by activeModal state */}
        {activeModal === 'SYSTEM' && (
          <SystemBattleModal onClose={closeModal} />
        )}

        {/* Other Modals */}
        <ChestModal isOpen={isChestModalOpen} onClose={() => setChestModalOpen(false)} />
        <FocusModeModal isOpen={isFocusModalOpen} onClose={() => setFocusModalOpen(false)} />
        <EditorModal isOpen={isEditorModalOpen} onClose={() => setEditorModalOpen(false)} />
        <PracticeSourceModal
          isOpen={isPracticeSourceModalOpen}
          onClose={() => setIsPracticeSourceModalOpen(false)}
        />
      </div>
    </main>
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
