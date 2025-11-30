import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { enqueueChickMessage } from '@/packages/server/chick'

export async function POST(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)

  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'chick_iq, chick_explanations_used, chick_fatigue, chick_emotion_state'
      )
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Chick Hook][explanation_viewed] Load profile error:', profileError)
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 500 })
    }

    const currentIq = profile?.chick_iq ?? 5
    const used = profile?.chick_explanations_used ?? 0
    const emotionState = profile?.chick_emotion_state ?? 'normal'
    const fatigue = profile?.chick_fatigue ?? 0

    const allowGain = used < 3
    const nextIq = allowGain ? Math.min(currentIq + 1, 10) : currentIq
    const nextUsed = used + 1

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        chick_iq: nextIq,
        chick_explanations_used: nextUsed,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Chick Hook][explanation_viewed] Update profile error:', updateError)
      return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
    }

    if (allowGain) {
      const snapshot = { iq: nextIq, fatigue, emotionState }
      try {
        await enqueueChickMessage({
          userId: user.id,
          candidates: [{ type: 'S1', stateSnapshot: snapshot }],
          client: supabase,
          defaultSnapshot: snapshot,
        })
      } catch (msgError) {
        console.error('[Chick Hook][explanation_viewed] enqueue message failed:', msgError)
      }
    }

    return NextResponse.json({
      success: true,
      chick_iq: nextIq,
      chick_explanations_used: nextUsed,
    })
  } catch (error) {
    console.error('[Chick Hook][explanation_viewed] Unexpected error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
