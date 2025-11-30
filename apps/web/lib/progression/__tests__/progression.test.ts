import { describe, it, expect } from 'vitest'
import { levelForXp } from '@/lib/progression/leveling'
import { updateStreak } from '@/lib/progression/streak'
import { computeMatchXp } from '@/lib/progression/xp'

describe('levelForXp', () => {
  it('returns level 1 for 0 xp', () => {
    const info = levelForXp(0)
    expect(info.level).toBe(1)
    expect(info.nextLevelXp).toBeGreaterThan(0)
  })

  it('increments level when xp surpasses threshold', () => {
    const info = levelForXp(55)
    expect(info.level).toBeGreaterThan(1)
  })
})

describe('updateStreak', () => {
  it('starts streak when there was none', () => {
    const result = updateStreak({ lastDayKey: null, count: 0 }, new Date('2024-02-01T00:00:00Z'))
    expect(result.streakCount).toBe(1)
    expect(result.hasProgress).toBe(true)
  })

  it('resets when gap larger than one day', () => {
    const result = updateStreak(
      { lastDayKey: '2024-02-01', count: 3 },
      new Date('2024-02-04T00:00:00Z'),
    )
    expect(result.streakCount).toBe(1)
    expect(result.brokeStreak).toBe(true)
  })
})

describe('computeMatchXp', () => {
  it('applies win bonus', () => {
    const result = computeMatchXp({
      correctAnswers: 5,
      totalQuestions: 10,
      didWin: true,
    })
    expect(result.totalXp).toBeGreaterThan(20)
  })

  it('enforces loss floor', () => {
    const result = computeMatchXp({
      correctAnswers: 0,
      totalQuestions: 10,
      didWin: false,
    })
    expect(result.totalXp).toBeGreaterThanOrEqual(5)
  })
})
