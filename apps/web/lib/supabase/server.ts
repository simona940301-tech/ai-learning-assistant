import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

// Development/Preview mode: Mock user configuration
// - In local development: NODE_ENV === 'development'
// - In Vercel preview: PREVIEW_FORCE_MOCK === 'true'
const USE_MOCK_USER =
  process.env.NODE_ENV === 'development' ||
  process.env.PREVIEW_FORCE_MOCK === 'true'

const MOCK_USER_ID = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

export function createClient() {
  const cookieStore = cookies()

  // Debug logging
  if (USE_MOCK_USER) {
    console.log('[Supabase Server] 🔧 Mock user mode enabled')
    console.log('[Supabase Server] Using service role key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...')
  }

  // Mock user mode: Use service role key to bypass RLS
  const supabaseKey = USE_MOCK_USER
    ? process.env.SUPABASE_SERVICE_ROLE_KEY!
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          // In mock user mode with service role key, return no cookies at all
          // This forces Supabase to use the service role key for all operations
          if (USE_MOCK_USER) {
            return undefined
          }

          const value = cookieStore.get(name)?.value

          // Additional safety check: Filter invalid JWT tokens in all modes
          // JWT should have exactly 3 parts separated by dots (header.payload.signature)
          if (value && value.includes('.')) {
            // Check if this looks like a JWT (contains dots and might be auth-related)
            // Be more aggressive in filtering - any cookie that looks like a malformed JWT
            const parts = value.split('.')
            if (parts.length !== 3) {
              console.log(`[Supabase] Filtering invalid JWT cookie: ${name} (${parts.length} parts, expected 3)`)
              return undefined
            }
            // Additional validation: each part should be base64-like (but be less strict)
            const looksValid = parts.every(part => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part))
            if (!looksValid) {
              console.log(`[Supabase] Filtering malformed JWT cookie: ${name} (invalid base64 part)`)
              return undefined
            }
          }

          return value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  // Mock user mode: Override auth methods to return mock user
  if (USE_MOCK_USER) {
    const originalAuth = client.auth
    const mockUser: User = {
      id: MOCK_USER_ID,
      email: 'dev@test.com',
      created_at: new Date().toISOString(),
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      role: 'authenticated',
    } as User

    const mockSession = {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      token_type: 'bearer',
      user: mockUser,
    }

    // In dev mode, always return mock user to avoid JWT parsing errors
    // This prevents errors when cookies contain invalid JWT tokens
    client.auth = {
      ...originalAuth,
      getUser: async () => {
        // Always return mock user in dev mode
        // This prevents JWT parsing errors from invalid cookies
        return {
          data: { user: mockUser },
          error: null,
        }
      },
      getSession: async () => {
        // Always return mock session in dev mode
        return {
          data: { session: mockSession },
          error: null,
        }
      },
    } as any
  }

  return client
}

export function createClientWithAccessToken(accessToken: string): SupabaseClient {
  if (!accessToken) {
    throw new Error('Access token is required to create Supabase client')
  }

  if (USE_MOCK_USER) {
    console.log('[Supabase Server] Using mock client for access token flow')
    return createClient()
  }

  // 移除過於嚴格的 token 驗證，讓 Supabase 自己處理無效 token
  // 這樣就不會因為無效 token 拋出錯誤導致系統卡住

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or anon key is not configured')
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, detectSessionInUrl: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  })
}
