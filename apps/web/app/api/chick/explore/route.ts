import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { enqueueChickMessage } from '@/packages/server/chick'

export async function POST(req: NextRequest) {
    const { supabase, user, errorType } = await getApiUser(req)
    if (!user) {
        const status = errorType === 'unauthenticated' ? 401 : 400
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const action = body.action // 'start' | 'claim'

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('coins, user_wallet_balance, chick_exploration_start_at, chick_exploration_allowance, chick_iq, chick_fatigue, chick_emotion_state')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 500 })
        }

        if (action === 'start') {
            const allowance = body.allowance || 0

            if (profile.chick_exploration_start_at) {
                return NextResponse.json({ error: 'ALREADY_EXPLORING' }, { status: 400 })
            }

            // Check both coins and user_wallet_balance for compatibility
            const currentBalance = profile.coins ?? profile.user_wallet_balance ?? 0
            if (currentBalance < allowance) {
                return NextResponse.json({ error: 'INSUFFICIENT_FUNDS' }, { status: 400 })
            }

            // Start exploration - update both coins and user_wallet_balance
            const newBalance = currentBalance - allowance
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    chick_exploration_start_at: new Date().toISOString(),
                    chick_exploration_allowance: allowance,
                    coins: newBalance,
                    user_wallet_balance: newBalance
                })
                .eq('id', user.id)

            if (updateError) {
                return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
            }

            return NextResponse.json({ success: true, status: 'EXPLORING', newBalance })

        } else if (action === 'claim') {
            if (!profile.chick_exploration_start_at) {
                return NextResponse.json({ error: 'NOT_EXPLORING' }, { status: 400 })
            }

            const startTime = new Date(profile.chick_exploration_start_at)
            const now = new Date()
            const durationHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60)

            // Minimum 1 minute for testing, usually 2 hours
            if (durationHours < 0.01) {
                return NextResponse.json({ error: 'TOO_SOON' }, { status: 400 })
            }

            // Calculate Rewards
            const allowance = profile.chick_exploration_allowance || 0

            // XP Formula: Base 50 + (Allowance * 0.5) + (Duration * 10)
            const xpGained = Math.floor(50 + (allowance * 0.5) + (durationHours * 10))

            // Gifts (Simulated)
            const gifts = []
            if (allowance > 100) {
                gifts.push('Small Gift')
            }
            if (allowance > 500 && Math.random() > 0.5) {
                gifts.push('Rare Handout')
            }

            // Reset Exploration Status
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    chick_exploration_start_at: null,
                    chick_exploration_allowance: 0,
                    // Add XP logic here if we had an XP column, for now we just return it
                    // In a real app, we would update the XP column
                })
                .eq('id', user.id)

            if (updateError) {
                return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
            }

            // Send Message (non-blocking - don't fail if message fails)
            try {
                await enqueueChickMessage({
                    userId: user.id,
                    candidates: [{
                        type: 'EXPLORATION_RETURN',
                        text: `我回來了！我用 ${allowance} 金幣去圖書館學習，學到了很多！(+${xpGained} XP)`,
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
            } catch (messageError) {
                console.error('[POST /api/chick/explore] Failed to send message:', messageError)
                // Don't fail the claim operation if message fails
            }

            return NextResponse.json({
                success: true,
                xpGained,
                gifts
            })
        }

        return NextResponse.json({ error: 'INVALID_ACTION' }, { status: 400 })

    } catch (error) {
        console.error('[POST /api/chick/explore] Unexpected error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
