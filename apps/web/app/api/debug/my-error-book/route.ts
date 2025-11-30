import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase'

// This is a DEBUG endpoint for development only
// Remove this endpoint in production
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient()
    const { searchParams } = new URL(req.url)
    const fallbackUserId =
      searchParams.get('userId') ||
      process.env.NEXT_PUBLIC_DEV_USER_ID ||
      'e770f9cd-52a7-43de-b983-70f6f78d2f53'

    // Get user's error book entries
    const { data, error } = await supabase
      .from('error_book')
      .select(`
        id,
        question_id,
        status,
        last_attempted_at,
        created_at,
        pack_questions (
          id,
          stem,
          answer,
          explanation
        )
      `)
      .eq('user_id', fallbackUserId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user_id: fallbackUserId,
      error_book_count: data?.length || 0,
      items: data || [],
      debug_info: {
        endpoint: '/api/debug/my-error-book',
        purpose: 'Development debugging - shows user error book entries',
        remove_in_production: true
      }
    })
  } catch (error) {
    console.error('[Debug Error Book API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
