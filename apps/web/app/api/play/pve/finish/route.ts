import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'
import { grantBattleFoodReward } from '@/lib/chick/rewards'

export async function POST(req: NextRequest) {
    // 🔍 TEST: Force immediate log to verify server logging works
    console.error('[PVE Finish] ========== API CALLED ==========')

    try {
        const body = await req.json()
        const { matchId, finalScore, winnerId, coinsEarned, participants } = body

        console.error('[PVE Finish] 📥 Received request:', {
            matchId,
            hasParticipants: !!participants,
            participantsLength: Array.isArray(participants) ? participants.length : 'not an array',
            participants: JSON.stringify(participants, null, 2)
        })

        if (!matchId) {
            console.error('[PVE Finish] ❌ No matchId provided')
            return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
        }

        const supabase = getSupabaseClient(req)

        // Update match history status
        console.log('[PVE Finish] 📝 Updating match history...')
        const { error } = await supabase
            .from('match_history')
            .update({
                player1_score: finalScore.player1,
                player2_score: finalScore.player2,
                winner_id: winnerId,
                status: 'COMPLETED',
                ended_at: new Date().toISOString(),
            })
            .eq('id', matchId)

        if (error) {
            console.error('[PVE Finish] ❌ DB Error updating match history:', error)
        } else {
            console.log('[PVE Finish] ✅ Match history updated successfully')
        }

        // 🎯 SOTA FIX: Apply Progression System (XP, Level, Streak, Badges)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            console.error('[PVE Finish] ❌ No authenticated user found')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log('[PVE Finish] 👤 User authenticated:', user.id)

        if (participants && Array.isArray(participants)) {
            console.log('[PVE Finish] ✅ Participants payload found, applying battle progression...')
            console.log('[PVE Finish] 📊 Participants data:', JSON.stringify(participants, null, 2))

            const debugInfo: Record<string, any> = {
                step: 'participants_found',
                participantsLength: participants.length,
                participantsData: participants
            }

            try {
                const { applyBattleProgression } = await import('@/lib/progression/service')

                // 🎯 Map CURRENT_USER to actual user ID
                const mappedParticipants = participants.map((p: any) => ({
                    ...p,
                    userId: p.userId === 'CURRENT_USER' ? user.id : p.userId
                }))

                debugInfo.step = 'calling_progression'
                debugInfo.mappedParticipants = mappedParticipants

                console.log('[PVE Finish] 🔄 Calling applyBattleProgression with:', {
                    matchId,
                    matchMode: 'PVE_TRAINING',
                    participantsCount: mappedParticipants.length,
                    mappedParticipants: JSON.stringify(mappedParticipants, null, 2)
                })

                const results = await applyBattleProgression(supabase, {
                    matchId,
                    matchMode: 'PVE_TRAINING',
                    participants: mappedParticipants,
                    endedAt: new Date().toISOString()
                })

                debugInfo.step = 'progression_complete'
                debugInfo.results = results

                console.log('[PVE Finish] ✅ Progression applied successfully!')
                console.log('[PVE Finish] 📈 Results:', JSON.stringify(results, null, 2))

                return NextResponse.json({
                    success: true,
                    progression: results,
                    debug: debugInfo  // 🔍 Add debug info to response
                })

            } catch (progressionError) {
                console.error('[PVE Finish] ❌ Progression Error:', progressionError)
                console.error('[PVE Finish] ❌ Error stack:', progressionError instanceof Error ? progressionError.stack : 'No stack trace')
                // Don't fail the request if progression calculation fails, just log it
                const errorInfo = {
                    step: 'progression_error',
                    error: progressionError instanceof Error ? progressionError.message : String(progressionError),
                    stack: progressionError instanceof Error ? progressionError.stack : undefined
                }

                return NextResponse.json({
                    success: false,
                    error: 'Progression calculation failed',
                    details: progressionError instanceof Error ? progressionError.message : String(progressionError),
                    debug: errorInfo  // 🔍 Add error debug info
                }, { status: 500 })
            }
        } else {
            console.warn('[PVE Finish] ⚠️ No participants payload provided, skipping progression')
            console.warn('[PVE Finish] ⚠️ Body received:', JSON.stringify(body, null, 2))

            const debugInfo = {
                step: 'no_participants',
                hasParticipants: !!participants,
                participantsType: typeof participants,
                isArray: Array.isArray(participants),
                bodyKeys: Object.keys(body)
            }

            return NextResponse.json({
                success: true,
                debug: debugInfo  // 🔍 Add debug info showing why participants missing
            })
        }

    } catch (error) {
        console.error('[PVE Finish] ❌ Unexpected Error:', error)
        console.error('[PVE Finish] ❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 })
    }
}

