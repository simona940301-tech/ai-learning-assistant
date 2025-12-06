import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { Api } from '@/lib/api/response'
import { getAvatarPreset } from '@/lib/avatar/presets'

export async function POST(request: NextRequest) {
  try {
    const { presetId, avatarTier } = await request.json()

    if (!presetId) {
      return NextResponse.json(
        { success: false, error: 'Missing presetId' },
        { status: 400 }
      )
    }

    // Get the current user (supports both cookie and bearer token auth)
    const { supabase, user, errorType } = await getApiUser(request)

    if (!user) {
      const message =
        errorType === 'invalid-jwt'
          ? '登入狀態失效，請重新登入'
          : 'Authentication required'
      return NextResponse.json(
        { success: false, error: message },
        { status: 401 }
      )
    }

    // Get the preset avatar
    const preset = getAvatarPreset(presetId)
    if (!preset) {
      return NextResponse.json(
        { success: false, error: 'Invalid preset ID' },
        { status: 400 }
      )
    }

    // Update the user's avatar with preset information
    // Support both avatar_url (legacy) and avatar_preset (new) fields
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: preset.imageUrl,
        avatar_preset: presetId,
        avatar_tier: avatarTier ?? 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[update-avatar] Database error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update avatar' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      avatarUrl: preset.imageUrl,
      presetId,
      avatarTier: avatarTier ?? 1,
    })

  } catch (error) {
    console.error('[update-avatar] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
