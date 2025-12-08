import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/api/auth'
import { fetchPveQuestions } from '@/lib/api/pve-helpers'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { userId, subject, timeLimit = 20 } = body

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        const supabase = getSupabaseClient(req)

        // 1. Fetch Questions
        const { questions: rawQuestions, baselineDifficulty } = await fetchPveQuestions(supabase, {
            userId,
            subject,
            numQuestions: 10, // Default 10 questions for PVE
        })

        // 2. Format Questions
        // 🎯 SOTA FIX: Type assertion to use strict DBQuestionRow type
        const questions = (rawQuestions as any[]).map(q => {
            const options = [
                q.option_a,
                q.option_b,
                q.option_c,
                q.option_d,
                ...(q.options || [])
            ].filter((opt): opt is string => opt && String(opt).trim().length > 0)

            const uniqueOptions = Array.from(new Set(options));

            return {
                id: String(q.id),
                question_text: (q.question_text || '').trim(),
                options: uniqueOptions.length >= 2 ? uniqueOptions : options,
                correct_answer: q.correct_answer || 'A',
                difficulty: q.difficulty_level || q.difficulty || 3,
                time_limit: timeLimit,
                skill_tags: q.skill_tags || q.knowledge_tags || [],
            }
        }).filter(q => q.question_text.length > 0 && q.options.length >= 2)

        if (questions.length === 0) {
            return NextResponse.json({ error: 'No questions available' }, { status: 500 })
        }

        // 3. Create Match in DB
        const { data: match, error } = await supabase
            .from('match_history')
            .insert({
                match_type: 'PVE_TRAINING',
                player1_id: userId,
                player2_id: null, // AI opponent
                player1_score: 0,
                player2_score: 0,
                question_list: questions,
                started_at: new Date().toISOString(),
                duration_seconds: 0
            })
            .select()
            .single()

        if (error) {
            console.error('[PVE Start] DB Insert Error:', error)
            return NextResponse.json({ error: 'Failed to create match' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            matchId: match.id,
            questions,
            baselineDifficulty
        })

    } catch (error: any) {
        console.error('[PVE Start] Handler Error:', error)
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
    }
}
