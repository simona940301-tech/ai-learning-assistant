import { describe, it, expect } from 'vitest'
import { calculateProficiency, proficiencyToExamScore, getProficiencyDescription } from '../proficiency-calculator'

describe('Proficiency Calculator', () => {
    describe('calculateProficiency', () => {
        it('should calculate proficiency with only self-report and test data', () => {
            const result = calculateProficiency({
                mock_exam_level: 10,  // Self-report: 10/15 = 66.7%
                challenge_score: 5,   // Test: 5/7 = 71.4%
                challenge_results: [
                    { isCorrect: true, timeMs: 8000 },
                    { isCorrect: true, timeMs: 9000 },
                    { isCorrect: true, timeMs: 12000 },
                    { isCorrect: true, timeMs: 11000 },
                    { isCorrect: true, timeMs: 10000 },
                    { isCorrect: false, timeMs: 20000 },
                    { isCorrect: false, timeMs: 18000 },
                ]
            })

            expect(result.proficiency).toBeGreaterThan(60)
            expect(result.proficiency).toBeLessThan(80)
            expect(result.confidence).toBe('medium')
            expect(result.breakdown.weights.self).toBe(0.3)
            expect(result.breakdown.weights.test).toBe(0.7)
        })

        it('should detect Dunning-Kruger effect and lower self-report weight', () => {
            const result = calculateProficiency({
                mock_exam_level: 14,  // Self-report: very high (93%)
                challenge_score: 3,   // Test: low (43%)
                challenge_results: [
                    { isCorrect: true, timeMs: 18000 },
                    { isCorrect: true, timeMs: 19000 },
                    { isCorrect: true, timeMs: 17000 },
                    { isCorrect: false, timeMs: 20000 },
                    { isCorrect: false, timeMs: 20000 },
                    { isCorrect: false, timeMs: 20000 },
                    { isCorrect: false, timeMs: 20000 },
                ]
            })

            // Gap > 30%, so self-weight should be 0.1
            expect(result.breakdown.weights.self).toBe(0.1)
            expect(result.breakdown.weights.test).toBe(0.7)
            // Proficiency should be closer to test score
            expect(result.proficiency).toBeLessThan(60)
        })

        it('should prioritize battle history when available', () => {
            const result = calculateProficiency({
                mock_exam_level: 10,
                challenge_score: 5,
                challenge_results: Array(7).fill({ isCorrect: true, timeMs: 10000 }),
                battle_history: Array(15).fill({ isCorrect: true, difficulty: 3 })
            })

            expect(result.breakdown.weights.battle).toBe(0.5)
            expect(result.breakdown.weights.self).toBe(0.2)
            expect(result.breakdown.weights.test).toBe(0.3)
            expect(result.confidence).toBe('high')
        })

        it('should apply speed bonus for fast correct answers', () => {
            const fastResult = calculateProficiency({
                mock_exam_level: 10,
                challenge_score: 5,
                challenge_results: Array(7).fill(null).map((_, i) => ({
                    isCorrect: i < 5,
                    timeMs: i < 5 ? 8000 : 20000  // Fast correct answers
                }))
            })

            const slowResult = calculateProficiency({
                mock_exam_level: 10,
                challenge_score: 5,
                challenge_results: Array(7).fill(null).map((_, i) => ({
                    isCorrect: i < 5,
                    timeMs: i < 5 ? 18000 : 20000  // Slow correct answers
                }))
            })

            expect(fastResult.proficiency).toBeGreaterThan(slowResult.proficiency)
        })
    })

    describe('proficiencyToExamScore', () => {
        it('should convert proficiency to exam score', () => {
            expect(proficiencyToExamScore(100)).toBe(15)
            expect(proficiencyToExamScore(66.7)).toBe(10)
            expect(proficiencyToExamScore(50)).toBe(7.5)
            expect(proficiencyToExamScore(0)).toBe(0)
        })
    })

    describe('getProficiencyDescription', () => {
        it('should return correct descriptions', () => {
            expect(getProficiencyDescription(95)).toBe('頂尖程度')
            expect(getProficiencyDescription(80)).toBe('優秀程度')
            expect(getProficiencyDescription(65)).toBe('良好程度')
            expect(getProficiencyDescription(50)).toBe('中等程度')
            expect(getProficiencyDescription(35)).toBe('基礎程度')
            expect(getProficiencyDescription(20)).toBe('待加強')
        })
    })
})
