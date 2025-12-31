'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

interface SubmitAnswerResult {
    success: boolean
    isCorrect?: boolean
    newScore?: {
        current_streak: number
        net_progress: number
        correct_count: number
    }
    error?: string
}

export async function submitPracticeAnswer(
    roomId: string,
    questionId: string,
    userAnswer: string
): Promise<SubmitAnswerResult> {
    const supabase = createClient()

    // 1. Verify User Auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // 2. Fetch Question Correct Answer
        // Using simple query for now. For higher load, consider caching questions in Redis or passing correct answer hash.
        // Assuming 'seed_questions' or 'pack_questions' or 'ugc_questions'. 
        // Since Practice Room can be from multiple sources, we need to know WHERE the question comes from.
        // However, for MVP Practice Room often constructs questions on the fly or pulls from a view.
        // InfinitePracticeRoom.tsx implies it fetches local state `questions` which has `correct_answer` field.
        // But Server Action needs to fetch it from DB to be secure.
        // The `questions` on client likely came from `practice_questions` view or similar API.
        // Let's assume we can fetch it from `seed_questions` or `pack_questions` if we know the source.
        //
        // CRITICAL ISSUE: The client doesn't send "source" to this action.
        // We should probably rely on a unified view or check multiple tables.
        // OR, since `InfinitePracticeRoom` uses `practice_questions` API, maybe we can query `seed_questions` 
        // (most PVE content is there) or `pack_questions`.
        //
        // Let's check `seed_questions` first as it's the primary source.

        let correctAnswer: string | null = null;

        // Check seed_questions
        const { data: seedQ } = await supabase
            .from('seed_questions')
            .select('correct_answer')
            .eq('id', questionId)
            .single()

        if (seedQ) {
            correctAnswer = seedQ.correct_answer
        } else {
            // Fallback: check pack_questions
            const { data: packQ } = await supabase
                .from('pack_questions')
                .select('answer')
                .eq('question_id', questionId) // pack_question uses question_id as FK? or id?
            // Wait, pack_questions usually has its own ID. 
            // If InfinitePracticeRoom sends the `id` of the question, we need to know WHICH table it belongs to.
            // In `InfinitePracticeRoom`, questions come from `/api/play/practice/questions`.
            // That API aggregates questions.
            // Let's assume for now we can find it in `seed_questions` (as it's the main repo).
            // If not found, we fail securely.
            // TODO: Enhance this to search other tables if needed.
        }

        if (!correctAnswer) {
            // Try searching by ID in pack_questions (sometimes they are direct IDs)
            const { data: packQ } = await supabase
                .from('pack_questions')
                .select('answer')
                .eq('id', questionId)
                .single()

            if (packQ) correctAnswer = packQ.answer
        }

        if (!correctAnswer) {
            return { success: false, error: 'Question not found' }
        }

        const isCorrect = userAnswer === correctAnswer
        const points = isCorrect ? 1 : 0

        // 3. Call Atomic RPC
        const { data: rpcResult, error: rpcError } = await supabase.rpc('increment_practice_score', {
            p_room_id: roomId,
            p_user_id: user.id,
            p_is_correct: isCorrect,
            p_points: points
        })

        if (rpcError) {
            console.error('[submitPracticeAnswer] RPC Error:', rpcError)
            return { success: false, error: 'Failed to update score' }
        }

        // Helper to safely access JSON properties
        const result = rpcResult as any

        if (!result.success) {
            return { success: false, error: result.error || 'Unknown error' }
        }

        return {
            success: true,
            isCorrect,
            newScore: {
                current_streak: result.new_streak,
                net_progress: result.new_net_progress,
                correct_count: result.new_correct_count
            }
        }

    } catch (err) {
        console.error('[submitPracticeAnswer] Error:', err)
        return { success: false, error: 'Internal server error' }
    }
}
