"use client"

import { create } from 'zustand'
import type { ChickEmotion, ChickMessageType } from '@/packages/server/chick/types'
import { trackMissionEvent } from '@/lib/mission-tracker'

export type ChickMessage = {
  id: string
  type: ChickMessageType
  text: string
  stateSnapshot: Record<string, unknown> | null
  createdAt: string
  readAt: string | null
  persistent?: boolean
  priority?: 'low' | 'medium' | 'high'
}

type SootheResult =
  | { ok: true; fatigue: number; sootheUsed: number }
  | { ok: false; reason: 'no_fatigue' | 'limit_reached' | 'unknown' }

type StoreState = {
  iq: number
  fatigue: number
  emotionState: ChickEmotion
  streakDays: number
  messages: ChickMessage[]
  messagesUnreadCount: number
  statusLoading: boolean
  messagesLoading: boolean
  speechBubbleVisible: boolean
  error: string | null
  lastSootheResult?: SootheResult
  hasFetchedStatus: boolean
  hunger: number
  intimacy: number
  foodBowlsCount: number
  explorationStartAt: string | null
  explorationAllowance: number
  evolutionStage: number
  evolutionVariant: string
  isExplorationFinished: boolean

  // Hatching & Naming System
  chickName: string | null
  userNickname: string | null
  hatchedAt: string | null
  firstFedAt: string | null
  lastSeenAt: string | null
  daysSinceLastSeen: number
  reunionState: 'happy' | 'sad' | 'runaway' | null

  // Optimistic UI Support
  previousState: Partial<StoreState> | null
  tempReaction: { emotion: string; message: string } | null

  // Derived
  isHatched: boolean
}

type StoreActions = {
  fetchStatus: () => Promise<void>
  fetchMessages: (limit?: number) => Promise<void>
  markMessageRead: (id: string) => Promise<void>
  soothe: () => Promise<void>
  showSpeechBubble: () => void
  hideSpeechBubble: () => void
  getCurrentMessage: () => { text: string; persistent?: boolean; priority?: 'low' | 'medium' | 'high' } | null
  refreshAfterBattleOrExplanation: () => Promise<void>
  interact: (action: 'poke' | 'check_streak' | 'battle_result' | 'idle_battle' | 'idle_review', context?: Record<string, any>) => Promise<void>
  setStreakDays: (days: number) => void

  // New Actions
  buyFood: (quantity: number) => Promise<boolean>
  feed: () => Promise<boolean>
  startExploration: (allowance: number) => Promise<boolean>
  claimExploration: () => Promise<{ success: boolean; xpGained: number; gifts: string[] } | null>
  setTempReaction: (emotion: string, message: string, duration?: number) => void

  // Hatching Actions
  hatchChick: (chickName: string, userNickname: string) => Promise<void>
  updateLastSeen: () => Promise<void>
}

type ChickStatusResponse = {
  iq: number
  fatigue: number
  emotionState: ChickEmotion
  messagesUnreadCount: number
  lastLoginAt?: string | null
  lastDecayAt?: string | null
  evolutionStage?: number
  evolutionVariant?: string
  hunger?: number
  intimacy?: number
  foodBowlsCount?: number
  explorationStartAt?: string | null
  explorationAllowance?: number
  isWellFed?: boolean
  wellFedExpiresAt?: string | null
  chickName?: string | null
  userNickname?: string | null
  hatchedAt?: string | null
  firstFedAt?: string | null
  lastSeenAt?: string | null
  daysSinceLastSeen?: number
  reunionState?: 'happy' | 'sad' | 'runaway' | null
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    const message = (payload as { message?: string }).message || res.statusText
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export const useChickStore = create<StoreState & StoreActions>((set, get) => ({
  iq: 0,
  fatigue: 0,
  emotionState: 'normal',
  streakDays: 0,
  messages: [],
  messagesUnreadCount: 0,
  statusLoading: false,
  messagesLoading: false,
  speechBubbleVisible: false,
  error: null,
  hasFetchedStatus: false,

  // New State Defaults
  hunger: 50,
  intimacy: 0,
  foodBowlsCount: 0,
  explorationStartAt: null,
  explorationAllowance: 0,
  evolutionStage: 0,
  evolutionVariant: 'default',
  previousState: null,
  tempReaction: null,

  // Hatching defaults
  chickName: null,
  userNickname: null,
  hatchedAt: null,
  firstFedAt: null,
  lastSeenAt: null,
  daysSinceLastSeen: 0,
  reunionState: null,
  isHatched: false,

  async fetchStatus() {
    const { statusLoading } = get()
    if (statusLoading) return
    set({ statusLoading: true, error: null })
    try {
      // Fetch both chick status and progression status in parallel
      const [chickData, progressionData] = await Promise.all([
        fetchJson<ChickStatusResponse>('/api/chick/status'),
        fetchJson<{
          streakDays?: number
        }>('/api/play/progression/status').catch(() => ({ streakDays: 0 })),
      ])

      // Debug: Log API response
      console.log('[ChickStore] API Response:', {
        chickData,
        progressionData
      })

      set({
        iq: chickData.iq ?? 0,
        fatigue: chickData.fatigue ?? 0,
        emotionState: chickData.emotionState ?? 'normal',
        messagesUnreadCount: chickData.messagesUnreadCount ?? 0,
        streakDays: progressionData.streakDays ?? 0,

        // All Chick data from /api/chick/status
        hunger: chickData.hunger ?? 50,
        intimacy: chickData.intimacy ?? 0,
        foodBowlsCount: chickData.foodBowlsCount ?? 0,
        evolutionStage: chickData.evolutionStage ?? 0,
        evolutionVariant: chickData.evolutionVariant ?? 'default',
        explorationStartAt: chickData.explorationStartAt ?? null,
        explorationAllowance: chickData.explorationAllowance ?? 0,

        // Hatching data
        chickName: chickData.chickName ?? null,
        userNickname: chickData.userNickname ?? null,
        hatchedAt: chickData.hatchedAt ?? null,
        firstFedAt: chickData.firstFedAt ?? null,
        lastSeenAt: chickData.lastSeenAt ?? null,
        daysSinceLastSeen: chickData.daysSinceLastSeen ?? 0,
        reunionState: chickData.reunionState ?? null,
        isHatched: Boolean(chickData.hatchedAt),

        statusLoading: false,
        hasFetchedStatus: true,
      })

      // Debug: Log final state
      console.log('[ChickStore] Updated State:', {
        hunger: chickData.hunger ?? 50,
        foodBowlsCount: chickData.foodBowlsCount ?? 0,
        intimacy: chickData.intimacy ?? 0,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load chick status',
        statusLoading: false,
        hasFetchedStatus: true,
      })
    }
  },

  async fetchMessages(limit = 20) {
    const { messagesLoading } = get()
    if (messagesLoading) return
    set({ messagesLoading: true, error: null })
    try {
      const data = await fetchJson<{ messages: ChickMessage[] }>(`/api/chick/messages?limit=${limit}`)
      const unread = data.messages.filter(m => !m.readAt).length
      set({
        messages: data.messages,
        messagesUnreadCount: unread,
        messagesLoading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load messages',
        messagesLoading: false,
      })
    }
  },

  async markMessageRead(id: string) {
    const { messagesUnreadCount, messages } = get()
    try {
      await fetchJson('/api/chick/message/read', {
        method: 'POST',
        body: JSON.stringify({ id }),
      })
      const updated = messages.map(m => (m.id === id ? { ...m, readAt: m.readAt ?? new Date().toISOString() } : m))
      const wasUnread = messages.find(m => m.id === id)?.readAt == null
      set({
        messages: updated,
        messagesUnreadCount: Math.max(0, messagesUnreadCount - (wasUnread ? 1 : 0)),
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to mark message read',
      })
    }
  },

  async soothe() {
    try {
      const result = await fetchJson<SootheResult>('/api/chick/soothe', { method: 'POST' })
      if (result.ok) {
        set({
          fatigue: result.fatigue,
          lastSootheResult: result,
          error: null,
        })
        // Lightweight refresh to keep unread counts in sync if POSITIVE message was added
        void get().fetchStatus()
      } else {
        set({ lastSootheResult: result })
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to soothe chick',
        lastSootheResult: { ok: false, reason: 'unknown' },
      })
    }
  },

  showSpeechBubble() {
    const { messages, messagesLoading } = get()
    if (messages.length === 0 && !messagesLoading) {
      void get().fetchMessages()
    }
    set({ speechBubbleVisible: true })
  },

  hideSpeechBubble() {
    set({ speechBubbleVisible: false })
  },

  getCurrentMessage() {
    const { messages, tempReaction } = get()

    // Priority: Temp Reaction > Unread Message > Recent Message
    if (tempReaction) {
      return { text: tempReaction.message, priority: 'low', persistent: false }
    }

    // Get the latest unread message, or the most recent message if all are read
    const unreadMessage = messages.find(m => !m.readAt)
    if (unreadMessage) {
      return {
        text: unreadMessage.text,
        persistent: unreadMessage.persistent,
        priority: unreadMessage.priority ?? 'low',
      }
    }

    // If no unread messages, return the most recent message
    if (messages.length > 0) {
      const latest = messages[0]
      return {
        text: latest.text,
        persistent: latest.persistent,
        priority: latest.priority ?? 'low',
      }
    }

    return null
  },

  async refreshAfterBattleOrExplanation() {
    await get().fetchStatus()
  },

  async interact(action: 'poke' | 'check_streak' | 'battle_result' | 'idle_battle' | 'idle_review', context?: Record<string, any>) {
    try {
      // Map old action names to new action types
      const actionMap: Record<string, string> = {
        poke: 'POKE',
        check_streak: 'CHECK_STREAK',
        battle_result: 'BATTLE_END',
        idle_battle: 'IDLE_BATTLE',
        idle_review: 'IDLE_REVIEW',
      }

      const newActionType = actionMap[action] || action.toUpperCase()

      const res = await fetchJson<{ ok: boolean; message?: ChickMessage | null; action?: string }>('/api/chick/action', {
        method: 'POST',
        body: JSON.stringify({
          type: newActionType,
          payload: context || {},
        }),
      })

      // If action is 'toggle', just toggle visibility without adding message
      if (res.action === 'toggle') {
        const { speechBubbleVisible } = get()
        set({ speechBubbleVisible: !speechBubbleVisible })
        return
      }

      if (res.ok && res.message) {
        const { messages, messagesUnreadCount } = get()
        // Prepend new message
        const newMessages = [res.message, ...messages]
        set({
          messages: newMessages,
          messagesUnreadCount: messagesUnreadCount + 1,
          speechBubbleVisible: true, // Auto show bubble
        })
      }
    } catch (err) {
      console.error('Failed to interact with chick:', err)
    }
  },

  setStreakDays(days: number) {
    set({ streakDays: days })
  },

  // New Actions
  async buyFood(quantity: number) {
    try {
      const res = await fetchJson<{ success: boolean; newBalance: number; newBowls: number }>('/api/shop/buy-food', {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      })
      if (res.success) {
        set({ foodBowlsCount: res.newBowls })
        return true
      }
      return false
    } catch (err) {
      console.error('Failed to buy food:', err)
      return false
    }
  },

  async feed() {
    const state = get()
    // Snapshot state for rollback
    const previousState = {
      hunger: state.hunger,
      foodBowlsCount: state.foodBowlsCount,
      intimacy: state.intimacy
    }
    set({ previousState })

    // Optimistic Update
    const newHunger = Math.max(0, state.hunger - 20)
    const newBowls = Math.max(0, state.foodBowlsCount - 1)
    const newIntimacy = state.intimacy + 5

    set({
      hunger: newHunger,
      foodBowlsCount: newBowls,
      intimacy: newIntimacy
    })

    try {
      const res = await fetchJson<{ success: boolean; newHunger: number; newBowls: number; newIntimacy: number }>('/api/chick/feed', {
        method: 'POST',
      })
      if (res.success) {
        // Reconcile with server state (optional, but good for consistency)
        set({
          hunger: res.newHunger,
          foodBowlsCount: res.newBowls,
          intimacy: res.newIntimacy,
          previousState: null // Clear rollback state
        })

        // Refresh messages to show "Yummy" message
        void get().fetchMessages()
        // Track mission progress
        trackMissionEvent('CHICK_FED').catch(err =>
          console.warn('[Chick Feed] Failed to track mission:', err)
        )
        return true
      } else {
        throw new Error('Feed failed')
      }
    } catch (err) {
      console.error('Failed to feed chick:', err)
      // Rollback with Playful Error
      if (get().previousState) {
        set({ ...get().previousState, previousState: null })
        get().setTempReaction('dizzy', '網路似乎有點餓了... (連線失敗)', 3000)
      }
      return false
    }
  },

  async startExploration(allowance: number) {
    const state = get()
    // Snapshot
    const previousState = {
      explorationStartAt: state.explorationStartAt,
      explorationAllowance: state.explorationAllowance
    }
    set({ previousState })

    // Optimistic Update
    set({
      explorationStartAt: new Date().toISOString(),
      explorationAllowance: allowance
    })

    try {
      const res = await fetchJson<{ success: boolean; newBalance?: number }>('/api/chick/explore', {
        method: 'POST',
        body: JSON.stringify({ action: 'start', allowance }),
      })
      if (res.success) {
        // Sync coin balance if returned (might need to add coins to store if we track it)
        set({ previousState: null })
        // Refresh status to sync coins and other state
        void get().fetchStatus()
        return true
      } else {
        throw new Error('Start exploration failed')
      }
    } catch (err) {
      console.error('Failed to start exploration:', err)
      // Rollback with Playful Error
      if (get().previousState) {
        set({ ...get().previousState, previousState: null })
        get().setTempReaction('confused', '找不到去圖書館的路... (連線失敗)', 3000)
      }
      return false
    }
  },

  async claimExploration() {
    // For claim, we don't do full optimistic data update because we don't know the reward yet.
    // But we can optimistically clear the "Exploring" status to show a loading state if needed.
    // Ideally, we wait for the result to show the reward modal.
    // However, we can clear the exploration state so the UI doesn't show "Exploring" anymore.

    const state = get()
    const previousState = {
      explorationStartAt: state.explorationStartAt,
      explorationAllowance: state.explorationAllowance
    }
    set({ previousState })

    // Optimistic: Clear exploration state immediately
    set({
      explorationStartAt: null,
      explorationAllowance: 0
    })

    try {
      const res = await fetchJson<{ success: boolean; xpGained: number; gifts: string[] }>('/api/chick/explore', {
        method: 'POST',
        body: JSON.stringify({ action: 'claim' }),
      })
      if (res.success) {
        set({ previousState: null })
        // Refresh status to sync coins and other state
        void get().fetchStatus()
        // Refresh messages to show return message
        void get().fetchMessages()
        return res
      } else {
        throw new Error('Claim failed')
      }
    } catch (err) {
      console.error('Failed to claim exploration:', err)
      // Rollback with Playful Error
      if (get().previousState) {
        set({ ...get().previousState, previousState: null })
        get().setTempReaction('dizzy', '包裹好像卡在路上了... (連線失敗)', 3000)
      }
      return null
    }
  },

  setTempReaction(emotion: string, message: string, duration = 3000) {
    set({
      tempReaction: { emotion, message },
      speechBubbleVisible: true
    })

    setTimeout(() => {
      // Only clear if it hasn't been overwritten
      const current = get().tempReaction
      if (current && current.emotion === emotion && current.message === message) {
        set({ tempReaction: null })
      }
    }, duration)
  },

  // Helper Getters
  get isExplorationFinished() {
    const { explorationStartAt } = get()
    if (!explorationStartAt) return false

    // Default 2 hours, but using 1 minute for testing/demo purposes if needed
    // This should match server logic in /api/chick/explore/route.ts
    const EXPLORATION_DURATION_MS = 2 * 60 * 60 * 1000
    // const EXPLORATION_DURATION_MS = 60 * 1000 // 1 minute for testing

    const startTime = new Date(explorationStartAt).getTime()
    const now = Date.now()
    return now - startTime >= EXPLORATION_DURATION_MS
  },

  // Hatching Actions
  async hatchChick(chickName: string, userNickname: string) {
    try {
      const res = await fetchJson<{
        success: boolean
        data: { chickName: string; userNickname: string; hatchedAt: string; lastSeenAt?: string | null }
      }>('/api/chick/hatch', {
        method: 'POST',
        body: JSON.stringify({ chickName, userNickname }),
      })

      if (!res.success) {
        throw new Error('Hatching failed')
      }

      set({
        chickName: res.data.chickName,
        userNickname: res.data.userNickname,
        hatchedAt: res.data.hatchedAt,
        lastSeenAt: res.data.lastSeenAt ?? null,
        daysSinceLastSeen: 0,
        reunionState: null,
        isHatched: true,
        error: null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to hatch chick'
      console.error('[ChickStore] hatchChick failed:', message)
      set({ error: message })
      throw err
    }
  },

  async updateLastSeen() {
    try {
      const data = await fetchJson<ChickStatusResponse>('/api/chick/status?updateLastSeen=true')
      set({
        chickName: data.chickName ?? null,
        userNickname: data.userNickname ?? null,
        hatchedAt: data.hatchedAt ?? null,
        firstFedAt: data.firstFedAt ?? null,
        lastSeenAt: data.lastSeenAt ?? null,
        daysSinceLastSeen: data.daysSinceLastSeen ?? 0,
        reunionState: data.reunionState ?? null,
        isHatched: Boolean(data.hatchedAt),
      })
    } catch (error) {
      console.error('[ChickStore] Failed to update last seen:', error)
    }
  },
}))
