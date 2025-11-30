import { XP_CONFIG } from './constants'

export interface XpComputationInput {
  correctAnswers: number
  totalQuestions: number
  didWin: boolean
  isTutorial?: boolean
  xpMultiplier?: number
}

export interface XpComputationResult {
  baseXp: number
  totalXp: number
  appliedMultiplier: number
}

export function computeMatchXp(payload: XpComputationInput): XpComputationResult {
  const correct = Math.max(0, payload.correctAnswers || 0)
  const didWin = Boolean(payload.didWin)
  const base = XP_CONFIG.baseMatchXp + correct * XP_CONFIG.correctAnswerXp
  const victoryBonus = didWin ? XP_CONFIG.winBonusXp : 0
  let total = base + victoryBonus

  if (!didWin) {
    total = Math.max(total, XP_CONFIG.lossFloorXp)
  }

  if (payload.isTutorial) {
    total += XP_CONFIG.tutorialBonusXp
  }

  const multiplier = Math.min(payload.xpMultiplier || 1, XP_CONFIG.maxDailyBuffMultiplier)
  const boosted = Math.round(total * multiplier)

  return {
    baseXp: total,
    totalXp: boosted,
    appliedMultiplier: multiplier,
  }
}
