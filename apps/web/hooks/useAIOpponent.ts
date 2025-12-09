/**
 * useAIOpponent Hook
 * 
 * Production-grade AI opponent simulation for PVE battles.
 * Uses stable dependencies and proper cleanup to prevent timer issues.
 * 
 * @see apps/web/app/onboarding/challenge/page.tsx for reference implementation
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

export type OpponentStatus = 'idle' | 'thinking' | 'locked' | 'hit' | 'miss'

export interface AIOpponentConfig {
    /** Minimum delay before AI answers (ms) */
    minDelayMs?: number
    /** Random additional delay range (ms) */
    randomDelayMs?: number
    /** Probability of AI answering correctly (0-1) */
    correctRate?: number
}

export interface AIOpponentResult {
    status: OpponentStatus
    answer: 'A' | 'B' | 'C' | 'D' | null
    score: number
    resolveNow: () => void // New: Force immediate resolution
}

const DEFAULT_CONFIG = {
    minDelayMs: 8000,
    randomDelayMs: 8000,
    correctRate: 0.65,
} as const

/**
 * Hook to manage AI opponent behavior in PVE battles
 *
 * @param questionId - Unique ID of current question (triggers new simulation when changed)
 * @param correctAnswer - The correct answer for the question
 * @param difficulty - Question difficulty (affects score calculation)
 * @param isActive - Whether simulation should be active
 * @param config - Optional configuration overrides
 */
export function useAIOpponent(
    questionId: string | undefined,
    correctAnswer: 'A' | 'B' | 'C' | 'D',
    difficulty: number,
    isActive: boolean,
    config: AIOpponentConfig = {}
): AIOpponentResult {
    const [status, setStatus] = useState<OpponentStatus>('idle')
    const [answer, setAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
    const [score, setScore] = useState(0)

    // 🎯 SOTA: Stable config
    const stableConfig = useMemo(
        () => ({
            minDelayMs: config.minDelayMs ?? DEFAULT_CONFIG.minDelayMs,
            randomDelayMs: config.randomDelayMs ?? DEFAULT_CONFIG.randomDelayMs,
            correctRate: config.correctRate ?? DEFAULT_CONFIG.correctRate,
        }),
        [config.minDelayMs, config.randomDelayMs, config.correctRate]
    )

    const timersRef = useRef<NodeJS.Timeout[]>([])
    const currentQuestionRef = useRef<string | null>(null)
    const pendingResultRef = useRef<{
        status: OpponentStatus,
        answer: 'A' | 'B' | 'C' | 'D',
        score: number
    } | null>(null)

    // Helper: Determine result (Quantum State - determined at start but revealed later)
    const determineResult = useCallback(() => {
        const isCorrect = Math.random() < stableConfig.correctRate
        const wrongOptions = (['A', 'B', 'C', 'D'] as const).filter(
            (opt) => opt !== correctAnswer
        )
        const finalAnswer = isCorrect
            ? correctAnswer
            : wrongOptions[Math.floor(Math.random() * wrongOptions.length)]

        // Calculate score
        const baseScore = Math.max(50, Math.min(200, 50 + difficulty * 15))
        // AI score varies slightly to feel human
        const speedBonus = isCorrect ? Math.random() * 0.3 + 1.0 : 1.0
        const finalScore = isCorrect ? Math.round(baseScore * speedBonus) : 0

        return {
            status: isCorrect ? 'hit' : 'miss' as OpponentStatus,
            answer: finalAnswer,
            score: finalScore
        }
    }, [correctAnswer, difficulty, stableConfig.correctRate])

    // Reset state when question changes
    useEffect(() => {
        if (questionId && questionId !== currentQuestionRef.current) {
            setStatus('idle')
            setAnswer(null)
            setScore(0)
            pendingResultRef.current = null
            currentQuestionRef.current = questionId
        }
    }, [questionId])

    // Main simulation effect
    useEffect(() => {
        // Guard clauses
        if (!isActive || !questionId) {
            return
        }

        // Only start if not already processing this question (or if reset)
        // We use status === 'thinking' as a flag that simulation is running
        if (status !== 'idle') {
            return
        }

        console.log('[useAIOpponent] 🤖 Starting simulation for question:', questionId)

        // 1. Determine the result immediately (Quantum State)
        const result = determineResult()
        pendingResultRef.current = result

        // Clear any existing timers
        timersRef.current.forEach(timer => clearTimeout(timer))
        timersRef.current = []

        // Set thinking status immediately
        setStatus('thinking')

        // Calculate delay
        const randomDelay = Math.random() * stableConfig.randomDelayMs
        const totalDelay = stableConfig.minDelayMs + randomDelay

        console.log(`[useAIOpponent] ⏱️ AI thinking for ${Math.round(totalDelay)}ms`, {
            targetResult: result.status
        })

        // Schedule the answer
        const timer = setTimeout(() => {
            console.log('[useAIOpponent] 💡 AI answering now (timer expired)')
            setAnswer(result.answer)
            setStatus(result.status)
            setScore(result.score)
        }, totalDelay)

        timersRef.current.push(timer)

        return () => {
            console.log('[useAIOpponent] 🧹 Cleaning up timers for question:', questionId)
            timersRef.current.forEach(t => clearTimeout(t))
            timersRef.current = []
        }
    }, [questionId, isActive, stableConfig, difficulty, correctAnswer, determineResult, status])

    // 🚀 SOTA: Force Immediate Resolution
    const resolveNow = useCallback(() => {
        if (!pendingResultRef.current) {
            // Fallback if simulation hadn't started (shouldn't happen in active battle)
            console.warn('[useAIOpponent] Force resolve called but no pending result')
            const result = determineResult()
            setAnswer(result.answer)
            setStatus(result.status)
            setScore(result.score)
            return
        }

        console.log('[useAIOpponent] ⚡️ INSTANT RESOLVE TRIGGERED (Speed Blitz)')

        // Clear all timers
        timersRef.current.forEach(t => clearTimeout(t))
        timersRef.current = []

        // Apply result immediately
        const result = pendingResultRef.current
        setAnswer(result.answer)
        setStatus(result.status)
        setScore(result.score)
    }, [determineResult])

    return { status, answer, score, resolveNow }
}
