import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/play/user/consume-energy
 * 
 * Consume 1 daily energy for battle
 * Returns success/failure based on available energy
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString(),
        },
        { status: 401 }
      )
    }

    // Get current energy (with lazy-reset)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('daily_energy, daily_energy_reset_at')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Check if reset needed
    const nowUtc = new Date()
    const resetTimeUtc = new Date(profile.daily_energy_reset_at)
    
    let currentEnergy = profile.daily_energy || 8
    let resetAt = profile.daily_energy_reset_at

    if (nowUtc >= resetTimeUtc) {
      // Reset first
      const nextResetTime = getNextResetTime()
      currentEnergy = 8
      resetAt = nextResetTime.toISOString()
      
      await supabase
        .from('profiles')
        .update({
          daily_energy: 8,
          daily_energy_reset_at: resetAt,
        })
        .eq('id', user.id)
    }

    // Check if energy available
    if (currentEnergy <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INSUFFICIENT_ENERGY', message: 'Daily energy exhausted' },
          dailyEnergyCount: 0,
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }

    // Consume energy
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        daily_energy: currentEnergy - 1,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[Consume Energy] Update error:', updateError)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UPDATE_FAILED', message: 'Failed to consume energy' },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      dailyEnergyCount: currentEnergy - 1,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Consume Energy] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

function getNextResetTime(): Date {
  const now = new Date()
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  taipeiTime.setHours(4, 0, 0, 0)
  if (taipeiTime <= now) {
    taipeiTime.setDate(taipeiTime.getDate() + 1)
  }
  const utcOffset = now.getTime() - now.getTimezoneOffset() * 60000
  const taipeiOffset = taipeiTime.getTime() - new Date(taipeiTime.toLocaleString('en-US', { timeZone: 'Asia/Taipei' })).getTime()
  return new Date(taipeiTime.getTime() - taipeiOffset)
}

