import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithAccessToken } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getSupabaseClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    if (token) {
      try {
        return createClientWithAccessToken(token)
      } catch (error) {
        console.error('[Error Book API] Failed to create Supabase client from Authorization header:', error)
      }
    }
  }
  return createClient()
}

/**
 * GET /api/error-book
 * 
 * Get user's error book items
 * Requires authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Check if we're in mock mode (development)
    const USE_MOCK_USER = process.env.NODE_ENV === 'development' || process.env.PREVIEW_FORCE_MOCK === 'true'

    if (USE_MOCK_USER) {
      // In mock mode, return empty error book for now
      // This avoids RLS issues with service role
      console.log('[Error Book API] Mock mode: returning empty error book')
      return NextResponse.json({
        success: true,
        items: [],
        count: 0,
      })
    }

    let supabase
    try {
      supabase = getSupabaseClient(req)
    } catch (error) {
      console.error('[Error Book API] Failed to create Supabase client:', error)
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const subject = searchParams.get('subject')
    const status = searchParams.get('status') || 'active' // active, mastered, all

    // Build query
    let query = supabase
      .from('error_book')
      .select(`
        id,
        question_id,
        user_id,
        status,
        last_attempted_at,
        created_at,
        pack_questions (
          id,
          stem,
          choices,
          answer,
          explanation,
          difficulty
        ),
        packs (
          id,
          subject,
          skill
        )
      `)
      .eq('user_id', user.id)

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Order by last attempted (oldest first for spaced repetition)
    query = query.order('last_attempted_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('[Error Book API] Error fetching items:', error)
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: error.message,
        },
        { status: 500 }
      )
    }

    // Filter by subject if provided
    let filteredData = data || []
    if (subject && data) {
      filteredData = data.filter((item: any) => item.packs?.subject === subject)
    }

    return NextResponse.json({
      success: true,
      items: filteredData,
      count: filteredData.length,
    })
  } catch (error) {
    console.error('[Error Book API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/error-book
 * 
 * Add error to error book
 * Requires authentication
 */
export async function POST(req: NextRequest) {
  try {
    // Check if we're in mock mode (development)
    const USE_MOCK_USER = process.env.NODE_ENV === 'development' || process.env.PREVIEW_FORCE_MOCK === 'true'

    if (USE_MOCK_USER) {
      // In mock mode, simulate successful error book addition
      console.log('[Error Book API] Mock mode: simulating error book addition')
      const body = await req.json()
      const { questionId } = body
      return NextResponse.json({
        success: true,
        item: { id: 'mock-error-book-id', questionId },
        message: 'Error added to error book',
      })
    }

    let supabase
    try {
      supabase = getSupabaseClient(req)
    } catch (error) {
      console.error('[Error Book API] Failed to create Supabase client:', error)
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { questionId } = body

    if (!questionId) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'questionId is required',
        },
        { status: 400 }
      )
    }

    // Check if error already exists
    const { data: existing } = await supabase
      .from('error_book')
      .select('id')
      .eq('user_id', user.id)
      .eq('question_id', questionId)
      .eq('status', 'active')
      .single()

    if (existing) {
      // Update last_attempted_at
      const { error: updateError } = await supabase
        .from('error_book')
        .update({ last_attempted_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        item: { id: existing.id, questionId },
        message: 'Error book entry updated',
      })
    }

    // Create new error book entry
    const { data, error } = await supabase
      .from('error_book')
      .insert({
        user_id: user.id,
        question_id: questionId,
        status: 'active',
        last_attempted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[Error Book API] Error creating entry:', error)
      return NextResponse.json(
        {
          error: 'DATABASE_ERROR',
          message: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data,
      message: 'Error added to error book',
    })
  } catch (error) {
    console.error('[Error Book API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


