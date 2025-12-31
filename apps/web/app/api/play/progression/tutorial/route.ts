import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/api/auth'
import { INTERNAL_API_HEADER } from '@/lib/progression/constants'

const TutorialSchema = z.object({
  userId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const apiKey =
    req.headers.get(INTERNAL_API_HEADER) ||
    req.headers.get('authorization')?.replace('Bearer ', '')
  const expectedApiKey = process.env.INTERNAL_API_KEY || process.env.BATTLE_EVENTS_API_KEY
  if (expectedApiKey && apiKey !== expectedApiKey) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = TutorialSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const supabase = getSupabaseClient(req)
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_matches,tutorial_completed_at')
    .eq('id', parsed.data.userId)
    .maybeSingle()

  const shouldStart =
    !profile?.tutorial_completed_at && (!profile?.total_matches || profile.total_matches === 0)

  if (shouldStart) {
    await supabase
      .from('battle_progression_state')
      .upsert({ user_id: parsed.data.userId, tutorial_forced: true }, { onConflict: 'user_id' })
  }

  return NextResponse.json({
    success: true,
    shouldStartTutorial: shouldStart,
  })
}
