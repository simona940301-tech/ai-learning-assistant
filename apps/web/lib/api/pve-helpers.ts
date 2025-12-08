import { SupabaseClient } from '@supabase/supabase-js'

// 🎯 SOTA FIX: Strict DB Row Type (ensures option_a/b/c/d exist)
export interface DBQuestionRow {
    id: string
    question_text: string
    option_a: string  // Required in DB schema
    option_b: string  // Required in DB schema
    option_c: string  // Required in DB schema
    option_d: string  // Required in DB schema
    correct_answer: string
    difficulty_level: number
    subject: string
    knowledge_tags: string[] | null
}

// Legacy type for compatibility
export type QuestionRow = {
    id: string
    question_text: string
    option_a?: string
    option_b?: string
    option_c?: string
    option_d?: string
    options?: string[]
    correct_answer: string
    difficulty?: number
    difficulty_level?: number
    time_limit?: number
    subject: string
    knowledge_tags?: string[]
    skill_tags?: string[]
}

export function generateFallbackQuestions(count: number) {
    const fallbackTemplates = [
        {
            question_text: 'What is the capital of France?',
            options: ['London', 'Paris', 'Berlin', 'Madrid'],
            correct_answer: 'B',
        },
        {
            question_text: 'Which planet is known as the Red Planet?',
            options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
            correct_answer: 'B',
        },
        {
            question_text: 'What is 2 + 2?',
            options: ['3', '4', '5', '6'],
            correct_answer: 'B',
        },
        {
            question_text: 'Who wrote "Romeo and Juliet"?',
            options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
            correct_answer: 'B',
        },
        {
            question_text: 'What is the largest ocean on Earth?',
            options: ['Atlantic', 'Pacific', 'Indian', 'Arctic'],
            correct_answer: 'B',
        },
    ]

    const questions = []
    for (let i = 0; i < count; i++) {
        const template = fallbackTemplates[i % fallbackTemplates.length]
        questions.push({
            id: `fallback-${i + 1}`,
            question_text: template.question_text,
            options: template.options,
            correct_answer: template.correct_answer,
            difficulty: 3,
            time_limit: 20,
            skill_tags: ['fallback'],
        })
    }
    return questions
}

export function pickQuestions(grouped: Record<number, QuestionRow[]>, difficulty: number, count: number) {
    const selected: QuestionRow[] = []
    let current = difficulty

    while (selected.length < count) {
        const bucket = grouped[current] || []
        if (bucket.length === 0) {
            // Try adjacent difficulties
            current = current > difficulty ? current - 1 : current + 1
            if (current < 1) current = 1
            if (current > 5) current = 5

            // If we've tried searching and still stuck or looping, break to avoid infinite loop
            // Simple check: if we are at bounds and still empty
            if ((current === 1 || current === 5) && (!grouped[1] || grouped[1].length === 0) && (!grouped[5] || grouped[5].length === 0)) {
                break; // Safety break
            }

            // Additional safety: if all buckets empty, break
            const totalAvailable = Object.values(grouped).reduce((sum, list) => sum + list.length, 0);
            if (totalAvailable === 0) break;

            continue
        }

        const randomIndex = Math.floor(Math.random() * bucket.length)
        const question = bucket.splice(randomIndex, 1)[0]
        if (question) selected.push(question)
    }

    return selected
}

export async function fetchPveQuestions(
    db: SupabaseClient,
    {
        userId,
        subject,
        numQuestions = 10,
        recentPerformance
    }: {
        userId?: string;
        subject?: string;
        numQuestions?: number;
        recentPerformance?: Array<{ isCorrect: boolean; timeMs: number; difficulty: number }>;
    }
) {
    let baselineDifficulty = 3

    if (userId) {
        try {
            const { data: proficiencyData } = await db
                .rpc('get_latest_user_proficiency', { p_user_id: userId })

            if (proficiencyData && proficiencyData.length > 0) {
                const userProficiency = proficiencyData[0]
                baselineDifficulty = Math.min(5, Math.max(1, Math.ceil(userProficiency.overall_proficiency / 20)))
            } else {
                const { data: profile } = await db
                    .from('profiles')
                    .select('level')
                    .eq('id', userId)
                    .maybeSingle()
                if (profile?.level) {
                    baselineDifficulty = Math.min(5, Math.max(1, Math.round(profile.level / 5)))
                }
            }
        } catch (e) {
            console.warn('Error fetching proficiency:', e)
        }

        // Dynamic Difficulty Adjustment (DDA)
        if (recentPerformance && recentPerformance.length >= 3) {
            const recentCount = Math.min(5, recentPerformance.length)
            const recent = recentPerformance.slice(-recentCount)
            const correctCount = recent.filter(r => r.isCorrect).length
            const accuracy = correctCount / recent.length
            const avgTimeMs = recent.reduce((sum, r) => sum + r.timeMs, 0) / recent.length
            const avgTimeSeconds = avgTimeMs / 1000

            let difficultyAdjustment = 0
            if (accuracy >= 0.8 && avgTimeSeconds < 12) difficultyAdjustment = 1
            else if (accuracy >= 0.9 && avgTimeSeconds < 8) difficultyAdjustment = 2
            else if (accuracy < 0.5) difficultyAdjustment = -1
            else if (accuracy < 0.3) difficultyAdjustment = -2

            baselineDifficulty = Math.min(5, Math.max(1, baselineDifficulty + difficultyAdjustment))
        }
    }

    // Weakness Sniper Logic
    let weaknessQuestions: any[] = []
    if (userId) {
        try {
            const { data: weakTags } = await db.rpc('get_weakest_tags', {
                p_user_id: userId,
                p_limit: 2
            })

            if (weakTags && weakTags.length > 0) {
                const tags = weakTags.map((t: any) => t.tag)
                const { data: wQuestions } = await db
                    .from('seed_questions')
                    .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, subject, knowledge_tags')
                    .overlaps('knowledge_tags', tags)
                    .eq('is_active', true)
                    .limit(5)

                if (wQuestions && wQuestions.length > 0) {
                    // 🎯 SOTA FIX: Type assertion for strict typing
                    weaknessQuestions = wQuestions as DBQuestionRow[]
                }
            }
        } catch (err) {
            console.warn('[Weakness Sniper] Failed:', err)
        }
    }

    console.log('[PVE Helper] Querying seed_questions with:', { subject, numQuestions, is_active: true })
    let query = db.from('seed_questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, correct_answer, difficulty_level, subject, knowledge_tags')

    if (subject) query = query.eq('subject', subject)

    const { data: questions, error } = await query
        .eq('is_active', true)
        .order('difficulty_level', { ascending: true })
        .limit(numQuestions * 3)

    if (error) {
        throw new Error(error.message)
    }

    if (!questions || questions.length === 0) {
        console.warn('[PVE Helper] No questions in database, using fallback')
        const fallbackQuestions = generateFallbackQuestions(numQuestions)
        return {
            questions: fallbackQuestions,
            baselineDifficulty,
            isFallback: true
        }
    }

    // 🎯 SOTA FIX: Use strict typing for database rows
    const grouped: Record<number, QuestionRow[]> = {}
    for (const row of (questions as DBQuestionRow[]) || []) {
        const diff = row.difficulty_level || 3
        grouped[diff] = grouped[diff] || []
        grouped[diff].push(row as QuestionRow)
    }

    // Clone grouped to avoid mutation issues if reused (though pickQuestions mutates the arrays inside)
    // Since we create a new grouped object each time, it's fine.

    let selectedQuestions = pickQuestions({ ...grouped }, baselineDifficulty, numQuestions)

    // Inject Weakness Questions
    if (weaknessQuestions.length > 0) {
        for (let i = 4; i < selectedQuestions.length; i += 5) {
            const wQ = weaknessQuestions.pop()
            if (wQ) {
                selectedQuestions[i] = wQ as QuestionRow
            }
        }
    }

    return {
        questions: selectedQuestions,
        baselineDifficulty,
        isFallback: false
    }
}
