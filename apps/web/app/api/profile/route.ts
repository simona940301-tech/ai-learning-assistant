import { NextRequest } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'
import { levelForXp } from '@/lib/progression'

/**
 * GET /api/profile
 *
 * Get current user's profile
 * Requires authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { supabase, user, errorType } = await getApiUser(req)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入或清除 Cookies 後再試。'
          : errorType === 'unauthenticated'
            ? 'Authentication required'
            : 'Authentication error occurred'

      return Api.unauthorized(message)
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Profile API] Query error:', profileError)
      return Api.customError(
        ApiErrorCode.DATABASE_ERROR,
        profileError.message
      )
    }

    if (!profile) {
      return Api.notFound('使用者資料')
    }

    const xpValue = profile?.xp ?? 0
    const levelInfo = levelForXp(xpValue)

    return Api.success({
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      xp: xpValue,
      level: levelInfo.level,
      xp_progress: levelInfo.progressPct,
      next_level_xp: levelInfo.nextLevelXp,
      coins: profile.coins,
      streak: profile.streak,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    })
  } catch (error) {
    console.error('[Profile API] Error:', error)
    return Api.serverError(
      error instanceof Error ? error.message : undefined
    )
  }
}
