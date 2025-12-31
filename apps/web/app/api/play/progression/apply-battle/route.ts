import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseClient } from '@/lib/api/auth'
import { applyBattleProgression } from '@/lib/progression/service'
import { INTERNAL_API_HEADER } from '@/lib/progression/constants'

const ParticipantSchema = z.object({
  userId: z.string().uuid(),
  correctAnswers: z.number().int().min(0),
  answeredQuestions: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  didWin: z.boolean(),
  mode: z.enum(['PVE_TUTORIAL', 'PVE_TRAINING', 'PVE_CHALLENGE', 'PVP']),
  isPvp: z.boolean().optional(),
  isPerfectGame: z.boolean().optional(),
  xpMultiplierOverride: z.number().optional(),
})

const BattleProgressionSchema = z.object({
  matchId: z.string(),
  matchMode: z.enum(['PVE_TUTORIAL', 'PVE_TRAINING', 'PVE_CHALLENGE', 'PVP']),
  subject: z.string().optional(),
  endedAt: z.string().optional(),
  participants: z.array(ParticipantSchema).min(1),
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
  const parsed = BattleProgressionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const supabase = getSupabaseClient(req)
  const results = await applyBattleProgression(supabase, {
    ...parsed.data,
    endedAt: parsed.data.endedAt || new Date().toISOString(),
  })

  return NextResponse.json({
    success: true,
    results,
    timestamp: new Date().toISOString(),
  })
}
