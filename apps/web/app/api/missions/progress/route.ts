import { createClient } from '@/lib/supabase/server'

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/missions/progress
 * Update mission progress when user completes activities
 * Body: { mission_type: 'play_battle' | 'feed_chick' | 'win_battle' | 'review_error', increment?: number }
 */
export async function POST(request: Request) {
    try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { mission_type, increment = 1 } = await request.json()

        if (!mission_type) {
            return NextResponse.json({ error: 'mission_type is required' }, { status: 400 })
        }

        // Get current state before update
        const { data: beforeData } = await supabase
            .from('daily_missions')
            .select('missions')
            .eq('user_id', user.id)
            .eq('mission_date', new Date().toISOString().split('T')[0])
            .single()

        const missionsBefore = beforeData?.missions || []

        // Call the database function to update progress
        const { data, error } = await supabase.rpc('update_mission_progress', {
            p_user_id: user.id,
            p_mission_type: mission_type,
            p_increment: increment
        })

        if (error) {
            console.error('Error updating mission progress:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Detect newly completed missions
        const missionsAfter = data || []
        const newly_completed: string[] = []

        missionsAfter.forEach((missionAfter: any) => {
            const missionBefore = missionsBefore.find((m: any) => m.id === missionAfter.id)
            if (missionAfter.is_completed && missionBefore && !missionBefore.is_completed) {
                newly_completed.push(missionAfter.id)
            }
        })

        // Check if all missions are now completed
        const all_completed = missionsAfter.every((m: any) => m.is_completed)

        return NextResponse.json({
            success: true,
            missions: data,
            newly_completed,
            all_completed
        })
    } catch (error) {
        console.error('Internal error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
