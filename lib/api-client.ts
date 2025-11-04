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
]

// Blocked legacy endpoints
const BLOCKED_ENDPOINTS = [/^\/api\/warmup\//]

// Debug flag (only log in debug mode)
const DEBUG = process.env.NEXT_PUBLIC_DEBUG_API_GUARD === 'true'

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
    const url = typeof input === 'string' ? input : input.toString()

    // Extract path from full URL
    let path = url
    try {
      const urlObj = new URL(url, window.location.origin)
      path = urlObj.pathname
    } catch {
      // If not a valid URL, treat as path
      path = url
    }

    // Only guard /api/* calls
    if (!path.startsWith('/api/')) {
      // Pass through non-API calls directly to native fetch
      return window.__PLMS_NATIVE_FETCH__!(input as any, init)
    }

    // Check if explicitly blocked
    if (BLOCKED_ENDPOINTS.some((pattern) => pattern.test(path))) {
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

    // Check if in whitelist
    if (ALLOWED_ENDPOINTS.some((pattern) => pattern.test(path))) {
      if (DEBUG) console.log('[API Guard] ✅ Allowed:', path)
      // Call NATIVE fetch directly (no recursion!)
      return window.__PLMS_NATIVE_FETCH__!(input as any, init)
    }

    // Not in whitelist, but allow by default (log warning in debug)
    if (DEBUG) console.warn('[API Guard] ⚠️  Unknown endpoint (allowing):', path)
    return window.__PLMS_NATIVE_FETCH__!(input as any, init)
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
