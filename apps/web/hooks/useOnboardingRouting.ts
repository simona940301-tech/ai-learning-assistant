import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * Custom hook to handle onboarding routing logic
 * 
 * This hook encapsulates all the complex authentication checking,
 * profile verification, and intelligent routing logic that was previously
 * in the Home page component.
 * 
 * @returns {Object} - Object containing isLoading state
 */
export function useOnboardingRouting() {
    const router = useRouter()
    const { user, loading: authLoading } = useAuth()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (authLoading) {
            setIsLoading(true)
            return
        }

        const checkAndRedirect = async () => {
            try {
                // 檢查環境變數（用於調試）
                const isMockDisabled = process.env.NEXT_PUBLIC_DISABLE_MOCK_USER === 'true'
                console.log('[useOnboardingRouting] Mock user disabled:', isMockDisabled, 'User:', user?.id)

                // 🎯 未登入用戶應該從匿名流程開始（目標設定頁）
                if (!user) {
                    console.log('[useOnboardingRouting] No user found, starting anonymous onboarding flow')
                    router.push('/onboarding/goal')
                    return
                }

                // 🎯 已登入用戶：檢查是否已完成 onboarding
                // 檢查是否為 mock user 模式
                const isMockMode = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'

                // 無論是否為 mock 模式，都先檢查 session 是否有效
                const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.getSession()

                console.log('[useOnboardingRouting] Session check:', {
                    hasSession: !!sessionData?.session,
                    sessionError: sessionError?.message,
                    userId: sessionData?.session?.user?.id,
                })

                // 如果沒有有效的 session，導向登入頁面
                if (sessionError || !sessionData?.session) {
                    console.warn('[useOnboardingRouting] No valid session found, redirecting to login')
                    router.push('/onboarding')
                    return
                }

                // 再次確認 session 有效性（在查詢前）
                const { data: finalSessionCheck } = await supabaseBrowserClient.auth.getSession()
                if (!finalSessionCheck?.session) {
                    console.warn('[useOnboardingRouting] Session invalidated before profile query, redirecting to login')
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
                    const errorCode = error.code as string | undefined
                    const errorMessage = error.message as string | undefined
                    const errorStatus = (error as { status?: number }).status

                    const isAuthError =
                        errorCode === 'PGRST301' ||
                        errorStatus === 401 ||
                        errorStatus === 403 ||
                        errorStatus === 406 ||
                        errorMessage?.includes('JWT') ||
                        errorMessage?.includes('authentication') ||
                        errorMessage?.includes('Unauthorized') ||
                        errorMessage?.includes('Not Acceptable')

                    if (isAuthError) {
                        console.warn('[useOnboardingRouting] Authentication error, redirecting to login:', error)
                        router.push('/onboarding')
                        return
                    }

                    // PGRST116 是「找不到記錄」的錯誤碼
                    if (error.code !== 'PGRST116') {
                        console.error('[useOnboardingRouting] Error checking onboarding status:', error)
                        router.push('/onboarding')
                        return
                    }
                }

                // 如果找不到 profile 記錄，可能是新註冊的用戶
                if (!data) {
                    // 再次確認 session 有效（雙重檢查）
                    const { data: recheckSession } = await supabaseBrowserClient.auth.getSession()
                    if (!recheckSession?.session) {
                        console.warn('[useOnboardingRouting] Profile not found but no valid session, redirecting to login')
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
                console.error('[useOnboardingRouting] Unexpected error checking onboarding status:', error)
                // 發生未預期的錯誤時，導向登入頁面讓用戶重新登入
                router.push('/onboarding')
            } finally {
                setIsLoading(false)
            }
        }

        checkAndRedirect()
    }, [user, authLoading, router])

    return { isLoading }
}
