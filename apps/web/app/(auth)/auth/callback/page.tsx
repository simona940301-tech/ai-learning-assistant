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

        // 創建 onboarding session
        await supabaseBrowserClient
          .from('onboarding_sessions')
          .insert(sessionData)
          .select()
          .single()

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

      // 創建 onboarding session
      const { data: session } = await supabaseBrowserClient
        .from('onboarding_sessions')
        .insert(sessionData)
        .select()
        .single()

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
          // Check if user has completed onboarding
          const { data } = await supabaseBrowserClient
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()

          // Get redirect URL from current URL
          const urlParams = new URLSearchParams(window.location.search)
          const redirectTo = urlParams.get('redirect') || '/home'

          if (data?.onboarding_completed) {
            // Already completed onboarding, go to home page
            router.push(redirectTo)
            return
          }

          // Check if has anonymous data (completed challenge before login)
          const hasAnonymousData =
            sessionStorage.getItem('onboarding_challenge_score') ||
            sessionStorage.getItem('onboarding_challenge_results') ||
            localStorage.getItem('onboarding_anonymous_data')

          // 如果有匿名資料，先遷移
          if (hasAnonymousData) {
            console.log('[AuthCallback] Detected anonymous data, migrating...')
            await migrateAnonymousData(user.id)
          }

          // Get session to check progress (after migration)
          const { data: session } = await supabaseBrowserClient
            .from('onboarding_sessions')
            .select('challenge_completed_at, scorecard_submitted_at, id')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Check profile for avatar
          const { data: profile } = await supabaseBrowserClient
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle()

          // Smart routing based on progress
          if (session?.scorecard_submitted_at) {
            // Completed habits survey, go to complete page
            router.push('/onboarding/complete')
          } else if (session?.challenge_completed_at) {
            // Completed challenge, check if has avatar
            if (profile?.avatar_url) {
              // Has avatar, go to habits survey
              router.push('/onboarding/habits')
            } else {
              // No avatar yet, go to avatar selection
              router.push('/onboarding/avatar')
            }
          } else {
            // New user or no progress, start from beginning
            router.push('/onboarding/goal')
          }
        } catch (error) {
          console.error('[AuthCallback] Error checking user status:', error)
          // 發生錯誤時，導向 onboarding
          router.push('/onboarding')
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

