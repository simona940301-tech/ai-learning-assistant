import { getTimezoneDayKey, diffDays } from './utils'

export interface StreakState {
  lastDayKey: string | null
  count: number
}

export function updateStreak(state: StreakState, completedAt: Date | string): {
  streakCount: number
  updatedDayKey: string
  hasProgress: boolean
  brokeStreak: boolean
} {
  const { dayKey } = getTimezoneDayKey(completedAt)
  if (state.lastDayKey === dayKey) {
    return {
      streakCount: state.count,
      updatedDayKey: dayKey,
      hasProgress: false,
      brokeStreak: false,
    }
  }

  if (!state.lastDayKey || diffDays(state.lastDayKey, dayKey) > 1) {
    return {
      streakCount: 1,
      updatedDayKey: dayKey,
      hasProgress: true,
      brokeStreak: state.count > 0,
    }
  }

  return {
    streakCount: state.count + 1,
    updatedDayKey: dayKey,
    hasProgress: true,
    brokeStreak: false,
  }
}
