export type MatchMode = 'PVE_TUTORIAL' | 'PVE_TRAINING' | 'PVE_CHALLENGE' | 'PVP'

export interface BattleParticipantPayload {
  userId: string
  correctAnswers: number
  totalQuestions: number
  didWin: boolean
  mode: MatchMode
  answeredQuestions: number
  isPerfectGame?: boolean
  isPvp?: boolean
  currentPvpStreak?: number
  xpMultiplierOverride?: number
}

export interface BattleProgressionRequest {
  matchId: string
  matchMode: MatchMode
  subject?: string
  endedAt: string
  participants: BattleParticipantPayload[]
}

export interface ChestRewardPayload {
  chestId: string
  gold: number
  xp: number
  buff?: {
    multiplier: number
    hours: number
  } | null
}
