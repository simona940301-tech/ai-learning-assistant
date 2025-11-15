'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Development/Preview mode: Always use mock user when enabled
// - In local development: NODE_ENV === 'development'
// - In Vercel preview: NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'
const USE_MOCK_USER =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_PREVIEW_FORCE_MOCK === 'true'

const MOCK_USER_ID = 'e770f9cd-52a7-43de-b983-70f6f78d2f53' // Fixed UUID for deterministic testing

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock user mode: Always use mock user (for local dev & preview)
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
      setLoading(false)
      return
    }

    // Production mode: Use real Supabase auth
    supabaseBrowser.auth.getUser().then(({ data: { user }, error }) => {
      if (error) {
        console.error('[AuthProvider] Error getting user:', error)
      }
      setUser(user)
      setLoading(false)
    })

    // 監聽認證狀態變化
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
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

