import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { matchId, finalScore, winnerId, coinsEarned } = body

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
        }

        const supabase = getSupabaseClient(req)

        // Update match history
        const { error } = await supabase
            .from('match_history')
            .update({
                player1_score: finalScore.player1,
                player2_score: finalScore.player2,
                winner_id: winnerId,
                status: 'COMPLETED',
                ended_at: new Date().toISOString(),
                // coins_earned: coinsEarned // If schema supports it
            })
            .eq('id', matchId)

        if (error) {
            console.error('[PVE Finish] DB Error:', error)
            // Non-blocking error for client
        }

        // Award coins/ELO transaction logic could go here or be a separate RPC
        // For now, assuming simple update

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[PVE Finish] Error:', error)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
