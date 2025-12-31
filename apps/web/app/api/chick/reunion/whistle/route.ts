import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiUser } from '@/lib/api/auth'

const isHatchingEnabled = process.env.FEATURE_CHICK_HATCHING_ENABLED !== '0'

const WhistleRequestSchema = z.object({
  cost: z
    .number()
    .int()
    .positive()
    .max(10000)
    .default(50)
    .refine((value) => value === 50, { message: 'Whistle cost is fixed at 50 coins' }),
})

export async function POST(req: NextRequest) {
  if (!isHatchingEnabled) {
    return NextResponse.json({ error: 'FEATURE_DISABLED' }, { status: 404 })
  }

  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  const parsed = WhistleRequestSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_REQUEST', details: parsed.error.format() }, { status: 400 })
  }

  const cost = parsed.data.cost

  try {
    const { data, error } = await supabase.rpc('use_chick_whistle', {
      p_user_id: user.id,
      p_cost: cost,
    })

    if (error) {
      const message = error.message || ''
      if (message.includes('INSUFFICIENT_FUNDS')) {
        return NextResponse.json({ error: 'INSUFFICIENT_FUNDS', message: 'Not enough coins (50 required)' }, { status: 400 })
      }
      if (message.includes('PROFILE_NOT_FOUND')) {
        return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 })
      }
      console.error('[POST /api/chick/reunion/whistle] RPC error:', error)
      return NextResponse.json({ error: 'FAILED_TO_REDEEM' }, { status: 500 })
    }

    const state = Array.isArray(data) ? data[0] : data

    if (!state) {
      return NextResponse.json({ error: 'FAILED_TO_REDEEM' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        coins: state.coins ?? null,
        walletBalance: state.user_wallet_balance ?? null,
        emotionState: state.chick_emotion_state ?? 'normal',
        lastSeenAt: state.last_seen_at ?? null,
        chickName: state.chick_name ?? null,
        userNickname: state.user_nickname ?? null,
        hatchedAt: state.chick_hatched_at ?? null,
        reunionState: 'happy',
      },
    })
  } catch (err) {
    console.error('[POST /api/chick/reunion/whistle] Unexpected error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
