import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/play/practice/save-error
 * Save a wrong answer from practice mode to error_book
 */
export async function POST(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
        }

        const body = await req.json()
        const { questionId, questionText, options, correctAnswer, userAnswer, roomId } = body

        if (!questionId || !questionText) {
            return NextResponse.json({ error: 'MISSING_DATA' }, { status: 400 })
        }

        // 1. Resolve Question ID to Pack Question ID
        // This ensures compatibility with the Error Book system which relies on pack_questions
        let finalQuestionId = questionId

        // Check if it's already a pack_question
        const { data: isPackQ } = await supabase
            .from('pack_questions')
            .select('id')
            .eq('id', questionId)
            .maybeSingle()

        if (!isPackQ) {
            // Check if it's from exam_question_bank
            const { data: examQ } = await supabase
                .from('exam_question_bank')
                .select('*')
                .eq('id', questionId)
                .maybeSingle()

            if (examQ) {
                // Sync to pack_questions
                // Find or create a "Practice Bank" pack
                let { data: practicePack } = await supabase
                    .from('packs')
                    .select('id')
                    .eq('name', 'Infinite Practice Bank')
                    .maybeSingle()

                if (!practicePack) {
                    const { data: newPack } = await supabase
                        .from('packs')
                        .insert({
                            name: 'Infinite Practice Bank',
                            subject: 'general',
                            skill: 'mixed',
                            difficulty: 3,
                            description: 'Auto-generated pack for Infinite Practice questions',
                            is_public: false
                        })
                        .select('id')
                        .single()
                    practicePack = newPack
                }

                if (practicePack) {
                    // Create pack_question
                    const { data: newPackQ } = await supabase
                        .from('pack_questions')
                        .insert({
                            pack_id: practicePack.id,
                            question_id: examQ.id, // Link back to original if needed, or just use as reference
                            stem: examQ.question_text,
                            choices: [examQ.option_a, examQ.option_b, examQ.option_c, examQ.option_d],
                            answer: examQ.correct_answer,
                            explanation: examQ.explanation,
                            difficulty: examQ.difficulty || 3
                        })
                        .select('id')
                        .single()

                    if (newPackQ) {
                        finalQuestionId = newPackQ.id
                    }
                }
            }
        }

        // Upsert into error_book using the resolved ID
        const { data: existing } = await supabase
            .from('error_book')
            .select('id, attempt_count')
            .eq('user_id', user.id)
            .eq('question_id', finalQuestionId)
            .maybeSingle()

        if (!existing) {
            const { error: insertError } = await supabase
                .from('error_book')
                .insert({
                    user_id: user.id,
                    question_id: finalQuestionId,
                    status: 'active',
                    pack_id: null,
                    first_attempted_at: new Date().toISOString(),
                    last_attempted_at: new Date().toISOString(),
                    attempt_count: 1,
                    notes: {
                        source: 'practice',
                        room_id: roomId || null,
                        question_preview: questionText,
                        user_answer: userAnswer,
                        correct_answer: correctAnswer,
                        options,
                        original_question_id: questionId // Keep track of original ID
                    },
                })
                .single()

            if (insertError) {
                console.error('Save practice error: insert failed', insertError)
                return NextResponse.json({ error: 'FAILED_SAVE_ERROR_BOOK' }, { status: 500 })
            }
        } else {
            const { error: updateError } = await supabase
                .from('error_book')
                .update({
                    last_attempted_at: new Date().toISOString(),
                    attempt_count: (existing.attempt_count || 0) + 1,
                    status: 'active' // Reactivate if it was mastered
                })
                .eq('id', existing.id)

            if (updateError) {
                console.error('Save practice error: update failed', updateError)
                return NextResponse.json({ error: 'FAILED_UPDATE_ERROR_BOOK' }, { status: 500 })
            }
        }

        return NextResponse.json({
            success: true,
            message: '已加入錯題本'
        })
    } catch (error) {
        console.error('Save practice error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
