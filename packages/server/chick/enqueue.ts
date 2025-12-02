import type { SupabaseClient } from '@supabase/supabase-js'
import { pickMessage } from './messages'
import { pruneChickMessages } from './prune'
import type { ChickMessage, ChickMessageCandidate, ChickMessageType, ChickState } from './types'

const PRIORITY_ORDER: ChickMessageType[] = [
  'S3', 'S2', 'S1',
  'MILESTONE',
  'BATTLE_VICTORY', 'BATTLE_LEARNING',
  'STREAK',
  'BATTLE_ENCOURAGEMENT',
  'IDLE_ENCOURAGE_BATTLE', 'IDLE_REVIEW_MISTAKES',
  'POKE_IDLE', 'POKE_BUSY',
  'POSITIVE'
]

function getPriorityScore(type: ChickMessageType): number {
  const idx = PRIORITY_ORDER.indexOf(type)
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
}

function chooseCandidate(candidates: ChickMessageCandidate[]): ChickMessageCandidate | null {
  if (!candidates || candidates.length === 0) return null
  return candidates.reduce<ChickMessageCandidate | null>((best, current) => {
    if (!best) return current
    const bestScore = getPriorityScore(best.type)
    const currentScore = getPriorityScore(current.type)
    if (currentScore < bestScore) return current
    return best
  }, null)
}

interface EnqueueOptions {
  userId: string
  candidates: ChickMessageCandidate[]
  client: SupabaseClient
  prune?: boolean
  defaultSnapshot?: Partial<ChickState> | null
}

/**
 * Insert at most one message per event with priority (S3 > S2 > S1 > POSITIVE).
 * Returns the inserted message or null if no valid candidate.
 */
export async function enqueueChickMessage(options: EnqueueOptions): Promise<ChickMessage | null> {
  const { userId, candidates, client, prune = true, defaultSnapshot = null } = options
  const db = client

  const chosen = chooseCandidate(candidates)
  if (!chosen) return null

  const text = chosen.text ?? pickMessage(chosen.type)
  if (!text) {
    // If we still don't have text, skip insert to avoid empty payload.
    return null
  }

  const { data, error } = await client
    .from('chick_messages')
    .insert({
      user_id: userId,
      type: chosen.type,
      text,
      state_snapshot: chosen.stateSnapshot ?? defaultSnapshot ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to enqueue chick message: ${error.message}`)
  }

  if (prune) {
    await pruneChickMessages(userId, client)
  }

  return data as ChickMessage
}

export { PRIORITY_ORDER }
