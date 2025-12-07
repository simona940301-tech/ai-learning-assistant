'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { BattleQuestionV3 } from '@/components/play/BattleQuestionV3'
import type { OpponentStatus } from '@/components/play/BattleQuestionV3'
import {
  calculateBaseScore,
  calculateSpeedCoefficient,
  calculateComboCoefficient,
  calculateComboMilestoneBonus,
} from '@/components/play/BattleQuestionV3'
import { motion, AnimatePresence } from 'framer-motion'
import { supabaseBrowserClient } from '@/lib/supabase'
import { PlayMockProvider } from '@/lib/play-context'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PremiumLoader } from '@/components/ui/premium-loader'

/**
 * STEP 2 — 快速測驗 (Challenge with AI Coach)
 * 
 * 設計:
 * - 支援匿名模式（使用 localStorage）
 * - 7 題測試，根據用戶程度智能選題
 * - 動態難度調整（根據答題結果）
 * - 答題後顯示解析
 * - 暖黃色系極簡 UI
 */

// AI 教練配置
const AI_MIN_DELAY_MS = 12000
const AI_RANDOM_DELAY_MS = 8000
const AI_CORRECT_RATE = 0.6

// localStorage keys
const STORAGE_KEY = 'onboarding_anonymous_data'

type Question = {
  id: string
  questionText: string
  options: string[]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  difficulty: number
  timeLimit: number
  explanation?: string
}

type Result = {
  questionId: string
  isCorrect: boolean
  timeMs: number
  answerSelected: 'A' | 'B' | 'C' | 'D' | null
  difficulty: number
}

type AnonymousData = {
  questions?: Question[]
  results?: Result[]
  userLevel?: number
  startedAt?: string
  avatarId?: string  // ✅ 新增 avatarId 支援
  goalData?: {
    target_university?: string
    target_department?: string
    is_exploring?: boolean
    current_grade?: string
    mock_exam_level?: number
  }
}

// ✅ API 返回的原始題目格式（snake_case）
type ApiQuestion = {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  difficulty_level: number
  explanation?: string
}

export default function OnboardingChallengePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [playerStreak, setPlayerStreak] = useState(0)
  const [aiStreak, setAiStreak] = useState(0)
  const [aiStatus, setAiStatus] = useState<OpponentStatus>('idle')
  const [aiAnswer, setAiAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReview, setShowReview] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [playerAvatarId, setPlayerAvatarId] = useState<string | null>(null)
  const resultsRef = useRef<Result[]>([])
  const aiAnswerPromiseRef = useRef<Promise<void> | null>(null)
  const aiTimeoutsRef = useRef<number[]>([])
  const playerAnsweredRef = useRef<boolean>(false)
  const questionStartTimeRef = useRef<number>(0)
  const currentUserLevelRef = useRef<number>(8) // 初始程度

  // Initialize session and fetch questions
  useEffect(() => {
    async function initSession() {
      try {
        let userLevel = 8 // 預設中等程度
        let currentSessionId: string | null = null

        // 檢查是否為匿名模式
        if (!user || authLoading) {
          // 匿名模式：從 localStorage 讀取 goalData、avatar 和測驗資料
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            try {
              const data: AnonymousData = JSON.parse(stored)
              // 優先使用 goalData 中的 mock_exam_level
              if (data.goalData?.mock_exam_level) {
                userLevel = data.goalData.mock_exam_level
              } else {
                userLevel = data.userLevel || 8
              }
              // 讀取 avatar ID
              if (data.avatarId) {
                setPlayerAvatarId(data.avatarId)
              }
              // 如果已有進行中的測驗，恢復狀態
              // ✅ 修復：安全訪問 data.results
              const resultsArray = data.results || []
              if (resultsArray.length > 0 && resultsArray.length < 7) {
                // 可以選擇恢復或重新開始
                // 這裡選擇重新開始以簡化流程
              }
            } catch (e) {
              console.error('[Challenge] Failed to parse stored data:', e)
            }
          } else {
            // 如果沒有 stored 資料，嘗試從 goalData 讀取
            const goalStored = localStorage.getItem('onboarding_anonymous_data')
            if (goalStored) {
              try {
                const goalData = JSON.parse(goalStored)
                if (goalData.goalData?.mock_exam_level) {
                  userLevel = goalData.goalData.mock_exam_level
                }
              } catch (e) {
                console.error('[Challenge] Failed to parse goal data:', e)
              }
            }
          }
          setIsAnonymous(true)
        } else {
          // 已登入模式：讀取 session 和 avatar
          const { data: sessionData } = await supabaseBrowserClient
            .from('onboarding_sessions')
            .select('id, mock_exam_level, current_grade')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          currentSessionId = sessionData?.id || null
          userLevel = sessionData?.mock_exam_level || 8

          // 讀取用戶 avatar
          const { data: profile } = await supabaseBrowserClient
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()

          if (profile?.avatar_url) {
            // 從 avatar_url 提取 preset ID
            // avatar_url 格式: /avatars/presets/fairy/avatarlightblue.png
            // 需要匹配對應的 preset ID
            const { AVATAR_PRESETS } = await import('@/lib/avatar/presets')
            const matchingPreset = AVATAR_PRESETS.find(p => p.imageUrl === profile.avatar_url)
            if (matchingPreset) {
              setPlayerAvatarId(matchingPreset.id)
            }
          }

          if (!currentSessionId) {
            const { data: newSession } = await supabaseBrowserClient
              .from('onboarding_sessions')
              .insert({
                user_id: user.id,
                current_step: 2,
                challenge_started_at: new Date().toISOString(),
              })
              .select('id')
              .single()

            currentSessionId = newSession?.id || null
          }
        }

        setSessionId(currentSessionId)
        currentUserLevelRef.current = userLevel

        // 動態難度評估：根據用戶程度生成 7 題難度序列
        // Level 1-5: [1,1,1,2,2,2,3]
        // Level 6-10: [1,1,2,2,2,3,3]
        // Level 11-15: [2,2,2,3,3,3,4] (如果支援 4 級)
        let difficultySequence: number[]
        if (userLevel <= 5) {
          difficultySequence = [1, 1, 1, 2, 2, 2, 3]
        } else if (userLevel <= 10) {
          difficultySequence = [1, 1, 2, 2, 2, 3, 3]
        } else {
          difficultySequence = [2, 2, 2, 3, 3, 3, 3] // 最高難度到 3
        }

        // 獲取所有需要的難度題目
        const uniqueDifficulties = [...new Set(difficultySequence)]
        const response = await fetch(
          `/api/onboarding/questions?difficulties=${uniqueDifficulties.join(',')}&count=7`
        )
        const data = await response.json()

        if (data.success && data.questions && data.questions.length >= 7) {
          // ✅ 明確類型：API 返回的是 ApiQuestion[]
          const apiQuestions = data.questions as ApiQuestion[]

          // 先對 API 返回的題目去重（以防萬一）
          const uniqueApiQuestions: ApiQuestion[] = Array.from(
            new Map(apiQuestions.map((q) => [q.id, q])).values()
          )

          // 根據難度序列分配題目
          const questionsByDifficulty: Record<number, ApiQuestion[]> = {}
          uniqueDifficulties.forEach(diff => {
            questionsByDifficulty[diff] = uniqueApiQuestions.filter(
              (q) => q.difficulty_level === diff
            )
          })

          // 追蹤已選題目 ID，避免重複
          const selectedQuestionIds = new Set<string>()
          const fetchedQuestions: Question[] = difficultySequence.map((diff, index) => {
            // 先從該難度的題目中選擇未選過的
            let available: ApiQuestion[] = (questionsByDifficulty[diff] || []).filter(
              (q) => !selectedQuestionIds.has(q.id)
            )

            // 如果該難度的題目都用完了，從所有題目中選擇未選過的
            if (available.length === 0) {
              available = uniqueApiQuestions.filter(
                (q) => !selectedQuestionIds.has(q.id)
              )
            }

            // 如果還是沒有可用題目，使用 fallback（理論上不應該發生）
            if (available.length === 0) {
              console.warn(`[Challenge] No available questions for difficulty ${diff} at index ${index}`)
              available = uniqueApiQuestions
            }

            // 隨機選擇一題
            const randomIndex = Math.floor(Math.random() * available.length)
            const selected = available[randomIndex]

            // 記錄已選題目
            selectedQuestionIds.add(selected.id)

            // ✅ 轉換 API 格式（snake_case）到前端格式（camelCase）
            return {
              id: selected.id,
              questionText: selected.question_text,
              options: [selected.option_a, selected.option_b, selected.option_c, selected.option_d],
              correctAnswer: selected.correct_answer,
              difficulty: selected.difficulty_level,
              timeLimit: 30,
              explanation: selected.explanation,
            }
          })

          // 驗證沒有重複題目
          const uniqueIds = new Set(fetchedQuestions.map(q => q.id))
          if (uniqueIds.size !== fetchedQuestions.length) {
            console.error('[Challenge] Duplicate questions detected!', {
              total: fetchedQuestions.length,
              unique: uniqueIds.size,
              questions: fetchedQuestions.map(q => ({ id: q.id, difficulty: q.difficulty }))
            })
          }

          setQuestions(fetchedQuestions)

          // 儲存到 localStorage（匿名模式）
          if (!user) {
            const anonymousData: AnonymousData = {
              questions: fetchedQuestions,
              results: [],
              userLevel,
              startedAt: new Date().toISOString(),
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(anonymousData))
          }
        } else {
          // Fallback
          setQuestions(generateFallbackQuestions())
        }

        setLoading(false)
      } catch (error) {
        console.error('[Challenge] Failed to init:', error)
        setQuestions(generateFallbackQuestions())
        setLoading(false)
      }
    }

    initSession()
  }, [user, authLoading])

  // AI 思考流程
  useEffect(() => {
    if (loading || questions.length === 0 || currentIndex >= questions.length || showReview) return

    const question = questions[currentIndex]

    playerAnsweredRef.current = false
    questionStartTimeRef.current = Date.now()
    setAiStatus('thinking')
    setAiAnswer(null)

    const randomDelay = Math.random() * AI_RANDOM_DELAY_MS
    const aiAnswerDelay = AI_MIN_DELAY_MS + randomDelay

    const promise = new Promise<void>((resolve) => {
      let aiAnswered = false

      const thinkingTimer = window.setTimeout(() => {
        if (aiAnswered) return

        aiAnswered = true
        const willAnswerCorrect = Math.random() < AI_CORRECT_RATE
        const wrongOptions: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'].filter(
          (opt) => opt !== question.correctAnswer
        ) as Array<'A' | 'B' | 'C' | 'D'>
        const answer = willAnswerCorrect ? question.correctAnswer : wrongOptions[Math.floor(Math.random() * wrongOptions.length)]

        setAiAnswer(answer)
        setAiStatus('locked')

        const settleTimer = window.setTimeout(() => {
          const isCorrect = answer === question.correctAnswer
          setAiStatus(isCorrect ? 'hit' : 'miss')

          if (isCorrect) {
            const estimated = calculateBaseScore(question.difficulty) * 1.6 + 100
            const swing = 0.55 + Math.random() * 0.25
            setAiScore((prev) => prev + Math.round(estimated * swing))
            setAiStreak((prev) => prev + 1)
          } else {
            setAiStreak(0)
          }

          resolve()
        }, 600)

        aiTimeoutsRef.current.push(settleTimer)
      }, aiAnswerDelay)

      aiTimeoutsRef.current.push(thinkingTimer)

      const checkPlayerAnswer = setInterval(() => {
        if (playerAnsweredRef.current && !aiAnswered) {
          const elapsed = Date.now() - questionStartTimeRef.current

          if (elapsed < AI_MIN_DELAY_MS) {
            clearInterval(checkPlayerAnswer)
            window.clearTimeout(thinkingTimer)

            const quickAnswerDelay = 1500 + Math.random() * 2500
            const quickAnswerTimer = window.setTimeout(() => {
              if (aiAnswered) return

              aiAnswered = true
              const willAnswerCorrect = Math.random() < AI_CORRECT_RATE
              const wrongOptions: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'].filter(
                (opt) => opt !== question.correctAnswer
              ) as Array<'A' | 'B' | 'C' | 'D'>
              const answer = willAnswerCorrect ? question.correctAnswer : wrongOptions[Math.floor(Math.random() * wrongOptions.length)]

              setAiAnswer(answer)
              setAiStatus('locked')

              const settleTimer = window.setTimeout(() => {
                const isCorrect = answer === question.correctAnswer
                setAiStatus(isCorrect ? 'hit' : 'miss')

                if (isCorrect) {
                  const estimated = calculateBaseScore(question.difficulty) * 1.6 + 100
                  const swing = 0.55 + Math.random() * 0.25
                  setAiScore((prev) => prev + Math.round(estimated * swing))
                  setAiStreak((prev) => prev + 1)
                } else {
                  setAiStreak(0)
                }

                resolve()
              }, 600)

              aiTimeoutsRef.current.push(settleTimer)
            }, quickAnswerDelay)

            aiTimeoutsRef.current.push(quickAnswerTimer)
          }
        }
      }, 100)

      aiTimeoutsRef.current.push(checkPlayerAnswer as any)
    })

    aiAnswerPromiseRef.current = promise

    return () => {
      aiTimeoutsRef.current.forEach((timerId) => window.clearTimeout(timerId))
      aiTimeoutsRef.current = []
      aiAnswerPromiseRef.current = null
    }
  }, [currentIndex, loading, questions, showReview])

  // 處理玩家答題
  const handlePlayerAnswer = async (
    answer: 'A' | 'B' | 'C' | 'D' | null,
    timeRemaining: number
  ) => {
    if (questions.length === 0) return

    playerAnsweredRef.current = true

    const question = questions[currentIndex]
    const isCorrect = answer === question.correctAnswer
    const timeMs = (question.timeLimit - timeRemaining) * 1000

    const estimatedPerQuestion = calculateBaseScore(question.difficulty) * 1.6 + 100
    const speedCoef = calculateSpeedCoefficient(timeRemaining, question.timeLimit)
    const normalizedSpeed = 0.6 + ((speedCoef - 0.8) / 0.2) * 0.4
    const nextStreak = isCorrect ? playerStreak + 1 : 0
    const comboCoef = isCorrect ? calculateComboCoefficient(nextStreak) : 1
    const comboMilestone = isCorrect ? calculateComboMilestoneBonus(nextStreak) : 0

    const playerDelta = isCorrect
      ? Math.round(estimatedPerQuestion * normalizedSpeed * comboCoef + comboMilestone)
      : -Math.round(estimatedPerQuestion * 0.25)

    const result: Result = {
      questionId: question.id,
      isCorrect,
      timeMs,
      answerSelected: answer,
      difficulty: question.difficulty,
    }

    resultsRef.current.push(result)

    // 動態調整難度（簡化版：根據連續答對/答錯調整）
    if (isCorrect && nextStreak >= 3) {
      // 連續答對 3 題，提升難度
      currentUserLevelRef.current = Math.min(15, currentUserLevelRef.current + 1)
    } else if (!isCorrect && resultsRef.current.filter(r => !r.isCorrect).length >= 2) {
      // 答錯 2 題，降低難度
      currentUserLevelRef.current = Math.max(1, currentUserLevelRef.current - 1)
    }

    setPlayerScore((prev) => Math.max(0, prev + playerDelta))
    setPlayerStreak(isCorrect ? nextStreak : 0)

    // 更新 localStorage（匿名模式）
    if (isAnonymous) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const data: AnonymousData = JSON.parse(stored)
          data.results = [...resultsRef.current]
          data.userLevel = currentUserLevelRef.current
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch (e) {
          console.error('[Challenge] Failed to update localStorage:', e)
        }
      }
    }

    if (aiAnswerPromiseRef.current) {
      await aiAnswerPromiseRef.current
    }

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1)
      } else {
        setShowReview(true)
      }
    }, 900)
  }

  const handleContinueToReward = async () => {
    // 防止重複點擊
    if (isNavigating) {
      console.log('[Challenge] Already navigating, ignoring duplicate call')
      return
    }

    try {
      console.log('[Challenge] handleContinueToReward called')
      setIsNavigating(true)
      const correctCount = resultsRef.current.filter((r) => r.isCorrect).length

      // 儲存完整資料到 localStorage（匿名模式）
      if (isAnonymous) {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          try {
            const data: AnonymousData = JSON.parse(stored)
            data.results = [...resultsRef.current]
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
          } catch (e) {
            console.error('[Challenge] Failed to save final results:', e)
          }
        }
      }

      // 儲存到 sessionStorage 供 reward 頁面使用
      sessionStorage.setItem('onboarding_challenge_score', String(correctCount))
      sessionStorage.setItem('onboarding_challenge_results', JSON.stringify(resultsRef.current))
      sessionStorage.setItem('onboarding_challenge_questions', JSON.stringify(questions))

      console.log('[Challenge] Data saved to sessionStorage, navigating...', {
        hasUser: !!user,
        hasSessionId: !!sessionId,
        correctCount,
      })

      if (!user || !sessionId) {
        // 匿名模式，直接導向 reward
        console.log('[Challenge] Anonymous mode, redirecting to reward')
        await router.push('/onboarding/reward')
        console.log('[Challenge] Navigation completed for anonymous user')
        return
      }

      // 已登入模式，更新資料庫（帶超時保護）
      console.log('[Challenge] Updating database for user session:', sessionId)

      try {
        const updateData = {
          current_step: 4, // Goal(1) → Avatar(2) → Challenge(3) → Reward(4)
          challenge_completed_at: new Date().toISOString(),
          challenge_score: correctCount,
          challenge_question_ids: questions.map((q) => q.id),
          challenge_results: resultsRef.current.map((r) => ({
            question_id: r.questionId,
            is_correct: r.isCorrect,
            time_ms: r.timeMs,
            answer_selected: r.answerSelected,
          })),
        }

        console.log('[Challenge] Update data prepared:', updateData)

        // 添加 5 秒超時保護
        const updatePromise = supabaseBrowserClient
          .from('onboarding_sessions')
          .update(updateData)
          .eq('id', sessionId)

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database update timeout')), 5000)
        )

        // ✅ 修復：正確處理 Promise.race 的類型
        const result = await Promise.race([updatePromise, timeoutPromise]) as { error?: unknown } | null
        const updateError = result && typeof result === 'object' && 'error' in result ? result.error : null

        if (updateError) {
          console.error('[Challenge] Failed to update session:', updateError)
          // 即使更新失敗，也繼續導航
        } else {
          console.log('[Challenge] Database updated successfully')
        }
      } catch (dbError) {
        console.error('[Challenge] Database operation threw error:', dbError)
        // 繼續導航，不讓資料庫問題阻擋用戶體驗
      }

      console.log('[Challenge] Redirecting to /onboarding/reward')
      await router.push('/onboarding/reward')
      console.log('[Challenge] Navigation completed for logged in user')
    } catch (error) {
      console.error('[Challenge] Unexpected error in handleContinueToReward:', error)
      // 確保即使發生錯誤也能導航
      try {
        await router.push('/onboarding/reward')
        console.log('[Challenge] Emergency navigation completed')
      } catch (navError) {
        console.error('[Challenge] Failed to navigate even in emergency:', navError)
        // 最後手段：使用 window.location
        window.location.href = '/onboarding/reward'
      }
    } finally {
      // 在出現錯誤的情況下，重置導航狀態
      setTimeout(() => setIsNavigating(false), 3000)
    }
  }

  if (loading) {
    return <PremiumLoader message="準備測驗中..." />
  }

  if (questions.length === 0) {
    return null
  }

  // Show review after all questions
  if (showReview) {
    const wrongQuestions = resultsRef.current
      .filter((result) => !result.isCorrect)
      .map((result) => {
        const question = questions.find((q) => q.id === result.questionId)
        return { result, question }
      })
      .filter((item): item is { result: Result; question: Question } => !!item.question)

    return (
      <div className="min-h-screen bg-[#FAF6E9] px-4 font-sans" style={{
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))'
      }}>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="text-[28px] font-semibold text-[#5D4037] mb-3 font-display">
              {wrongQuestions.length === 0 ? '🎉 全對!' : '📝 錯題回顧'}
            </h1>
            <p className="text-[15px] text-[#8B6F47]">
              {wrongQuestions.length === 0
                ? '太棒了!你答對了所有題目'
                : `答錯 ${wrongQuestions.length} 題,讓我們一起看看`}
            </p>
          </motion.div>

          {wrongQuestions.length > 0 && (
            <div className="space-y-6 mb-8">
              {wrongQuestions.map(({ result, question }, index) => {
                const optionLabels: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
                return (
                  <motion.div
                    key={question.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-[#FFFDF5] rounded-3xl p-6 border-2 border-[#E0D0B8] shadow-sm"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#DC2626] flex items-center justify-center">
                        <X className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-[16px] font-medium text-[#5D4037] mb-3 leading-relaxed">
                          {question?.questionText || '題目載入中...'}
                        </h3>
                        <div className="space-y-2 mb-4">
                          {optionLabels.map((label, optIndex) => {
                            const isCorrect = label === question?.correctAnswer
                            const isUserAnswer = label === result.answerSelected
                            return (
                              <div
                                key={label}
                                className={`px-4 py-3 rounded-xl border transition-colors ${isCorrect
                                  ? 'bg-[#E8F5E9] border-[#528555]'
                                  : isUserAnswer
                                    ? 'bg-[#FFEBEE] border-[#DC2626]'
                                    : 'bg-[#F8F5E8] border-[#E0D0B8]'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-[14px] ${isCorrect ? 'text-[#5D4037]' : 'text-[#8B6F47]'}`}>
                                    <span className={`font-semibold mr-2 ${isCorrect ? 'text-[#528555]' : 'text-[#FED168]'}`}>
                                      {label}.
                                    </span>
                                    {question?.options?.[optIndex] || '選項載入中...'}
                                  </span>
                                  {isCorrect && <Check className="h-4 w-4 text-[#528555]" />}
                                  {isUserAnswer && !isCorrect && <X className="h-4 w-4 text-[#DC2626]" />}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className="text-[13px] text-[#8B6F47] mb-3 flex items-center gap-2">
                          <span>你選了 <span className="text-[#DC2626]">{result.answerSelected}</span></span>
                          <span>→</span>
                          <span>正確答案 <span className="text-[#528555]">{question?.correctAnswer}</span></span>
                        </div>
                        {question?.explanation && (
                          <div className="bg-[#F8F5E8] rounded-xl p-4 border border-[#E0D0B8]">
                            <p className="text-[13px] font-medium text-[#5D4037] mb-1">📖 詳細解析</p>
                            <p className="text-[13px] text-[#8B6F47] leading-relaxed">
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          <Button
            onClick={handleContinueToReward}
            disabled={isNavigating}
            className="w-full h-14 bg-[#FED168] hover:bg-[#E6C058] disabled:bg-[#E0D0B8] disabled:cursor-not-allowed text-[#5D4037] disabled:text-[#8B6F47] rounded-2xl text-[16px] font-bold shadow-lg transition-colors"
          >
            {isNavigating
              ? '正在跳轉...'
              : wrongQuestions.length === 0
                ? '查看獎勵 →'
                : '我理解了,繼續 →'
            }
          </Button>

        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]

  return (
    <PlayMockProvider>
      <div className="min-h-screen bg-[#FAF6E9]" style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        <BattleQuestionV3
          question={currentQuestion}
          questionIndex={currentIndex}
          totalQuestions={questions.length}
          onAnswer={handlePlayerAnswer}
          player1Score={playerScore}
          player2Score={aiScore}
          player1Streak={playerStreak}
          player2Streak={aiStreak}
          opponentName="AI 教練"
          opponentStatus={aiStatus}
          opponentAnswer={aiAnswer}
          playerPresetId={playerAvatarId ?? undefined}
        />
      </div>
    </PlayMockProvider>
  )
}

function generateFallbackQuestions(): Question[] {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `fallback-${i + 1}`,
    questionText: `這是第 ${i + 1} 道測試題。請選擇 ${['A', 'B', 'C', 'D'][i % 4]}。`,
    options: ['選項 A', '選項 B', '選項 C', '選項 D'],
    correctAnswer: ['A', 'B', 'C', 'D'][i % 4] as 'A' | 'B' | 'C' | 'D',
    difficulty: Math.floor(i / 2) + 1,
    timeLimit: 30,
    explanation: `這是第 ${i + 1} 題的解析。`,
  }))
}
