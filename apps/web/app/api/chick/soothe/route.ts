import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { enqueueChickMessage } from '@/packages/server/chick'

export async function POST() {
  const { supabase, user, errorType } = await getApiUser()
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('chick_fatigue, chick_soothe_used, chick_iq, chick_emotion_state')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[POST /api/chick/soothe] Load profile error:', profileError)
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 500 })
    }

    const currentFatigue = profile?.chick_fatigue ?? 0
    const currentSootheUsed = profile?.chick_soothe_used ?? 0
    const emotionState = profile?.chick_emotion_state ?? 'normal'
    const iq = profile?.chick_iq ?? 0

    if (currentFatigue <= 0) {
      return NextResponse.json({ ok: false, reason: 'no_fatigue' })
    }

    if (currentSootheUsed >= 5) {
      return NextResponse.json({ ok: false, reason: 'limit_reached' })
    }

    const nextFatigue = Math.max(currentFatigue - 1, 0)
    const nextSootheUsed = currentSootheUsed + 1

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        chick_fatigue: nextFatigue,
        chick_soothe_used: nextSootheUsed,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[POST /api/chick/soothe] Update profile error:', updateError)
      return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
    }

    const snapshot = { iq, fatigue: nextFatigue, emotionState }
    try {
      await enqueueChickMessage({
        userId: user.id,
        candidates: [{ type: 'POSITIVE', stateSnapshot: snapshot }],
        client: supabase,
        defaultSnapshot: snapshot,
      })
    } catch (msgError) {
      console.error('[POST /api/chick/soothe] enqueue message failed:', msgError)
    }

    return NextResponse.json({ ok: true, fatigue: nextFatigue, sootheUsed: nextSootheUsed })
  } catch (err) {
    console.error('[POST /api/chick/soothe] Unexpected error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
