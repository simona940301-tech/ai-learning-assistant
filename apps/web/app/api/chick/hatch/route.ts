import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiUser } from '@/lib/api/auth'

const isHatchingEnabled = process.env.FEATURE_CHICK_HATCHING_ENABLED !== '0'

const HatchRequestSchema = z.object({
  chickName: z
    .string()
    .trim()
    .min(1, 'Chick name is required')
    .max(12, 'Chick name must be 1-12 characters')
    .regex(/^[\p{L}\p{N}]+$/u, 'Name can only contain letters and numbers'),
  userNickname: z
    .string()
    .trim()
    .min(1, 'User nickname is required')
    .max(12, 'User nickname must be 1-12 characters')
    .regex(/^[\p{L}\p{N}]+$/u, 'Nickname can only contain letters and numbers'),
})

/**
 * POST /api/chick/hatch
 *
 * Save chick name and user nickname after hatching ceremony
 */
export async function POST(request: NextRequest) {
  if (!isHatchingEnabled) {
    return NextResponse.json({ error: 'FEATURE_DISABLED' }, { status: 404 })
  }

  const { supabase, user, errorType } = await getApiUser(request)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = HatchRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { chickName, userNickname } = parsed.data

    // Check if already hatched to keep immutable ceremony state
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('chick_hatched_at, chick_name, user_nickname')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[Hatch API] Load profile error:', profileError)
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 })
    }

    if (profile.chick_hatched_at) {
      return NextResponse.json(
        {
          error: 'ALREADY_HATCHED',
          data: {
            chickName: profile.chick_name,
            userNickname: profile.user_nickname,
            hatchedAt: profile.chick_hatched_at,
          },
        },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('profiles')
      .update({
        chick_name: chickName,
        user_nickname: userNickname,
        chick_hatched_at: now,
        last_seen_at: now,
        updated_at: now,
      })
      .eq('id', user.id)
      .select('chick_name, user_nickname, chick_hatched_at, last_seen_at')
      .single()

    if (error || !data) {
      console.error('[Hatch API] Database error:', error)
      return NextResponse.json({ error: 'FAILED_TO_SAVE' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        chickName: data.chick_name,
        userNickname: data.user_nickname,
        hatchedAt: data.chick_hatched_at,
        lastSeenAt: data.last_seen_at,
      },
    })
  } catch (error) {
    console.error('[Hatch API] Unexpected error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
