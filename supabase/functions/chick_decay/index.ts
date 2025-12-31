// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.3'
import { pickMessage } from '../../packages/server/chick/messages.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for chick_decay function')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: { headers: { 'x-chick-function': 'chick_decay' } },
})

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000

interface ProfileRow {
  id: string
  chick_iq: number | null
  chick_iq_last_decay_at: string | null
  chick_fatigue: number | null
  chick_emotion_state: string | null
}

async function pruneMessages(userId: string) {
  const { data, error } = await supabase
    .from('chick_messages')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(20, 4000)

  if (error) throw error
  const ids = (data ?? []).map(row => row.id).filter(Boolean)
  if (ids.length === 0) return
  const { error: delError } = await supabase.from('chick_messages').delete().in('id', ids)
  if (delError) throw delError
}

async function insertS1Message(user: ProfileRow, snapshot: any) {
  const text = pickMessage('S1')
  if (!text) return
  const { error } = await supabase.from('chick_messages').insert({
    user_id: user.id,
    type: 'S1',
    text,
    state_snapshot: snapshot,
  })
  if (error) throw error
  await pruneMessages(user.id)
}

serve(async req => {
  const now = new Date()
  const thresholdIso = new Date(now.getTime() - TWELVE_HOURS_MS).toISOString()

  console.log('[chick_decay] Starting decay check', { thresholdIso, now: now.toISOString() })

  const { data: users, error } = await supabase
    .from('profiles')
    .select('id, chick_iq, chick_iq_last_decay_at, chick_fatigue, chick_emotion_state')
    .or(`chick_iq_last_decay_at.lte.${thresholdIso},chick_iq_last_decay_at.is.null`)

  if (error) {
    console.error('[chick_decay] Failed to fetch candidates:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  console.log(`[chick_decay] Found ${users?.length ?? 0} users eligible for decay`)

  let processed = 0
  let updated = 0
  let messages = 0
  const nowIso = now.toISOString()
  const decayLogs: Array<{ userId: string; beforeIq: number; afterIq: number }> = []

  for (const user of users ?? []) {
    processed += 1
    const currentIq = user.chick_iq ?? 0
    const nextIq = Math.max(currentIq - 1, 0)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        chick_iq: nextIq,
        chick_iq_last_decay_at: nowIso,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error(`[chick_decay] Update profile failed for user ${user.id}:`, updateError)
      continue
    }

    updated += 1
    decayLogs.push({ userId: user.id, beforeIq: currentIq, afterIq: nextIq })
    console.log(`[chick_decay] Decayed user ${user.id}: IQ ${currentIq} → ${nextIq}`)

    if (nextIq === 0) {
      const snapshot = {
        iq: nextIq,
        fatigue: user.chick_fatigue ?? 0,
        emotionState: (user.chick_emotion_state as string | null) ?? 'normal',
      }
      try {
        await insertS1Message(user, snapshot)
        messages += 1
        console.log(`[chick_decay] Sent S1 message to user ${user.id}`)
      } catch (msgError) {
        console.error(`[chick_decay] enqueue message failed for user ${user.id}:`, msgError)
      }
    }
  }

  const summary = {
    processed,
    updated,
    messages,
    checkedAfter: thresholdIso,
    executionTime: now.toISOString(),
    sampleLogs: decayLogs.slice(0, 5), // Log first 5 for monitoring
  }

  console.log('[chick_decay] Completed', summary)

  return new Response(JSON.stringify(summary), { headers: { 'Content-Type': 'application/json' } })
})

