import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/play/user/status
 * 
 * Get user battle status including dailyEnergy and wallet balance
 * Auto-resets dailyEnergy if reset time has passed (UTC+8 04:00)
 */
export async function GET(req: NextRequest) {
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

    // Get user profile with lazy-reset logic
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('daily_energy, daily_energy_reset_at, coins, elo_rank')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      // In development mode, auto-create profile for dev user
      const isDev = process.env.NODE_ENV === 'development'
      const isDevUser = user.id === 'e770f9cd-52a7-43de-b983-70f6f78d2f53'

      if (isDev && isDevUser && profileError?.code === 'PGRST116') {
        console.log('[Play User Status] Auto-creating dev profile...')

        const nextResetTime = getNextResetTime()
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name: 'Dev User',
            daily_energy: 8,
            daily_energy_reset_at: nextResetTime.toISOString(),
            coins: 1000,
            elo_rank: 1000,
          })
          .select('daily_energy, daily_energy_reset_at, coins, elo_rank')
          .single()

        if (createError || !newProfile) {
          console.error('[Play User Status] Failed to create dev profile:', createError)
          return NextResponse.json(
            {
              success: false,
              error: { code: 'PROFILE_CREATE_FAILED', message: 'Failed to create dev profile' },
              timestamp: new Date().toISOString(),
            },
            { status: 500 }
          )
        }

        console.log('[Play User Status] Dev profile created successfully')
        return NextResponse.json({
          success: true,
          dailyEnergyCount: newProfile.daily_energy || 8,
          walletBalance: newProfile.coins || 0,
          eloRank: newProfile.elo_rank || 1000,
          dailyEnergyResetAt: newProfile.daily_energy_reset_at,
          timestamp: new Date().toISOString(),
        })
      }

      console.error('[Play User Status] Profile error:', profileError)
      return NextResponse.json(
        {
          success: false,
          error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      )
    }

    // Lazy-reset: Check if dailyEnergy needs reset
    const nowUtc = new Date()
    const resetTimeUtc = new Date(profile.daily_energy_reset_at)
    
    let dailyEnergy = profile.daily_energy || 8
    let dailyEnergyResetAt = profile.daily_energy_reset_at

    if (nowUtc >= resetTimeUtc) {
      // Reset needed: Update in database
      const nextResetTime = getNextResetTime()
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          daily_energy: 8,
          daily_energy_reset_at: nextResetTime.toISOString(),
        })
        .eq('id', user.id)

      if (!updateError) {
        dailyEnergy = 8
        dailyEnergyResetAt = nextResetTime.toISOString()
      } else {
        console.error('[Play User Status] Failed to reset daily energy:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      dailyEnergyCount: dailyEnergy,
      walletBalance: profile.coins || 0,
      eloRank: profile.elo_rank || 1000,
      dailyEnergyResetAt,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Play User Status] Error:', error)
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

/**
 * Calculate next reset time (UTC+8 04:00)
 * Returns UTC timestamp
 */
function getNextResetTime(): Date {
  const now = new Date()
  const taipeiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  
  // Set to 04:00 today
  taipeiTime.setHours(4, 0, 0, 0)
  
  // If already past 04:00 today, set to 04:00 tomorrow
  if (taipeiTime <= now) {
    taipeiTime.setDate(taipeiTime.getDate() + 1)
  }
  
  // Convert back to UTC
  const utcOffset = now.getTime() - now.getTimezoneOffset() * 60000
  const taipeiOffset = taipeiTime.getTime() - new Date(taipeiTime.toLocaleString('en-US', { timeZone: 'Asia/Taipei' })).getTime()
  
  return new Date(taipeiTime.getTime() - taipeiOffset)
}

