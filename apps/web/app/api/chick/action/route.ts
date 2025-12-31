/**
 * POST /api/chick/action
 * 
 * 統一事件總線 - 所有電子雞相關事件都通過此端點處理
 * 
 * 設計原則：
 * - 單一入口：所有用戶行為都通過此端點
 * - 標準化格式：統一的 type 和 payload
 * - 解耦設計：狀態更新邏輯在 ChickReactor 中
 */

import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { ChickReactor, type ChickActionType, type ChickActionPayload } from '@/packages/server/chick/reactor'

export async function POST(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const { type, payload } = body as {
      type: ChickActionType
      payload?: ChickActionPayload
    }

    if (!type) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'Action type is required' }, { status: 400 })
    }

    console.log('[POST /api/chick/action] Processing action:', type, 'User:', user.id)

    // Fetch current state
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'chick_iq, chick_fatigue, chick_emotion_state, chick_fatigue_battle_counter, chick_explanations_used, last_login_at'
      )
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[POST /api/chick/action] Load profile error:', profileError)
      return NextResponse.json({ error: 'PROFILE_NOT_FOUND', details: profileError.message }, { status: 500 })
    }

    const currentState = {
      iq: profile?.chick_iq ?? 5,
      fatigue: profile?.chick_fatigue ?? 0,
      emotionState: profile?.chick_emotion_state ?? 'normal',
      fatigueBattleCounter: profile?.chick_fatigue_battle_counter ?? 0,
      explanationsUsed: profile?.chick_explanations_used ?? 0,
      lastLoginAt: profile?.last_login_at ?? null,
    }

    // Process action through ChickReactor
    const reactor = new ChickReactor(supabase)
    const result = await reactor.processAction(user.id, type, payload || {}, currentState)

    if (!result.ok) {
      return NextResponse.json({ error: 'PROCESSING_FAILED', details: result.error }, { status: 500 })
    }

    // Track learning actions for emotion recovery (P1-D)
    if (['BATTLE_END', 'EXPLANATION_VIEWED', 'WRONGBOOK_REVIEWED', 'NOTE_SAVED'].includes(type)) {
      await supabase.from('chick_learning_actions').insert({
        user_id: user.id,
        action_type: type === 'BATTLE_END' ? 'BATTLE' : type === 'EXPLANATION_VIEWED' ? 'EXPLANATION' : type === 'WRONGBOOK_REVIEWED' ? 'WRONGBOOK' : 'NOTE',
        action_metadata: payload || {},
      })
    }

    // Check for emotion recovery (P1-D: Time + Behavior Hybrid)
    const finalState = result.newState.emotionState || currentState.emotionState
    if (['sick', 'runaway'].includes(finalState)) {
      await checkEmotionRecovery(user.id, supabase, { ...currentState, emotionState: finalState })
    }

    return NextResponse.json({
      ok: true,
      iqDelta: result.stateUpdate.iqDelta,
      fatigueDelta: result.stateUpdate.fatigueDelta,
      newEmotion: result.newState.emotionState,
      message: result.message,
    })
  } catch (err) {
    console.error('[POST /api/chick/action] Unexpected error:', err)
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * P1-D: 情感狀態恢復邏輯（時間 + 行為混合）
 * 
 * 條件：在 3 天內完成 5 次學習行為（對戰/詳解/錯題本），且用戶已登入
 * 效果：狀態從 sick → normal
 */
async function checkEmotionRecovery(
  userId: string,
  supabase: Awaited<ReturnType<typeof getApiUser>>['supabase'],
  currentState: any
) {
  const emotionState = currentState.emotionState
  if (!['sick', 'runaway'].includes(emotionState)) {
    return // Only check recovery for sick/runaway states
  }

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

  // Count learning actions in last 3 days
  const { data: actions, error: countError } = await supabase
    .from('chick_learning_actions')
    .select('id', { count: 'exact', head: false })
    .eq('user_id', userId)
    .gte('created_at', threeDaysAgo.toISOString())

  if (countError) {
    console.error(`[Emotion Recovery] Failed to count learning actions for user ${userId}:`, countError)
    return
  }

  const actionCount = actions?.length ?? 0
  const lastLogin = currentState.lastLoginAt ? new Date(currentState.lastLoginAt) : null
  const daysSinceLogin = lastLogin ? (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24) : 999

  // Recovery condition: 3 days window + 5 learning actions + user logged in
  if (daysSinceLogin <= 3 && actionCount >= 5) {
    const { error } = await supabase
      .from('profiles')
      .update({
        chick_emotion_state: 'normal',
        chick_emotion_updated_at: now.toISOString(),
      })
      .eq('id', userId)
      .eq('chick_emotion_state', emotionState)

    if (!error) {
      console.log(
        `[Emotion Recovery] User ${userId} recovered from ${emotionState} to normal (${actionCount} actions in 3 days)`
      )
    } else {
      console.error(`[Emotion Recovery] Failed to update emotion state for user ${userId}:`, error)
    }
  }
}

