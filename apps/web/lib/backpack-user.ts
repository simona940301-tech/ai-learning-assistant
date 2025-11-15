const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

/**
 * Returns the development user id used to bypass auth in Backpack APIs.
 * Throws descriptive errors so API routes can surface clear configuration issues.
 */
export function requireDevBackpackUserId(): string {
  const devUserId = process.env.BACKPACK_DEV_USER_ID

  if (!devUserId) {
    throw new Error('BACKPACK_DEV_USER_ID is not configured. Create a test user in Supabase Auth and set its UUID in .env.local.')
  }

  if (!UUID_REGEX.test(devUserId)) {
    throw new Error('BACKPACK_DEV_USER_ID must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).')
  }

  return devUserId
}

/**
 * Client-side helper to get user ID with development mode fallback.
 * 
 * In development mode, if user is not authenticated, returns dev user ID from API.
 * In production, requires authentication.
 * 
 * @returns User ID or null if not authenticated and not in dev mode
 */
export async function getUserIdWithDevFallback(): Promise<string | null> {
  // Try to get authenticated user first
  try {
    const { supabaseBrowserClient } = await import('@/lib/supabase')
    const { data, error } = await supabaseBrowserClient.auth.getUser()
    
    if (!error && data?.user?.id) {
      return data.user.id
    }
  } catch (err) {
    console.warn('[getUserIdWithDevFallback] Unable to retrieve Supabase user:', err)
  }

  // In development mode, try to get dev user ID from API
  const isDevelopment = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && window.location.hostname === 'localhost')

  if (isDevelopment) {
    try {
      const response = await fetch('/api/backpack/dev-user-id', {
        method: 'GET',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.userId) {
          console.log('[getUserIdWithDevFallback] Using dev user ID:', data.userId)
          return data.userId
        }
      }
    } catch (err) {
      console.warn('[getUserIdWithDevFallback] Unable to get dev user ID:', err)
    }
  }

  return null
}
