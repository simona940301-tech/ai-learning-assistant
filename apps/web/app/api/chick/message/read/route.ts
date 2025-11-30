import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    const status = errorType === 'unauthenticated' ? 401 : 400
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
  }

  const body = await req.json().catch(() => null) as { id?: string } | null
  const messageId = body?.id

  if (!messageId) {
    return NextResponse.json({ error: 'INVALID_PAYLOAD', message: 'id is required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('chick_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 })
      }
      console.error('[POST /api/chick/message/read] Update error:', error)
      return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ ok: false, reason: 'not_found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/chick/message/read] Unexpected error:', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
