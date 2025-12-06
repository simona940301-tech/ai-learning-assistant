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
      if (!stored) {
        // 檢查 sessionStorage 是否有資料（從 reward 頁面來的）
        const score = sessionStorage.getItem('onboarding_challenge_score')
        const results = sessionStorage.getItem('onboarding_challenge_results')
        const questions = sessionStorage.getItem('onboarding_challenge_questions')

        if (!score && !results) {
          return false // 沒有匿名資料
        }

        // 從 sessionStorage 構建資料結構
        const data: any = {
          results: results ? JSON.parse(results) : [],
          questions: questions ? JSON.parse(questions) : [],
          userLevel: 8, // 預設值
        }

        // 準備 session 資料
        const sessionData: any = {
          user_id: userId,
          current_step: 3, // 已完成 challenge，準備進入 reward
          status: 'in_progress',
          mock_exam_level: 8,
        }

        // 如果有 challenge 資料，加入測驗結果
        if (data.results && data.results.length > 0) {
          sessionData.challenge_score = parseInt(score || '0', 10)
          sessionData.challenge_question_ids = data.questions?.map((q: any) => q.id) || []
          sessionData.challenge_results = data.results.map((r: any) => ({
            question_id: r.questionId,
            is_correct: r.isCorrect,
            time_ms: r.timeMs,
            answer_selected: r.answerSelected,
          }))
          sessionData.challenge_completed_at = new Date().toISOString()
        }

        // 創建或更新 onboarding session（避免重複）
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

        // 清除 sessionStorage
        sessionStorage.removeItem('onboarding_challenge_score')
        sessionStorage.removeItem('onboarding_challenge_results')
        sessionStorage.removeItem('onboarding_challenge_questions')

        console.log('[AuthCallback] Migrated anonymous data from sessionStorage')
        return true
      }

      const data = JSON.parse(stored)

      // 準備 session 資料
      const sessionData: any = {
        user_id: userId,
        current_step: 3, // 已完成 challenge，準備進入 reward
        status: 'in_progress',
        mock_exam_level: data.goalData?.mock_exam_level || data.userLevel || 8,
      }

      // 如果有 goalData，加入目標設定資料
      if (data.goalData) {
        sessionData.target_university = data.goalData.target_university
        sessionData.target_department = data.goalData.target_department
        sessionData.is_exploring = data.goalData.is_exploring
        sessionData.current_grade = data.goalData.current_grade
        if (data.goalData.mock_exam_level) {
          sessionData.mock_exam_level = data.goalData.mock_exam_level
        }
      }

      // 如果有 challenge 資料，加入測驗結果
      if (data.startedAt) {
        sessionData.challenge_started_at = data.startedAt
        sessionData.challenge_completed_at = new Date().toISOString()
      }
      if (data.results && data.results.length > 0) {
        sessionData.challenge_score = data.results.filter((r: any) => r.isCorrect).length
        sessionData.challenge_question_ids = data.questions?.map((q: any) => q.id) || []
        sessionData.challenge_results = data.results.map((r: any) => ({
          question_id: r.questionId,
          is_correct: r.isCorrect,
          time_ms: r.timeMs,
          answer_selected: r.answerSelected,
        }))
        // 確保 challenge_completed_at 已設置（如果還沒有）
        if (!sessionData.challenge_completed_at) {
          sessionData.challenge_completed_at = new Date().toISOString()
        }
      }

      // 創建或更新 onboarding session（避免重複創建）
      // 先檢查是否已有 in_progress session
      const { data: existingSession } = await supabaseBrowserClient
        .from('onboarding_sessions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existingSession) {
        // 更新現有 session
        console.log('[AuthCallback] 更新現有 session:', existingSession.id)
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .update(sessionData)
          .eq('id', existingSession.id)
      } else {
        // 創建新 session
        console.log('[AuthCallback] 創建新 session')
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .insert(sessionData)
          .select()
          .single()
      }

      // 更新 profile（如果有目標設定資料）
      if (data.goalData) {
        await supabaseBrowserClient
          .from('profiles')
          .update({
            target_university: data.goalData.target_university,
            target_department: data.goalData.target_department,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
      }

      // 清除 localStorage
      localStorage.removeItem('onboarding_anonymous_data')
      sessionStorage.removeItem('onboarding_challenge_score')
      sessionStorage.removeItem('onboarding_challenge_results')
      sessionStorage.removeItem('onboarding_challenge_questions')

      console.log('[AuthCallback] Successfully migrated anonymous data')
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
            .select('challenge_completed_at, scorecard_submitted_at, current_step, id')
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
            // Completed challenge, go to reward page
            router.push('/onboarding/reward')
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

