import { SupabaseClient } from '@supabase/supabase-js'

export interface LearningDNA {
    avg_answer_time_ms: number
    accuracy_by_tag: Record<string, number>
    preferred_session_length: 'short' | 'medium' | 'long'
    peak_performance_hour: number // 0-23
    quit_rate: number // 0-1
    streak_consistency: number // 0-1
    learning_style: 'visual' | 'practice' | 'mixed'
    last_calculated_at: string
}

export const INITIAL_DNA: LearningDNA = {
    avg_answer_time_ms: 0,
    accuracy_by_tag: {},
    preferred_session_length: 'medium',
    peak_performance_hour: 12,
    quit_rate: 0,
    streak_consistency: 0,
    learning_style: 'mixed',
    last_calculated_at: new Date().toISOString(),
}

export async function calculateLearningDNA(
    supabase: SupabaseClient,
    userId: string
): Promise<LearningDNA> {
    // 1. Fetch recent matches (last 50)
    const { data: matches } = await supabase
        .from('match_history')
        .select('*')
        .or(`player1_id.eq.${userId},player2_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50)

    if (!matches || matches.length === 0) {
        return INITIAL_DNA
    }

    // 2. Calculate metrics
    let totalAnswerTime = 0
    let totalAnswers = 0
    let tagCorrectCounts: Record<string, number> = {}
    let tagTotalCounts: Record<string, number> = {}
    let sessionLengths: number[] = []
    let hourlyWins: Record<number, number> = {}
    let hourlyMatches: Record<number, number> = {}
    let incompleteMatches = 0

    for (const match of matches) {
        const isPlayer1 = match.player1_id === userId
        const answers = isPlayer1 ? match.player1_answers : match.player2_answers
        const questions = match.question_list || []

        // Session length
        if (match.duration_seconds) {
            sessionLengths.push(match.duration_seconds)
        }

        // Quit rate (if no winner and duration is short?)
        if (!match.winner_id && (!match.duration_seconds || match.duration_seconds < 30)) {
            incompleteMatches++
        }

        // Hourly performance
        const hour = new Date(match.created_at).getHours()
        hourlyMatches[hour] = (hourlyMatches[hour] || 0) + 1
        if (match.winner_id === userId) {
            hourlyWins[hour] = (hourlyWins[hour] || 0) + 1
        }

        // Answer analysis
        if (Array.isArray(answers) && Array.isArray(questions)) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i]
                const a = answers[i]

                if (a && q) {
                    totalAnswers++
                    // Mock answer time (since we don't track per-question time yet in match_history, use avg)
                    // Ideally match_history should store time per answer. 
                    // For now, use match duration / num questions as approximation
                    if (match.duration_seconds) {
                        totalAnswerTime += (match.duration_seconds * 1000) / questions.length
                    }

                    const isCorrect = a.trim().toUpperCase() === q.correct_answer?.trim().toUpperCase()

                    if (q.skill_tags && Array.isArray(q.skill_tags)) {
                        for (const tag of q.skill_tags) {
                            tagTotalCounts[tag] = (tagTotalCounts[tag] || 0) + 1
                            if (isCorrect) {
                                tagCorrectCounts[tag] = (tagCorrectCounts[tag] || 0) + 1
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Aggregate results
    const avgAnswerTime = totalAnswers > 0 ? totalAnswerTime / totalAnswers : 0

    const accuracyByTag: Record<string, number> = {}
    for (const tag in tagTotalCounts) {
        accuracyByTag[tag] = tagCorrectCounts[tag] / tagTotalCounts[tag]
    }

    const avgSessionLength = sessionLengths.length > 0
        ? sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length
        : 0

    let preferredSession: 'short' | 'medium' | 'long' = 'medium'
    if (avgSessionLength < 300) preferredSession = 'short' // < 5 mins
    else if (avgSessionLength > 1800) preferredSession = 'long' // > 30 mins

    let peakHour = 12
    let maxWinRate = -1
    for (const h in hourlyMatches) {
        const hour = parseInt(h)
        const winRate = (hourlyWins[hour] || 0) / hourlyMatches[hour]
        if (winRate > maxWinRate) {
            maxWinRate = winRate
            peakHour = hour
        }
    }

    const quitRate = incompleteMatches / matches.length

    return {
        avg_answer_time_ms: Math.round(avgAnswerTime),
        accuracy_by_tag: accuracyByTag,
        preferred_session_length: preferredSession,
        peak_performance_hour: peakHour,
        quit_rate: quitRate,
        streak_consistency: 0.8, // Placeholder, requires complex query
        learning_style: 'mixed', // Placeholder
        last_calculated_at: new Date().toISOString(),
    }
}
