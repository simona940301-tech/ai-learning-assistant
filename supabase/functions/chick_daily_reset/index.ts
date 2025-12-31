// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.3'
import { pickMessage } from '../../packages/server/chick/messages.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for chick_daily_reset')
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: { headers: { 'x-chick-function': 'chick_daily_reset' } },
})

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

async function insertPositiveMessage(userId: string, snapshot: any) {
  const text = pickMessage('POSITIVE')
  if (!text) return
  const { error } = await supabase.from('chick_messages').insert({
    user_id: userId,
    type: 'POSITIVE',
    text,
    state_snapshot: snapshot,
  })
  if (error) throw error
  await pruneMessages(userId)
}

serve(async _req => {
  const now = new Date()
  const nowIso = now.toISOString()

  console.log('[chick_daily_reset] Starting daily reset', { executionTime: nowIso })

  // Fetch users before reset to log state
  const { data: usersBeforeReset, error: fetchBeforeError } = await supabase
    .from('profiles')
    .select('id, chick_explanations_used, chick_soothe_used, chick_fatigue_battle_counter, chick_fatigue')
    .limit(100) // Sample for logging

  if (!fetchBeforeError && usersBeforeReset) {
    const sampleState = usersBeforeReset[0]
    console.log('[chick_daily_reset] Sample state before reset:', {
      userId: sampleState?.id,
      explanationsUsed: sampleState?.chick_explanations_used,
      sootheUsed: sampleState?.chick_soothe_used,
      battleCounter: sampleState?.chick_fatigue_battle_counter,
      fatigue: sampleState?.chick_fatigue,
    })
  }

  // Reset counters for everyone
  const { data: resetResult, error: resetError } = await supabase
    .from('profiles')
    .update({
      chick_explanations_used: 0,
      chick_soothe_used: 0,
      chick_fatigue_battle_counter: 0,
      chick_explanations_reset_at: nowIso,
      chick_soothe_reset_at: nowIso,
    })
    .select('id')
    .limit(1)

  if (resetError) {
    console.error('[chick_daily_reset] Reset failed:', resetError)
    return new Response(JSON.stringify({ error: resetError.message }), { status: 500 })
  }

  console.log('[chick_daily_reset] Reset completed', {
    sampleUserId: resetResult?.[0]?.id,
    resetTime: nowIso,
  })

  // Fetch users for optional greeting
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id, chick_iq, chick_fatigue, chick_emotion_state')

  if (userError) {
    console.error('[chick_daily_reset] Fetch users for greeting failed:', userError)
    return new Response(JSON.stringify({ reset: 'ok', greetError: userError.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let greeted = 0
  const greetingLogs: Array<{ userId: string; iq: number; fatigue: number }> = []

  for (const user of users ?? []) {
    const snapshot = {
      iq: user.chick_iq ?? 0,
      fatigue: user.chick_fatigue ?? 0,
      emotionState: (user.chick_emotion_state as string | null) ?? 'normal',
    }
    try {
      await insertPositiveMessage(user.id, snapshot)
      greeted += 1
      if (greetingLogs.length < 5) {
        greetingLogs.push({ userId: user.id, iq: snapshot.iq, fatigue: snapshot.fatigue })
      }
    } catch (msgError) {
      console.error(`[chick_daily_reset] enqueue message failed for user ${user.id}:`, msgError)
    }
  }

  const summary = {
    reset: 'ok',
    greeted,
    totalUsers: users?.length ?? 0,
    executionTime: nowIso,
    sampleGreetings: greetingLogs,
  }

  console.log('[chick_daily_reset] Completed', summary)

  return new Response(JSON.stringify(summary), {
    headers: { 'Content-Type': 'application/json' },
  })
})

