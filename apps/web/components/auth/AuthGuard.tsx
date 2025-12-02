'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PremiumLoader } from '@/components/ui/premium-loader'
import { supabaseBrowserClient } from '@/lib/supabase'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

/**
 * 認證守護組件
 * 確保只有已登入用戶才能訪問受保護的頁面
 */
export function AuthGuard({
  children,
  redirectTo = '/onboarding/goal',
  requireAuth = true
}: AuthGuardProps) {
  const { user, loading, hasValidSession } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) {
      console.log('[AuthGuard] 等待認證狀態載入...')
      return // 等待認證狀態載入
    }

    console.log('[AuthGuard] 認證狀態檢查:', {
      user: !!user,
      userId: user?.id,
      hasValidSession,
      requireAuth
    })

    if (requireAuth) {
      // 🎯 修復：放寬認證要求，只檢查 user 存在
      if (!user) {
        console.warn('[AuthGuard] 無用戶，重導向到登入')
        router.push(redirectTo)
        return
      }

      // 🚨 Critical: 強制阻擋所有 Mock User - 無例外
      if (user.email === 'dev@test.com' || user.id === 'e770f9cd-52a7-43de-b983-70f6f78d2f53') {
        console.warn('[AuthGuard] 🚨 強制阻擋 Mock User，執行登出')
        // 強制登出 Mock User
        supabaseBrowserClient.auth.signOut()
        router.push('/onboarding')
        return
      }

      console.log('[AuthGuard] 認證檢查通過:', { userId: user.id })
    } else {
      console.log('[AuthGuard] 不需要認證，直接通過')
    }
  }, [user, loading, requireAuth, redirectTo, router])

  // 顯示載入中
  if (loading) {
    return <PremiumLoader message="檢查登入狀態..." className="bg-background" />
  }

  // 🎯 修復：簡化認證檢查，避免無限載入
  if (requireAuth) {
    // 沒有用戶，顯示載入中（等待重導向）
    if (!user) {
      return <PremiumLoader message="重導向到登入頁面..." className="bg-background" />
    }

    // 🚨 Critical: 強制阻擋 Mock User 渲染
    if (user.email === 'dev@test.com' || user.id === 'e770f9cd-52a7-43de-b983-70f6f78d2f53') {
      return <PremiumLoader message="正在登出 Mock User..." className="bg-background" />
    }
  }

  // 認證通過或不需要認證，顯示內容
  return <>{children}</>
}