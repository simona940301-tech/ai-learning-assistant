/**
 * ChickReactor - 後端原子化事件處理模組
 * 
 * 職責：
 * 1. 監聽事件總線
 * 2. 根據事件類型原子化地更新電子雞狀態（IQ, Fatigue, Emotion）
 * 3. 生成對應的訊息候選
 * 
 * 設計原則：
 * - 單一職責：只負責狀態更新邏輯
 * - 與 API 路由解耦：可獨立測試
 * - 原子化處理：每個事件類型有明確的狀態變更規則
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { enqueueChickMessage } from './enqueue'
import { pickMessage } from './messages'
import type { ChickMessageType, ChickState, ChickEmotion } from './types'

export type ChickActionType =
  // 學習行為事件
  | 'BATTLE_END'
  | 'EXPLANATION_VIEWED'
  | 'WRONGBOOK_REVIEWED'
  | 'NOTE_SAVED'
  | 'STREAK_CONTINUE'
  | 'STREAK_BREAK'
  // 互動事件
  | 'POKE'
  | 'CHECK_STREAK'
  | 'IDLE_BATTLE'
  | 'IDLE_REVIEW'
  // 系統事件
  | 'LOGIN'
  | 'SOOTHE'

export interface ChickActionPayload {
  // Battle-specific
  battleResult?: 'win' | 'loss' | 'draw'
  questionsCorrect?: number
  questionsTotal?: number
  
  // Interaction-specific
  inBattle?: boolean
  lastInteraction?: number
  
  // Streak-specific
  streakDays?: number
  
  // Generic
  metadata?: Record<string, any>
}

export interface ChickStateUpdate {
  iqDelta: number
  fatigueDelta: number
  emotionChange?: ChickEmotion | null
  messageCandidates: Array<{
    type: ChickMessageType
    text?: string
  }>
}

export interface ChickReactorResult {
  ok: boolean
  stateUpdate: ChickStateUpdate
  newState: Partial<ChickState>
  message?: {
    id: string
    type: ChickMessageType
    text: string
  } | null
  error?: string
}

/**
 * ChickReactor - 原子化事件處理器
 */
export class ChickReactor {
  constructor(private client: SupabaseClient) {}

  /**
   * 處理事件並返回狀態更新計劃
   */
  async processAction(
    userId: string,
    actionType: ChickActionType,
    payload: ChickActionPayload,
    currentState: Partial<ChickState>
  ): Promise<ChickReactorResult> {
    try {
      // 計算狀態變更
      const stateUpdate = this.calculateStateUpdate(actionType, payload, currentState)

      // 應用狀態變更
      const newState = await this.applyStateUpdate(userId, currentState, stateUpdate)

      // 生成並儲存訊息
      const message = await this.generateMessage(userId, actionType, payload, stateUpdate, newState)

      return {
        ok: true,
        stateUpdate,
        newState,
        message,
      }
    } catch (error) {
      return {
        ok: false,
        stateUpdate: { iqDelta: 0, fatigueDelta: 0, messageCandidates: [] },
        newState: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 計算狀態變更（純函數，易於測試）
   */
  private calculateStateUpdate(
    actionType: ChickActionType,
    payload: ChickActionPayload,
    currentState: Partial<ChickState>
  ): ChickStateUpdate {
    const iq = currentState.iq ?? 5
    const fatigue = currentState.fatigue ?? 0
    const emotionState = currentState.emotionState ?? 'normal'

    let iqDelta = 0
    let fatigueDelta = 0
    let emotionChange: ChickEmotion | null = null
    const messageCandidates: Array<{ type: ChickMessageType; text?: string }> = []

    switch (actionType) {
      case 'BATTLE_END': {
        const result = payload.battleResult || 'draw'
        if (result === 'win') {
          iqDelta = 1 // +1 IQ per battle (capped at 10)
          fatigueDelta = 1 // Battle counter handled separately
          messageCandidates.push({ type: 'BATTLE_VICTORY' })
        } else if (result === 'loss') {
          iqDelta = 0
          fatigueDelta = 1
          messageCandidates.push({ type: 'BATTLE_LEARNING' })
        } else {
          iqDelta = 0
          fatigueDelta = 1
          messageCandidates.push({ type: 'BATTLE_LEARNING' })
        }
        break
      }

      case 'EXPLANATION_VIEWED': {
        const explanationsUsed = currentState.explanationsUsed ?? 0
        if (explanationsUsed < 3) {
          iqDelta = 1
          messageCandidates.push({ type: 'POSITIVE' })
        }
        break
      }

      case 'WRONGBOOK_REVIEWED': {
        iqDelta = 1
        messageCandidates.push({ type: 'POSITIVE' })
        break
      }

      case 'NOTE_SAVED': {
        iqDelta = 1
        messageCandidates.push({ type: 'POSITIVE' })
        break
      }

      case 'STREAK_CONTINUE': {
        const streakDays = payload.streakDays ?? 0
        if (streakDays >= 7) {
          iqDelta = 2
        } else if (streakDays >= 3) {
          iqDelta = 1
        }
        const template = pickMessage('STREAK')
        if (template) {
          messageCandidates.push({
            type: 'STREAK',
            text: template.replace('{streak}', streakDays.toString()),
          })
        }
        break
      }

      case 'STREAK_BREAK': {
        fatigueDelta = 1
        emotionChange = 'distant'
        messageCandidates.push({ type: 'S3' })
        break
      }

      case 'POKE': {
        const inBattle = payload.inBattle || false
        const lastInteraction = payload.lastInteraction || 0
        const timeSinceLastInteraction = Date.now() - lastInteraction

        // Debounce: if poked within 10 seconds, return empty
        if (timeSinceLastInteraction < 10000) {
          return { iqDelta: 0, fatigueDelta: 0, messageCandidates: [] }
        }

        messageCandidates.push({ type: inBattle ? 'POKE_BUSY' : 'POKE_IDLE' })
        break
      }

      case 'IDLE_BATTLE': {
        // Check state priority: S3 > S2 > S1 > idle
        const daysSinceLogin = this.calculateDaysSinceLogin(currentState.lastLoginAt)
        if (daysSinceLogin > 2) {
          messageCandidates.push({ type: 'S3' })
        } else if (fatigue >= 2) {
          messageCandidates.push({ type: 'S2' })
        } else if (iq <= 3) {
          messageCandidates.push({ type: 'S1' })
        } else {
          messageCandidates.push({ type: 'IDLE_ENCOURAGE_BATTLE' })
        }
        break
      }

      case 'IDLE_REVIEW': {
        const daysSinceLogin = this.calculateDaysSinceLogin(currentState.lastLoginAt)
        if (daysSinceLogin > 2) {
          messageCandidates.push({ type: 'S3' })
        } else if (fatigue >= 2) {
          messageCandidates.push({ type: 'S2' })
        } else if (iq <= 3) {
          messageCandidates.push({ type: 'S1' })
        } else {
          messageCandidates.push({ type: 'IDLE_REVIEW_MISTAKES' })
        }
        break
      }

      case 'CHECK_STREAK': {
        const streakDays = payload.streakDays ?? 0
        if (streakDays > 0) {
          const template = pickMessage('STREAK')
          if (template) {
            messageCandidates.push({
              type: 'STREAK',
              text: template.replace('{streak}', streakDays.toString()),
            })
          }
        }
        break
      }

      case 'LOGIN': {
        // Login itself doesn't change state, but triggers emotion recovery check
        break
      }

      case 'SOOTHE': {
        // Soothe handled separately in soothe API
        break
      }
    }

    return {
      iqDelta,
      fatigueDelta,
      emotionChange,
      messageCandidates,
    }
  }

  /**
   * 應用狀態更新到資料庫
   */
  private async applyStateUpdate(
    userId: string,
    currentState: Partial<ChickState>,
    update: ChickStateUpdate
  ): Promise<Partial<ChickState>> {
    const currentIQ = currentState.iq ?? 5
    const currentFatigue = currentState.fatigue ?? 0
    const currentEmotion = currentState.emotionState ?? 'normal'

    const newIQ = Math.max(0, Math.min(10, currentIQ + update.iqDelta))
    const newFatigue = Math.max(0, Math.min(3, currentFatigue + update.fatigueDelta))
    const newEmotion = update.emotionChange ?? currentEmotion

    const updatePayload: Record<string, any> = {
      chick_iq: newIQ,
      chick_fatigue: newFatigue,
      chick_emotion_state: newEmotion,
      last_login_at: new Date().toISOString(),
    }

    // Handle battle counter for fatigue
    if (update.fatigueDelta > 0 && update.iqDelta >= 0) {
      // Battle increases counter
      const currentCounter = currentState.fatigueBattleCounter ?? 0
      const nextCounter = currentCounter + 1
      if (nextCounter >= 5) {
        updatePayload.chick_fatigue = Math.min(3, currentFatigue + 1)
        updatePayload.chick_fatigue_battle_counter = 0
      } else {
        updatePayload.chick_fatigue_battle_counter = nextCounter
      }
    }

    const { error } = await this.client
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)

    if (error) {
      throw new Error(`Failed to update chick state: ${error.message}`)
    }

    return {
      iq: newIQ,
      fatigue: newFatigue,
      emotionState: newEmotion as ChickEmotion,
    }
  }

  /**
   * 生成並儲存訊息
   */
  private async generateMessage(
    userId: string,
    actionType: ChickActionType,
    payload: ChickActionPayload,
    stateUpdate: ChickStateUpdate,
    newState: Partial<ChickState>
  ) {
    if (stateUpdate.messageCandidates.length === 0) {
      return null
    }

    const snapshot = {
      iq: newState.iq ?? 0,
      fatigue: newState.fatigue ?? 0,
      emotionState: newState.emotionState ?? 'normal',
    }

    const message = await enqueueChickMessage({
      userId,
      candidates: stateUpdate.messageCandidates.map(c => ({
        type: c.type,
        text: c.text,
        stateSnapshot: snapshot,
      })),
      client: this.client,
      defaultSnapshot: snapshot,
    })

    return message
  }

  /**
   * 計算距離上次登入的天數
   */
  private calculateDaysSinceLogin(lastLoginAt?: string | null): number {
    if (!lastLoginAt) return 999
    const lastLogin = new Date(lastLoginAt)
    const now = new Date()
    return (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
  }
}

