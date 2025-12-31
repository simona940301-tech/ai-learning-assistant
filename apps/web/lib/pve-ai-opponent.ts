/**
 * PVE AI Opponent Simulation Module
 * 
 * Provides realistic AI opponent behavior for PVE battles,
 * based on the proven onboarding challenge implementation.
 */

export type OpponentStatus = 'idle' | 'thinking' | 'locked' | 'hit' | 'miss'

export interface AIOpponentConfig {
    /** Minimum delay before AI answers (ms) */
    minDelayMs?: number
    /** Random additional delay range (ms) */
    randomDelayMs?: number
    /** Probability of AI answering correctly (0-1) */
    correctRate?: number
    /** Quick response delay if player answers fast (ms) */
    quickResponseDelayMs?: number
    /** Threshold for "fast" player answer (ms) */
    fastAnswerThresholdMs?: number
}

export interface AIAnswerResult {
    answer: 'A' | 'B' | 'C' | 'D'
    isCorrect: boolean
    delayMs: number
}

const DEFAULT_CONFIG: Required<AIOpponentConfig> = {
    minDelayMs: 12000,
    randomDelayMs: 8000,
    correctRate: 0.6,
    quickResponseDelayMs: 2000,
    fastAnswerThresholdMs: 12000,
}

/**
 * Simulates AI opponent answering a question
 * 
 * @param correctAnswer The correct answer to the question
 * @param config AI behavior configuration
 * @param onStatusChange Callback when AI status changes
 * @param playerAnsweredAt Optional timestamp when player answered (for quick response)
 * @returns Promise that resolves with AI answer result
 */
export function simulateAIAnswer(
    correctAnswer: 'A' | 'B' | 'C' | 'D',
    config: AIOpponentConfig = {},
    onStatusChange: (status: OpponentStatus, answer?: 'A' | 'B' | 'C' | 'D') => void,
    playerAnsweredAt?: number
): Promise<AIAnswerResult> {
    const cfg = { ...DEFAULT_CONFIG, ...config }
    const questionStartTime = Date.now()

    return new Promise((resolve) => {
        let aiAnswered = false
        let thinkingTimer: NodeJS.Timeout | null = null
        let settleTimer: NodeJS.Timeout | null = null
        let checkPlayerInterval: NodeJS.Timeout | null = null

        // Set initial status
        onStatusChange('thinking')

        // Calculate base delay
        const randomDelay = Math.random() * cfg.randomDelayMs
        const baseDelay = cfg.minDelayMs + randomDelay

        console.log('[AI Opponent] Calculated delays:', {
            minDelayMs: cfg.minDelayMs,
            randomDelayMs: cfg.randomDelayMs,
            randomDelay,
            baseDelay,
            baseDelaySeconds: (baseDelay / 1000).toFixed(1)
        })

        // Main AI answer logic
        const executeAnswer = (delay: number) => {
            console.log('[AI Opponent] Setting timer for', (delay / 1000).toFixed(1), 'seconds')
            thinkingTimer = setTimeout(() => {
                if (aiAnswered) return
                aiAnswered = true
                console.log('[AI Opponent] Timer fired! Answering now')

                // Determine if AI answers correctly
                const willAnswerCorrect = Math.random() < cfg.correctRate

                // Generate answer
                let answer: 'A' | 'B' | 'C' | 'D'
                if (willAnswerCorrect) {
                    answer = correctAnswer
                } else {
                    const wrongOptions = (['A', 'B', 'C', 'D'] as const).filter(
                        (opt) => opt !== correctAnswer
                    )
                    answer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
                }

                // Lock in answer
                onStatusChange('locked', answer)

                // Settle and show result
                settleTimer = setTimeout(() => {
                    const isCorrect = answer === correctAnswer
                    onStatusChange(isCorrect ? 'hit' : 'miss', answer)

                    resolve({
                        answer,
                        isCorrect,
                        delayMs: delay,
                    })
                }, 600)
            }, delay)
        }

        // Start with base delay
        executeAnswer(baseDelay)

        // Check if player answers quickly
        if (playerAnsweredAt !== undefined) {
            checkPlayerInterval = setInterval(() => {
                if (aiAnswered) {
                    clearInterval(checkPlayerInterval!)
                    return
                }

                const elapsed = Date.now() - questionStartTime
                const playerElapsed = playerAnsweredAt - questionStartTime

                // If player answered quickly, AI responds faster
                if (playerElapsed < cfg.fastAnswerThresholdMs && elapsed >= playerElapsed) {
                    clearInterval(checkPlayerInterval!)
                    if (thinkingTimer) clearTimeout(thinkingTimer)

                    const quickDelay = cfg.quickResponseDelayMs + Math.random() * 1000
                    executeAnswer(quickDelay)
                }
            }, 100)
        }

        // Cleanup function (not exposed, but timers will be cleared when promise resolves)
    })
}

/**
 * Creates a cleanup function for AI simulation
 * Use this to cancel ongoing AI simulation when component unmounts
 */
export function createAISimulationCleanup() {
    const timers: NodeJS.Timeout[] = []

    return {
        addTimer: (timer: NodeJS.Timeout) => timers.push(timer),
        cleanup: () => timers.forEach((t) => clearTimeout(t)),
    }
}

/**
 * Calculate AI score based on answer result
 * Similar to player scoring but with slight variations
 */
export function calculateAIScore(
    isCorrect: boolean,
    difficulty: number,
    currentStreak: number
): number {
    if (!isCorrect) return 0

    const baseScore = Math.max(50, Math.min(200, 50 + difficulty * 15))

    // AI gets slightly lower speed bonus (0.55-0.8 range)
    const speedVariation = 0.55 + Math.random() * 0.25

    // Combo coefficient
    let comboCoef = 1.0
    if (currentStreak >= 2) comboCoef += 0.1
    if (currentStreak >= 3) comboCoef += 0.1
    if (currentStreak >= 5) comboCoef += 0.1

    return Math.round(baseScore * speedVariation * comboCoef)
}
