import {
    simulateEnglishGrade,
    calculateMockExamAdjustment,
    calculateDreamSchoolReadyScore,
    calculateEnglishReadyScore,
    PerformanceData,
    SkillPerformanceResult
} from '../dream-school-calculator'
import { EnglishRequirement, SkillWeights } from '../taiwan-universities'

describe('Dream School Calculator V3.5', () => {

    const mockReq: EnglishRequirement = {
        requiredGradeLevel: 13,
        passScore: 60,
        excellentScore: 90
    }

    describe('simulateEnglishGrade', () => {
        it('should return 15 for accuracy >= 92%', () => {
            const data: PerformanceData = { weightedAccuracy: 0.92, totalQuestions: 100, avgResponseTimeMs: 5000 }
            expect(simulateEnglishGrade(data)).toBeCloseTo(15, 1)
        })

        it('should handle low volume penalty', () => {
            // 15 questions (half of 30) -> score should be halved? 
            // Logic: U_grade * (15/30)
            const data: PerformanceData = { weightedAccuracy: 0.92, totalQuestions: 15, avgResponseTimeMs: 5000 }
            // Base grade 15. Volume factor 0.5. Result 7.5
            expect(simulateEnglishGrade(data)).toBeCloseTo(7.5, 1)
        })
    })

    describe('calculateEnglishReadyScore', () => {
        it('should map grade 13 to pass score 60', () => {
            const score = calculateEnglishReadyScore(13, mockReq, 5000)
            expect(score).toBeCloseTo(60, 1)
        })

        it('should map grade 15 to excellent score 90', () => {
            const score = calculateEnglishReadyScore(15, mockReq, 5000)
            expect(score).toBeCloseTo(90, 1)
        })

        it('should apply time penalty', () => {
            // 45000ms -> max penalty 0.92 factor
            const score = calculateEnglishReadyScore(15, mockReq, 45000)
            // 90 * 0.92 = 82.8
            expect(score).toBeCloseTo(82.8, 1)
        })
    })

    describe('calculateDreamSchoolReadyScore', () => {
        const weights: SkillWeights = { vocabulary: 1.0 }

        it('should calculate aggregated score correctly', () => {
            const vocabPerf: PerformanceData = { weightedAccuracy: 0.92, totalQuestions: 100, avgResponseTimeMs: 5000 }
            const vocabGrade = simulateEnglishGrade(vocabPerf) // 15
            const vocabScore = calculateEnglishReadyScore(vocabGrade, mockReq, 5000) // 90

            const skillResults: SkillPerformanceResult[] = [{
                skillName: 'vocabulary',
                performance: vocabPerf,
                grade: vocabGrade,
                readyScore: vocabScore
            }]

            const result = calculateDreamSchoolReadyScore({
                skillResults,
                skillWeights: weights,
                mockExamLevel: 15, // Match
                streak: 20, // +7 boost
                eloRank: 1000, // Top 10% -> +3 boost
                minReadyScore: 100,
                englishRequirement: mockReq
            })

            // Academic: 90
            // Mock Adj: 1.0 (15 vs 15)
            // Boost: 7 + 3 = 10
            // Final: 90 * 1.0 + 10 = 100
            // ReadyPct: 100%

            expect(result.userFinalScore).toBeCloseTo(100, 1)
            expect(result.readyPct).toBeCloseTo(100, 1)
        })
    })
})
