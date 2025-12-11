import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { enqueueChickMessage } from '@/packages/server/chick'

export async function POST(req: Request) {
    const { supabase, user, errorType } = await getApiUser()
    if (!user) {
        const status = errorType === 'unauthenticated' ? 401 : 400
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
    }

    try {
        // 1. Check inventory
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('chick_food_bowls, chick_hunger, chick_intimacy, chick_iq, chick_fatigue, chick_emotion_state')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 500 })
        }

        if ((profile.chick_food_bowls || 0) < 1) {
            return NextResponse.json({ error: 'NO_FOOD' }, { status: 400 })
        }

        // 2. Calculate new stats
        const currentHunger = profile.chick_hunger || 50
        const newHunger = Math.max(0, currentHunger - 20) // Reduce hunger by 20
        const newBowls = (profile.chick_food_bowls || 0) - 1
        const newIntimacy = (profile.chick_intimacy || 0) + 5

        // 3. Update Profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                chick_hunger: newHunger,
                chick_food_bowls: newBowls,
                chick_intimacy: newIntimacy,
                chick_last_fed_at: new Date().toISOString(),
                chick_hunger_last_updated_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('[POST /api/chick/feed] Update error:', updateError)
            return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
        }

        // 4. Update daily mission progress (feed_chick)
        try {
            await supabase.rpc('update_mission_progress', {
                p_user_id: user.id,
                p_mission_type: 'feed_chick',
                p_increment: 1
            })
        } catch (missionError) {
            // Non-critical, just log
            console.warn('[POST /api/chick/feed] Failed to update mission:', missionError)
        }

        // 5. Trigger Chick Reaction (Message)
        // We can enqueue a message directly
        await enqueueChickMessage({
            userId: user.id,
            candidates: [{
                type: 'FEEDING_YUMMY', // We might need to add this type to types.ts or just use a generic one for now
                text: "我吃飽了，精神好多了，謝謝你！",
                stateSnapshot: {
                    iq: profile.chick_iq,
                    fatigue: profile.chick_fatigue,
                    emotionState: profile.chick_emotion_state
                }
            }],
            client: supabase,
            defaultSnapshot: {
                iq: profile.chick_iq,
                fatigue: profile.chick_fatigue,
                emotionState: profile.chick_emotion_state
            }
        })

        return NextResponse.json({
            success: true,
            newHunger,
            newBowls,
            newIntimacy
        })

    } catch (error) {
        console.error('[POST /api/chick/feed] Unexpected error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
