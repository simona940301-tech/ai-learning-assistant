import { describe, it, expect } from 'vitest'
import { predictScore, generateEncouragingMessage, generateRecommendations } from '../prediction-engine'

describe('Prediction Engine', () => {
    describe('predictScore', () => {
        it('should predict realistic improvement for basic level', () => {
            const result = predictScore({
                currentScore: 6,
                recentAccuracy: 0.7,
                dailyQuestions: 10,
                daysFromNow: 14
            })

            expect(result.predictedScore).toBeGreaterThan(6)
            expect(result.predictedScore).toBeLessThanOrEqual(9)  // Max +3 for basic level
            expect(result.isRealistic).toBe(true)
            expect(result.confidence).toBeGreaterThan(0.5)
        })

        it('should apply ceiling effect for high scores', () => {
            const result = predictScore({
                currentScore: 13,
                recentAccuracy: 0.9,
                dailyQuestions: 20,
                daysFromNow: 14
            })

            expect(result.predictedScore).toBeLessThanOrEqual(14)  // Max +1 for high level
            expect(result.isRealistic).toBe(true)
        })

        it('should increase improvement with more practice', () => {
            const lowPractice = predictScore({
                currentScore: 10,
                recentAccuracy: 0.7,
                dailyQuestions: 5,
                daysFromNow: 14
            })

            const highPractice = predictScore({
                currentScore: 10,
                recentAccuracy: 0.7,
                dailyQuestions: 20,
                daysFromNow: 14
            })

            expect(highPractice.predictedScore).toBeGreaterThan(lowPractice.predictedScore)
        })

        it('should have higher confidence with more days of data', () => {
            const shortTerm = predictScore({
                currentScore: 10,
                recentAccuracy: 0.7,
                dailyQuestions: 10,
                daysFromNow: 3
            })

            const longTerm = predictScore({
                currentScore: 10,
                recentAccuracy: 0.7,
                dailyQuestions: 10,
                daysFromNow: 14
            })

            expect(longTerm.confidence).toBeGreaterThan(shortTerm.confidence)
        })
    })

    describe('generateEncouragingMessage', () => {
        it('should generate improving message for positive trend', () => {
            const message = generateEncouragingMessage({
                currentScore: 10,
                predictedScore: 11,
                targetUniversity: '台灣大學',
                targetDepartment: '資訊工程學系',
                daysRemaining: 14
            })

            expect(message).toBeTruthy()
            expect(message.length).toBeGreaterThan(0)
        })

        it('should generate stable message for no change', () => {
            const message = generateEncouragingMessage({
                currentScore: 10,
                predictedScore: 10.2,
                targetUniversity: '台灣大學',
                targetDepartment: '資訊工程學系',
                daysRemaining: 14
            })

            expect(message).toBeTruthy()
        })
    })

    describe('generateRecommendations', () => {
        it('should recommend focusing on weak concepts', () => {
            const recommendations = generateRecommendations({
                weakConcepts: [
                    { concept: '虛擬語氣', errorRate: 0.6 },
                    { concept: '過去完成式', errorRate: 0.4 }
                ],
                currentPracticeRate: 10
            })

            expect(recommendations.length).toBeGreaterThan(0)
            expect(recommendations[0].type).toBe('focus_concept')
            expect(recommendations[0].concept).toBe('虛擬語氣')
        })

        it('should recommend increasing practice if below optimal', () => {
            const recommendations = generateRecommendations({
                weakConcepts: [],
                currentPracticeRate: 5
            })

            const practiceRec = recommendations.find(r => r.type === 'increase_practice')
            expect(practiceRec).toBeDefined()
            expect(practiceRec?.target).toBeGreaterThan(5)
        })
    })
})
