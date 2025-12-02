import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClientWithAccessToken } from '@/lib/supabase/server'

/**
 * API Security Middleware
 *
 * Provides edge-level authentication and authorization for API routes.
 * This is the first line of defense against unauthorized access.
 *
 * Security Layers:
 * 1. User Authentication - Validates user session/token
 * 2. Admin Authorization - Checks admin role for admin routes
 * 3. Service Authentication - Validates API keys for service-to-service calls
 */

// ============================================================================
// Route Configuration
// ============================================================================

/**
 * Routes that MUST have user authentication
 * Any request to these routes without valid user session will be rejected with 401
 */
const PROTECTED_API_ROUTES = [
  '/api/ai/',
  '/api/explain',
  '/api/solve',
  '/api/tutor/',
  '/api/backpack/',
  '/api/profile/',
  '/api/missions/',
  '/api/chick/',
  '/api/shop/',
  '/api/avatar/',
  '/api/play/practice/',
  '/api/play/progression/',
  '/api/play/ugc-questions/',
  '/api/error-book/',
  '/api/admin/',
  '/api/notebook/',
  '/api/rag/',
  '/api/summary/',
  '/api/user/',
  '/api/store/',
  '/api/dashboard/',
  '/api/proficiency/',
  '/api/community/',
  '/api/questions/generate',
  '/api/hints/generate',
  '/api/onboarding/',
  '/api/explanation/',
]

/**
 * Routes that are intentionally public
 * These routes can be accessed without authentication
 */
const PUBLIC_API_ROUTES = [
  '/api/health',
  '/api/docs',
  '/api/heartbeat',
  '/api/qr/', // QR code entry point - public pack discovery
  '/api/packs', // Public pack browsing (auth optional for install status)
  '/api/auth/', // Authentication routes (login, register, etc.)
  '/api/onboarding/questions', // Onboarding questions - allow anonymous access for onboarding flow
]

/**
 * Service-to-service routes that require API key authentication
 * These are typically called by internal services (e.g., Rust battle engine)
 */
const SERVICE_API_ROUTES = [
  '/api/internal/',
  '/api/play/battle/events', // Called by Rust battle-ws service
  '/api/play/questions/seed',
]

/**
 * Routes that require admin role
 * In addition to user authentication, these check for admin role in profiles table
 */
const ADMIN_API_ROUTES = [
  '/api/admin/',
]

function extractBearerToken(header: string | null): string | null {
  if (!header) return null
  const match = header.match(/^\s*Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()
  return token || null
}

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Check if we're in development/preview mode with mock authentication
 * In these modes, we skip authentication checks for easier development
 */
function isMockModeEnabled(): boolean {
  // 🎯 修復：徹底停用 Mock Mode
  return false && (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_DISABLE_MOCK_USER !== 'true' &&
    process.env.NEXT_PUBLIC_ENABLE_REAL_AUTH_TEST !== 'true'
  )
}

// ============================================================================
// Main Middleware Function
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip authentication in development/preview mock mode
  // This allows local development without setting up full auth
  if (isMockModeEnabled()) {
    console.log(`[Middleware] Mock mode enabled - skipping auth checks for ${pathname}`)
    return NextResponse.next()
  }

  // Log all API requests in production for security monitoring
  console.log(`[Middleware] ${request.method} ${pathname}`)

  // Check if route is intentionally public
  // Note: Check public routes FIRST before protected routes
  const isPublicRoute = PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    console.log(`[Middleware] Public route - allowing access to ${pathname}`)
    return NextResponse.next()
  }

  // Check if route requires service-to-service authentication
  const isServiceRoute = SERVICE_API_ROUTES.some(route => pathname.startsWith(route))
  if (isServiceRoute) {
    return handleServiceAuth(request, pathname)
  }

  // Check if route requires user authentication
  const requiresAuth = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route))
  if (requiresAuth) {
    return handleUserAuth(request, pathname)
  }

  // Default: allow (for backwards compatibility during migration)
  // Log unclassified routes for security audit
  console.warn(`[Middleware] ⚠️  Unclassified route (should be added to route config): ${pathname}`)
  return NextResponse.next()
}

// ============================================================================
// User Authentication Handler
// ============================================================================

/**
 * Validates user authentication and authorization
 *
 * @param request - The incoming request
 * @param pathname - The requested path
 * @returns NextResponse with 401/403 if unauthorized, or next() if authorized
 */
async function handleUserAuth(request: NextRequest, pathname: string): Promise<NextResponse> {
  try {
    const bearerToken = extractBearerToken(request.headers.get('authorization'))

    // Prefer Authorization header (used by frontend fetch guard) before falling back to cookies
    if (bearerToken) {
      try {
        const supabase = createClientWithAccessToken(bearerToken)
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          const message = error.message || ''
          if (message.includes('Expected 3 parts in JWT')) {
            return NextResponse.json(
              {
                success: false,
                error: 'INVALID_JWT',
                message: '登入狀態失效，請重新登入或清除 Cookies 後再試。',
                code: 'middleware_invalid_jwt',
              },
              { status: 401 }
            )
          }
          console.warn(`[Middleware] Bearer auth error for ${pathname}:`, error.message)
        } else if (user) {
          console.log(`[Middleware] Authenticated user ${user.id} via bearer token accessing ${pathname}`)

          const isAdminRoute = ADMIN_API_ROUTES.some(route => pathname.startsWith(route))
          if (isAdminRoute) {
            return handleAdminAuth(supabase, user.id, pathname)
          }

          return NextResponse.next()
        }
      } catch (error) {
        console.error(`[Middleware] Unexpected bearer auth error for ${pathname}:`, error)
      }
    }

    // Create Supabase client with request cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() { }, // Read-only in middleware
          remove() { },
        },
      }
    )

    // Get authenticated user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Check for authentication errors
    if (error) {
      console.warn(`[Middleware] Auth error for ${pathname}:`, error.message)

      // Handle invalid JWT specifically
      if (error.message.includes('Expected 3 parts in JWT')) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_JWT',
            message: '登入狀態失效，請重新登入或清除 Cookies 後再試。',
            code: 'middleware_invalid_jwt',
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_ERROR',
          message: 'Authentication error occurred',
          code: 'middleware_auth_error',
        },
        { status: 401 }
      )
    }

    // Check if user is authenticated
    if (!user) {
      console.warn(`[Middleware] Unauthenticated request to protected route: ${pathname}`)
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
          code: 'middleware_auth_required',
        },
        { status: 401 }
      )
    }

    console.log(`[Middleware] Authenticated user ${user.id} accessing ${pathname}`)

    // Check if route requires admin role
    const isAdminRoute = ADMIN_API_ROUTES.some(route => pathname.startsWith(route))
    if (isAdminRoute) {
      return handleAdminAuth(supabase, user.id, pathname)
    }

    // User is authenticated, allow access
    return NextResponse.next()
  } catch (error) {
    console.error(`[Middleware] Unexpected error in handleUserAuth for ${pathname}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal authentication error',
        code: 'middleware_internal_error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Admin Authorization Handler
// ============================================================================

/**
 * Validates admin role for admin-only routes
 *
 * @param supabase - Supabase client instance
 * @param userId - The authenticated user's ID
 * @param pathname - The requested path
 * @returns NextResponse with 403 if not admin, or next() if authorized
 */
async function handleAdminAuth(
  supabase: any,
  userId: string,
  pathname: string
): Promise<NextResponse> {
  try {
    // Fetch user profile to check role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error(`[Middleware] Error fetching profile for admin check:`, error)
      return NextResponse.json(
        {
          success: false,
          error: 'PROFILE_ERROR',
          message: 'Error checking admin permissions',
          code: 'middleware_profile_error',
        },
        { status: 500 }
      )
    }

    // Check if user has admin role
    if (profile?.role !== 'admin') {
      console.warn(`[Middleware] Non-admin user ${userId} attempted to access admin route: ${pathname}`)
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Admin access required',
          code: 'middleware_admin_required',
        },
        { status: 403 }
      )
    }

    console.log(`[Middleware] Admin user ${userId} accessing ${pathname}`)
    return NextResponse.next()
  } catch (error) {
    console.error(`[Middleware] Unexpected error in handleAdminAuth:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Internal authorization error',
        code: 'middleware_internal_error',
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Service-to-Service Authentication Handler
// ============================================================================

/**
 * Validates API key for service-to-service routes
 *
 * @param request - The incoming request
 * @param pathname - The requested path
 * @returns NextResponse with 401 if invalid key, or next() if authorized
 */
async function handleServiceAuth(request: NextRequest, pathname: string): Promise<NextResponse> {
  // Extract API key from headers
  const apiKey = request.headers.get('x-api-key') || request.headers.get('x-internal-api-key')

  // Determine which API key to expect based on the route
  let expectedKey: string | undefined
  let keyType: string

  if (pathname.startsWith('/api/play/battle/events')) {
    expectedKey = process.env.BATTLE_EVENTS_API_KEY
    keyType = 'BATTLE_EVENTS_API_KEY'
  } else if (pathname.startsWith('/api/internal/') || pathname.startsWith('/api/play/questions/seed')) {
    expectedKey = process.env.INTERNAL_API_KEY
    keyType = 'INTERNAL_API_KEY'
  } else {
    // Fallback to any service key
    expectedKey = process.env.INTERNAL_API_KEY || process.env.BATTLE_EVENTS_API_KEY
    keyType = 'SERVICE_API_KEY'
  }

  // Check if API key is configured
  if (!expectedKey) {
    console.error(`[Middleware] ${keyType} not configured for service route: ${pathname}`)
    return NextResponse.json(
      {
        success: false,
        error: 'MISCONFIGURED',
        message: 'Service authentication not configured',
        code: 'middleware_service_key_missing',
      },
      { status: 500 }
    )
  }

  // Validate API key
  if (!apiKey || apiKey !== expectedKey) {
    console.warn(`[Middleware] Invalid API key for service route: ${pathname}`)
    return NextResponse.json(
      {
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
        code: 'middleware_invalid_api_key',
      },
      { status: 401 }
    )
  }

  console.log(`[Middleware] Valid service API key for ${pathname}`)
  return NextResponse.next()
}

// ============================================================================
// Middleware Configuration
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all API routes
     * Exclude Next.js internals and static files
     */
    '/api/:path*',
  ],
}
