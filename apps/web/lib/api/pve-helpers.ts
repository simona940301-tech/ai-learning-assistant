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
    // Supabase join result
    question_explanations?: { explanation_text: string }[] | null
    explanation_text?: string // Fallback or direct
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
    explanation?: string
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

    // 🎯 Simplified robust selection
    while (selected.length < count) {
        // Simple round-robin strategy across difficulties if exact match not found
        let found = false

        // 1. Try exact difficulty
        if (grouped[current] && grouped[current].length > 0) {
            const bucket = grouped[current]
            const randomIndex = Math.floor(Math.random() * bucket.length)
            selected.push(bucket.splice(randomIndex, 1)[0])
            found = true
        }

        // 2. If not found, look for ANY question
        if (!found) {
            const allKeys = Object.keys(grouped).map(Number)
            const availableKeys = allKeys.filter(k => grouped[k].length > 0)

            if (availableKeys.length === 0) break; // No more questions

            // Pick random difficulty that has questions
            const randomKey = availableKeys[Math.floor(Math.random() * availableKeys.length)]
            const bucket = grouped[randomKey]
            const randomIndex = Math.floor(Math.random() * bucket.length)
            selected.push(bucket.splice(randomIndex, 1)[0])
        }

        // Move difficulty for next pick (oscillate)
        // logic: 3 -> 4 -> 2 -> 5 -> 1
        // Simplified: just random jitter for variety
        current = Math.min(5, Math.max(1, current + (Math.random() > 0.5 ? 1 : -1)))
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
            // 🎯 SOTA FIX: Add timeout for proficiency check to prevent hanging
            const proficiencyPromise = db.rpc('get_latest_user_proficiency', { p_user_id: userId })
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Proficiency timeout')), 2000))

            const { data: proficiencyData } = await Promise.race([proficiencyPromise, timeoutPromise]) as any

            if (proficiencyData && proficiencyData.length > 0) {
                const userProficiency = proficiencyData[0]
                baselineDifficulty = Math.min(5, Math.max(1, Math.ceil(userProficiency.overall_proficiency / 20)))
            } else {
                // Fallback to profile level
                const { data: profile } = await db
                    .from('profiles')
                    .select('level')
                    .eq('id', userId)
                    .maybeSingle()
                if (profile?.level) {
                    baselineDifficulty = Math.min(5, Math.max(1, Math.round(profile.level / 5)))
                }
            }
            console.log('[PVE Helper] Proficiency Check Complete. Baseline:', baselineDifficulty)
        } catch (e) {
            console.warn('[PVE Helper] Error fetching proficiency (using default):', e)
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
            console.log('[PVE Helper] Fetching weakest tags for user:', userId)

            // 🎯 FIX: Add timeout protection for RPC call
            const weakTagsPromise = db.rpc('get_weakest_tags', {
                p_user_id: userId,
                p_limit: 2
            })

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Weakness tags timeout')), 2000)
            )

            const { data: weakTags } = await Promise.race([
                weakTagsPromise,
                timeoutPromise
            ]) as any

            console.log('[PVE Helper] Weak tags result:', { count: weakTags?.length })

            if (weakTags && weakTags.length > 0) {
                const tags = weakTags.map((t: any) => t.tag)
                console.log('[PVE Helper] Querying weakness questions for tags:', tags)

                const { data: wQuestions } = await db
                    .from('seed_questions')
                    .select(`
                        id, 
                        question_text, 
                        option_a, 
                        option_b, 
                        option_c, 
                        option_d, 
                        correct_answer, 
                        difficulty_level, 
                        subject, 
                        knowledge_tags
                    `)
                    .overlaps('knowledge_tags', tags)
                    .eq('is_active', true)
                    .limit(5)

                console.log('[PVE Helper] Weakness questions found:', wQuestions?.length || 0)

                if (wQuestions && wQuestions.length > 0) {
                    // 🎯 SOTA FIX: Fetch explanations for weakness questions (including option_analysis)
                    const weaknessIds = wQuestions.map(q => q.id)
                    const { data: weaknessExplanations } = await db
                        .from('question_explanations')
                        .select('question_id, explanation_text, option_analysis')
                        .in('question_id', weaknessIds)

                    const weaknessExplMap = new Map<string, string>()
                    if (weaknessExplanations) {
                        weaknessExplanations.forEach((expl: any) => {
                            let fullExplanation = expl.explanation_text || ''

                            // Append option_analysis if exists
                            if (expl.option_analysis && typeof expl.option_analysis === 'object') {
                                const optionAnalysis = expl.option_analysis

                                // Check for A, B, C, D keys
                                const optionKeys = ['A', 'B', 'C', 'D'].filter(key => optionAnalysis[key])

                                if (optionKeys.length > 0) {
                                    fullExplanation += '\n\n**選項分析：**\n'
                                    optionKeys.forEach(key => {
                                        fullExplanation += `\n**選項 ${key}**：${optionAnalysis[key]}`
                                    })
                                } else {
                                    const otherKeys = Object.keys(optionAnalysis).filter(
                                        key => key !== 'corePoint' && key !== 'translation' && optionAnalysis[key]
                                    )

                                    if (otherKeys.length > 0) {
                                        fullExplanation += '\n\n**補充說明：**\n'
                                        otherKeys.forEach(key => {
                                            fullExplanation += `\n**${key}**：${optionAnalysis[key]}`
                                        })
                                    }
                                }
                            }

                            weaknessExplMap.set(expl.question_id, fullExplanation)
                        })
                    }

                    // Merge explanations into weakness questions
                    weaknessQuestions = wQuestions.map((q: any) => ({
                        ...q,
                        explanation: weaknessExplMap.get(q.id) || undefined
                    })) as DBQuestionRow[]
                }
            } else {
                console.log('[PVE Helper] No weak tags found, skipping weakness questions')
            }
        } catch (err) {
            console.warn('[Weakness Sniper] Failed or timeout:', err)
            // Continue without weakness questions
        }
    }

    console.log('[PVE Helper] Querying seed_questions with:', { subject, numQuestions, is_active: true })

    // 🎯 SOTA FIX: Supabase LEFT JOIN syntax is broken for this relationship
    // Instead of using question_explanations!left(explanation_text) which returns empty arrays,
    // we fetch questions and explanations separately, then merge them
    // This is more reliable and follows best practices for complex joins

    let query = db.from('seed_questions')
        .select(`
            id, 
            question_text, 
            option_a, 
            option_b, 
            option_c, 
            option_d, 
            correct_answer, 
            difficulty_level, 
            subject, 
            knowledge_tags
        `)

    if (subject) query = query.eq('subject', subject)

    const { data: questions, error } = await query
        .eq('is_active', true)
        .limit(numQuestions * 5) // Fetch slightly more to ensure randomization

    console.log('[PVE Helper] Query completed!', { questionCount: questions?.length, hasError: !!error })

    if (error) {
        console.error('[PVE Helper] DB Error:', error)
        // Fall through to fallback
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

    // 🎯 SOTA FIX: Fetch explanations separately for all question IDs
    // Also fetch option_analysis which is a separate JSON column
    const questionIds = questions.map(q => q.id)
    const { data: explanations, error: explError } = await db
        .from('question_explanations')
        .select('question_id, explanation_text, option_analysis')
        .in('question_id', questionIds)

    if (explError) {
        console.warn('[PVE Helper] Failed to fetch explanations:', explError)
    }

    // Create a map for O(1) lookup and merge explanation_text with option_analysis
    const explanationMap = new Map<string, string>()
    if (explanations) {
        explanations.forEach((expl: any) => {
            let fullExplanation = expl.explanation_text || ''

            // 🎯 SOTA FIX: Append option_analysis if it exists
            if (expl.option_analysis && typeof expl.option_analysis === 'object') {
                const optionAnalysis = expl.option_analysis

                // 🔍 DEBUG: Log the raw analysis object to see what keys we actually have
                console.log(`[PVE Helper] Raw option_analysis for question ${expl.question_id}:`, JSON.stringify(optionAnalysis))

                // Normalize keys to uppercase to handle 'a', 'b', 'c', 'd' vs 'A', 'B', 'C', 'D'
                const normalizedAnalysis: Record<string, string> = {}
                Object.keys(optionAnalysis).forEach(key => {
                    normalizedAnalysis[key.toUpperCase()] = optionAnalysis[key]
                })

                // Check for formatted keys A, B, C, D
                const optionKeys = ['A', 'B', 'C', 'D'].filter(key => normalizedAnalysis[key])

                if (optionKeys.length > 0) {
                    // Clean up dangling "選項分析：" or "選項分析:" from the end of explanation_text
                    // This prevents the issue where the text says "選項分析：" and then we append another "選項分析："
                    // or if we have it in text but no data, we might want to keep it (but here we have data)
                    fullExplanation = fullExplanation.replace(/\s*(\*\*|)?選項分析(\*\*|)?[:：]\s*$/g, '')

                    // Append our structured analysis
                    fullExplanation += '\n\n**選項分析：**\n'
                    optionKeys.forEach(key => {
                        fullExplanation += `\n**選項 ${key}**：${normalizedAnalysis[key]}`
                    })
                } else {
                    // Check for other structured fields (excluding corePoint and translation which might be redundant)
                    // Also exclude 'A', 'B', 'C', 'D' since we handled them (though logic above says they aren't there)
                    const otherKeys = Object.keys(optionAnalysis).filter(
                        key => {
                            const k = key.toUpperCase()
                            return k !== 'COREPOINT' && k !== 'TRANSLATION' &&
                                k !== 'A' && k !== 'B' && k !== 'C' && k !== 'D' &&
                                optionAnalysis[key]
                        }
                    )

                    if (otherKeys.length > 0) {
                        // Clean up dangling headers if specific keys are found
                        fullExplanation = fullExplanation.replace(/\s*(\*\*|)?(選項分析|補充說明)(\*\*|)?[:：]\s*$/g, '')

                        fullExplanation += '\n\n**補充說明：**\n'
                        otherKeys.forEach(key => {
                            fullExplanation += `\n**${key}**：${optionAnalysis[key]}`
                        })
                    }
                }
            } else {
                console.log(`[PVE Helper] No valid option_analysis object for question ${expl.question_id}`)
            }

            explanationMap.set(expl.question_id, fullExplanation)
        })
    }

    console.log('[PVE Helper] Explanations fetched:', {
        total: explanations?.length || 0,
        questionCount: questions.length,
        coverage: questions.length > 0 ? Math.round((explanations?.length || 0) / questions.length * 100) : 0,
        withOptionAnalysis: explanations?.filter((e: any) => e.option_analysis).length || 0
    })

    // Continue with normal processing
    const grouped: Record<number, QuestionRow[]> = {}
    for (const row of questions as DBQuestionRow[]) {
        const diff = row.difficulty_level || 3
        grouped[diff] = grouped[diff] || []

        // 🎯 SOTA FIX: Get explanation from our separate query
        const explanation = explanationMap.get(row.id) || undefined

        // 🔍 DEBUG: Track explanation extraction
        console.log('[PVE Helper] Question explanation status:', {
            questionId: row.id,
            hasExplanation: !!explanation,
            explanationPreview: explanation ? `${explanation.substring(0, 50)}...` : null
        })

        const questionRow: QuestionRow = {
            ...row,
            knowledge_tags: row.knowledge_tags || undefined,
            explanation: explanation
        }
        grouped[diff].push(questionRow)
    }

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

    // 🔍 DEBUG: Verify explanations in final selection
    const explanationStats = {
        total: selectedQuestions.length,
        withExplanation: selectedQuestions.filter(q => q.explanation).length,
        withoutExplanation: selectedQuestions.filter(q => !q.explanation).length
    }
    console.log('[PVE Helper] Final question selection explanation stats:', explanationStats)
    if (explanationStats.withoutExplanation > 0) {
        console.warn('[PVE Helper] ⚠️ Some questions missing explanations:',
            selectedQuestions.filter(q => !q.explanation).map(q => q.id)
        )
    }

    return {
        questions: selectedQuestions,
        baselineDifficulty,
        isFallback: false
    }
}
