import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ChickEventType, ChickEventPayload } from '@/lib/chick/events'

/**
 * POST /api/chick/event
 *
 * Receives Chick events and updates Chick state accordingly
 * Returns updated state deltas (IQ, fatigue, emotion changes)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { type, payload } = body as { type: ChickEventType; payload: ChickEventPayload }

    if (!type) {
      return NextResponse.json({ error: 'Event type is required' }, { status: 400 })
    }

    // Calculate state changes based on event type
    const stateChanges = calculateStateChanges(type, payload)

    // Fetch current Chick state
    const { data: currentState, error: fetchError } = await supabase
      .from('chick_state')
      .select('iq, fatigue, emotion_state')
      .eq('user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to fetch chick state:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch chick state' }, { status: 500 })
    }

    // Calculate new state values
    const currentIQ = currentState?.iq || 0
    const currentFatigue = currentState?.fatigue || 0

    const newIQ = Math.max(0, Math.min(100, currentIQ + stateChanges.iqDelta))
    const newFatigue = Math.max(0, Math.min(5, currentFatigue + stateChanges.fatigueDelta))

    // Update Chick state
    const { error: updateError } = await supabase
      .from('chick_state')
      .upsert(
        {
          user_id: user.id,
          iq: newIQ,
          fatigue: newFatigue,
          emotion_state: stateChanges.newEmotion || currentState?.emotion_state || 'normal',
          last_interaction_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (updateError) {
      console.error('Failed to update chick state:', updateError)
      return NextResponse.json({ error: 'Failed to update chick state' }, { status: 500 })
    }

    // Generate a message based on event type (optional)
    const message = generateChickMessage(type, payload, stateChanges)

    // Optionally save message to chick_messages table
    if (message) {
      await supabase.from('chick_messages').insert({
        user_id: user.id,
        type: mapEventTypeToMessageType(type),
        text: message,
        state_snapshot: { iq: newIQ, fatigue: newFatigue },
        created_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      ok: true,
      iqDelta: stateChanges.iqDelta,
      fatigueDelta: stateChanges.fatigueDelta,
      newEmotion: stateChanges.newEmotion,
      message,
    })
  } catch (error) {
    console.error('Chick event error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate state changes based on event type
 */
function calculateStateChanges(type: ChickEventType, payload: ChickEventPayload) {
  const changes = {
    iqDelta: 0,
    fatigueDelta: 0,
    newEmotion: null as string | null,
  }

  switch (type) {
    case 'LOGIN':
      changes.iqDelta = 0
      changes.fatigueDelta = 0
      break

    case 'BATTLE_END':
      if (payload.battleResult === 'win') {
        changes.iqDelta = 3
        changes.fatigueDelta = 1
      } else if (payload.battleResult === 'loss') {
        changes.iqDelta = 1
        changes.fatigueDelta = 1
      } else {
        changes.iqDelta = 2
        changes.fatigueDelta = 1
      }
      break

    case 'EXPLANATION_VIEWED':
      changes.iqDelta = 2
      changes.fatigueDelta = 0
      break

    case 'WRONGBOOK_REVIEWED':
      changes.iqDelta = 1
      changes.fatigueDelta = 0
      break

    case 'NOTE_SAVED':
      changes.iqDelta = 1
      changes.fatigueDelta = 0
      break

    case 'STREAK_CONTINUE':
      changes.iqDelta = (payload.streakDays || 0) >= 7 ? 5 : 2
      changes.fatigueDelta = 0
      break

    case 'STREAK_BREAK':
      changes.iqDelta = 0
      changes.fatigueDelta = 1
      changes.newEmotion = 'sad'
      break

    default:
      break
  }

  return changes
}

/**
 * Generate a Chick message based on event
 */
function generateChickMessage(
  type: ChickEventType,
  payload: ChickEventPayload,
  changes: { iqDelta: number; fatigueDelta: number }
): string | null {
  switch (type) {
    case 'LOGIN':
      return '歡迎回來！準備好今天的學習挑戰了嗎？'

    case 'BATTLE_END':
      if (payload.battleResult === 'win') {
        return `太棒了！你贏了這場對戰！+${changes.iqDelta} IQ`
      } else if (payload.battleResult === 'loss') {
        return '別灰心！從錯誤中學習，下次會更好的！'
      } else {
        return '打成平手！繼續加油！'
      }

    case 'EXPLANATION_VIEWED':
      return `好學的態度！理解了這道題目，+${changes.iqDelta} IQ`

    case 'WRONGBOOK_REVIEWED':
      return '複習錯題是提升的關鍵！繼續保持！'

    case 'NOTE_SAVED':
      return '做筆記是個好習慣！記錄下來方便以後複習。'

    case 'STREAK_CONTINUE':
      return `連續學習 ${payload.streakDays} 天！你真是太厲害了！`

    case 'STREAK_BREAK':
      return '好久沒見到你了，我有點想你呢...'

    default:
      return null
  }
}

/**
 * Map event type to message type for database
 */
function mapEventTypeToMessageType(
  type: ChickEventType
): 'ENCOURAGEMENT' | 'STREAK' | 'BATTLE' | 'REVIEW' | 'STUDY' {
  switch (type) {
    case 'LOGIN':
      return 'ENCOURAGEMENT'
    case 'BATTLE_END':
      return 'BATTLE'
    case 'EXPLANATION_VIEWED':
      return 'STUDY'
    case 'WRONGBOOK_REVIEWED':
      return 'REVIEW'
    case 'NOTE_SAVED':
      return 'STUDY'
    case 'STREAK_CONTINUE':
    case 'STREAK_BREAK':
      return 'STREAK'
    default:
      return 'ENCOURAGEMENT'
  }
}
