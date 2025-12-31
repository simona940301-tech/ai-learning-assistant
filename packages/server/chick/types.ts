export type ChickEmotion = 'normal' | 'cold' | 'distant' | 'hibernate' | 'sick' | 'runaway' | 'meditate'

export type ChickMessageType =
  | 'S1' | 'S2' | 'S3'
  | 'POSITIVE'
  | 'POKE_IDLE'
  | 'POKE_BUSY'
  | 'IDLE_ENCOURAGE_BATTLE'
  | 'IDLE_REVIEW_MISTAKES'
  | 'BATTLE_ENCOURAGEMENT'
  | 'BATTLE_VICTORY'
  | 'BATTLE_LEARNING'
  | 'MILESTONE'
  | 'STREAK'
  | 'FEEDING_YUMMY'
  | 'EXPLORATION_RETURN'

export interface ChickState {
  iq: number
  fatigue: number
  emotionState: ChickEmotion
  iqLastDecayAt?: string | null
  explanationsUsed?: number
  explanationsResetAt?: string | null
  fatigueBattleCounter?: number
  sootheUsed?: number
  sootheResetAt?: string | null
  emotionUpdatedAt?: string | null
  lastLoginAt?: string | null
}

export interface ChickMessage {
  id: string
  user_id: string
  type: ChickMessageType
  text: string
  state_snapshot: Record<string, unknown> | null
  created_at: string
  read_at: string | null
}

export interface ChickMessageCandidate {
  type: ChickMessageType
  text?: string
  stateSnapshot?: Partial<ChickState> | null
}
