'use client'

import { useEffect } from 'react'
import { usePlay } from '@/lib/play-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Coins, Swords, Users, FileText, Sparkles, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SystemBattleModal } from '@/components/play/SystemBattleModal'
import { CustomBattleModal } from '@/components/play/CustomBattleModal'
import { BattleQuestion as BattleQuestionV2 } from '@/components/play/BattleQuestionV2'
import {
  calculateBaseScore,
  calculateSpeedCoefficient,
  calculateComboCoefficient,
  calculateComboMilestoneBonus,
  generateRNGBonus,
} from '@/components/play/BattleQuestionV2'
import { BattleResultModal } from '@/components/play/BattleResultModal'
import { useRouter } from 'next/navigation'

// ============================================
// Top Status Bar Component
// ============================================

function StatusBar() {
  const { userStatus, isLoadingStatus } = usePlay()

  if (isLoadingStatus) {
    return (
      <div className="fixed top-0 left-0 right-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-end gap-4 px-4 py-3">
          <div className="h-6 w-20 animate-pulse rounded bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  // 未登錄狀態：顯示提示
  if (!userStatus) {
    return (
      <div className="fixed top-0 left-0 right-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-end gap-4 px-4 py-3">
          <span className="text-sm text-muted-foreground">請先登錄</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-40 border-b bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg items-center justify-end gap-3 px-4 py-3">
        {/* Elo Rank */}
        <div className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-2.5 py-1.5 border border-purple-500/20">
          <Trophy className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-semibold text-purple-300">
            {userStatus.eloRank || 1000}
          </span>
        </div>

        {/* Energy Gauge */}
        <div className="flex items-center gap-1.5">
          <Zap className={`h-4 w-4 ${userStatus.dailyEnergyCount > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i < userStatus.dailyEnergyCount
                    ? 'bg-yellow-500'
                    : 'bg-muted/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-semibold text-foreground">
            {userStatus.walletBalance.toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// Main Battle Hub Cards
// ============================================

function BattleHubCards() {
  const { openSystemModal, openCustomModal } = usePlay()

  const cards = [
    {
      id: 'system',
      title: '系統對戰',
      description: 'AI 訓練、弱點會戰、排位賽',
      icon: Swords,
      color: 'from-blue-500 to-cyan-500',
      onClick: openSystemModal,
    },
    {
      id: 'custom',
      title: '自訂對戰',
      description: '創建房間、邀請好友',
      icon: Users,
      color: 'from-purple-500 to-pink-500',
      onClick: openCustomModal,
    },
  ]

  return (
    <div className="space-y-4 px-4">
      {cards.map((card, index) => {
        const Icon = card.icon
              return (
                <motion.div
            key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="group relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm p-5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md hover:border-border cursor-pointer"
                    onClick={card.onClick}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                    
                    <div className="relative flex items-center gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-md`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      <div className="flex-1">
                        <h3 className="mb-0.5 text-lg font-semibold">{card.title}</h3>
                        <p className="text-xs text-muted-foreground/70">{card.description}</p>
                      </div>

                      <div className="text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground">
                        →
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
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
  } = usePlay()

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

  // 處理 ROUND_RESOLVED 後自動進入下一題
  useEffect(() => {
    if (battleState && battleState.isInBattle && battleState.opponentStatus !== 'idle') {
      // 對手已答題，等待 2.5 秒後進入下一題
      const timer = setTimeout(() => {
        const nextIndex = battleState.currentQuestionIndex + 1
        if (nextIndex < battleState.questionList.length) {
          setBattleState({
            ...battleState,
            currentQuestionIndex: nextIndex,
            opponentStatus: 'idle',
            opponentAnswer: null,
          })
        }
      }, 2500)
      
      return () => clearTimeout(timer)
    }
  }, [battleState?.opponentStatus, battleState?.currentQuestionIndex, battleState, setBattleState])

  // 如果正在載入，顯示載入狀態
  if (isLoadingStatus) {
    return (
      <>
        <StatusBar />
        <main className="mx-auto max-w-lg pt-20 pb-24">
          <div className="px-4 space-y-4">
            <Card className="border-2 p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 w-32 bg-muted rounded mx-auto mb-2" />
                <div className="h-4 w-48 bg-muted rounded mx-auto" />
              </div>
            </Card>
        </div>
        </main>
      </>
    )
  }

  // 如果沒有用戶狀態，顯示提示（不重定向，因為 onboarding 頁面不存在）
  if (!userStatus && !skipAuthCheck) {
    return (
      <>
        <StatusBar />
        <main className="mx-auto max-w-lg pt-20 pb-24">
          <div className="px-4">
            <Card className="border-2 p-8 text-center">
              <h2 className="mb-4 text-xl font-bold">請先登錄</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                登錄後即可開始對戰
              </p>
              <Button onClick={() => router.push('/home')}>
                返回首頁
              </Button>
            </Card>
          </div>
        </main>
      </>
    )
  }
  
  // 對戰中：顯示題目
  if (battleState && battleState.isInBattle && battleState.questionList.length > 0) {
    const currentQuestion = battleState.questionList[battleState.currentQuestionIndex]
    console.log(`[PlayPage] ✅ Rendering battle page - question ${battleState.currentQuestionIndex + 1}/${battleState.questionList.length}`)
    
    if (currentQuestion) {
      // 轉換題目格式
      const question = {
        id: currentQuestion.id || `q-${battleState.currentQuestionIndex}`,
        questionText: currentQuestion.question_text || currentQuestion.questionText || '',
        options: Array.isArray(currentQuestion.options) 
          ? currentQuestion.options.map((opt: any) => 
              typeof opt === 'string' ? opt : (opt.text || opt.id || String(opt))
            )
          : ['選項 A', '選項 B', '選項 C', '選項 D'],
        correctAnswer: (currentQuestion.correct_answer || currentQuestion.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
        difficulty: currentQuestion.difficulty || 3,
        timeLimit: currentQuestion.time_limit || currentQuestion.timeLimit || 30,
        skillTags: currentQuestion.skill_tags || currentQuestion.skillTags,
      }

      const handleAnswer = (answer: 'A' | 'B' | 'C' | 'D', timeRemaining: number) => {
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
        setBattleState({
          ...battleState,
          player1Streak: newStreak,
          player1Score: battleState.player1Score + finalScore,
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
        <>
          <StatusBar />
          <BattleQuestionV2
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
            ddaBand={battleState.ddaBand}
          />
        </>
      )
    }
  }

            return (
    <>
      <StatusBar />
      
      <main className="mx-auto max-w-lg pt-20 pb-24">
        {/* Hero Section - Minimalist Design */}
        <div className="mb-10 px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            知識對戰
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm text-muted-foreground/80"
          >
            選擇你的對戰模式，開始挑戰
          </motion.p>
        </div>

        {/* Battle Hub Cards */}
        <BattleHubCards />

        {/* Empty State - Minimalist */}
        <div className="mt-16 px-4">
          <div className="rounded-lg border border-dashed border-border/50 bg-card/30 p-8 text-center backdrop-blur-sm">
            <FileText className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground/60">
              對戰記錄將顯示在這裡
            </p>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'SYSTEM' && (
          <SystemBattleModal onClose={closeModal} />
        )}
        {activeModal === 'CUSTOM' && (
          <CustomBattleModal onClose={closeModal} />
        )}
        {activeModal === 'BATTLE_RESULT' && (
          <BattleResultModal onClose={closeModal} />
        )}
      </AnimatePresence>

      {/* Lobby Confirm Modal - 簡化版本 */}
      {lobbyConfirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="max-w-md p-6">
            <h3 className="mb-4 text-xl font-bold">確認對戰</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              對戰即將開始，倒數 {lobbyConfirmState.countdown} 秒
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
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
                onClick={() => {
                  console.log(`[PlayPage] Sending CONFIRM_LOBBY for matchId: ${lobbyConfirmState.matchId}`)
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
      )}
    </>
  )
}

// ============================================
// Main Export
// ============================================

export default function PlayPage() {
  return <PlayPageContent />
}
