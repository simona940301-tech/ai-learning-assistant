/**
 * Proficiency Calculator
 * 
 * Calculates user proficiency score based on:
 * 1. Self-reported level (mock_exam_level from onboarding)
 * 2. Actual test performance (challenge results)
 * 3. Battle history (if available)
 * 
 * Uses dynamic weighting based on data availability and consistency.
 */

export interface ChallengeResult {
    isCorrect: boolean
    timeMs: number
}

export interface BattleRecord {
    isCorrect: boolean
    difficulty: number
}

export interface ProficiencyInput {
    mock_exam_level: number  // 1-15 (self-reported)
    challenge_score: number  // 0-7 (number of correct answers)
    challenge_results: ChallengeResult[]
    battle_history?: BattleRecord[]
}

export interface ProficiencyOutput {
    proficiency: number  // 0-100
    confidence: 'low' | 'medium' | 'high'
    breakdown: {
        selfReported: number
        testPerformance: number
        battlePerformance: number
        weights: {
            self: number
            test: number
            battle: number
        }
    }
}

/**
 * Calculate user proficiency score with dynamic weighting
 */
export function calculateProficiency(data: ProficiencyInput): ProficiencyOutput {
    // 1. Normalize self-reported level (0-100)
    const selfReported = (data.mock_exam_level / 15) * 100

    // 2. Calculate test accuracy (0-100)
    const testAccuracy = (data.challenge_score / data.challenge_results.length) * 100

    // 3. Calculate test speed coefficient (fast correct answers = true mastery)
    const correctResults = data.challenge_results.filter(r => r.isCorrect)
    const avgTime = correctResults.length > 0
        ? correctResults.reduce((sum, r) => sum + r.timeMs, 0) / correctResults.length
        : 15000

    // Speed bonus: <10s = +5, 10-15s = 0, >15s = -5
    const speedBonus = avgTime < 10000 ? 5 : avgTime < 15000 ? 0 : -5

    // 4. Calculate battle performance (if available)
    let battlePerformance = 0
    if (data.battle_history && data.battle_history.length > 0) {
        const battleAccuracy = data.battle_history.filter(b => b.isCorrect).length / data.battle_history.length * 100
        battlePerformance = battleAccuracy
    }

    // 5. Dynamic weighting
    const hasEnoughBattles = data.battle_history && data.battle_history.length >= 10
    const selfTestGap = Math.abs(selfReported - testAccuracy)

    // Dunning-Kruger Effect Detection:
    // 當自評與實測差距 > 30% 時,降低自評權重
    // 這通常表示用戶高估(能力不足者)或低估(imposter syndrome)自己
    let w_self = selfTestGap > 30 ? 0.1 : 0.3
    let w_test = 0.7
    let w_battle = 0

    if (hasEnoughBattles) {
        w_self = 0.2
        w_test = 0.3
        w_battle = 0.5
    }

    // 6. Calculate final proficiency
    const proficiency = (
        selfReported * w_self +
        (testAccuracy + speedBonus) * w_test +
        battlePerformance * w_battle
    )

    // 7. Determine confidence level
    const testQuestions = data.challenge_results.length
    const battleCount = data.battle_history?.length || 0

    let confidence: 'low' | 'medium' | 'high'
    // 有充分對戰數據 + 測試數據 = high confidence
    if (testQuestions >= 7 && battleCount >= 10) {
        confidence = 'high'  // 85% 信心
    }
    // 有足夠測試數據 OR 有一定對戰數據 = medium confidence
    else if (testQuestions >= 5 || battleCount >= 5) {
        confidence = 'medium'  // 70% 信心
    }
    // 數據不足 = low confidence
    else {
        confidence = 'low'  // 50% 信心
    }

    return {
        proficiency: Math.max(0, Math.min(100, Math.round(proficiency))),
        confidence,
        breakdown: {
            selfReported: Math.round(selfReported),
            testPerformance: Math.round(testAccuracy + speedBonus),
            battlePerformance: Math.round(battlePerformance),
            weights: {
                self: w_self,
                test: w_test,
                battle: w_battle
            }
        }
    }
}

/**
 * Calculate subject-specific proficiency
 */
export function calculateSubjectProficiency(
    subject: 'english' | 'math',
    data: ProficiencyInput
): ProficiencyOutput {
    // For now, use the same algorithm
    // In the future, we can add subject-specific adjustments
    return calculateProficiency(data)
}

/**
 * Convert proficiency (0-100) to exam score (0-15)
 */
export function proficiencyToExamScore(proficiency: number): number {
    return Math.round((proficiency / 100) * 15 * 10) / 10  // Round to 1 decimal
}

/**
 * Get proficiency level description
 */
export function getProficiencyDescription(proficiency: number): string {
    if (proficiency >= 90) return '頂尖程度'
    if (proficiency >= 75) return '優秀程度'
    if (proficiency >= 60) return '良好程度'
    if (proficiency >= 45) return '中等程度'
    if (proficiency >= 30) return '基礎程度'
    return '待加強'
}
