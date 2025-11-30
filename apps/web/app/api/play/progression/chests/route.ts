import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getApiUser } from '@/lib/api/auth'
import { levelForXp } from '@/lib/progression'

const OpenChestSchema = z.object({
  chestId: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    return NextResponse.json({ error: errorType }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'UNOPENED'

  const { data, error } = await supabase
    .from('battle_chests')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', status)
    .order('granted_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    chests: data || [],
  })
}

export async function POST(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    return NextResponse.json({ error: errorType }, { status: 401 })
  }

  const json = await req.json()
  const parsed = OpenChestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_REQUEST' }, { status: 400 })
  }

  const { chestId } = parsed.data
  const { data: chest, error: fetchError } = await supabase
    .from('battle_chests')
    .select('*')
    .eq('id', chestId)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !chest) {
    return NextResponse.json({ error: 'CHEST_NOT_FOUND' }, { status: 404 })
  }

  if (chest.status !== 'UNOPENED') {
    return NextResponse.json({ error: 'ALREADY_OPENED' }, { status: 400 })
  }

  const rewards = chest.rewards || {}
  const xpDelta = Number(rewards.xp || 0)
  const goldDelta = Number(rewards.gold || 0)
  const buff = rewards.buff

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('xp,level,coins')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 404 })
  }

  const newXp = (profile.xp || 0) + xpDelta
  const levelInfo = levelForXp(newXp)
  const newCoins = (profile.coins || 0) + goldDelta

  await supabase
    .from('battle_chests')
    .update({
      status: 'OPENED',
      xp_delta: xpDelta,
      gold_delta: goldDelta,
      opened_at: new Date().toISOString(),
    })
    .eq('id', chestId)

  await supabase
    .from('profiles')
    .update({ xp: newXp, level: levelInfo.level, coins: newCoins })
    .eq('id', user.id)

  if (buff?.multiplier && buff?.hours) {
    const expires = new Date()
    expires.setHours(expires.getHours() + buff.hours)
    await supabase
      .from('battle_progression_state')
      .update({
        xp_multiplier: buff.multiplier,
        xp_multiplier_expires_at: expires.toISOString(),
      })
      .eq('user_id', user.id)
  }

  return NextResponse.json({
    success: true,
    rewards: {
      xp: xpDelta,
      gold: goldDelta,
      buff: buff || null,
    },
    level: levelInfo.level,
    totalXp: newXp,
    coins: newCoins,
  })
}
