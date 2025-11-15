import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientWithAccessToken } from '@/lib/supabase/server'

function getSupabaseClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim()
    if (token) {
      try {
        return createClientWithAccessToken(token)
      } catch (error) {
        console.error('[Backpack API] Failed to create Supabase client from Authorization header:', error)
      }
    }
  }
  return createClient()
}

export const dynamic = 'force-dynamic'

/**
 * GET /api/backpack
 *
 * Get user's backpack items
 * Requires authentication
 */
export async function GET(req: NextRequest) {
  try {
    // Log environment for debugging
    const isDev = process.env.NODE_ENV === 'development'
    console.log(`[Backpack API] Environment: ${process.env.NODE_ENV}, DEV_MODE: ${isDev}`)

    // Check if we're in mock mode (development)
    const USE_MOCK_USER = process.env.NODE_ENV === 'development' || process.env.PREVIEW_FORCE_MOCK === 'true'

    if (USE_MOCK_USER) {
      // In mock mode, return empty backpack for now
      // This avoids RLS issues with service role
      console.log('[Backpack API] Mock mode: returning empty backpack')
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
      // If client creation fails (e.g., due to JWT parsing), return 401
      console.error('[Backpack API] Failed to create Supabase client:', error)
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    // Check authentication
    let user
    let authError

    try {
      const authResult = await supabase.auth.getUser()
      user = authResult.data?.user
      authError = authResult.error
    } catch (error) {
      // Handle JWT parsing errors or other auth errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('[Backpack API] Auth error:', errorMessage)

      // Check if it's a JWT parsing error
      if (errorMessage.includes('JWT') || errorMessage.includes('token')) {
        // Return 401 for JWT errors
        return NextResponse.json(
          {
            error: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          { status: 401 }
        )
      }

      authError = error instanceof Error ? error : new Error('Authentication failed')
    }

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
    const type = searchParams.get('type')

    // Build query
    let query = supabase
      .from('backpack_items')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (subject) {
      query = query.eq('subject', subject)
    }
    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Backpack API] Error fetching items:', error)
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
      items: data || [],
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('[Backpack API] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


