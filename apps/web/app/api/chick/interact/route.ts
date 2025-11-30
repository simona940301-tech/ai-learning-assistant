import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { enqueueChickMessage } from '@/packages/server/chick'
import { pickMessage } from '@/packages/server/chick/messages'
import type { ChickMessageType } from '@/packages/server/chick/types'

export async function POST(req: Request) {
    const { supabase, user, errorType } = await getApiUser()
    if (!user) {
        const status = errorType === 'unauthenticated' ? 401 : 400
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const action = body.action as 'poke' | 'check_streak' | 'battle_result' | 'idle_battle' | 'idle_review'
        const context = body.context || {}

        console.log('[POST /api/chick/interact] Action:', action, 'User:', user.id)

        if (!action) {
            return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 })
        }

        // Fetch profile for snapshot
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('chick_iq, chick_fatigue, chick_emotion_state, last_login_at')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('[POST /api/chick/interact] Load profile error:', profileError)
            return NextResponse.json({ error: 'PROFILE_NOT_FOUND', details: profileError.message }, { status: 500 })
        }

        console.log('[POST /api/chick/interact] Profile loaded:', profile)

        const snapshot = {
            iq: profile?.chick_iq ?? 0,
            fatigue: profile?.chick_fatigue ?? 0,
            emotionState: profile?.chick_emotion_state ?? 'normal',
        }

        let messageType: ChickMessageType | null = null
        let messageText: string | null = null

        if (action === 'poke') {
            // Context-aware poke
            const inBattle = context.inBattle || false
            const lastInteraction = context.lastInteraction || 0
            const timeSinceLastInteraction = Date.now() - lastInteraction

            // Debounce: if poked within 10 seconds, just toggle bubble (no new message)
            if (timeSinceLastInteraction < 10000) {
                return NextResponse.json({ ok: true, message: null, action: 'toggle' })
            }

            messageType = inBattle ? 'POKE_BUSY' : 'POKE_IDLE'
        } else if (action === 'idle_battle' || action === 'idle_review') {
            // Smart idle reminder: check state first
            const iq = snapshot.iq
            const fatigue = snapshot.fatigue
            const lastLogin = profile?.last_login_at ? new Date(profile.last_login_at) : null
            const daysSinceLogin = lastLogin ? (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24) : 999

            // Priority: S3 > S2 > S1 > idle messages
            if (daysSinceLogin > 2) {
                messageType = 'S3'
            } else if (fatigue >= 2) {
                messageType = 'S2'
            } else if (iq <= 3) {
                messageType = 'S1'
            } else {
                // No state issues, use idle message
                messageType = action === 'idle_battle' ? 'IDLE_ENCOURAGE_BATTLE' : 'IDLE_REVIEW_MISTAKES'
            }
        } else if (action === 'check_streak') {
            // Query progression table directly for streak
            try {
                const { data: progressionData, error: progressionError } = await supabase
                    .from('progression')
                    .select('streak_current')
                    .eq('user_id', user.id)
                    .single()

                if (!progressionError && progressionData) {
                    const streak = progressionData.streak_current ?? 0

                    if (streak > 0) {
                        messageType = 'STREAK'
                        const template = pickMessage('STREAK')
                        if (template) {
                            messageText = template.replace('{streak}', streak.toString())
                        }
                    } else {
                        // No streak, no message
                        return NextResponse.json({ ok: true, message: null })
                    }
                } else {
                    // If progression query fails, just skip streak message
                    console.log('[POST /api/chick/interact] No progression data or error:', progressionError)
                    return NextResponse.json({ ok: true, message: null })
                }
            } catch (err) {
                console.error('[POST /api/chick/interact] Failed to fetch progression:', err)
                return NextResponse.json({ ok: true, message: null })
            }
        } else if (action === 'battle_result') {
            const isVictory = context.isVictory || false
            messageType = isVictory ? 'BATTLE_VICTORY' : 'BATTLE_LEARNING'
        }

        if (!messageType) {
            return NextResponse.json({ ok: true, message: null })
        }

        const message = await enqueueChickMessage({
            userId: user.id,
            candidates: [{
                type: messageType,
                stateSnapshot: snapshot,
                text: messageText || undefined
            }],
            client: supabase,
            defaultSnapshot: snapshot,
        })

        return NextResponse.json({ ok: true, message })
    } catch (err) {
        console.error('[POST /api/chick/interact] Unexpected error:', err)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
