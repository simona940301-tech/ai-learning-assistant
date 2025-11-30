import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 專注模式完成請求
 */
export interface FocusModeCompleteRequest {
    duration: number // 專注時長（秒）
    questionsCompleted: number // 完成題數
    correctAnswers: number // 正確題數
}

/**
 * XP 計算規則
 */
const XP_RULES = {
    BASE_XP_PER_MINUTE: 5, // 每分鐘基礎 XP
    QUESTION_BONUS: 10, // 每題額外獎勵
    ACCURACY_MULTIPLIER: {
        PERFECT: 2.0, // 100% 正確率
        EXCELLENT: 1.5, // 80-99%
        GOOD: 1.2, // 60-79%
        NORMAL: 1.0, // <60%
    },
    MIN_DURATION: 60, // 最小專注時長（秒）
    MAX_XP_PER_SESSION: 500, // 單次最大 XP
}

/**
 * POST /api/play/focus/complete
 * 
 * 專注模式完成，獎勵 XP
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED', message: 'Authentication required' },
                { status: 401 }
            )
        }

        const body: FocusModeCompleteRequest = await req.json()
        const { duration, questionsCompleted, correctAnswers } = body

        // Validation
        if (duration === undefined || questionsCompleted === undefined || correctAnswers === undefined) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'duration, questionsCompleted, and correctAnswers are required',
                },
                { status: 400 }
            )
        }

        if (duration < XP_RULES.MIN_DURATION) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: `Minimum focus duration is ${XP_RULES.MIN_DURATION} seconds`,
                },
                { status: 400 }
            )
        }

        if (correctAnswers > questionsCompleted) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'correctAnswers cannot exceed questionsCompleted',
                },
                { status: 400 }
            )
        }

        // Calculate XP
        const xpCalculation = calculateFocusModeXP(duration, questionsCompleted, correctAnswers)

        // Award XP to user
        const { data: profile, error: updateError } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', user.id)
            .single()

        if (updateError || !profile) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'PROFILE_NOT_FOUND',
                    message: 'User profile not found',
                },
                { status: 404 }
            )
        }

        const currentXP = profile.xp || 0
        const newXP = currentXP + xpCalculation.totalXP

        const { error: xpUpdateError } = await supabase
            .from('profiles')
            .update({ xp: newXP })
            .eq('id', user.id)

        if (xpUpdateError) {
            console.error('[Focus Complete API] Failed to update XP:', xpUpdateError)
            return NextResponse.json(
                {
                    success: false,
                    error: 'UPDATE_FAILED',
                    message: 'Failed to award XP',
                },
                { status: 500 }
            )
        }

        // Log focus session (optional, for analytics)
        const { error: logError } = await supabase.from('focus_sessions').insert({
            user_id: user.id,
            duration_seconds: duration,
            questions_completed: questionsCompleted,
            correct_answers: correctAnswers,
            xp_awarded: xpCalculation.totalXP,
            accuracy: xpCalculation.accuracy,
            created_at: new Date().toISOString(),
        })

        if (logError) {
            // Non-critical, just log
            console.warn('[Focus Complete API] Failed to log session:', logError)
        }

        return NextResponse.json({
            success: true,
            data: {
                xpAwarded: xpCalculation.totalXP,
                breakdown: xpCalculation.breakdown,
                newTotalXP: newXP,
                previousXP: currentXP,
            },
            message: `獲得 ${xpCalculation.totalXP} XP！`,
        })
    } catch (error) {
        console.error('[Focus Complete API] Error:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}

/**
 * 計算專注模式 XP
 */
function calculateFocusModeXP(
    duration: number,
    questionsCompleted: number,
    correctAnswers: number
): {
    totalXP: number
    accuracy: number
    breakdown: {
        baseXP: number
        questionBonus: number
        accuracyMultiplier: number
        finalXP: number
    }
} {
    // 1. 基礎 XP（基於時長）
    const minutes = Math.floor(duration / 60)
    const baseXP = minutes * XP_RULES.BASE_XP_PER_MINUTE

    // 2. 題目獎勵
    const questionBonus = questionsCompleted * XP_RULES.QUESTION_BONUS

    // 3. 正確率加成
    const accuracy = questionsCompleted > 0 ? correctAnswers / questionsCompleted : 0
    let accuracyMultiplier = XP_RULES.ACCURACY_MULTIPLIER.NORMAL

    if (accuracy >= 1.0) {
        accuracyMultiplier = XP_RULES.ACCURACY_MULTIPLIER.PERFECT
    } else if (accuracy >= 0.8) {
        accuracyMultiplier = XP_RULES.ACCURACY_MULTIPLIER.EXCELLENT
    } else if (accuracy >= 0.6) {
        accuracyMultiplier = XP_RULES.ACCURACY_MULTIPLIER.GOOD
    }

    // 4. 計算總 XP
    const rawXP = (baseXP + questionBonus) * accuracyMultiplier
    const finalXP = Math.min(Math.round(rawXP), XP_RULES.MAX_XP_PER_SESSION)

    return {
        totalXP: finalXP,
        accuracy,
        breakdown: {
            baseXP,
            questionBonus,
            accuracyMultiplier,
            finalXP,
        },
    }
}
