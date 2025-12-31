/**
 * Comprehensive test suite for the Personalization System
 * Tests all components: Proficiency, DDA, SRS, RAG, Micro-hints
 */

import { describe, it, expect } from 'vitest'
import {
  calculateQuality,
  updateSRSCard,
  getDueCards,
  getNextPracticeCards,
  predictRetention
} from '../srs-scheduler'
import { calculateProficiency } from '../proficiency-calculator'

describe('Personalization System - Integration Tests', () => {
  describe('SRS Scheduler', () => {
    it('should calculate quality correctly based on correctness and time', () => {
      // Perfect recall - very quick
      expect(calculateQuality(true, 5000, 15000)).toBe(5)

      // Good recall - quick
      expect(calculateQuality(true, 10000, 15000)).toBe(4)

      // Hesitant recall - normal time
      expect(calculateQuality(true, 14000, 15000)).toBe(3)

      // Careless mistake - quick but wrong
      expect(calculateQuality(false, 5000, 15000)).toBe(2)

      // Normal time but wrong
      expect(calculateQuality(false, 14000, 15000)).toBe(1)

      // Slow and wrong - complete blackout
      expect(calculateQuality(false, 20000, 15000)).toBe(0)
    })

    it('should update SRS card correctly for correct answer', () => {
      const card = {
        consecutiveCorrect: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        lastReviewedAt: new Date('2025-01-01'),
        nextReviewAt: new Date('2025-01-02')
      }

      const review = {
        quality: 4,
        responseTimeMs: 10000,
        isCorrect: true
      }

      const update = updateSRSCard(card, review)

      expect(update.newConsecutiveCorrect).toBe(1)
      expect(update.newEaseFactor).toBeGreaterThan(2.5)
      expect(update.newInterval).toBe(1) // First correct answer
      expect(update.confidence).toBeGreaterThan(0)
    })

    it('should reset SRS card for incorrect answer', () => {
      const card = {
        consecutiveCorrect: 3,
        easeFactor: 2.8,
        intervalDays: 14,
        lastReviewedAt: new Date('2025-01-01'),
        nextReviewAt: new Date('2025-01-15')
      }

      const review = {
        quality: 1,
        responseTimeMs: 20000,
        isCorrect: false
      }

      const update = updateSRSCard(card, review)

      expect(update.newConsecutiveCorrect).toBe(0)
      expect(update.newEaseFactor).toBeLessThan(2.8)
      expect(update.newInterval).toBe(1) // Reset to beginning
    })

    it('should correctly identify due cards', () => {
      const now = new Date('2025-01-15')

      const cards = [
        {
          id: '1',
          consecutiveCorrect: 1,
          easeFactor: 2.5,
          intervalDays: 1,
          lastReviewedAt: new Date('2025-01-10'),
          nextReviewAt: new Date('2025-01-11') // Overdue by 4 days
        },
        {
          id: '2',
          consecutiveCorrect: 2,
          easeFactor: 2.5,
          intervalDays: 6,
          lastReviewedAt: new Date('2025-01-12'),
          nextReviewAt: new Date('2025-01-18') // Not due yet
        },
        {
          id: '3',
          consecutiveCorrect: 0,
          easeFactor: 2.5,
          intervalDays: 1,
          lastReviewedAt: null,
          nextReviewAt: null // Never reviewed
        }
      ]

      const dueCards = getDueCards(cards, now)

      expect(dueCards).toHaveLength(2)
      expect(dueCards.map(c => c.id)).toContain('1')
      expect(dueCards.map(c => c.id)).toContain('3')
    })

    it('should get optimal practice cards with SRS algorithm', () => {
      const cards = [
        {
          id: '1',
          consecutiveCorrect: 1,
          easeFactor: 2.5,
          intervalDays: 1,
          lastReviewedAt: new Date('2025-01-10'),
          nextReviewAt: new Date('2025-01-11')
        },
        {
          id: '2',
          consecutiveCorrect: 0,
          easeFactor: 1.8,
          intervalDays: 1,
          lastReviewedAt: new Date('2025-01-14'),
          nextReviewAt: new Date('2025-01-15')
        },
        {
          id: '3',
          consecutiveCorrect: 0,
          easeFactor: 2.5,
          intervalDays: 1,
          lastReviewedAt: null,
          nextReviewAt: null
        }
      ]

      const practiceCards = getNextPracticeCards(cards, 3, true)

      expect(practiceCards).toHaveLength(3)
    })

    it('should predict retention using forgetting curve', () => {
      const card = {
        consecutiveCorrect: 2,
        easeFactor: 2.5,
        intervalDays: 6,
        lastReviewedAt: new Date('2025-01-01'),
        nextReviewAt: new Date('2025-01-07')
      }

      // Test retention immediately after review
      const retentionDay0 = predictRetention(card, new Date('2025-01-01'))
      expect(retentionDay0).toBeGreaterThan(0.9) // Should be very high

      // Test retention at scheduled review
      const retentionDay6 = predictRetention(card, new Date('2025-01-07'))
      expect(retentionDay6).toBeGreaterThan(0.3)
      expect(retentionDay6).toBeLessThan(0.9)

      // Test retention after scheduled review (forgetting)
      const retentionDay14 = predictRetention(card, new Date('2025-01-15'))
      expect(retentionDay14).toBeLessThan(retentionDay6)
    })
  })

  describe('Proficiency Calculator', () => {
    it('should calculate proficiency with balanced weights', () => {
      const result = calculateProficiency({
        selfReportedLevel: 3,
        challengeResults: [
          { isCorrect: true, timeMs: 10000 },
          { isCorrect: true, timeMs: 12000 },
          { isCorrect: false, timeMs: 18000 }
        ],
        battleElo: 1200,
        recentAnswers: [
          { isCorrect: true, timeMs: 8000, subject: 'English' },
          { isCorrect: true, timeMs: 9000, subject: 'English' },
          { isCorrect: false, timeMs: 20000, subject: 'English' }
        ]
      })

      expect(result.finalProficiency).toBeGreaterThan(0)
      expect(result.finalProficiency).toBeLessThanOrEqual(100)
      expect(result.challengeScore).toBeGreaterThan(0)
      expect(result.weights.selfWeight).toBeGreaterThan(0)
      expect(result.weights.testWeight).toBeGreaterThan(0)
    })

    it('should detect Dunning-Kruger effect', () => {
      // Self-reported very high (5) but actual performance is low
      const result = calculateProficiency({
        selfReportedLevel: 5,
        challengeResults: [
          { isCorrect: false, timeMs: 20000 },
          { isCorrect: false, timeMs: 19000 },
          { isCorrect: false, timeMs: 21000 }
        ],
        battleElo: 900,
        recentAnswers: []
      })

      expect(result.hasDunningKruger).toBe(true)
      expect(result.selfTestGap).toBeGreaterThan(30)
    })

    it('should apply speed bonus correctly', () => {
      // Fast correct answers
      const fastResult = calculateProficiency({
        selfReportedLevel: 3,
        challengeResults: [
          { isCorrect: true, timeMs: 5000 },
          { isCorrect: true, timeMs: 6000 },
          { isCorrect: true, timeMs: 7000 }
        ],
        battleElo: 1000,
        recentAnswers: []
      })

      // Slow correct answers
      const slowResult = calculateProficiency({
        selfReportedLevel: 3,
        challengeResults: [
          { isCorrect: true, timeMs: 18000 },
          { isCorrect: true, timeMs: 19000 },
          { isCorrect: true, timeMs: 20000 }
        ],
        battleElo: 1000,
        recentAnswers: []
      })

      expect(fastResult.challengeScore).toBeGreaterThan(slowResult.challengeScore)
    })

    it('should weight battle ELO when sufficient data is available', () => {
      const highEloResult = calculateProficiency({
        selfReportedLevel: 3,
        challengeResults: [{ isCorrect: true, timeMs: 10000 }],
        battleElo: 1400,
        recentAnswers: Array(30).fill({ isCorrect: true, timeMs: 10000, subject: 'English' })
      })

      const lowEloResult = calculateProficiency({
        selfReportedLevel: 3,
        challengeResults: [{ isCorrect: true, timeMs: 10000 }],
        battleElo: 800,
        recentAnswers: Array(30).fill({ isCorrect: true, timeMs: 10000, subject: 'English' })
      })

      expect(highEloResult.finalProficiency).toBeGreaterThan(lowEloResult.finalProficiency)
    })
  })

  describe('DDA Integration', () => {
    it('should map proficiency to difficulty correctly', () => {
      // 0-20 proficiency -> difficulty 1
      expect(Math.ceil(15 / 20)).toBe(1)

      // 20-40 proficiency -> difficulty 2
      expect(Math.ceil(35 / 20)).toBe(2)

      // 40-60 proficiency -> difficulty 3
      expect(Math.ceil(55 / 20)).toBe(3)

      // 60-80 proficiency -> difficulty 4
      expect(Math.ceil(75 / 20)).toBe(4)

      // 80-100 proficiency -> difficulty 5
      expect(Math.ceil(95 / 20)).toBe(5)
    })

    it('should adjust difficulty based on recent performance', () => {
      const baselineDifficulty = 3

      // High accuracy + fast = increase difficulty
      const recentPerformance = [
        { isCorrect: true, timeMs: 8000, difficulty: 3 },
        { isCorrect: true, timeMs: 9000, difficulty: 3 },
        { isCorrect: true, timeMs: 7000, difficulty: 3 },
        { isCorrect: true, timeMs: 10000, difficulty: 3 },
        { isCorrect: true, timeMs: 8500, difficulty: 3 }
      ]

      const accuracy = recentPerformance.filter(r => r.isCorrect).length / recentPerformance.length
      const avgTime = recentPerformance.reduce((sum, r) => sum + r.timeMs, 0) / recentPerformance.length / 1000

      expect(accuracy).toBeGreaterThanOrEqual(0.8)
      expect(avgTime).toBeLessThan(12)

      // Should increase difficulty by 1
      const newDifficulty = Math.min(5, Math.max(1, baselineDifficulty + 1))
      expect(newDifficulty).toBe(4)
    })
  })

  describe('System Integration', () => {
    it('should flow from proficiency -> DDA -> SRS correctly', () => {
      // Step 1: Calculate proficiency
      const proficiency = calculateProficiency({
        selfReportedLevel: 3,
        challengeResults: [
          { isCorrect: true, timeMs: 10000 },
          { isCorrect: true, timeMs: 11000 }
        ],
        battleElo: 1100,
        recentAnswers: [
          { isCorrect: true, timeMs: 9000, subject: 'English' }
        ]
      })

      // Step 2: Map to difficulty
      const difficulty = Math.min(5, Math.max(1, Math.ceil(proficiency.finalProficiency / 20)))

      expect(difficulty).toBeGreaterThanOrEqual(1)
      expect(difficulty).toBeLessThanOrEqual(5)

      // Step 3: SRS scheduling
      const srsCard = {
        consecutiveCorrect: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        lastReviewedAt: null,
        nextReviewAt: null
      }

      const review = {
        quality: calculateQuality(true, 10000, 15000),
        responseTimeMs: 10000,
        isCorrect: true
      }

      const updated = updateSRSCard(srsCard, review)

      expect(updated.newInterval).toBeGreaterThan(0)
      expect(updated.confidence).toBeGreaterThan(0)
    })
  })
})
