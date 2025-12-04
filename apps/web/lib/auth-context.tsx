'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase'
import type { Provider, User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name?: string) => Promise<void>
  signInWithOAuth: (provider: Provider | 'google' | 'facebook' | 'apple') => Promise<void>
  hasValidSession: boolean // 新增：真實 session 狀態
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 🔒 Complete Mock User Shutdown - 徹底停用 Mock User 
const USE_MOCK_USER = false

const MOCK_USER_ID = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)

  // 🎯 新增：驗證真實 session 的函數
  const validateSession = useCallback(async () => {
    try {
      const { data: sessionData, error } = await supabaseBrowser.auth.getSession()
      const isValid = !error && !!sessionData?.session?.access_token
      setHasValidSession(isValid)
      return isValid
    } catch {
      setHasValidSession(false)
      return false
    }
  }, [])

  const mockAuthenticate = useCallback(async () => {
    if (!USE_MOCK_USER) return
    await new Promise(resolve => setTimeout(resolve, 200))
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (USE_MOCK_USER) {
        console.warn('[AuthProvider] Mock mode signIn called, ignoring credentials', { email })
        await mockAuthenticate()
        return
      }
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password })
      if (error) {
        throw new Error(error.message)
      }
      // 登入成功後，導向 auth callback 頁面統一處理 onboarding 檢查
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/callback'
      }
    },
    [mockAuthenticate],
  )

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      if (USE_MOCK_USER) {
        console.warn('[AuthProvider] Mock mode signUp called, ignoring credentials', { email, name })
        await mockAuthenticate()
        return
      }
      const { error } = await supabaseBrowser.auth.signUp({
        email,
        password,
        options: name ? { data: { full_name: name } } : undefined,
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    [mockAuthenticate],
  )

  const signInWithOAuth = useCallback(
    async (provider: Provider | 'google' | 'facebook' | 'apple') => {
      // 🎯 修復：OAuth 永遠使用真實認證，即使在開發模式
      console.log('🚀 [AuthProvider] Starting real OAuth login with', provider)

      let redirectTo = undefined
      if (typeof window !== 'undefined') {
        // 優先使用當前 origin
        redirectTo = `${window.location.origin}/auth/callback`

        // 如果有設定 NEXT_PUBLIC_SITE_URL 且不是 localhost，則優先使用（適用於生產環境覆蓋）
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
        if (siteUrl && !siteUrl.includes('localhost') && !window.location.origin.includes('localhost')) {
          redirectTo = `${siteUrl}/auth/callback`
        }

        console.log('🔗 [AuthProvider] OAuth Redirect URL:', redirectTo)
      }

      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: {
            // 強制 Google 顯示選擇帳號畫面，避免自動登入錯誤的帳號
            prompt: 'select_account',
          }
        }
      })
      if (error) {
        console.error('❌ [AuthProvider] OAuth error:', error)
        throw new Error(error.message)
      }
      console.log('✅ [AuthProvider] OAuth initiated successfully')
    },
    [],
  )

  useEffect(() => {
    // 🔒 強制停用 Mock User - 避免認證循環
    console.log('[AuthProvider] 🔄 Initializing real auth only...')

    let mounted = true

    // 🎯 簡化認證初始化，避免循環調用
    async function initAuth() {
      try {
        if (!mounted) return

        // 直接獲取用戶，不要額外的 session 驗證
        const { data: { user: currentUser }, error } = await supabaseBrowser.auth.getUser()

        if (!mounted) return

        if (error) {
          // 靜默處理錯誤，避免控制台噪音
          if (!error.message.includes('Auth session missing')) {
            console.warn('[AuthProvider] Auth error:', error.message)
          }
          setUser(null)
          setHasValidSession(false)
        } else {
          setUser(currentUser)
          setHasValidSession(!!currentUser)
        }
      } catch (err) {
        if (mounted) {
          console.error('[AuthProvider] Auth initialization error:', err)
          setUser(null)
          setHasValidSession(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // 🎯 簡化狀態變化監聽
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      console.log('[AuthProvider] Auth state changed:', event, { hasSession: !!session })

      setUser(session?.user ?? null)
      setHasValidSession(!!session?.user)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signInWithOAuth,
      hasValidSession
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}