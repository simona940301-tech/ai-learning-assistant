import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOptionsHandler } from '@/lib/api/cors'

export const OPTIONS = createOptionsHandler()

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/questions/upload
 * Upload questions to exam_question_bank (teacher only)
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        // Check teacher role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'teacher') {
            return NextResponse.json({ error: 'FORBIDDEN: Teacher only' }, { status: 403 })
        }

        // Parse request
        const { questions } = await req.json()
        if (!Array.isArray(questions) || questions.length === 0) {
            return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 })
        }

        // Insert questions
        const { data, error } = await supabase
            .from('exam_question_bank')
            .insert(
                questions.map(q => ({
                    question_text: q.question_text,
                    option_a: q.option_a,
                    option_b: q.option_b,
                    option_c: q.option_c,
                    option_d: q.option_d,
                    correct_answer: q.correct_answer,
                    explanation: q.explanation,
                    difficulty: q.difficulty,
                    topic_tags: [q.subject],
                    confidence_score: 1.0,
                    analysis_id: null
                }))
            )
            .select()

        if (error) {
            console.error('Upload error:', error)
            return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            count: data.length
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
