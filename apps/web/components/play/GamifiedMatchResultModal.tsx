'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { X, Info, Edit2, HelpCircle, CheckCircle2, Trophy, Sparkles, Star } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { PixelTrophy, PixelCoin, PixelStar, PixelBook } from '@/components/ui/pixel-art-icons'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { usePlay } from '@/lib/play-context'
import { CoinCounter, XPCounter, EloChange } from '@/components/ui/count-up'
import { GameHaptics } from '@/lib/haptics'
import { LevelUpCelebration } from './LevelUpCelebration'
import { toast } from 'sonner'
import { WrongQuestionEditModal } from './WrongQuestionEditModal'
import { QuestionAskModal } from './QuestionAskModal'
import { trackMissionEvent } from '@/lib/mission-tracker'

// 客戶端 API 包裝：添加錯題到錯題本
async function addToErrorBook(questionId: string) {
  const response = await fetch('/api/error-book', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      questionId,
      source: 'battle',
    }),
  })
  const data = await response.json()
  return { ok: data.success, ...data }
}

interface WrongQuestion {
  id: string
  questionText: string
  options: string[]
  correctAnswer: string
  userAnswer: string | null
  explanation?: string
  difficulty?: number
  source?: string
  subject?: string
  isAsked?: boolean // 是否已提問
}

interface GamifiedMatchResultModalProps {
  onClose: () => void
}

type ModalLayer = 'L1' | 'L2'

export function GamifiedMatchResultModal({ onClose }: GamifiedMatchResultModalProps) {
  const { user } = useAuth()
  const {
    postMatchInsights,
    setPostMatchInsights,
    userStatus,
    progression,
    refreshProgression,
    openSystemModal,
    battleState,
  } = usePlay()

  // 狀態管理
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [currentLayer, setCurrentLayer] = useState<ModalLayer>('L1')
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[] | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  const [editingQuestion, setEditingQuestion] = useState<WrongQuestion | null>(null)
  const [askingQuestion, setAskingQuestion] = useState<WrongQuestion | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [coinBreakdownVisible, setCoinBreakdownVisible] = useState(false)
  const [eloChange, setEloChange] = useState<{ oldElo: number; newElo: number; eloDiff: number } | null>(null)
  const lastInitializedMatchId = useRef<string | null>(null)
  const [wrongQuestionsLoading, setWrongQuestionsLoading] = useState(false)
  const [wrongQuestionsError, setWrongQuestionsError] = useState<string | null>(null)

  // 計算數據
  const resolvedPlayer1Score = postMatchInsights?.finalScore?.player1 ?? 0
  const resolvedPlayer2Score = postMatchInsights?.finalScore?.player2 ?? 0
  const resolvedIsWinner = postMatchInsights?.winner ? postMatchInsights.winner === user?.id : false
  const scoreDiff = resolvedPlayer1Score - resolvedPlayer2Score
  const coinsEarned = postMatchInsights?.coinsEarned ?? 0
  const coinBreakdown = postMatchInsights?.coinBreakdown
  const xpEarned = progression ? Math.round((progression.xp.progress || 0) * 100) : 0

  // 檢查 Level Up（只檢查一次）
  const lastLevelRef = useRef(progression?.xp.level || 1)
  const hasCheckedLevelUp = useRef(false)
  const wrongCount = wrongQuestions?.length ?? 0
  useEffect(() => {
    if (hasCheckedLevelUp.current) return
    if (progression && progression.xp.level > lastLevelRef.current) {
      hasCheckedLevelUp.current = true
      setShowLevelUp(true)
      lastLevelRef.current = progression.xp.level
    }
  }, [progression])

  // 當新的 match 開始時，重置 Layer 和狀態
  useEffect(() => {
    if (!postMatchInsights?.matchId) {
      lastInitializedMatchId.current = null
      return
    }

    if (lastInitializedMatchId.current === postMatchInsights.matchId) {
      return
    }

    lastInitializedMatchId.current = postMatchInsights.matchId
    console.log('[GamifiedMatchResultModal] New match started, resetting to Layer 1, matchId:', postMatchInsights.matchId)
    setCurrentLayer('L1')
    setWrongQuestions(null)
    setSelectedQuestions(new Set())
    setEditingQuestion(null)
    setAskingQuestion(null)
    setCoinBreakdownVisible(false)

    // Track mission progress for battle completion
    const playerWon = resolvedPlayer1Score > resolvedPlayer2Score
    trackMissionEvent('BATTLE_COMPLETED').catch(err =>
      console.warn('[Mission Tracker] Failed to track battle completion:', err)
    )
    if (playerWon) {
      trackMissionEvent('BATTLE_WON').catch(err =>
        console.warn('[Mission Tracker] Failed to track battle win:', err)
      )
    }
  }, [postMatchInsights?.matchId, resolvedPlayer1Score, resolvedPlayer2Score])

  // 獲取錯誤題目列表
  const hasFetchedWrongQuestions = useRef<string | null>(null)
  useEffect(() => {
    if (!postMatchInsights?.matchId) {
      setWrongQuestions(null)
      setSelectedQuestions(new Set())
      hasFetchedWrongQuestions.current = null
      return
    }

    if (hasFetchedWrongQuestions.current === postMatchInsights.matchId) {
      return
    }

    hasFetchedWrongQuestions.current = postMatchInsights.matchId
    setWrongQuestions(null)
    setSelectedQuestions(new Set())
    setWrongQuestionsLoading(true)
    setWrongQuestionsError(null)

    const fetchWrongQuestions = async (retries = 3) => {
      console.log(`[GamifiedMatchResultModal] 開始獲取錯題，matchId: ${postMatchInsights.matchId}, 剩餘重試次數: ${retries}`)
      try {
        await new Promise(resolve => setTimeout(resolve, 500))

        let answersData: any = { success: false }
        for (let i = 0; i < retries; i++) {
          const answersRes = await fetch(`/api/play/battle/answers?matchId=${postMatchInsights.matchId}`)
          answersData = await answersRes.json()
          console.log(`[GamifiedMatchResultModal] 答題記錄 (第 ${i + 1} 次嘗試):`, answersData)

          if (answersData.success && answersData.answers && answersData.answers.length > 0) {
            console.log(`[GamifiedMatchResultModal] 成功獲取答題記錄 (第 ${i + 1} 次嘗試):`, answersData.answers.length, '題')
            break
          }
          console.warn(`[GamifiedMatchResultModal] 獲取答題記錄失敗，重試中... (第 ${i + 1} 次嘗試)`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        if (!answersData.success || !answersData.answers) {
          throw new Error(answersData.error || '無法取得答題記錄')
        }

        const wrongAnswers = answersData.answers.filter((a: any) => !a.isCorrect)
        const wrongQuestionIds = wrongAnswers.map((a: any) => String(a.questionId))

        console.log('[GamifiedMatchResultModal] 錯誤題目 ID:', wrongQuestionIds, `(共 ${wrongQuestionIds.length} 題)`)

        if (wrongQuestionIds.length === 0) {
          setWrongQuestions([])
          setWrongQuestionsLoading(false)
          return
        }

        const detailsRes = await fetch(`/api/play/questions/details?ids=${wrongQuestionIds.join(',')}`)
        const detailsData = await detailsRes.json()

        if (!detailsData.success || !detailsData.questions) {
          throw new Error(detailsData.error || '無法取得題目詳情')
        }

        const wrong: WrongQuestion[] = detailsData.questions.map((q: any) => {
          const answerRecord = wrongAnswers.find((a: any) => String(a.questionId) === String(q.id))
          return {
            id: String(q.id),
            questionText: q.questionText,
            options: q.options || [],
            correctAnswer: q.correctAnswer,
            userAnswer: answerRecord ? (answerRecord.userAnswer || null) : null,
            explanation: q.explanation || '',
            difficulty: q.difficulty,
            source: q.source,
            subject: q.subject,
          }
        })

        console.log('[GamifiedMatchResultModal] 成功設置錯題列表:', wrong.length, '題')
        setWrongQuestions(wrong)
        setSelectedQuestions(new Set(wrong.map(q => q.id)))
      } catch (error) {
        console.error('[GamifiedMatchResultModal] Failed to fetch wrong questions:', error)
        setWrongQuestions([])
        setSelectedQuestions(new Set())
        setWrongQuestionsError(error instanceof Error ? error.message : '取得錯題失敗')
      } finally {
        setWrongQuestionsLoading(false)
      }
    }

    fetchWrongQuestions()
  }, [postMatchInsights?.matchId])

  // 獲取 Elo 變化
  useEffect(() => {
    if (!postMatchInsights?.matchId || !userStatus?.eloRank) return

    if (postMatchInsights.eloChange) {
      setEloChange(postMatchInsights.eloChange)
      return
    }

    const timer = setTimeout(() => {
      fetch('/api/play/user/status', {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.eloRank && userStatus.eloRank) {
            const diff = data.eloRank - userStatus.eloRank
            if (diff !== 0) {
              setEloChange({
                oldElo: userStatus.eloRank,
                newElo: data.eloRank,
                eloDiff: diff,
              })
            }
          }
        })
        .catch(console.error)
    }, 2500)

    return () => clearTimeout(timer)
  }, [postMatchInsights?.matchId, postMatchInsights?.eloChange, userStatus?.eloRank])

  // 觸覺反饋
  useEffect(() => {
    if (resolvedIsWinner) {
      GameHaptics.celebrate()
    } else {
      GameHaptics.fail()
    }
  }, [resolvedIsWinner])

  // 個性化標語
  const getPersonalizedTagline = useCallback(() => {
    if (scoreDiff === 0) return '精彩平局'
    if (resolvedIsWinner) {
      if (eloChange && eloChange.eloDiff > 20) return '壓倒性勝利！'
      if (eloChange && eloChange.eloDiff > 0) return 'Elo 穩定提升中！'
      return '恭喜獲勝！'
    }
    if (eloChange && eloChange.eloDiff < -20) return '雖敗猶榮，繼續努力！'
    return '已全力以赴'
  }, [resolvedIsWinner, scoreDiff, eloChange])

  // 切換到 Layer 2
  const handleGoToLayer2 = useCallback(() => {
    if (!wrongQuestions || wrongQuestions.length === 0 || wrongQuestionsLoading) {
      return
    }
    console.log('[GamifiedMatchResultModal] 🔄 Switching to Layer 2')
    console.log('[GamifiedMatchResultModal] wrongQuestions.length:', wrongQuestions.length)
    console.log('[GamifiedMatchResultModal] wrongQuestions:', JSON.stringify(wrongQuestions, null, 2))
    console.log('[GamifiedMatchResultModal] currentLayer before:', currentLayer)
    setCurrentLayer('L2')
    console.log('[GamifiedMatchResultModal] currentLayer set to: L2')
    GameHaptics.buttonPress()
  }, [wrongQuestions, currentLayer, wrongQuestionsLoading])

  // 切換選擇
  const toggleQuestionSelection = useCallback((questionId: string) => {
    if (!wrongQuestions || wrongQuestions.length === 0) return
    setSelectedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        next.add(questionId)
      }
      return next
    })
  }, [])

  // 全選/取消全選
  const toggleSelectAll = useCallback(() => {
    if (!wrongQuestions || wrongQuestions.length === 0) {
      setSelectedQuestions(new Set())
      return
    }
    if (selectedQuestions.size === wrongQuestions.length) {
      setSelectedQuestions(new Set())
    } else {
      setSelectedQuestions(new Set(wrongQuestions.map(q => q.id)))
    }
  }, [selectedQuestions.size, wrongQuestions])

  // 關閉 Modal
  const handleClose = useCallback(() => {
    setPostMatchInsights(null)
    refreshProgression()
    onClose()
  }, [onClose, setPostMatchInsights, refreshProgression])

  // 保存到錯題本
  const handleSaveToErrorBook = useCallback(async () => {
    if (!user || selectedQuestions.size === 0 || !wrongQuestions || wrongQuestions.length === 0) return

    setIsSaving(true)
    try {
      const promises = Array.from(selectedQuestions).map(async (questionId) => {
        const question = wrongQuestions.find(q => q.id === questionId)
        if (!question) return { ok: false }

        // 使用 API 路由調用錯題本服務
        const result = await addToErrorBook(question.id)
        return result
      })

      const results = await Promise.all(promises)
      const successCount = results.filter(r => r.success || r.ok).length

      if (successCount > 0) {
        GameHaptics.celebrate()
        // 顯示成功提示
        toast.success(`成功加入 ${successCount} 題到錯題本！`, {
          description: '繼續保持！',
          duration: 3000
        })
        handleClose()
      } else {
        toast.error('儲存失敗，請稍後再試')
      }
    } catch (error) {
      console.error('[GamifiedMatchResultModal] Failed to save to error book:', error)
      toast.error('儲存失敗，請稍後再試')
    } finally {
      setIsSaving(false)
    }
  }, [user, selectedQuestions, wrongQuestions, handleClose])

  // 處理提問
  const handleAskQuestion = useCallback((question: WrongQuestion) => {
    setAskingQuestion(question)
  }, [])

  // 處理提問完成
  const handleAskComplete = useCallback((questionId: string) => {
    setWrongQuestions((prev) =>
      prev ? prev.map((q) => (q.id === questionId ? { ...q, isAsked: true } : q)) : []
    )
    setAskingQuestion(null)
  }, [])

  // 再來一局
  const handleRematch = useCallback(() => {
    handleClose()
    setTimeout(() => openSystemModal(), 300)
  }, [handleClose, openSystemModal])

  // 防止重複渲染
  const modalKey = useMemo(() => postMatchInsights?.matchId || Date.now(), [postMatchInsights?.matchId])

  // 如果顯示 Level Up，先顯示慶祝動畫
  if (showLevelUp && progression) {
    return (
      <LevelUpCelebration
        level={progression.xp.level}
        onComplete={() => setShowLevelUp(false)}
      />
    )
  }

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()} key={modalKey}>
        <DialogContent className="max-w-2xl overflow-hidden p-0 bg-transparent border-0 pointer-events-auto">
          <DialogHeader className="sr-only">
            <DialogTitle asChild>
              <VisuallyHidden>對戰結果</VisuallyHidden>
            </DialogTitle>
            <DialogDescription asChild>
              <VisuallyHidden>完整的對戰結算與錯題回顧</VisuallyHidden>
            </DialogDescription>
          </DialogHeader>
          <div className="relative pointer-events-auto">
            {/* 背景：根據勝負切換顏色 + 科技紋理 */}
            <div
              className={`absolute inset-0 -z-10 backdrop-blur-xl ${resolvedIsWinner
                ? 'bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-pink-900/20'
                : 'bg-gradient-to-br from-red-900/20 via-orange-900/20 to-amber-900/20'
                }`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* 右上角關閉按鈕 */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 transition-all hover:scale-110"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 兩層內容容器 - 平滑垂直滑動過渡 */}
            <div className="relative overflow-hidden pointer-events-auto">
              <div className="relative" style={{ height: 'min(600px, 85dvh)' }}>
                <AnimatePresence mode="wait" initial={false}>
                  {currentLayer === 'L1' ? (
                    <motion.div
                      key="L1"
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -100 }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="absolute inset-0 pointer-events-auto z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Layer1Content
                        player1Score={resolvedPlayer1Score}
                        player2Score={resolvedPlayer2Score}
                        isWinner={resolvedIsWinner}
                        scoreDiff={scoreDiff}
                        tagline={getPersonalizedTagline()}
                        coinsEarned={coinsEarned}
                        coinBreakdown={coinBreakdown}
                        coinBreakdownVisible={coinBreakdownVisible}
                        onCoinBreakdownToggle={() => setCoinBreakdownVisible(!coinBreakdownVisible)}
                        xpEarned={xpEarned}
                        eloChange={eloChange}
                        wrongCount={wrongCount}
                        wrongCountLoading={wrongQuestionsLoading}
                        wrongQuestionsError={wrongQuestionsError}
                        onGoToLayer2={handleGoToLayer2}
                        onRematch={handleRematch}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="L2"
                      initial={{ opacity: 0, y: 100 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 100 }}
                      transition={{ duration: 0.4, ease: 'easeInOut' }}
                      className="absolute inset-0 pointer-events-auto z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Layer2Content
                        wrongQuestions={wrongQuestions}
                        wrongQuestionsLoading={wrongQuestionsLoading}
                        selectedQuestions={selectedQuestions}
                        onToggleSelection={toggleQuestionSelection}
                        onToggleSelectAll={toggleSelectAll}
                        onEdit={(q) => setEditingQuestion(q)}
                        onAsk={handleAskQuestion}
                        onSave={handleSaveToErrorBook}
                        onRematch={handleRematch}
                        onClose={handleClose}
                        isSaving={isSaving}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 編輯 Modal */}
      {editingQuestion && (
        <WrongQuestionEditModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={(updated) => {
            setWrongQuestions((prev) =>
              prev ? prev.map((q) => (q.id === updated.id ? updated : q)) : []
            )
            setEditingQuestion(null)
          }}
        />
      )}

      {/* 提問 Modal */}
      {askingQuestion && (
        <QuestionAskModal
          question={askingQuestion}
          onClose={() => setAskingQuestion(null)}
          onComplete={handleAskComplete}
        />
      )}
    </>
  )
}

// Layer 1: 戰績與獎勵聚焦
interface Layer1ContentProps {
  player1Score: number
  player2Score: number
  isWinner: boolean
  scoreDiff: number
  tagline: string
  coinsEarned: number
  coinBreakdown?: any
  coinBreakdownVisible: boolean
  onCoinBreakdownToggle: () => void
  xpEarned: number
  eloChange: { oldElo: number; newElo: number; eloDiff: number } | null
  wrongCount: number
  onGoToLayer2: () => void
  onRematch: () => void
  wrongCountLoading: boolean
  wrongQuestionsError: string | null
}

function Layer1Content({
  player1Score,
  player2Score,
  isWinner,
  scoreDiff,
  tagline,
  coinsEarned,
  coinBreakdown,
  coinBreakdownVisible,
  onCoinBreakdownToggle,
  xpEarned,
  eloChange,
  wrongCount,
  wrongCountLoading,
  wrongQuestionsError,
  onGoToLayer2,
}: Layer1ContentProps) {
  const [animationComplete, setAnimationComplete] = useState(false)
  const wrongCountLabel = wrongCountLoading ? '載入中' : wrongCount
  const showWrongActions = !wrongCountLoading && wrongCount > 0
  const disableLayer2Cta = wrongCountLoading || wrongCount === 0

  useEffect(() => {
    const timer = setTimeout(() => setAnimationComplete(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  const [revealIndex, setRevealIndex] = useState(0)

  useEffect(() => {
    if (revealIndex < 3) {
      const timer = setTimeout(() => setRevealIndex(prev => prev + 1), 300)
      return () => clearTimeout(timer)
    }
  }, [revealIndex])

  return (
    <div className="bg-gradient-to-b from-[#05070E]/95 to-[#101525]/95 text-white rounded-2xl p-8 h-full overflow-y-auto relative pointer-events-auto">
      {/* 卡片光暈邊緣 */}
      <div className={`absolute inset-0 rounded-2xl border shadow-[0_0_30px_rgba(99,102,241,0.3),inset_0_0_20px_rgba(99,102,241,0.1)] pointer-events-none ${isWinner ? 'border-yellow-500/20' : 'border-red-500/20'
        }`} />

      {/* 背景紋理 */}
      <div
        className={`absolute inset-0 rounded-2xl opacity-30 ${isWinner
          ? 'bg-gradient-to-br from-yellow-900/10 via-blue-900/10 to-purple-900/10'
          : 'bg-gradient-to-br from-red-900/10 via-orange-900/10 to-amber-900/10'
          }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* 標題區域 */}
      <div className="text-center mb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-3"
        >
          {isWinner && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
            >
              <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            </motion.div>
          )}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold"
          >
            {tagline}
          </motion.h2>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/60 text-sm font-light"
        >
          {scoreDiff === 0
            ? '雙方都值得掌聲'
            : isWinner
              ? `你領先 ${Math.abs(scoreDiff)} 分贏下此戰`
              : `差 ${Math.abs(scoreDiff)} 分，下一場就是逆襲！`}
        </motion.p>

        {/* 分數對比 - 增強視覺層次 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 items-center gap-4 mt-8"
        >
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-light">你</p>
            <p className="text-5xl font-black bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              {player1Score}
            </p>
          </motion.div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white/50">vs</p>
            <p className="text-base text-white/40 font-light mt-1">差距 {Math.abs(scoreDiff)}</p>
          </div>
          <motion.div
            className="space-y-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-light">對手</p>
            <p className="text-5xl font-black text-white/50">{player2Score}</p>
          </motion.div>
        </motion.div>
      </div>

      {/* 獎勵區域 - 極簡像素風格 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="border border-white/10 bg-white/5 p-4 mb-6 relative"
        style={{
          borderWidth: '1px',
          imageRendering: 'pixelated',
        }}
      >
        {/* 單像素分隔線 */}
        <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

        <div className="flex flex-wrap items-center justify-center gap-8">
          {/* 金幣計數器 - 像素化 */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: revealIndex >= 0 ? 0.7 : 0 }}
          >
            <div className="flex items-center gap-2">
              <PixelCoin size={24} className="text-yellow-400" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">金幣</span>
                <span
                  className="text-2xl font-black text-yellow-400 leading-none"
                  style={{ fontFamily: 'monospace' }}
                >
                  {coinsEarned}
                </span>
              </div>
            </div>
            {coinBreakdown && (
              <button
                onClick={onCoinBreakdownToggle}
                className="absolute -top-1 -right-1 w-4 h-4 border border-white/20 bg-white/10 flex items-center justify-center text-[8px] text-white/70 hover:bg-white/20 transition-colors"
                aria-label="查看金幣詳情"
                style={{ imageRendering: 'pixelated' }}
              >
                <Info className="w-2.5 h-2.5" />
              </button>
            )}
          </motion.div>

          {/* 經驗值計數器 - 像素化 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: revealIndex >= 1 ? 0.8 : 0 }}
            className="relative"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <PixelStar size={24} className="text-yellow-400" />
              </motion.div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">經驗</span>
                <span
                  className="text-2xl font-black text-yellow-400 leading-none"
                  style={{ fontFamily: 'monospace' }}
                >
                  +{xpEarned}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Elo 變化 - 像素化 */}
          {eloChange && eloChange.eloDiff !== 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: revealIndex >= 2 ? 0.9 : 0 }}
              className="flex items-center gap-2"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Elo</span>
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-lg font-black text-white/50 leading-none"
                    style={{ fontFamily: 'monospace' }}
                  >
                    {eloChange.oldElo}
                  </span>
                  <span className="text-sm text-white/60">→</span>
                  <span
                    className={`text-lg font-black leading-none ${eloChange.eloDiff > 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    style={{ fontFamily: 'monospace' }}
                  >
                    {eloChange.newElo}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 金幣詳情 Pop-up - 像素風格 */}
        {coinBreakdownVisible && coinBreakdown && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-black/80 border border-white/20 text-xs"
            style={{
              borderWidth: '1px',
              imageRendering: 'pixelated',
            }}
          >
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-white/50 uppercase tracking-wider">基礎獎勵</span>
                <span className="text-white">{coinBreakdown.base || 0}</span>
              </div>
              {coinBreakdown.winner && (
                <div className="flex justify-between">
                  <span className="text-white/50 uppercase tracking-wider">勝利加成</span>
                  <span className="text-yellow-400">+{coinBreakdown.winner}</span>
                </div>
              )}
              {coinBreakdown.contract && (
                <div className="flex justify-between">
                  <span className="text-white/50 uppercase tracking-wider">合約獎勵</span>
                  <span className="text-blue-400">+{coinBreakdown.contract}</span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-white/10 font-bold">
                <span className="uppercase tracking-wider">總計</span>
                <span className="text-yellow-400">{coinBreakdown.total || coinsEarned}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 錯誤提示 - 像素風格 */}
        {showWrongActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: animationComplete ? 0 : 1.2 }}
            className="mt-4 p-3 bg-yellow-500/5 border border-yellow-400/40 flex items-center gap-3 relative"
            style={{
              borderWidth: '1px',
              imageRendering: 'pixelated',
            }}
          >
            {/* 慢速脈衝邊框 */}
            <motion.div
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="absolute inset-0 border border-yellow-400/60"
            />
            <span className="text-lg relative z-10">⚠</span>
            <div className="flex-1 relative z-10">
              <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider font-mono">
                待領取：訂正錯題 {wrongCountLabel}
              </p>
              <p className="text-[10px] text-yellow-400/60 mt-0.5 font-mono">加入錯題本可獲得額外獎勵</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      <div className="relative z-10 mt-4 text-[11px] text-yellow-300/80 font-mono text-center">
        {wrongQuestionsError
          ? `無法載入錯題：${wrongQuestionsError}`
          : '建議：檢查錯題並加入錯題本以獲得額外獎勵'}
      </div>

      {/* 主 CTA - 像素風格 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animationComplete ? 0 : 1.4 }}
        className="relative z-20"
      >
        <button
          disabled={disableLayer2Cta}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (disableLayer2Cta) return
            console.log('[Layer1] CTA clicked, wrongCount:', wrongCount)
            onGoToLayer2()
          }}
          className={`w-full bg-indigo-500 text-white border border-indigo-400/50 h-12 text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] relative overflow-hidden pointer-events-auto z-50 font-mono ${disableLayer2Cta ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          style={{
            borderWidth: '1px',
            imageRendering: 'pixelated',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px rgba(99,102,241,0.6)',
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <PixelBook size={16} className="text-white" />
            加入錯題本 ({wrongCountLabel} 題)
          </span>
          {/* 像素化光邊效果 */}
          {showWrongActions && (
            <motion.div
              className="absolute inset-0 border border-white/30"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ imageRendering: 'pixelated' }}
            />
          )}
        </button>
      </motion.div>
    </div>
  )
}

// Layer 2: 錯題處理與協作
interface Layer2ContentProps {
  wrongQuestions: WrongQuestion[] | null
  wrongQuestionsLoading: boolean
  selectedQuestions: Set<string>
  onToggleSelection: (id: string) => void
  onToggleSelectAll: () => void
  onEdit: (question: WrongQuestion) => void
  onAsk: (question: WrongQuestion) => void
  onSave: () => void
  onRematch: () => void
  onClose: () => void
  isSaving: boolean
}

function Layer2Content({
  wrongQuestions,
  wrongQuestionsLoading,
  selectedQuestions,
  onToggleSelection,
  onToggleSelectAll,
  onEdit,
  onAsk,
  onSave,
  onRematch,
  onClose,
  isSaving,
}: Layer2ContentProps) {
  const questionList = wrongQuestions ?? []
  console.log('[Layer2Content] Rendering with', questionList.length, 'wrong questions')
  console.log('[Layer2Content] Wrong questions:', questionList)

  return (
    <div className="bg-gradient-to-b from-[#05070E]/95 to-[#101525]/95 text-white rounded-2xl p-8 h-full flex flex-col relative pointer-events-auto">
      {/* 卡片光暈邊緣 */}
      <div className="absolute inset-0 rounded-2xl border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.3),inset_0_0_20px_rgba(99,102,241,0.1)] pointer-events-none" />
      {/* 標題 */}
      <div className="mb-6 relative z-10">
        <h2 className="text-2xl font-bold mb-2">錯題處理</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/60">選擇要加入錯題本的題目</p>
          {!wrongQuestionsLoading && questionList.length > 0 && (
            <button
              onClick={onToggleSelectAll}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              {selectedQuestions.size === questionList.length ? '取消全選' : '全選'}
            </button>
          )}
        </div>
      </div>

      {/* 題目列表 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 relative z-10">
        {wrongQuestionsLoading ? (
          <div className="flex items-center justify-center h-full text-white/50 text-sm">
            載入錯題中...
          </div>
        ) : questionList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-white/40 mb-4">
              <Trophy className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg font-medium">太棒了！</p>
              <p className="text-sm mt-2">這場對戰沒有答錯題目</p>
            </div>
          </div>
        ) : (
          questionList.map((question, index) => {
            const isSelected = selectedQuestions.has(question.id)
            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-xl border p-4 transition-all relative ${isSelected
                  ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                  : 'border-white/10 bg-white/5'
                  }`}
                style={{
                  boxShadow: isSelected
                    ? '0 4px 16px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              >
                {/* 左側色條 */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isSelected ? 'bg-indigo-500' : 'bg-blue-500/30'
                  }`} />
                <div className="flex items-start gap-4">
                  {/* 選擇框 */}
                  <button
                    onClick={() => onToggleSelection(question.id)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-white/30 bg-transparent'
                      }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </button>

                  {/* 題目內容 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/90 mb-2 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="text-white/80">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                        }}
                      >
                        {question.questionText || ''}
                      </ReactMarkdown>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                      <span>正確答案：{question.correctAnswer}</span>
                      {question.userAnswer && (
                        <span>你的答案：{question.userAnswer}</span>
                      )}
                      {question.difficulty && (
                        <span className="px-2 py-0.5 rounded bg-white/10">難度 L{question.difficulty}</span>
                      )}
                      {question.source && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">{question.source}</span>
                      )}
                    </div>
                  </div>

                  {/* 操作按鈕 - 優化間距和懸停效果 */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onEdit(question)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all hover:scale-110 group"
                      aria-label="編輯"
                    >
                      <Edit2 className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                    </button>
                    <button
                      onClick={() => onAsk(question)}
                      disabled={question.isAsked}
                      className={`p-2 rounded-lg transition-all ${question.isAsked
                        ? 'bg-blue-500/20 cursor-not-allowed'
                        : 'bg-white/5 hover:bg-white/10 hover:scale-110'
                        } group`}
                      aria-label="求助學霸"
                    >
                      {question.isAsked ? (
                        <div className="relative">
                          <HelpCircle className="w-4 h-4 text-blue-400" />
                          <motion.div
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400"
                            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        </div>
                      ) : (
                        <HelpCircle className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 已提問標記 */}
                {question.isAsked && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-blue-400 flex items-center gap-1"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    已提問
                  </motion.div>
                )}

                {/* 詳解顯示 */}
                {question.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 pt-3 border-t border-white/10"
                  >
                    <div className="text-xs font-semibold text-white/70 mb-2">📖 詳解</div>
                    <div className="prose prose-invert prose-sm max-w-none text-white/80">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                          li: ({ children }) => <li className="text-sm">{children}</li>,
                        }}
                      >
                        {question.explanation}
                      </ReactMarkdown>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })
        )}
      </div>

      {/* 底部操作 */}
      <div className="space-y-3 pt-4 border-t border-white/10 relative z-10">
        <Button
          onClick={onSave}
          disabled={selectedQuestions.size === 0 || isSaving}
          className="w-full rounded-xl bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-50 h-12 text-base font-semibold shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] transition-all active:scale-95 relative overflow-hidden"
        >
          <span className="relative z-10">
            {isSaving
              ? '儲存中...'
              : `加入錯題本 (${selectedQuestions.size} 題)`}
          </span>
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-xl"
            initial={{ scale: 0, opacity: 0.8 }}
            whileTap={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        </Button>
        <Button
          onClick={onRematch}
          variant="outline"
          className="w-full rounded-xl border-white/30 text-white hover:bg-white/10 h-12 text-base transition-all active:scale-95"
        >
          再來一局
        </Button>
        <Button
          onClick={() => {
            onClose()
            window.location.href = '/home'
          }}
          variant="ghost"
          className="w-full rounded-xl text-white/50 hover:text-white hover:bg-white/5 h-10 text-sm transition-all"
        >
          返回首頁
        </Button>
      </div>
    </div>
  )
}
