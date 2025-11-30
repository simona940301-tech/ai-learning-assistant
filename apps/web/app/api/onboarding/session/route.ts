import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/onboarding/session
 * Get current user's onboarding session
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get latest in-progress session
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) {
      console.error('[OnboardingAPI] Failed to fetch session:', sessionError)
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
    }

    return NextResponse.json({ data: session })
  } catch (error) {
    console.error('[OnboardingAPI] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/onboarding/session
 * Create new onboarding session
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create new session
    const { data: session, error: createError } = await supabase
      .from('onboarding_sessions')
      .insert({
        user_id: user.id,
        current_step: 1,
        status: 'in_progress',
      })
      .select()
      .single()

    if (createError) {
      console.error('[OnboardingAPI] Failed to create session:', createError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ data: session })
  } catch (error) {
    console.error('[OnboardingAPI] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/onboarding/session
 * Update onboarding session
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { sessionId, updates } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Update session
    const { data: session, error: updateError } = await supabase
      .from('onboarding_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('[OnboardingAPI] Failed to update session:', updateError)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ data: session })
  } catch (error) {
    console.error('[OnboardingAPI] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
