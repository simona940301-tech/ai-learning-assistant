import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'

const tiers = [
  { min: 0, label: 'Bronze' },
  { min: 900, label: 'Silver' },
  { min: 1100, label: 'Gold' },
  { min: 1300, label: 'Platinum' },
  { min: 1500, label: 'Diamond' },
]

function resolveTier(elo: number) {
  let tier = tiers[0].label
  for (const t of tiers) {
    if (elo >= t.min) tier = t.label
  }
  return tier
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseClient(req)
  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
  const page = Number(searchParams.get('page') || 0)
  const from = page * limit

  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,elo_rank,level')
    .order('elo_rank', { ascending: false })
    .range(from, from + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    entries: (data || []).map((row, index) => ({
      userId: row.id,
      username: row.username,
      elo: row.elo_rank || 0,
      tier: resolveTier(row.elo_rank || 0),
      level: row.level || 1,
      rank: from + index + 1,
    })),
    nextPage: data && data.length === limit ? page + 1 : null,
  })
}
