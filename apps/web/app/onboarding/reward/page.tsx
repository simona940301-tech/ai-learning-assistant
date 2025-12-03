'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { motion } from 'framer-motion'
import { Trophy, Gift, Sparkles, BookOpen, FileText, Target, Check, Save, ArrowRight } from 'lucide-react'
import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * STEP 3 — 獎勵頁面
 * 
 * 設計:
 * - 顯示獎勵 (XP + 徽章 + 金幣)
 * - 顯示今日任務列表（已登入用戶）
 * - 註冊 CTA（匿名模式）
 * - 暖黃色系極簡 UI
 * 
 * 注意：錯題詳解已在 challenge 頁面的 review 階段顯示
 */

interface Task {
  id: string
  type: 'vocabulary' | 'cloze' | 'reading'
  title: string
  count: number
  icon: typeof BookOpen
}

export default function OnboardingRewardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [playerScore, setPlayerScore] = useState(0)
  const [xpEarned, setXpEarned] = useState(0)
  const [coinsEarned, setCoinsEarned] = useState(0)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)

  // 🛡️ Enterprise-Grade Auth Protection - Mock User Detection & Onboarding Status Check
  const checkAuthAndRedirect = useCallback(async () => {
    // 🚨 Critical: 強制阻擋所有 Mock User - 無例外
    if (user && (user.id === 'e770f9cd-52a7-43de-b983-70f6f78d2f53' || user.email === 'dev@test.com')) {
      console.warn('[Reward] 🚨 強制阻擋 Mock User，執行登出')
      await supabaseBrowserClient.auth.signOut()
      router.push('/onboarding')
      return
    }

    if (!user) return

    try {
      // Session 驗證 - 確保有效登入
      const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.getSession()
      if (sessionError || !sessionData?.session) {
        console.warn('[Reward] Invalid session, redirecting to login')
        router.push('/onboarding')
        return
      }

      // Onboarding 狀態檢查 - 與架構一致
      const { data, error } = await supabaseBrowserClient
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('[Reward] Profile query error:', error)
        router.push('/onboarding')
        return
      }

      if (data?.onboarding_completed) {
        console.log('[Reward] ✅ User completed onboarding, redirecting to home')
        router.push('/home')
        return
      }

      console.log('[Reward] ✅ Auth verified, continuing with reward page')
    } catch (error) {
      console.error('[Reward] Auth check failed:', error)
      router.push('/onboarding')
    }
  }, [user, router])

  // 🎯 Optimized: 只在認證狀態改變時執行，避免無限循環
  useEffect(() => {
    if (!authLoading) {
      checkAuthAndRedirect()
    }
  }, [authLoading, user?.id, checkAuthAndRedirect]) // 只監聽 user.id 避免物件變化

  // 🚀 Smart Data Initialization - Mock User Safe + Performance Optimized
  useEffect(() => {
    async function init() {
      console.log('[Reward] 🔄 Starting init function...')
      console.log('[Reward] User state:', { hasUser: !!user, userId: user?.id, authLoading })
      
      // 🚨 Critical: 強制阻擋 Mock User 資料庫操作
      if (user && (user.id === 'e770f9cd-52a7-43de-b983-70f6f78d2f53' || user.email === 'dev@test.com')) {
        console.warn('[Reward] 🚨 Mock User detected in init, aborting all operations')
        await supabaseBrowserClient.auth.signOut()
        setLoading(false)
        return
      }

      try {
        // 從 sessionStorage 讀取資料
        const storedScore = sessionStorage.getItem('onboarding_challenge_score')
        const storedResults = sessionStorage.getItem('onboarding_challenge_results')
        const storedQuestions = sessionStorage.getItem('onboarding_challenge_questions')

        const score = storedScore ? parseInt(storedScore, 10) : 0
        const results = storedResults ? JSON.parse(storedResults) : []
        const questions = storedQuestions ? JSON.parse(storedQuestions) : []

        console.log('[Reward] Session data:', { score, results: results.length, questions: questions.length })

        setPlayerScore(score)
        setXpEarned(20 + score * 10)
        setCoinsEarned(score >= 5 ? 100 : score >= 4 ? 80 : score >= 3 ? 60 : 40)

        // 如果已登入，更新資料庫
        if (user) {
          const { data: session } = await supabaseBrowserClient
            .from('onboarding_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (session) {
            setSessionId(session.id)

            // Grant rewards
            await grantRewards(user.id, 20 + score * 10, coinsEarned)

            // Update session
            await supabaseBrowserClient
              .from('onboarding_sessions')
              .update({
                current_step: 3,
                challenge_score: score,
                challenge_completed_at: new Date().toISOString(), // 標記挑戰完成時間
                challenge_question_ids: questions.map((q: any) => q.id),
                challenge_results: results.map((r: any) => ({
                  question_id: r.questionId,
                  is_correct: r.isCorrect,
                  time_ms: r.timeMs,
                  answer_selected: r.answerSelected,
                })),
                initial_xp_granted: 20 + score * 10,
                initial_badge_granted: 'rookie_warrior',
                surprise_reward: { type: 'gold', amount: coinsEarned },
              })
              .eq('id', session.id)

            // Generate tasks
            const generatedTasks = analyzeTasks(score)
            setTasks(generatedTasks)

            // Create task config
            await supabaseBrowserClient
              .from('onboarding_task_configs')
              .upsert({
                user_id: user.id,
                weak_areas: generatedTasks.map(t => t.type),
                vocabulary_ratio: 0.4,
                cloze_ratio: 0.3,
                reading_ratio: 0.3,
                daily_task_size: generatedTasks.length,
              }, {
                onConflict: 'user_id'
              })
          }
        } else {
          // 匿名模式
          setIsAnonymous(true)
          setTasks(analyzeTasks(score))
        }

        // Trigger confetti (dynamic import for client-side only)
        if (typeof window !== 'undefined') {
          const confetti = (await import('canvas-confetti')).default
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FED168', '#528555', '#FFFDF5'],
          })
        }

        console.log('[Reward] ✅ All processing completed')
        setLoading(false)
      } catch (error) {
        console.error('[Reward] ❌ Error in init:', error)
        // Graceful fallback - 即使出錯也要顯示基本獎勵
        const fallbackScore = sessionStorage.getItem('onboarding_challenge_score')
        const score = fallbackScore ? parseInt(fallbackScore, 10) : 0
        setPlayerScore(score)
        setXpEarned(20 + score * 10)
        setCoinsEarned(score >= 5 ? 100 : score >= 4 ? 80 : score >= 3 ? 60 : 40)
        setTasks(getDefaultTasks())
        console.log('[Reward] 🔧 Fallback completed')
        setLoading(false)
      }
    }

    // 🎯 Prevention: 避免重複執行
    if (!loading) return
    
    init()
  }, [user?.id, authLoading, loading]) // 加入 loading 依賴確保只執行一次

  const handleRegister = () => {
    // 導向登入/註冊頁面，並帶上來源參數
    router.push('/auth/login?from=reward')
  }

  if (loading) {
    return <PremiumLoader message="計算獎勵中..." />
  }

  return (
    <div className="min-h-screen bg-[#FAF6E9] px-6 py-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-[#FED168] shadow-lg"
          >
            <Trophy className="h-10 w-10 text-[#5D4037]" />
          </motion.div>
          <h1 className="text-4xl font-bold text-[#5D4037] mb-3">
            🎉 太棒了!完成設定!
          </h1>
          <p className="text-lg text-[#8B6F47]">
            你獲得了以下獎勵
          </p>
        </motion.div>

        {/* Rewards Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#FFFDF5] rounded-3xl p-8 border-2 border-[#E0D0B8] shadow-lg mb-8"
        >
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Coins */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-4xl mb-2 flex justify-center"><img src="/icon/coin.png" alt="金幣" className="w-12 h-12 object-contain" /></div>
              <div className="text-3xl font-bold text-[#FED168] mb-1">+{coinsEarned}</div>
              <div className="text-sm text-[#A68B6B]">金幣</div>
            </motion.div>

            {/* XP */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">⭐</div>
              <div className="text-3xl font-bold text-[#FED168] mb-1">+{xpEarned}</div>
              <div className="text-sm text-[#A68B6B]">經驗值</div>
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">🏅</div>
              <div className="text-base font-bold text-[#FED168] mb-1">新手戰士</div>
              <div className="text-sm text-[#A68B6B]">徽章</div>
            </motion.div>
          </div>

          <div className="h-px bg-[#E0D0B8] mb-6" />

          <div className="text-center">
            <p className="text-sm text-[#8B6F47] mb-1">你答對了</p>
            <p className="text-5xl font-bold text-[#FED168]">{playerScore}</p>
            <p className="text-sm text-[#A68B6B] mt-1">題</p>
          </div>
        </motion.div>

        {/* Daily Mission Section - 已登入用戶 */}
        {user && tasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-[#FFFDF5] rounded-3xl p-8 border-2 border-[#E0D0B8] shadow-lg mb-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#528555] flex items-center justify-center">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#5D4037]">今天的任務</h2>
                <p className="text-sm text-[#8B6F47]">根據你的測試結果準備的</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-[#F8F5E8] border border-[#E0D0B8]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FED168] flex items-center justify-center flex-shrink-0">
                    <task.icon className="h-5 w-5 text-[#5D4037]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#5D4037]">{task.title}</h3>
                    <p className="text-sm text-[#8B6F47]">{task.count} 題</p>
                  </div>
                  <Check className="h-5 w-5 text-[#A68B6B]" />
                </motion.div>
              ))}
            </div>

            <div className="bg-[#F8F5E8] rounded-2xl p-4 border border-[#E0D0B8]">
              <div className="flex items-center gap-3">
                <Gift className="h-6 w-6 text-[#FED168]" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#5D4037]">完成後可再拿</p>
                  <p className="text-sm text-[#8B6F47]">+50 XP + 隨機獎勵 <img src="/icon/gift.png" alt="隨機獎勵" className="w-4 h-4 inline object-contain" /></p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-[#F8F5E8] rounded-2xl p-5 border border-[#E0D0B8] mb-8"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-[#FED168] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[#8B6F47]">
              <p className="font-medium text-[#5D4037] mb-1">這些任務是專門為你設計的</p>
              <p>隨著你的練習,我們會不斷調整難度和題型,讓學習更有效率</p>
            </div>
          </div>
        </motion.div>

        {/* 註冊 CTA - 匿名模式 */}
        {isAnonymous && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-gradient-to-r from-[#FED168] to-[#E6C058] rounded-2xl p-6 border-2 border-[#E0D0B8] shadow-lg mb-8"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Save className="h-6 w-6 text-[#5D4037]" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#5D4037] mb-1">
                  註冊帳號儲存錯題筆記
                </h3>
                <p className="text-sm text-[#8B6F47]">
                  儲存你的測驗結果和錯題，隨時複習
                </p>
              </div>
            </div>
            <Button
              onClick={handleRegister}
              className="w-full h-14 bg-white hover:bg-[#FFFDF5] text-[#5D4037] rounded-xl text-[16px] font-bold shadow-lg flex items-center justify-center gap-2"
            >
              立即註冊
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* Continue Button - 僅已登入用戶顯示 */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={() => router.push('/onboarding/habits')}
              className="w-full h-16 bg-[#FED168] hover:bg-[#E6C058] text-[#5D4037] rounded-2xl text-lg font-bold shadow-lg"
            >
              繼續設定 →
            </Button>
            <p className="text-center text-sm text-[#A68B6B] mt-4">
              完善你的個人資料
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Helper Functions

async function grantRewards(userId: string, xp: number, coins: number): Promise<void> {
  try {
    const { data: profile } = await supabaseBrowserClient
      .from('profiles')
      .select('user_wallet_balance')
      .eq('id', userId)
      .single()

    if (!profile) return

    await supabaseBrowserClient
      .from('profiles')
      .update({
        user_wallet_balance: (profile.user_wallet_balance || 0) + coins,
      })
      .eq('id', userId)

    await supabaseBrowserClient
      .from('user_badges')
      .upsert({
        user_id: userId,
        badge_code: 'rookie_warrior',
        earned_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,badge_code',
        ignoreDuplicates: true
      })
  } catch (error) {
    console.error('[grantRewards] Failed:', error)
  }
}

function analyzeTasks(score: number): Task[] {
  const allTasks: Task[] = [
    {
      id: 'vocab',
      type: 'vocabulary',
      title: '單字小測驗',
      count: 2,
      icon: BookOpen,
    },
    {
      id: 'cloze',
      type: 'cloze',
      title: '克漏字練習',
      count: 1,
      icon: FileText,
    },
    {
      id: 'reading',
      type: 'reading',
      title: '迷你閱讀',
      count: 1,
      icon: BookOpen,
    },
  ]

  if (score <= 2) {
    allTasks[0].count = 3
    allTasks[1].count = 1
    allTasks.pop()
  } else if (score >= 5) {
    allTasks[2].count = 2
  }

  return allTasks
}

function getDefaultTasks(): Task[] {
  return [
    {
      id: 'vocab',
      type: 'vocabulary',
      title: '單字小測驗',
      count: 2,
      icon: BookOpen,
    },
    {
      id: 'cloze',
      type: 'cloze',
      title: '克漏字練習',
      count: 1,
      icon: FileText,
    },
    {
      id: 'reading',
      type: 'reading',
      title: '迷你閱讀',
      count: 1,
      icon: BookOpen,
    },
  ]
}
