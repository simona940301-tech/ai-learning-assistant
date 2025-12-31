import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export async function POST() {
    try {
        const { supabase, user } = await getApiUser()

        if (!user) {
            return NextResponse.json({ error: 'NO_USER' }, { status: 401 })
        }

        // Initialize chick fields for this user
        const { data, error } = await supabase
            .from('profiles')
            .update({
                chick_iq: 5,  // Range: 0-10, default: 5
                chick_fatigue: 0,
                chick_emotion_state: 'normal'
            })
            .eq('id', user.id)
            .select()
            .single()

        if (error) {
            return NextResponse.json({
                error: 'UPDATE_FAILED',
                details: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Chick fields initialized',
            profile: data
        })
    } catch (err) {
        return NextResponse.json({
            error: 'EXCEPTION',
            message: err instanceof Error ? err.message : String(err)
        }, { status: 500 })
    }
}
