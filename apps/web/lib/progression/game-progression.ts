import type { SupabaseClient } from '@supabase/supabase-js'
import { GameTelemetryService } from '@/lib/services/game-telemetry-service'
import type { GameType } from '@/lib/dal/game-session-repo'
import { XP_CONFIG } from './constants'
import { levelForXp } from './leveling'

// ============================================
// Types
// ============================================

export interface ApplyGameProgressionParams {
    userId: string
    sessionId: string
    gameType: GameType
    score: number
    totalPossible: number
    timeSpentSeconds: number
    telemetry: Record<string, any>
}

export interface GameProgressionResult {
    userId: string
    xpGained: number
    coinsGained: number
    newLevel: number
    leveledUp: boolean
    newXp: number
    accuracy: number
    chestsGranted: string[]
    achievementsUnlocked: string[]
    badgesGranted: string[]
}

// ============================================
// XP Calculation for Game Modes
// ============================================

/**
 * Calculate XP for game completion
 * Similar to battle XP but adapted for game modes
 */
function computeGameXp(params: {
    score: number
    totalPossible: number
    gameType: GameType
    timeSpentSeconds: number
}): number {
    const { score, totalPossible, gameType, timeSpentSeconds } = params

    // Base XP calculation
    const accuracy = totalPossible > 0 ? score / totalPossible : 0
    const baseXp = Math.round(score * XP_CONFIG.correctAnswerXp)

    // Game type multipliers
    const gameTypeMultipliers: Record<GameType, number> = {
        editor_mode: 1.2, // Editor Mode is more challenging
        detective_log: 1.3, // Detective's Log requires critical thinking
    }

    const typeMultiplier = gameTypeMultipliers[gameType] || 1.0

    // Accuracy bonus (perfect = +50% XP)
    const accuracyBonus = accuracy >= 1.0 ? baseXp * 0.5 : 0

    // Time efficiency bonus (completing faster gives bonus)
    // Assume 30 seconds per question is baseline
    const expectedTime = totalPossible * 30
    const timeEfficiency = timeSpentSeconds > 0 ? expectedTime / timeSpentSeconds : 1
    const timeBonus =
        timeEfficiency > 1.2 ? Math.round(baseXp * 0.2) : 0 // 20% bonus for fast completion

    // Total XP
    const totalXp = Math.round((baseXp + accuracyBonus + timeBonus) * typeMultiplier)

    // Floor and ceiling
    return Math.max(XP_CONFIG.lossFloorXp, Math.min(totalXp, 500)) // Max 500 XP per game
}

/**
 * Calculate coins for game completion
 */
function computeGameCoins(params: {
    score: number
    totalPossible: number
    accuracy: number
}): number {
    const { score, accuracy } = params

    // Base coins: 10 per correct answer
    const baseCoins = score * 10

    // Perfect accuracy bonus
    const perfectBonus = accuracy >= 1.0 ? 50 : 0

    return baseCoins + perfectBonus
}

// ============================================
// Main Progression Function
// ============================================

/**
 * Apply progression rewards for game completion
 * Integrates with existing progression system
 */
export async function applyGameProgression(
    supabase: SupabaseClient,
    params: ApplyGameProgressionParams
): Promise<GameProgressionResult | null> {
    try {
        const { userId, sessionId, gameType, score, totalPossible, timeSpentSeconds, telemetry } =
            params

        // Calculate accuracy
        const accuracy = totalPossible > 0 ? score / totalPossible : 0

        // Calculate XP and coins
        const xpGained = computeGameXp({ score, totalPossible, gameType, timeSpentSeconds })
        const coinsGained = computeGameCoins({ score, totalPossible, accuracy })

        // Fetch current profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, xp, level, coins')
            .eq('id', userId)
            .single()

        if (profileError || !profile) {
            console.error('[GameProgression] Failed to fetch profile:', profileError)
            return null
        }

        // Calculate new XP and level
        const previousXp = profile.xp || 0
        const newXp = previousXp + xpGained
        const levelInfo = levelForXp(newXp)
        const leveledUp = levelInfo.level > (profile.level || 1)

        // Update profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                xp: newXp,
                level: levelInfo.level,
                coins: (profile.coins || 0) + coinsGained,
            })
            .eq('id', userId)

        if (updateError) {
            console.error('[GameProgression] Failed to update profile:', updateError)
            return null
        }

        // Mark progression as applied in game session
        const telemetryService = new GameTelemetryService(supabase)
        await telemetryService.markProgressionApplied(sessionId, xpGained, coinsGained)

        // Update daily missions (if applicable)
        try {
            await supabase.rpc('update_mission_progress', {
                p_user_id: userId,
                p_mission_type: 'play_game', // Assuming there's a "play_game" mission type
                p_increment: 1,
            })

            // Perfect game mission
            if (accuracy >= 1.0) {
                await supabase.rpc('update_mission_progress', {
                    p_user_id: userId,
                    p_mission_type: 'perfect_game',
                    p_increment: 1,
                })
            }
        } catch (missionError) {
            console.warn('[GameProgression] Mission update failed (non-critical):', missionError)
        }

        // Grant level-up chest if leveled up
        const chestsGranted: string[] = []
        if (leveledUp) {
            try {
                const { data: chest } = await supabase
                    .from('battle_chests')
                    .insert({
                        user_id: userId,
                        chest_type: 'BRONZE',
                        source: `game_level_up_${gameType}`,
                        rewards: { gold: 50, xp: 30, label: 'Level Up Reward' },
                    })
                    .select('id')
                    .single()

                if (chest) {
                    chestsGranted.push(chest.id)
                }
            } catch (chestError) {
                console.warn('[GameProgression] Chest grant failed (non-critical):', chestError)
            }
        }

        // Grant perfect game achievement
        const achievementsUnlocked: string[] = []
        const badgesGranted: string[] = []

        if (accuracy >= 1.0) {
            try {
                // Check if achievement already exists
                const { data: existing } = await supabase
                    .from('user_achievements')
                    .select('achievement_code')
                    .eq('user_id', userId)
                    .eq('achievement_code', 'perfect_game_mode')
                    .maybeSingle()

                if (!existing) {
                    await supabase.from('user_achievements').insert({
                        user_id: userId,
                        achievement_code: 'perfect_game_mode',
                    })

                    achievementsUnlocked.push('perfect_game_mode')

                    // Grant badge
                    const { data: badgeExists } = await supabase
                        .from('user_badges')
                        .select('badge_code')
                        .eq('user_id', userId)
                        .eq('badge_code', 'perfect_game')
                        .maybeSingle()

                    if (!badgeExists) {
                        await supabase.from('user_badges').insert({
                            user_id: userId,
                            badge_code: 'perfect_game',
                        })
                        badgesGranted.push('perfect_game')
                    }
                }
            } catch (achievementError) {
                console.warn('[GameProgression] Achievement grant failed (non-critical):', achievementError)
            }
        }

        // Chick System: Increase hunger from game activity (+10)
        try {
            const { increaseHungerFromActivity } = await import('@/lib/chick/hunger')
            await increaseHungerFromActivity(supabase, userId, 10)
        } catch (chickError) {
            console.warn('[GameProgression] Chick hunger update failed (non-critical):', chickError)
        }

        // Chick System: Grant food reward (Perfect: +3, Good: +2, Normal: +1)
        try {
            const { grantGameFoodReward } = await import('@/lib/chick/rewards')
            const foodAmount = accuracy >= 1.0 ? 3 : accuracy >= 0.8 ? 2 : 1
            await grantGameFoodReward(supabase, userId, foodAmount)
        } catch (chickError) {
            console.warn('[GameProgression] Chick food reward failed (non-critical):', chickError)
        }

        console.log(
            `[GameProgression] Applied for user ${userId}: +${xpGained} XP, +${coinsGained} coins, Level ${levelInfo.level}`
        )

        return {
            userId,
            xpGained,
            coinsGained,
            newLevel: levelInfo.level,
            leveledUp,
            newXp,
            accuracy,
            chestsGranted,
            achievementsUnlocked,
            badgesGranted,
        }
    } catch (error) {
        console.error('[GameProgression] Unexpected error:', error)
        return null
    }
}
