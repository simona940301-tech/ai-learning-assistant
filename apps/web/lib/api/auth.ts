import type { NextRequest } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient, createClientWithAccessToken } from '@/lib/supabase/server'
import { createClientForEdge } from '@/lib/supabase/server-edge'
import { getCurrentUser, type AuthErrorType } from '@/lib/auth/getCurrentUser'

const MOCK_MODE =
  process.env.PREVIEW_FORCE_MOCK === 'true'

let bearerWarningLogged = false

function extractBearerToken(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/^\s*Bearer\s+(.+)$/i)
  if (!match) return null
  const token = match[1]?.trim()
  return token || null
}

/**
 * Create a Supabase client that automatically prefers the Authorization header
 * sent to our API routes. Falls back to cookie/session based authentication.
 */
export function getSupabaseClient(req?: NextRequest): SupabaseClient {
  const token = req ? extractBearerToken(req.headers.get('authorization')) : null

  if (token) {
    try {
      return createClientWithAccessToken(token)
    } catch (error) {
      if (!bearerWarningLogged) {
        bearerWarningLogged = true
        console.warn(
          '[API Auth] Failed to hydrate Supabase client from Authorization header. Falling back to cookie auth.',
          error
        )
      }
    }
  }

  // Edge runtime: use request-based client if req is provided
  // This handles edge runtime where cookies() may not work
  if (req) {
    try {
      return createClientForEdge(req)
    } catch (error) {
      // Fallback to regular client if edge client fails
      console.warn('[API Auth] Edge client failed, using regular client:', error)
    }
  }

  return createClient()
}

/**
 * Helper for API routes that need the authenticated user but also want to
 * surface structured error metadata to the caller.
 *
 * IMPORTANT: This is the new preferred method for API route authentication.
 * It properly handles invalid JWT errors and provides structured error types.
 */
export async function getApiUser(req?: NextRequest): Promise<{
  supabase: SupabaseClient
  user: User | null
  errorType: AuthErrorType
}> {
  // For API routes with Bearer token, we still need to validate it
  const token = req ? extractBearerToken(req.headers.get('authorization')) : null

  if (token) {
    const supabase = getSupabaseClient(req)
    // If using Bearer token auth, validate through supabase
    try {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error) {
        const message = error.message || String(error)
        if (message.includes('Expected 3 parts in JWT')) {
          // Return a fresh client without the invalid JWT
          const freshClient = createClient()
          return { supabase: freshClient, user: null, errorType: 'invalid-jwt' }
        }
        return { supabase, user: null, errorType: 'other' }
      }

      if (!user) {
        return { supabase, user: null, errorType: 'unauthenticated' }
      }

      return { supabase, user, errorType: 'none' }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('Expected 3 parts in JWT')) {
        // Return a fresh client without the invalid JWT
        const freshClient = createClient()
        return { supabase: freshClient, user: null, errorType: 'invalid-jwt' }
      }
      return { supabase, user: null, errorType: 'other' }
    }
  }

  // For cookie-based auth, create client first then get user directly
  // This ensures proper cookie reading in API routes
  const supabase = getSupabaseClient(req)
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      const message = error.message || String(error)
      if (message.includes('Expected 3 parts in JWT')) {
        return { supabase, user: null, errorType: 'invalid-jwt' }
      }
      return { supabase, user: null, errorType: 'other' }
    }
    
    if (!user) {
      return { supabase, user: null, errorType: 'unauthenticated' }
    }
    
    return { supabase, user, errorType: 'none' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('Expected 3 parts in JWT')) {
      return { supabase, user: null, errorType: 'invalid-jwt' }
    }
    return { supabase, user: null, errorType: 'other' }
  }
}

/**
 * @deprecated Use getApiUser instead for better error handling
 *
 * Helper for API routes that need the authenticated user but also want to
 * surface structured error metadata to the caller.
 */
export async function getSupabaseUser(req: NextRequest): Promise<{
  supabase: SupabaseClient
  user: User | null
  error: Error | null
}> {
  const { supabase, user, errorType } = await getApiUser(req)
  const error = errorType === 'none' ? null : new Error(
    errorType === 'invalid-jwt' ? 'Invalid JWT token' :
    errorType === 'unauthenticated' ? 'Not authenticated' :
    'Authentication error'
  )
  return { supabase, user, error }
}

export function isMockModeEnabled() {
  return MOCK_MODE
}
