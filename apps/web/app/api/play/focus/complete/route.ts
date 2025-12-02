import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { levelForXp } from '@/lib/progression'

/**
 * 專注模式完成請求
 */
export interface FocusModeCompleteRequest {
    duration: number // 專注時長（秒）
    questionsCompleted?: number // 完成題數（可選，專注模式主要為計時器）
    correctAnswers?: number // 正確題數（可選）
}

/**
 * 專注模式 XP 獎勵規則（頂尖設計）
 * 
 * 設計原則：
 * 1. 時間階梯獎勵：鼓勵長時間專注
 * 2. 完成獎勵：完成整個時段有額外獎勵
 * 3. XP Multiplier支持：整合現有buff系統
 * 4. 平衡性：與其他活動（戰鬥、任務）的XP獎勵平衡
 */
const FOCUS_XP_RULES = {
    // 時間階梯獎勵（每分鐘基礎XP）
    TIME_TIERS: {
        SHORT: { minutes: [5, 15], baseXPPerMinute: 3 }, // 5-15分鐘：基礎率
        MEDIUM: { minutes: [15, 30], baseXPPerMinute: 4 }, // 15-30分鐘：1.33x
        LONG: { minutes: [30, 60], baseXPPerMinute: 5 }, // 30-60分鐘：1.67x
        EXTENDED: { minutes: [60, Infinity], baseXPPerMinute: 6 }, // 60+分鐘：2.0x
    },
    
    // 完成獎勵（完成整個專注時段）
    COMPLETION_BONUS: {
        MIN_DURATION: 5, // 最小5分鐘才有完成獎勵
        BASE_BONUS: 10, // 基礎完成獎勵
        TIER_MULTIPLIERS: {
            SHORT: 1.0, // 5-15分鐘：10 XP
            MEDIUM: 1.5, // 15-30分鐘：15 XP
            LONG: 2.0, // 30-60分鐘：20 XP
            EXTENDED: 3.0, // 60+分鐘：30 XP
        },
    },
    
    // 題目獎勵（如果專注模式中有答題）
    QUESTION_BONUS: {
        PER_QUESTION: 2, // 每題2 XP（低於戰鬥模式，因為專注模式重點在時間）
        PERFECT_BONUS: 5, // 全對額外獎勵
    },
    
    // 限制
    MIN_DURATION_SECONDS: 60, // 最小專注時長（秒）
    MAX_XP_PER_SESSION: 1000, // 單次最大 XP（防止濫用）
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
        const { duration, questionsCompleted = 0, correctAnswers = 0 } = body

        // Validation
        if (duration === undefined || duration < 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: 'duration is required and must be non-negative',
                },
                { status: 400 }
            )
        }

        if (duration < FOCUS_XP_RULES.MIN_DURATION_SECONDS) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: `Minimum focus duration is ${FOCUS_XP_RULES.MIN_DURATION_SECONDS} seconds`,
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

        // Get user profile and XP multiplier
        const [{ data: profile }, { data: progressionState }] = await Promise.all([
            supabase
                .from('profiles')
                .select('xp, level, focus_stats')
                .eq('id', user.id)
                .single(),
            supabase
                .from('battle_progression_state')
                .select('xp_multiplier, xp_multiplier_expires_at')
                .eq('user_id', user.id)
                .maybeSingle(),
        ])

        if (!profile) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'PROFILE_NOT_FOUND',
                    message: 'User profile not found',
                },
                { status: 404 }
            )
        }

        // Check XP multiplier (buff)
        const xpMultiplier = getActiveXpMultiplier(progressionState)

        // Calculate XP
        const xpCalculation = calculateFocusModeXP(duration, questionsCompleted, correctAnswers, xpMultiplier)

        // Update XP and level
        const currentXP = profile.xp || 0
        const newXP = currentXP + xpCalculation.totalXP
        const levelInfo = levelForXp(newXP)

        // Update profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                xp: newXP,
                level: levelInfo.level,
                focus_stats: updateFocusStats(profile.focus_stats || {}, duration, xpCalculation.totalXP),
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('[Focus Complete API] Failed to update profile:', updateError)
            return NextResponse.json(
                {
                    success: false,
                    error: 'UPDATE_FAILED',
                    message: 'Failed to award XP',
                },
                { status: 500 }
            )
        }

        // Log focus session (for analytics)
        const { error: logError } = await supabase.from('focus_sessions').insert({
            user_id: user.id,
            duration_seconds: duration,
            questions_completed: questionsCompleted,
            correct_answers: correctAnswers,
            xp_awarded: xpCalculation.totalXP,
            xp_multiplier_applied: xpMultiplier,
            accuracy: questionsCompleted > 0 ? correctAnswers / questionsCompleted : null,
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
                levelInfo: {
                    level: levelInfo.level,
                    progress: levelInfo.progressPct,
                    nextLevelXp: levelInfo.nextLevelXp,
                },
                xpMultiplierApplied: xpMultiplier,
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
 * 獲取有效的 XP Multiplier
 */
function getActiveXpMultiplier(progressionState: any): number {
    if (!progressionState?.xp_multiplier || !progressionState?.xp_multiplier_expires_at) {
        return 1.0
    }

    const expiresAt = new Date(progressionState.xp_multiplier_expires_at)
    if (expiresAt > new Date()) {
        return Number(progressionState.xp_multiplier) || 1.0
    }

    return 1.0
}

/**
 * 更新專注統計
 */
function updateFocusStats(
    currentStats: any,
    durationSeconds: number,
    xpAwarded: number
): any {
    const minutes = Math.floor(durationSeconds / 60)
    return {
        total_minutes: (currentStats.total_minutes || 0) + minutes,
        sessions_completed: (currentStats.sessions_completed || 0) + 1,
        total_xp_earned: (currentStats.total_xp_earned || 0) + xpAwarded,
        last_session_at: new Date().toISOString(),
        // 保持其他統計
        current_streak: currentStats.current_streak || 0,
    }
}

/**
 * 計算專注模式 XP（頂尖設計）
 * 
 * 獎勵結構：
 * 1. 時間階梯獎勵：根據專注時長給予不同基礎XP率
 * 2. 完成獎勵：完成整個專注時段有額外獎勵
 * 3. 題目獎勵（可選）：如果專注模式中有答題
 * 4. XP Multiplier：應用buff（如果有的話）
 */
function calculateFocusModeXP(
    durationSeconds: number,
    questionsCompleted: number,
    correctAnswers: number,
    xpMultiplier: number = 1.0
): {
    totalXP: number
    breakdown: {
        timeBasedXP: number
        completionBonus: number
        questionBonus: number
        perfectBonus: number
        beforeMultiplier: number
        xpMultiplier: number
        finalXP: number
    }
} {
    const minutes = Math.floor(durationSeconds / 60)
    const { TIME_TIERS, COMPLETION_BONUS, QUESTION_BONUS } = FOCUS_XP_RULES

    // 1. 時間階梯獎勵
    let timeBasedXP = 0
    let tier = 'SHORT'

    if (minutes >= 60) {
        tier = 'EXTENDED'
        timeBasedXP = minutes * TIME_TIERS.EXTENDED.baseXPPerMinute
    } else if (minutes >= 30) {
        tier = 'LONG'
        timeBasedXP = minutes * TIME_TIERS.LONG.baseXPPerMinute
    } else if (minutes >= 15) {
        tier = 'MEDIUM'
        timeBasedXP = minutes * TIME_TIERS.MEDIUM.baseXPPerMinute
    } else if (minutes >= 5) {
        tier = 'SHORT'
        timeBasedXP = minutes * TIME_TIERS.SHORT.baseXPPerMinute
    } else {
        // 少於5分鐘，只給基礎獎勵
        timeBasedXP = minutes * TIME_TIERS.SHORT.baseXPPerMinute
    }

    // 2. 完成獎勵（完成整個專注時段）
    let completionBonus = 0
    if (minutes >= COMPLETION_BONUS.MIN_DURATION) {
        const tierMultiplier = COMPLETION_BONUS.TIER_MULTIPLIERS[tier as keyof typeof COMPLETION_BONUS.TIER_MULTIPLIERS] || 1.0
        completionBonus = Math.round(COMPLETION_BONUS.BASE_BONUS * tierMultiplier)
    }

    // 3. 題目獎勵（可選）
    let questionBonus = 0
    let perfectBonus = 0
    if (questionsCompleted > 0) {
        questionBonus = questionsCompleted * QUESTION_BONUS.PER_QUESTION
        const accuracy = correctAnswers / questionsCompleted
        if (accuracy >= 1.0) {
            perfectBonus = QUESTION_BONUS.PERFECT_BONUS
        }
    }

    // 4. 計算總 XP（應用 multiplier）
    const beforeMultiplier = timeBasedXP + completionBonus + questionBonus + perfectBonus
    const afterMultiplier = beforeMultiplier * xpMultiplier
    const finalXP = Math.min(Math.round(afterMultiplier), FOCUS_XP_RULES.MAX_XP_PER_SESSION)

    return {
        totalXP: finalXP,
        breakdown: {
            timeBasedXP: Math.round(timeBasedXP),
            completionBonus,
            questionBonus,
            perfectBonus,
            beforeMultiplier: Math.round(beforeMultiplier),
            xpMultiplier,
            finalXP,
        },
    }
}
