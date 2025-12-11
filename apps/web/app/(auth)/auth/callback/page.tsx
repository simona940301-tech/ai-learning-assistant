'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { supabaseBrowserClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  // 遷移匿名測驗資料到資料庫
  const migrateAnonymousData = async (userId: string): Promise<boolean> => {
    try {
      // ========================================
      // 🔒 CRITICAL: 雙重保護 - 確保不會污染老用戶
      // ========================================
      const { data: existingProfile } = await supabaseBrowserClient
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle()

      if (existingProfile?.onboarding_completed) {
        console.log('[AuthCallback] 🛡️ 老用戶保護：跳過匿名資料遷移')
        // 清除匿名資料
        localStorage.removeItem('onboarding_anonymous_data')
        sessionStorage.removeItem('onboarding_challenge_score')
        sessionStorage.removeItem('onboarding_challenge_results')
        sessionStorage.removeItem('onboarding_challenge_questions')
        return false
      }

      const stored = localStorage.getItem('onboarding_anonymous_data')
      // 檢查 sessionStorage 是否有資料（從 reward 頁面來的）
      const scoreStr = sessionStorage.getItem('onboarding_challenge_score')
      const resultsStr = sessionStorage.getItem('onboarding_challenge_results')
      const questionsStr = sessionStorage.getItem('onboarding_challenge_questions')

      let score = 0
      let results: any[] = []
      let questions: any[] = []
      let userLevel = 8
      let goalData: any = null
      let startedAt: string | undefined

      if (stored) {
        const data = JSON.parse(stored)
        results = data.results || []
        questions = data.questions || []
        userLevel = data.userLevel || 8
        goalData = data.goalData
        startedAt = data.startedAt
        score = results.filter((r: any) => r.isCorrect).length
      } else if (scoreStr || resultsStr) {
        // Fallback to sessionStorage
        score = parseInt(scoreStr || '0', 10)
        results = resultsStr ? JSON.parse(resultsStr) : []
        questions = questionsStr ? JSON.parse(questionsStr) : []
      } else {
        return false // 沒有匿名資料
      }

      // 準備 session 資料
      const sessionData: any = {
        user_id: userId,
        // 直接跳過 Reward(4)，進入 Habits(5)
        // 邏輯: Goal(1) -> Avatar(2) -> Challenge(3) -> Reward(4) -> Habits(5) -> Complete
        // 因為我們在這裡發放獎勵，所以直接設為 4 (完成 Reward) 或 5 (進入 Habits)
        // 根據 reward/page.tsx，完成後並沒有明確 update current_step 到 5，而是依賴 navigation
        // 此處我們設為 4 代表已過 Reward
        current_step: 4,
        status: 'in_progress',
        mock_exam_level: goalData?.mock_exam_level ?? userLevel ?? 8,
      }

      // 如果有 goalData，加入目標設定資料
      if (goalData) {
        sessionData.target_university = goalData.target_university
        sessionData.target_department = goalData.target_department
        sessionData.is_exploring = goalData.is_exploring
        sessionData.current_grade = goalData.current_grade
      }

      // 加入測驗結果
      if (startedAt) {
        sessionData.challenge_started_at = startedAt
      }
      // 總是更新完成時間
      sessionData.challenge_completed_at = new Date().toISOString()

      if (results.length > 0) {
        sessionData.challenge_score = score
        sessionData.challenge_question_ids = questions.map((q: any) => q.id) || []
        sessionData.challenge_results = results.map((r: any) => ({
          question_id: r.questionId,
          is_correct: r.isCorrect,
          time_ms: r.timeMs,
          answer_selected: r.answerSelected,
        }))
      }

      // ========================================
      // 🎁 [NEW] 自動發放獎勵邏輯
      // ========================================
      const xpEarned = 20 + score * 10
      const coinsEarned = score >= 5 ? 100 : score >= 4 ? 80 : score >= 3 ? 60 : 40

      console.log('[AuthCallback] 🎁 自動發放獎勵:', { xp: xpEarned, coins: coinsEarned })

      // 1. 更新 Profile 錢包
      const { data: profile } = await supabaseBrowserClient
        .from('profiles')
        .select('user_wallet_balance')
        .eq('id', userId)
        .single()

      if (profile) {
        await supabaseBrowserClient
          .from('profiles')
          .update({
            user_wallet_balance: (profile.user_wallet_balance || 0) + coinsEarned,
          })
          .eq('id', userId)
      }

      // 2. 發放徽章
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

      // 3. 生成任務配置
      // 簡易分析邏輯 (複製自 reward page)
      const weakAreas: string[] = []
      // 總是包含 vocabulary (2)
      weakAreas.push('vocabulary', 'vocabulary')
      // 總是包含 cloze (1)
      weakAreas.push('cloze')
      // 根據分數調整
      if (score <= 2) {
        weakAreas.push('vocabulary') // +1 vocab
      } else if (score >= 5) {
        weakAreas.push('reading', 'reading') // +2 reading
      } else {
        weakAreas.push('reading') // +1 reading
      }

      await supabaseBrowserClient
        .from('onboarding_task_configs')
        .upsert({
          user_id: userId,
          weak_areas: weakAreas, // 簡化存儲類型
          vocabulary_ratio: 0.4,
          cloze_ratio: 0.3,
          reading_ratio: 0.3,
          daily_task_size: weakAreas.length,
        }, {
          onConflict: 'user_id'
        })

      // 更新 sessionData 以包含獎勵資訊
      sessionData.initial_xp_granted = xpEarned
      sessionData.initial_badge_granted = 'rookie_warrior'
      sessionData.surprise_reward = { type: 'gold', amount: coinsEarned }

      // ========================================
      // 保存 Session
      // ========================================

      // 創建或更新 onboarding session
      const { data: existingSession } = await supabaseBrowserClient
        .from('onboarding_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSession) {
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .update(sessionData)
          .eq('id', existingSession.id)
      } else {
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .insert(sessionData)
          .select()
          .single()
      }

      // 更新 profile（如果有目標設定資料）
      if (goalData) {
        await supabaseBrowserClient
          .from('profiles')
          .update({
            target_university: goalData.target_university,
            target_department: goalData.target_department,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }

      // 清除 localStorage
      localStorage.removeItem('onboarding_anonymous_data')
      sessionStorage.removeItem('onboarding_challenge_score')
      sessionStorage.removeItem('onboarding_challenge_results')
      sessionStorage.removeItem('onboarding_challenge_questions')

      console.log('[AuthCallback] Successfully migrated anonymous data & granted rewards')
      return true
    } catch (error) {
      console.error('[AuthCallback] Failed to migrate anonymous data:', error)
      // 不阻擋登入流程，只記錄錯誤
      return false
    }
  }

  useEffect(() => {
    // Wait for auth state to load
    const checkAuthAndRedirect = async () => {
      // If still loading, wait
      if (loading) {
        return
      }

      // Handle OAuth callback (code exchange)
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const error_param = urlParams.get('error')
      const error_description = urlParams.get('error_description')

      // Check for OAuth errors from provider
      if (error_param) {
        console.error('[AuthCallback] OAuth error from provider:', {
          error: error_param,
          description: error_description
        })
        router.push('/onboarding')
        return
      }

      if (code) {
        console.log('[AuthCallback] OAuth code detected:', code.substring(0, 20) + '...')
        try {
          const { data, error } = await supabaseBrowserClient.auth.exchangeCodeForSession(code)

          if (error) {
            console.error('[AuthCallback] Code exchange failed:', {
              message: error.message,
              status: error.status,
              name: error.name,
              code: error.code
            })
            router.push('/onboarding')
            return
          }

          if (!data?.session) {
            console.error('[AuthCallback] Code exchange succeeded but no session returned')
            router.push('/onboarding')
            return
          }

          console.log('[AuthCallback] Code exchange successful, session:', {
            user: data.session.user.id,
            expires_at: data.session.expires_at
          })

          // Wait a bit for auth context to update
          await new Promise(resolve => setTimeout(resolve, 1000))
          // Continue with normal flow below
        } catch (err) {
          console.error('[AuthCallback] Code exchange error:', err)
          router.push('/onboarding')
          return
        }
      }

      // Check session validity
      const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.getSession()

      if (sessionError || !sessionData?.session) {
        console.warn('[AuthCallback] No valid session found, redirecting to onboarding')
        router.push('/onboarding')
        return
      }

      // If have session but user not updated, wait
      if (!user && sessionData.session) {
        setTimeout(() => {
          checkAuthAndRedirect()
        }, 500)
        return
      }

      if (user) {
        try {
          // ========================================
          // 🔒 CRITICAL: 優先檢查是否為老用戶
          // ========================================
          const { data } = await supabaseBrowserClient
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()

          // Get redirect URL from current URL
          const urlParams = new URLSearchParams(window.location.search)
          const redirectTo = urlParams.get('redirect') || '/home'

          if (data?.onboarding_completed) {
            // ✅ 老用戶：清除所有匿名資料，直接到首頁
            console.log('[AuthCallback] 🎯 老用戶登入，清除匿名資料並導向 /home')

            // 清除匿名資料（避免污染老用戶資料）
            localStorage.removeItem('onboarding_anonymous_data')
            sessionStorage.removeItem('onboarding_challenge_score')
            sessionStorage.removeItem('onboarding_challenge_results')
            sessionStorage.removeItem('onboarding_challenge_questions')

            router.push(redirectTo)
            return
          }

          // ========================================
          // 🆕 新用戶：遷移匿名資料
          // ========================================
          console.log('[AuthCallback] 🆕 新用戶登入，檢查匿名資料...')

          const hasAnonymousData =
            sessionStorage.getItem('onboarding_challenge_score') ||
            sessionStorage.getItem('onboarding_challenge_results') ||
            localStorage.getItem('onboarding_anonymous_data')

          // 只有新用戶才遷移匿名資料
          if (hasAnonymousData) {
            console.log('[AuthCallback] 發現匿名資料，開始遷移...')
            const migrated = await migrateAnonymousData(user.id)
            if (migrated) {
              console.log('[AuthCallback] ✅ 匿名資料遷移成功')
            }
          }

          // Get session to check progress (after migration)
          const { data: session } = await supabaseBrowserClient
            .from('onboarding_sessions')
            .select('challenge_completed_at, scorecard_submitted_at, current_step, id, initial_xp_granted')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Smart routing based on progress
          // 新流程：Goal(1) → Avatar(2) → Challenge(3) → Reward(4) → Habits(5) → Complete
          if (session?.scorecard_submitted_at) {
            // Completed habits survey, go to complete page
            router.push('/onboarding/complete')
          } else if (session?.challenge_completed_at) {
            // New Check: If rewards already granted, skip reward page
            // 這裡可以檢查 initial_xp_granted 是否存在
            if (session.initial_xp_granted) {
              console.log('[AuthCallback] 🎁 獎勵已發放，跳過 Reward 直接進入 Habits')
              router.push('/onboarding/habits')
            } else {
              // Completed challenge, go to reward page
              router.push('/onboarding/reward')
            }
          } else if (session?.current_step && session.current_step >= 3) {
            // Started or completed challenge step, go to challenge
            router.push('/onboarding/challenge')
          } else if (session?.current_step && session.current_step >= 2) {
            // Completed avatar selection, go to challenge
            router.push('/onboarding/challenge')
          } else if (session?.current_step && session.current_step >= 1) {
            // Completed goal setting, go to avatar selection
            router.push('/onboarding/avatar')
          } else {
            // New user or no progress, start from beginning (goal → avatar → challenge)
            router.push('/onboarding/goal')
          }
        } catch (error) {
          console.error('[AuthCallback] Error checking user status:', error)

          // 🔒 錯誤處理：根據是否有 user 決定導向
          if (user) {
            // 已登入但查詢出錯，安全起見導向首頁（避免卡在 onboarding）
            console.log('[AuthCallback] 已登入用戶遇到錯誤，導向 /home')
            router.push('/home')
          } else {
            // 未登入，導向 onboarding 入口
            console.log('[AuthCallback] 未登入用戶遇到錯誤，導向 /onboarding')
            router.push('/onboarding')
          }
        }
      } else {
        // If still not authenticated, redirect to onboarding
        router.push('/onboarding')
      }
    }

    // 初始檢查
    const timer = setTimeout(() => {
      checkAuthAndRedirect()
    }, 500)

    return () => clearTimeout(timer)
  }, [user, loading, router])

  return <PremiumLoader message="正在處理登入..." className="bg-background" />
}

