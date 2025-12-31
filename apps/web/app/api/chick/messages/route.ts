import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  const { searchParams } = new URL(req.url)
  const limitParam = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 20) : 20

  try {
    const { data, error } = await supabase
      .from('chick_messages')
      .select('id, type, text, state_snapshot, created_at, read_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[GET /api/chick/messages] Query error:', error)
      return NextResponse.json({ error: 'QUERY_FAILED' }, { status: 500 })
    }

    const messages = (data ?? []).map(msg => ({
      id: msg.id,
      type: msg.type,
      text: msg.text,
      stateSnapshot: msg.state_snapshot,
      createdAt: msg.created_at,
      readAt: msg.read_at,
    }))

    return NextResponse.json({ messages })
  } catch (err) {
    console.error('[GET /api/chick/messages] Unexpected error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
