/**
 * Edge-compatible Supabase client creation
 * For use in edge runtime API routes
 * 
 * Based on Supabase SSR documentation for edge runtime:
 * https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Create Supabase client for edge runtime
 * Reads cookies directly from request headers
 * 
 * @param req NextRequest - The incoming request
 * @param res NextResponse (optional) - Response object for setting cookies
 */
export function createClientForEdge(
  req: NextRequest,
  res?: NextResponse
): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        // Read cookie from request headers (edge runtime compatible)
        // req.cookies is a ReadonlyRequestCookies instance
        try {
          const cookie = req.cookies.get(name)
          return cookie?.value
        } catch (error) {
          // Fallback: try reading from Cookie header directly
          const cookieHeader = req.headers.get('cookie')
          if (cookieHeader) {
            const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
              const [key, value] = cookie.trim().split('=')
              if (key && value) {
                acc[key] = decodeURIComponent(value)
              }
              return acc
            }, {} as Record<string, string>)
            return cookies[name]
          }
          return undefined
        }
      },
      set(name: string, value: string, options: CookieOptions) {
        // In edge runtime, we can't set cookies directly in the response
        // Cookies should be set via middleware or client-side
        // If res is provided, we could set headers, but edge runtime has limitations
        if (res) {
          // Note: This may not work in all edge runtime scenarios
          // Consider using middleware for cookie management
          res.cookies.set({
            name,
            value,
            ...options,
          })
        }
      },
      remove(name: string, options: CookieOptions) {
        // Remove cookie by setting it to empty with past expiry
        if (res) {
          res.cookies.set({
            name,
            value: '',
            ...options,
            expires: new Date(0),
          })
        }
      },
    },
  })
}

