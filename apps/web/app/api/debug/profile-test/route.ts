import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export async function GET() {
    try {
        const { supabase, user, errorType } = await getApiUser()

        if (!user) {
            return NextResponse.json({
                error: 'NO_USER',
                errorType
            }, { status: 401 })
        }

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (profileError) {
            return NextResponse.json({
                error: 'PROFILE_ERROR',
                details: profileError.message,
                code: profileError.code,
                userId: user.id
            }, { status: 500 })
        }

        if (!profile) {
            return NextResponse.json({
                error: 'NO_PROFILE',
                userId: user.id,
                message: 'Profile not found for this user'
            }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            userId: user.id,
            profile: {
                chick_iq: profile.chick_iq,
                chick_fatigue: profile.chick_fatigue,
                chick_emotion_state: profile.chick_emotion_state,
            }
        })
    } catch (err) {
        return NextResponse.json({
            error: 'EXCEPTION',
            message: err instanceof Error ? err.message : String(err)
        }, { status: 500 })
    }
}
