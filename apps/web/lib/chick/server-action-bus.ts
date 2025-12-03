/**
 * Chick Server Action Bus - 服務端事件發送 Helper
 * 
 * 用於在服務端（API routes, server functions）發送電子雞事件
 */

import type { ChickActionType, ChickActionPayload } from '@/packages/server/chick/reactor'

/**
 * 在服務端發送電子雞動作
 * 注意：這需要 Supabase client 和 user ID
 */
export async function sendChickActionServer(
  supabase: any,
  userId: string,
  type: ChickActionType,
  payload?: ChickActionPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 直接調用 ChickReactor 處理，避免 HTTP 請求
    const { ChickReactor } = await import('@/packages/server/chick/reactor')
    
    // Fetch current state
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'chick_iq, chick_fatigue, chick_emotion_state, chick_fatigue_battle_counter, chick_explanations_used, last_login_at'
      )
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('[sendChickActionServer] Load profile error:', profileError)
      return { ok: false, error: profileError.message }
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
    const result = await reactor.processAction(userId, type, payload || {}, currentState)

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    // Track learning actions for emotion recovery
    if (['BATTLE_END', 'EXPLANATION_VIEWED', 'WRONGBOOK_REVIEWED', 'NOTE_SAVED'].includes(type)) {
      await supabase.from('chick_learning_actions').insert({
        user_id: userId,
        action_type: type === 'BATTLE_END' ? 'BATTLE' : type === 'EXPLANATION_VIEWED' ? 'EXPLANATION' : type === 'WRONGBOOK_REVIEWED' ? 'WRONGBOOK' : 'NOTE',
        action_metadata: payload || {},
      })
    }

    // Check for emotion recovery
    const finalState = result.newState.emotionState || currentState.emotionState
    if (['sick', 'runaway'].includes(finalState)) {
      await checkEmotionRecovery(userId, supabase, { ...currentState, emotionState: finalState })
    }

    return { ok: true }
  } catch (error) {
    console.error('[sendChickActionServer] Error:', error)
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * P1-D: 情感狀態恢復邏輯（時間 + 行為混合）
 */
async function checkEmotionRecovery(userId: string, supabase: any, currentState: any) {
  const emotionState = currentState.emotionState
  if (!['sick', 'runaway'].includes(emotionState)) {
    return
  }

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

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
    }
  }
}



























