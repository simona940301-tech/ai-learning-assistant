'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowserClient } from '@/lib/supabase'
import { PremiumLoader } from '@/components/ui/premium-loader'

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading) return // 等待 auth 狀態載入

    const checkAndRedirect = async () => {
      // 檢查環境變數（用於調試）
      const isMockDisabled = process.env.NEXT_PUBLIC_DISABLE_MOCK_USER === 'true'
      console.log('[Home] Mock user disabled:', isMockDisabled, 'User:', user?.id)
      
      if (!user) {
        // 🎯 未登入用戶應該從匿名流程開始（目標設定頁）
        console.log('[Home] No user found, starting anonymous onboarding flow')
        router.push('/onboarding/goal')
        return
      }

      // 🎯 已登入用戶：檢查是否已完成 onboarding
      // 如果已完成，直接停留在 /home，不需要重定向

      // 已登入，驗證認證是否有效並檢查 onboarding 狀態
      try {
        // 檢查是否為 mock user 模式
        const isMockMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'
        
        // 無論是否為 mock 模式，都先檢查 session 是否有效
        // 這可以確保即使是 mock user，也有有效的認證 token
        const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.getSession()
        
        console.log('[Home] Session check:', {
          hasSession: !!sessionData?.session,
          sessionError: sessionError?.message,
          userId: sessionData?.session?.user?.id,
        })
        
        // 如果沒有有效的 session，導向登入頁面
        // 在 mock user 模式下，如果沒有真實的 session，也應該導向登入頁面
        // 這樣用戶就可以通過真實的登入流程來測試
        if (sessionError || !sessionData?.session) {
          console.warn('[Home] No valid session found, redirecting to login')
          router.push('/onboarding')
          return
        }

        // 再次確認 session 有效性（在查詢前）
        // 這是為了確保在 mock user 模式下，如果有殘留的 mock user 但沒有真實 session，
        // 也會被正確導向登入頁面
        const { data: finalSessionCheck } = await supabaseBrowserClient.auth.getSession()
        if (!finalSessionCheck?.session) {
          console.warn('[Home] Session invalidated before profile query, redirecting to login')
          router.push('/onboarding')
          return
        }

        // 驗證用戶認證是否有效（通過查詢 profiles）
        const { data, error } = await supabaseBrowserClient
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()

        // 如果查詢返回錯誤，檢查是否為認證錯誤
        if (error) {
          // 檢查是否為認證錯誤（401/403/406）
          // 406 (Not Acceptable) 通常表示請求格式問題，但也可能是認證問題
          const isAuthError = 
            error.code === 'PGRST301' || 
            error.status === 401 || 
            error.status === 403 ||
            error.status === 406 || // Not Acceptable - 可能是認證問題
            error.message?.includes('JWT') || 
            error.message?.includes('authentication') ||
            error.message?.includes('Unauthorized') ||
            error.message?.includes('Not Acceptable')
          
          if (isAuthError) {
            console.warn('[Home] Authentication error, redirecting to login:', error)
            router.push('/onboarding')
            return
          }
          
          // PGRST116 是「找不到記錄」的錯誤碼
          // 但如果沒有有效的 session，不應該到這裡
          // 為了安全起見，如果查詢失敗且不是「找不到記錄」，導向登入頁面
          if (error.code !== 'PGRST116') {
            console.error('[Home] Error checking onboarding status:', error)
            router.push('/onboarding')
            return
          }
        }

        // 如果找不到 profile 記錄，可能是新註冊的用戶
        // 但必須確保用戶已經登入（有有效的 session）才能開始 onboarding
        if (!data) {
          // 再次確認 session 有效（雙重檢查）
          const { data: recheckSession } = await supabaseBrowserClient.auth.getSession()
          if (!recheckSession?.session) {
            console.warn('[Home] Profile not found but no valid session, redirecting to login')
            router.push('/onboarding')
            return
          }
          // 有有效 session 且找不到 profile，導向 onboarding 流程
          router.push('/onboarding/goal')
          return
        }

        if (data.onboarding_completed) {
          // 已完成 onboarding，導向首頁
          router.push('/home')
        } else {
          // 未完成 onboarding - 智能判斷應該導向哪個步驟
          const { data: session } = await supabaseBrowserClient
            .from('onboarding_sessions')
            .select('challenge_completed_at, scorecard_submitted_at')
            .eq('user_id', user.id)
            .eq('status', 'in_progress')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const { data: profile } = await supabaseBrowserClient
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .maybeSingle()

          // 智能路由：根據完成進度導向正確的步驟
          if (session?.scorecard_submitted_at) {
            // 已完成問卷，導向完成頁
            router.push('/onboarding/complete')
          } else if (session?.challenge_completed_at) {
            // 已完成 challenge，檢查頭像
            if (profile?.avatar_url) {
              // 有頭像，導向問卷
              router.push('/onboarding/habits')
            } else {
              // 無頭像，導向頭像頁
              router.push('/onboarding/avatar')
            }
          } else {
            // 從頭開始 onboarding
            router.push('/onboarding/goal')
          }
        }
      } catch (error) {
        console.error('[Home] Unexpected error checking onboarding status:', error)
        // 發生未預期的錯誤時，導向登入頁面讓用戶重新登入
        router.push('/onboarding')
      }
    }

    checkAndRedirect()
  }, [user, authLoading, router])

  // 顯示載入中狀態
  return <PremiumLoader message="正在載入..." className="bg-background" />
}
