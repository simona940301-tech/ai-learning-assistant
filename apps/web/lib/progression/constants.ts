export const XP_CONFIG = {
  baseMatchXp: 10,
  correctAnswerXp: 2,
  winBonusXp: 10,
  lossFloorXp: 5,
  tutorialBonusXp: 30,
  maxDailyBuffMultiplier: 2,
}

export const LEVELING_CONFIG = {
  baseThreshold: 50,
  linearIncrement: 10,
  maxLevel: 200,
}

export const STREAK_CONFIG = {
  timezone: 'Asia/Taipei',
  resetHour: 4, // 4AM UTC+8 reset boundary
}

export const CHEST_CONFIG = {
  BRONZE: {
    gold: { min: 50, max: 100 },
    xp: { min: 20, max: 50 },
  },
  GOLD: {
    gold: { min: 150, max: 300 },
    xp: { min: 90, max: 160 },
    buff: { multiplier: 1.2, hours: 24 },
  },
} as const

export const INTERNAL_API_HEADER = 'x-internal-api-key'
