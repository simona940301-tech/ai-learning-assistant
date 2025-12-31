import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/onboarding/complete
 * Complete onboarding and grant rewards
 *
 * Body:
 * - sessionId: UUID (optional - will use latest if not provided)
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

    // Parse request body
    const body = await request.json()
    const { sessionId: providedSessionId } = body

    // Get session
    let sessionId = providedSessionId
    if (!sessionId) {
      const { data: session } = await supabase
        .from('onboarding_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!session) {
        return NextResponse.json({ error: 'No active session found' }, { status: 404 })
      }

      sessionId = session.id
    }

    // Update session status
    const { error: sessionError } = await supabase
      .from('onboarding_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id)

    if (sessionError) {
      console.error('[OnboardingCompleteAPI] Failed to update session:', sessionError)
      return NextResponse.json({ error: 'Failed to complete session' }, { status: 500 })
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('[OnboardingCompleteAPI] Failed to update profile:', profileError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    })
  } catch (error) {
    console.error('[OnboardingCompleteAPI] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
