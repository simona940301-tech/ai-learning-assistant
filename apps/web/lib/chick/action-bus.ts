/**
 * Chick Action Bus - 統一事件總線前端 Helper
 * 
 * 所有電子雞相關事件都通過此 helper 發送到 /api/chick/action
 */

import type { ChickActionType, ChickActionPayload } from '@/packages/server/chick/reactor'

export interface ChickActionResponse {
  ok: boolean
  iqDelta?: number
  fatigueDelta?: number
  newEmotion?: string
  message?: {
    id: string
    type: string
    text: string
  } | null
  error?: string
}

/**
 * 發送電子雞動作到統一事件總線
 */
export async function sendChickAction(
  type: ChickActionType,
  payload?: ChickActionPayload
): Promise<ChickActionResponse> {
  try {
    const response = await fetch('/api/chick/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        type,
        payload: payload || {},
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        ok: false,
        error: errorData.message || `Failed to send ${type} action`,
      }
    }

    const data = await response.json()
    return {
      ok: true,
      ...data,
    }
  } catch (error) {
    console.error(`Failed to send Chick action (${type}):`, error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Helper: 發送對戰結束事件
 */
export async function sendBattleEndAction(payload: {
  battleResult: 'win' | 'loss' | 'draw'
  questionsCorrect: number
  questionsTotal: number
}) {
  return sendChickAction('BATTLE_END', {
    battleResult: payload.battleResult,
    questionsCorrect: payload.questionsCorrect,
    questionsTotal: payload.questionsTotal,
  })
}

/**
 * Helper: 發送詳解查看事件
 */
export async function sendExplanationViewedAction(payload?: { questionId?: string }) {
  return sendChickAction('EXPLANATION_VIEWED', {
    metadata: payload,
  })
}

/**
 * Helper: 發送錯題本複習事件 (P1-E)
 */
export async function sendWrongbookReviewedAction(payload?: { questionsReviewed?: number }) {
  return sendChickAction('WRONGBOOK_REVIEWED', {
    metadata: payload,
  })
}

/**
 * Helper: 發送筆記保存事件 (P1-E)
 */
export async function sendNoteSavedAction(payload?: { noteId?: string }) {
  return sendChickAction('NOTE_SAVED', {
    metadata: payload,
  })
}

/**
 * Helper: 發送連續天數事件 (P1-E)
 */
export async function sendStreakAction(payload: {
  type: 'continue' | 'break'
  streakDays: number
}) {
  return sendChickAction(payload.type === 'continue' ? 'STREAK_CONTINUE' : 'STREAK_BREAK', {
    streakDays: payload.streakDays,
  })
}

/**
 * Helper: 發送互動事件
 */
export async function sendPokeAction(context?: { inBattle?: boolean; lastInteraction?: number }) {
  return sendChickAction('POKE', {
    inBattle: context?.inBattle || false,
    lastInteraction: context?.lastInteraction || 0,
  })
}

/**
 * Helper: 發送檢查連續天數事件
 */
export async function sendCheckStreakAction(streakDays: number) {
  return sendChickAction('CHECK_STREAK', {
    streakDays,
  })
}

/**
 * Helper: 發送空閒提醒事件
 */
export async function sendIdleAction(type: 'battle' | 'review') {
  return sendChickAction(type === 'battle' ? 'IDLE_BATTLE' : 'IDLE_REVIEW')
}

