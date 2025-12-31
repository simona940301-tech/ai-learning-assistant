import { LEVELING_CONFIG } from './constants'

export interface LevelProgress {
  level: number
  currentXp: number
  currentLevelFloor: number
  nextLevelXp: number
  progressPct: number
}

export function xpForLevel(level: number) {
  if (level <= 1) return 0
  const { baseThreshold, linearIncrement } = LEVELING_CONFIG
  let xp = 0
  for (let lv = 1; lv < level; lv += 1) {
    xp += baseThreshold + (lv - 1) * linearIncrement
  }
  return xp
}

export function levelForXp(xp: number): LevelProgress {
  const cappedXp = Math.max(0, xp)
  let level = 1
  let floor = 0
  let next = LEVELING_CONFIG.baseThreshold

  while (cappedXp >= next && level < LEVELING_CONFIG.maxLevel) {
    level += 1
    floor = next
    const step = LEVELING_CONFIG.baseThreshold + (level - 1) * LEVELING_CONFIG.linearIncrement
    next += step
  }

  const span = next - floor
  const gained = cappedXp - floor
  const progressPct = span > 0 ? Math.min(1, gained / span) : 0

  return {
    level,
    currentXp: cappedXp,
    currentLevelFloor: floor,
    nextLevelXp: next,
    progressPct,
  }
}
