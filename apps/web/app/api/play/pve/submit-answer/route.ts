import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { matchId, questionId, answer, isCorrect, timeRemaining, score } = body

        if (!matchId) {
            return NextResponse.json({ error: 'Match ID required' }, { status: 400 })
        }

        const supabase = getSupabaseClient(req)

        // Fire-and-forget logic: We don't await the DB insert to keep UI fast? 
        // Actually, this handler IS the background process from the client's perspective.
        // So we can await here.

        const { error } = await supabase
            .from('match_answers')
            .insert({
                match_id: matchId,
                question_id: questionId,
                user_answer: answer,
                is_correct: isCorrect,
                time_remaining: timeRemaining,
                score_awarded: score
            })

        // 🎯 Update User Answers for Ready Score (Dream School)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            // Estimate response time (default 30s limit if unknown)
            const responseTimeMs = Math.max(0, (30 - (timeRemaining || 0)) * 1000)

            await supabase.from('user_answers').insert({
                user_id: user.id,
                question_id: questionId,
                is_correct: isCorrect,
                metadata: {
                    subject: body.subject || 'english',
                    difficulty: body.difficulty || 3,
                    response_time_ms: responseTimeMs,
                    source: 'pve_match'
                }
            }).then(({ error }) => {
                if (error) console.error('[PVE Submit] user_answers insert failed:', error)
            })
        }

        if (error) {
            // Fallback: Update match_history's current score
            await supabase.rpc('increment_match_score', {
                match_id_input: matchId,
                score_delta: score
            })
        }

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('[PVE Submit] Error:', error)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
