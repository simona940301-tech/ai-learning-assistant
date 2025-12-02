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

// 🎯 修復：更嚴格的 Mock User 控制
// 只在明確啟用且不在測試模式時才使用 Mock User
const USE_MOCK_USER = 
  process.env.NODE_ENV === 'development' && 
  process.env.NEXT_PUBLIC_DISABLE_MOCK_USER !== 'true' &&
  process.env.NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST !== 'true'

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
      const { error } = await supabaseBrowser.auth.signInWithOAuth({
        provider,
        options:
          typeof window !== 'undefined'
            ? {
                redirectTo: `${window.location.origin}/auth/callback`,
              }
            : undefined,
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
    // 🎯 修復：Mock user 模式改為可選，而非強制
    if (USE_MOCK_USER) {
      const mode = process.env.NODE_ENV === 'development' ? 'Development' : 'Preview'
      console.log(`[AuthProvider] 🔧 ${mode} mode: Auto-login as`, MOCK_USER_ID)
      const mockUser = {
        id: MOCK_USER_ID,
        email: 'dev@test.com',
        created_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
      } as User
      setUser(mockUser)
      setHasValidSession(false) // Mock user 沒有真實 session
      setLoading(false)
      return
    }

    // 🎯 修復：生產模式使用真實 Supabase 認證
    async function initAuth() {
      try {
        // 先檢查 session
        const sessionValid = await validateSession()
        
        // 再獲取用戶
        const { data: { user: currentUser }, error } = await supabaseBrowser.auth.getUser()
        
        if (error) {
          console.error('[AuthProvider] Error getting user:', error)
          setUser(null)
          setHasValidSession(false)
        } else {
          setUser(currentUser)
          // 只有當用戶存在且 session 有效時才算完全認證
          setHasValidSession(!!currentUser && sessionValid)
        }
      } catch (err) {
        console.error('[AuthProvider] Auth initialization error:', err)
        setUser(null)
        setHasValidSession(false)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // 🎯 監聽認證狀態變化
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthProvider] Auth state changed:', event, { hasSession: !!session })
      
      setUser(session?.user ?? null)
      
      // 每次狀態變化都重新驗證 session
      if (session?.user) {
        const sessionValid = await validateSession()
        setHasValidSession(sessionValid)
      } else {
        setHasValidSession(false)
      }
      
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [validateSession])

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