'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * Onboarding Entry Point - 純導向邏輯
 * 
 * 流程：
 * 1. 未登入用戶 → /onboarding/goal（開始匿名 onboarding）
 * 2. 已登入但未完成 → 智能恢復到對應步驟
 * 3. 已登入且完成 → /home
 */
export default function OnboardingEntryPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    async function redirect() {
      // 等待認證載入
      if (authLoading) return

      try {
        // ========================================
        // 情境 1：未登入用戶（匿名模式）
        // ========================================
        if (!user) {
          console.log('[Onboarding] 未登入用戶，開始匿名 onboarding')
          router.push('/onboarding/goal')
          return
        }

        // ========================================
        // 情境 2 & 3：已登入用戶
        // ========================================
        console.log('[Onboarding] 已登入用戶，檢查 onboarding 狀態')

        // 驗證 session
        const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.getSession()
        if (sessionError || !sessionData?.session) {
          console.log('[Onboarding] Session 無效，視為未登入')
          router.push('/onboarding/goal')
          return
        }

        // 查詢 profile
        const { data: profile, error: profileError } = await supabaseBrowserClient
          .from('profiles')
          .select('onboarding_completed, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        if (profileError) {
          console.error('[Onboarding] Profile 查詢錯誤:', profileError)
          // 發生錯誤，安全起見導向 goal
          router.push('/onboarding/goal')
          return
        }

        // 情境 3：已完成 onboarding → 直接到首頁
        if (profile?.onboarding_completed) {
          console.log('[Onboarding] ✅ 已完成 onboarding，導向 /home')
          router.push('/home')
          return
        }

        // 情境 2：已登入但未完成 → 智能恢復
        console.log('[Onboarding] 已登入但未完成，智能恢復...')

        // 查詢 session 進度
        const { data: session } = await supabaseBrowserClient
          .from('onboarding_sessions')
          .select('challenge_completed_at, scorecard_submitted_at, current_step')
          .eq('user_id', user.id)
          .eq('status', 'in_progress')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // 智能路由：根據完成進度導向
        // 流程：Goal(1) → Avatar(2) → Challenge(3) → Reward(4) → Habits(5) → Complete
        if (session?.scorecard_submitted_at) {
          // 已完成問卷 → 導向完成頁
          console.log('[Onboarding] 恢復到：Complete')
          router.push('/onboarding/complete')
        } else if (session?.challenge_completed_at) {
          // 已完成 challenge → 導向 reward（註冊後繼續）
          console.log('[Onboarding] 恢復到：Reward')
          router.push('/onboarding/reward')
        } else if (profile?.avatar_url) {
          // 已有頭像 → 導向 challenge
          console.log('[Onboarding] 恢復到：Challenge')
          router.push('/onboarding/challenge')
        } else if (session?.current_step >= 1) {
          // 已完成 goal → 導向 avatar
          console.log('[Onboarding] 恢復到：Avatar')
          router.push('/onboarding/avatar')
        } else {
          // 全新用戶 → 從 goal 開始
          console.log('[Onboarding] 恢復到：Goal')
          router.push('/onboarding/goal')
        }
      } catch (error) {
        console.error('[Onboarding] 導向邏輯錯誤:', error)
        // 發生錯誤，安全起見導向 goal
        router.push('/onboarding/goal')
      }
    }

    redirect()
  }, [user, authLoading, router])

  // 顯示載入畫面
  return <PremiumLoader message="正在載入..." />
}
