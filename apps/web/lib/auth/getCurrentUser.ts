import type { User } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type AuthErrorType = 'none' | 'invalid-jwt' | 'unauthenticated' | 'other'

export type CurrentUserResult = {
  user: User | null
  errorType: AuthErrorType
}

// 🎯 修復：徹底停用 Mock User
const MOCK_FLAG = false && (
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_DISABLE_MOCK_USER !== 'true' &&
  process.env.NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST !== 'true'
)

const MOCK_USER_ID =
  process.env.BACKPACK_DEV_USER_ID ||
  process.env.NEXT_PUBLIC_DEV_USER_ID ||
  process.env.BACKPACK_DEV_USER_ID || 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

const CLEAR_INVALID_JWT =
  process.env.AUTH_CLEAR_INVALID_JWT === 'true' ||
  process.env.NODE_ENV === 'development' // 開發模式下自動清除無效 JWT

const INVALID_JWT_MESSAGE = 'Expected 3 parts in JWT'

export async function getCurrentUser(): Promise<CurrentUserResult> {
  if (MOCK_FLAG && MOCK_USER_ID) {
    return { user: buildMockUser(MOCK_USER_ID), errorType: 'none' }
  }

  const supabase = createClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      return handleSupabaseAuthError(error)
    }

    if (!user) {
      return { user: null, errorType: 'unauthenticated' }
    }

    return { user, errorType: 'none' }
  } catch (error) {
    return handleSupabaseAuthError(error)
  }
}

function handleSupabaseAuthError(error: unknown): CurrentUserResult {
  const message = getErrorMessage(error)
  if (message.includes(INVALID_JWT_MESSAGE)) {
    console.warn('[Auth] Invalid JWT detected, treating as signed-out.')
    if (CLEAR_INVALID_JWT) {
      try {
        clearAuthCookies()
      } catch (cookieError) {
        console.error('[Auth] Failed to clear invalid JWT cookies:', cookieError)
      }
    }
    return { user: null, errorType: 'invalid-jwt' }
  }

  console.error('[Auth] Unexpected error while fetching user:', error)
  return { user: null, errorType: 'other' }
}

function buildMockUser(id: string): User {
  return {
    id,
    email: 'mock-user@dev.local',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as User
}

function getErrorMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && 'message' in error) {
    const maybeMessage = (error as { message?: unknown }).message
    return typeof maybeMessage === 'string' ? maybeMessage : ''
  }
  return ''
}

export function clearAuthCookies() {
  const cookieStore = cookies()
  const cookieNames = new Set([
    'sb-access-token',
    'sb-refresh-token',
    ...deriveSupabaseCookieNames(),
  ])

  cookieStore.getAll().forEach(cookie => {
    const shouldClear =
      cookieNames.has(cookie.name) ||
      cookie.name.startsWith('sb-') ||
      cookie.name.includes('supabase')

    if (shouldClear) {
      cookieStore.set({
        name: cookie.name,
        value: '',
        expires: new Date(0),
        path: '/',
      })
    }
  })
}

function deriveSupabaseCookieNames(): string[] {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return []

  const match = supabaseUrl.match(/https?:\/\/([a-zA-Z0-9-]+)\.supabase\.co/)
  if (!match?.[1]) return []

  const ref = match[1]
  return [`sb-${ref}-auth-token`, `sb-${ref}-refresh-token`]
}

