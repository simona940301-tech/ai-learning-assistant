// 修復後的 onboarding 頁面邏輯
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
// ... other imports

export default function OnboardingLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const { signInWithOAuth, user, loading: authLoading, hasValidSession } = useAuth()
  const router = useRouter()

  // 🎯 修復：更嚴格的認證檢查
  useEffect(() => {
    // 等待 auth 狀態完全載入
    if (authLoading || loading) return

    // 🎯 關鍵修復：必須有用戶 AND 有效 session
    if (user && hasValidSession) {
      console.log('✅ [Onboarding] User authenticated with valid session')
      
      // 檢查是否完成 onboarding
      async function checkOnboarding() {
        try {
          const { data } = await supabaseBrowserClient
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()

          if (data?.onboarding_completed) {
            console.log('✅ [Onboarding] User already completed onboarding, redirecting to home')
            router.push('/home')
          } else {
            console.log('📝 [Onboarding] User needs to complete onboarding, redirecting to goal')
            router.push('/onboarding/goal')
          }
        } catch (error) {
          console.error('❌ [Onboarding] Error checking onboarding status:', error)
          // 發生錯誤時，假設需要完成 onboarding
          router.push('/onboarding/goal')
        }
      }

      checkOnboarding()
    } else if (user && !hasValidSession) {
      // 🎯 修復：有 user 但沒有有效 session（可能是 mock user）
      console.warn('⚠️ [Onboarding] User exists but no valid session - staying on login page')
      setError('請重新登入以繼續')
    } else {
      // 🎯 沒有用戶，正常顯示登入表單
      console.log('👤 [Onboarding] No authenticated user, showing login form')
    }
  }, [user, hasValidSession, authLoading, loading, router])

  const handleGoogleLogin = async () => {
    try {
      setError(null)
      setGoogleLoading(true)
      
      console.log('🚀 [Onboarding] Starting Google OAuth...')
      await signInWithOAuth('google')
      
      // OAuth 會導向到 callback 頁面，這裡不需要手動導向
      console.log('✅ [Onboarding] Google OAuth initiated')
      
    } catch (err) {
      console.error('❌ [Onboarding] Google login failed:', err)
      setError(err instanceof Error ? err.message : 'Google 登錄失敗')
      setGoogleLoading(false)
    }
  }

  // 🎯 修復：顯示載入狀態直到認證狀態確定
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">正在檢查登入狀態...</p>
        </div>
      </div>
    )
  }

  // 🎯 修復：已認證用戶不應該看到登入表單
  if (user && hasValidSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">已登入，正在重新導向...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* 登入表單 UI */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          
          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Google 登入按鈕 */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="w-full flex justify-center items-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            ) : (
              <Chrome className="h-5 w-5 text-gray-600" />
            )}
            <span className="text-gray-700">
              {googleLoading ? '登入中...' : '使用 Google 登入'}
            </span>
          </button>

          {/* 開發模式提示 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs">
                🔧 開發模式: Mock User = {USE_MOCK_USER ? '啟用' : '停用'}
                <br />
                有效 Session = {hasValidSession ? '是' : '否'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 右側視覺區域 */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-[#FAF6E9]">
        {/* 視覺內容... */}
      </div>
    </div>
  )
}