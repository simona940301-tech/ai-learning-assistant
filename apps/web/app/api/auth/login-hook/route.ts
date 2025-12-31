import { createClient } from '@/lib/supabase/server'
import { enqueueChickMessage } from '@/packages/server/chick'
import { Api } from '@/lib/api/response'
import { ApiErrorCode } from '@/lib/types/api'

const DAY_MS = 24 * 60 * 60 * 1000

function deriveEmotionState(lastLoginAt: string | null): 'normal' | 'cold' | 'distant' | 'hibernate' {
  if (!lastLoginAt) return 'normal'
  const diff = Date.now() - new Date(lastLoginAt).getTime()
  if (diff > 14 * DAY_MS) return 'hibernate'
  if (diff > 3 * DAY_MS) return 'distant'
  if (diff > DAY_MS) return 'cold'
  return 'normal'
}

export async function POST() {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return Api.unauthorized('Not authenticated')
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('chick_emotion_state, last_login_at, chick_iq, chick_fatigue')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[Chick Hook][login] Load profile error:', profileError)
      return Api.notFound('Profile')
    }

    const prevEmotion = profile?.chick_emotion_state ?? 'normal'
    const nextEmotion = deriveEmotionState(profile?.last_login_at ?? null)
    const nowIso = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        last_login_at: nowIso,
        chick_emotion_state: nextEmotion,
        chick_emotion_updated_at: nowIso,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Chick Hook][login] Update profile error:', updateError)
      return Api.customError(ApiErrorCode.DATABASE_ERROR, 'Failed to update profile')
    }

    if (nextEmotion !== prevEmotion) {
      const snapshot = {
        iq: profile?.chick_iq ?? 5,
        fatigue: profile?.chick_fatigue ?? 0,
        emotionState: nextEmotion,
      }
      try {
        await enqueueChickMessage({
          userId: user.id,
          candidates: [{ type: 'S3', stateSnapshot: snapshot }],
          client: supabase,
          defaultSnapshot: snapshot,
        })
      } catch (msgError) {
        console.error('[Chick Hook][login] enqueue message failed:', msgError)
      }
    }

    return Api.success(
      {
        chick_emotion_state: nextEmotion,
        last_login_at: nowIso
      },
      Api.withTimestamp()
    )
  } catch (error) {
    console.error('[Chick Hook][login] Unexpected error:', error)
    return Api.serverError()
  }
}
