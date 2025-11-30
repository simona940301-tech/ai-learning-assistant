import { supabaseBrowserClient } from '@/lib/supabase'

/**
 * Centralized API client with endpoint guards
 * Blocks legacy warmup endpoints and enforces solver-only flow
 */

declare global {
  interface Window {
    __PLMS_FETCH_GUARD_INSTALLED__?: boolean
    __PLMS_NATIVE_FETCH__?: typeof fetch
  }
}

// Whitelist of allowed API endpoints
const ALLOWED_ENDPOINTS = [
  /^\/api\/solve/,
  /^\/api\/ai\//,
  /^\/api\/exec\//,
  /^\/api\/tutor\//,
  /^\/api\/backpack\//,
  /^\/api\/heartbeat/,
  /^\/api\/label\//,
  /^\/api\/health/,
  /^\/api\/explain/,
  /^\/api\/mcp\//,
  /^\/api\/rag\//,
]

// Blocked legacy endpoints
const BLOCKED_ENDPOINTS = [/^\/api\/warmup\//]

// Debug flag (only log in debug mode)
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_API_GUARD === 'true'
const MAX_API_RETRIES = 2
const RETRYABLE_STATUS = new Set([500, 502, 503, 504])
const RETRY_BASE_DELAY_MS = 200

let cachedAccessToken: string | null = null
let cachedAccessTokenExpiresAt = 0
let pendingTokenPromise: Promise<string | null> | null = null
let sessionWarningLogged = false

/**
 * Check if an endpoint is allowed
 */
function isEndpointAllowed(url: string): boolean {
  // Check if explicitly blocked
  if (BLOCKED_ENDPOINTS.some((pattern) => pattern.test(url))) {
    return false
  }

  // Check if in whitelist
  return ALLOWED_ENDPOINTS.some((pattern) => pattern.test(url))
}

/**
 * Install global fetch guard (IDEMPOTENT)
 * Call this once at app initialization
 */
export function installGlobalFetchGuard(): void {
  if (typeof window === 'undefined') return

  // Idempotent: Only install once
  if (window.__PLMS_FETCH_GUARD_INSTALLED__) {
    if (DEBUG) console.log('[API Guard] Already installed, skipping')
    return
  }

  // Save the NATIVE fetch reference before any modifications
  const nativeFetch = window.fetch.bind(window)
  window.__PLMS_NATIVE_FETCH__ = nativeFetch

  // Override window.fetch with guard logic
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    let path: string

    try {
      const urlObj = new URL(request.url, window.location.origin)
      path = urlObj.pathname
    } catch {
      path = typeof input === 'string' ? input : request.url
    }

    if (!path.startsWith('/api/')) {
      return nativeFetch(request)
    }

    if (BLOCKED_ENDPOINTS.some(pattern => pattern.test(path))) {
      if (DEBUG) console.warn('[API Guard] ❌ Blocked legacy warmup:', path)
      return new Response(
        JSON.stringify({
          error: 'endpoint_deprecated',
          message: 'This endpoint has been deprecated. Use /api/solve instead.',
        }),
        {
          status: 410,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (isEndpointAllowed(path)) {
      if (DEBUG) console.log('[API Guard] ✅ Allowed:', path)
    } else if (DEBUG) {
      console.warn('[API Guard] ⚠️  Unknown endpoint (allowing):', path)
    }

    const authedRequest = await withAuthorizationHeader(request)
    return fetchWithRetry(authedRequest, path, nativeFetch)
  }

  window.__PLMS_FETCH_GUARD_INSTALLED__ = true
  console.log('✅ [API Guard] Global fetch guard installed')
}

/**
 * Uninstall global fetch guard (for testing)
 */
export function uninstallGlobalFetchGuard(): void {
  if (typeof window === 'undefined') return
  if (window.__PLMS_NATIVE_FETCH__) {
    window.fetch = window.__PLMS_NATIVE_FETCH__
    window.__PLMS_FETCH_GUARD_INSTALLED__ = false
    console.log('✅ [API Guard] Fetch guard uninstalled')
  }
}

async function withAuthorizationHeader(request: Request): Promise<Request> {
  const headers = new Headers(request.headers)

  if (!headers.has('Authorization')) {
    const token = await getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  return new Request(request, { headers })
}

async function getAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const now = Date.now()
  if (cachedAccessToken && cachedAccessTokenExpiresAt > now) {
    return cachedAccessToken
  }
  if (pendingTokenPromise) {
    return pendingTokenPromise
  }

  pendingTokenPromise = (async () => {
    try {
      const { data, error } = await supabaseBrowserClient.auth.getSession()
      if (error) {
        if (!sessionWarningLogged) {
          console.warn('[API Guard] Unable to read Supabase session:', error.message)
          sessionWarningLogged = true
        }
        cachedAccessToken = null
        cachedAccessTokenExpiresAt = 0
        return null
      }

      const session = data?.session
      cachedAccessToken = session?.access_token ?? null
      cachedAccessTokenExpiresAt = session?.expires_at
        ? session.expires_at * 1000 - 5_000
        : 0
      return cachedAccessToken
    } catch (error) {
      if (!sessionWarningLogged) {
        console.warn('[API Guard] Unable to resolve Supabase session:', error)
        sessionWarningLogged = true
      }
      cachedAccessToken = null
      cachedAccessTokenExpiresAt = 0
      return null
    } finally {
      pendingTokenPromise = null
    }
  })()

  return pendingTokenPromise
}

async function fetchWithRetry(request: Request, path: string, nativeFetch: typeof fetch) {
  const canRetry = request.method === 'GET'
  const requestVariants = [request]

  if (canRetry) {
    for (let i = 0; i < MAX_API_RETRIES; i++) {
      requestVariants.push(request.clone())
    }
  }

  for (let attempt = 0; attempt < requestVariants.length; attempt++) {
    const currentRequest = requestVariants[attempt]
    try {
      const response = await nativeFetch(currentRequest)
      if (
        canRetry &&
        attempt < MAX_API_RETRIES &&
        shouldRetryResponse(response)
      ) {
        if (DEBUG) {
          console.warn(
            `[API Guard] Retry ${attempt + 1} for ${path} (${response.status})`
          )
        }
        await waitFor((attempt + 1) * RETRY_BASE_DELAY_MS)
        continue
      }
      return response
    } catch (error) {
      if (!canRetry || attempt >= MAX_API_RETRIES) {
        throw error
      }
      if (DEBUG) {
        console.warn(`[API Guard] Network error for ${path}, retrying...`, error)
      }
      await waitFor((attempt + 1) * RETRY_BASE_DELAY_MS)
    }
  }

  // Should never reach here, but fall back to one more attempt
  return nativeFetch(request)
}

function shouldRetryResponse(response: Response) {
  return RETRYABLE_STATUS.has(response.status)
}

function waitFor(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

/**
 * Safe JSON POST with Content-Type validation
 * Prevents "Unexpected token '<'" errors when API returns HTML
 */
export async function postJSON<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // Read response as text first
  const text = await res.text()
  const contentType = res.headers.get('content-type') || ''

  // Check if response is OK
  if (!res.ok) {
    // For 404/500, throw error with text snippet (not JSON parse)
    throw new Error(
      `HTTP ${res.status} ${res.statusText} — ${text.slice(0, 200)}`
    )
  }

  // Validate Content-Type before parsing
  if (!contentType.includes('application/json')) {
    throw new Error(
      `INVALID_CONTENT_TYPE: expected JSON, got "${contentType || 'unknown'}" — ${text.slice(0, 200)}`
    )
  }

  // Safe JSON parse with error handling
  try {
    return JSON.parse(text) as T
  } catch (e) {
    throw new Error(
      `INVALID_JSON: ${String(e)} — ${text.slice(0, 200)}`
    )
  }
}
