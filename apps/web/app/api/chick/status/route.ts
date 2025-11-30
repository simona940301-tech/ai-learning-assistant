import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { checkEvolution } from '@/lib/chick/evolution'
import { pickMessage } from '@/packages/server/chick/messages'

const isHatchingEnabled = process.env.FEATURE_CHICK_HATCHING_ENABLED !== '0'

export async function GET(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  try {
    // 0. Update hunger over time (time-driven)
    try {
      const { updateHungerOverTime, checkAndApplyWellFedBuff } = await import('@/lib/chick/hunger')
      await updateHungerOverTime(supabase, user.id)
      await checkAndApplyWellFedBuff(supabase, user.id)
    } catch (hungerError) {
      console.warn('[GET /api/chick/status] Failed to update hunger:', hungerError)
    }

    // 1. Check Evolution first
    const evolutionResult = await checkEvolution(supabase, user.id)
    if (evolutionResult.evolved) {
      const message = pickMessage('MILESTONE')
      await supabase.from('chick_messages').insert({
        user_id: user.id,
        type: 'MILESTONE',
        text: message || `Your Chick has evolved to Stage ${evolutionResult.newStage}!`,
        state_snapshot: { stage: evolutionResult.newStage, variant: evolutionResult.newVariant }
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'chick_iq, chick_fatigue, chick_emotion_state, last_login_at, chick_iq_last_decay_at, chick_evolution_stage, chick_evolution_variant, chick_hunger, chick_intimacy, food_bowls_count, chick_exploration_start_at, chick_exploration_allowance, chick_name, user_nickname, chick_hatched_at, chick_first_fed_at, last_seen_at'
      )
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[GET /api/chick/status] Load profile error:', profileError)
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 500 })
    }

    // 2. Check Inactivity & Update State
    const now = new Date()
    const lastLogin = profile.last_login_at ? new Date(profile.last_login_at) : now
    const daysInactive = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)

    let newEmotion = profile.chick_emotion_state
    let shouldUpdateEmotion = false

    // Logic: 
    // > 7 days -> Runaway (if not already)
    // > 3 days -> Sick (if not already sick or runaway)
    // Note: We do NOT revert state here. Recovery requires interaction.

    if (daysInactive > 7 && newEmotion !== 'runaway') {
      newEmotion = 'runaway'
      shouldUpdateEmotion = true
    } else if (daysInactive > 3 && newEmotion !== 'sick' && newEmotion !== 'runaway') {
      newEmotion = 'sick'
      shouldUpdateEmotion = true
    }

    // Update DB if state changed
    if (shouldUpdateEmotion) {
      await supabase.from('profiles').update({ chick_emotion_state: newEmotion }).eq('id', user.id)
    }

    // Update last_login_at to now (Heartbeat)
    await supabase.from('profiles').update({ last_login_at: now.toISOString() }).eq('id', user.id)

    const { count, error: countError } = await supabase
      .from('chick_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (countError) {
      console.error('[GET /api/chick/status] Count unread error:', countError)
      return NextResponse.json({ error: 'COUNT_FAILED' }, { status: 500 })
    }

    // Check well-fed buff status
    const { data: progressionState } = await supabase
      .from('battle_progression_state')
      .select('chick_well_fed_expires_at')
      .eq('user_id', user.id)
      .maybeSingle()

    const wellFedExpiresAt = progressionState?.chick_well_fed_expires_at
    const isWellFedActive = wellFedExpiresAt && new Date(wellFedExpiresAt) > now

    const shouldUpdateLastSeen =
      isHatchingEnabled && req.nextUrl.searchParams.get('updateLastSeen') === 'true'

    const previousLastSeenAt = isHatchingEnabled ? profile?.last_seen_at : null
    const daysSinceLastSeen = previousLastSeenAt
      ? Math.floor((now.getTime() - new Date(previousLastSeenAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0
    const reunionState =
      isHatchingEnabled && previousLastSeenAt
        ? daysSinceLastSeen >= 7
          ? 'runaway'
          : daysSinceLastSeen >= 3
            ? 'sad'
            : daysSinceLastSeen >= 1
              ? 'happy'
              : null
        : null

    const responsePayload = {
      iq: profile?.chick_iq ?? 0,
      fatigue: profile?.chick_fatigue ?? 0,
      emotionState: newEmotion ?? 'normal',
      messagesUnreadCount: count ?? 0,
      lastLoginAt: now.toISOString(),
      lastDecayAt: profile?.chick_iq_last_decay_at ?? null,
      evolutionStage: profile?.chick_evolution_stage ?? 0,
      evolutionVariant: profile?.chick_evolution_variant ?? 'default',
      hunger: profile?.chick_hunger ?? 50,
      intimacy: profile?.chick_intimacy ?? 0,
      foodBowlsCount: profile?.food_bowls_count ?? 0,
      explorationStartAt: profile?.chick_exploration_start_at ?? null,
      explorationAllowance: profile?.chick_exploration_allowance ?? 0,
      isWellFed: isWellFedActive,
      wellFedExpiresAt: wellFedExpiresAt ?? null,
      chickName: profile?.chick_name ?? null,
      userNickname: profile?.user_nickname ?? null,
      hatchedAt: profile?.chick_hatched_at ?? null,
      firstFedAt: profile?.chick_first_fed_at ?? null,
      lastSeenAt: shouldUpdateLastSeen ? now.toISOString() : previousLastSeenAt ?? null,
      daysSinceLastSeen,
      reunionState,
    } as const

    if (shouldUpdateLastSeen) {
      const { error: lastSeenError } = await supabase
        .from('profiles')
        .update({ last_seen_at: now.toISOString() })
        .eq('id', user.id)

      if (lastSeenError) {
        console.error('[GET /api/chick/status] Failed to update last_seen_at:', lastSeenError)
      }
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('[GET /api/chick/status] Unexpected error:', error)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
