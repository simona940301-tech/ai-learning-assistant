'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowser } from '@/lib/supabase'
import { ProfileRepo } from '@/lib/dal/profile-repo'

// ============================================
// Types
// ============================================

export type OpponentStatus = 'idle' | 'thinking' | 'locked' | 'hit' | 'miss'

export interface Question {
  id: string
  question_text?: string
  questionText?: string
  options?: string[] | Array<{ text?: string; id?: string }>
  correct_answer?: string
  correctAnswer?: string
  difficulty?: number
  time_limit?: number
  timeLimit?: number
  skill_tags?: string[]
  skillTags?: string[]
}

export interface AnswerRecord {
  questionId: string
  isCorrect: boolean | null
  userAnswer: string | null
}

export interface BattleState {
  isInBattle: boolean
  matchId: string | null
  matchType?: string | null
  subject?: string | null
  questionList: Question[]
  currentQuestionIndex: number
  player1Score: number
  player2Score: number
  player1Streak: number
  player2Streak: number
  playerHasAnswered: boolean
  opponentStatus: OpponentStatus
  opponentAnswer: 'A' | 'B' | 'C' | 'D' | null
  hasShield?: boolean
  ddaBand?: 'low' | 'target' | 'high' // DDA 難度區間（根據答題結果推斷）
  answerRecords?: AnswerRecord[] // 追蹤答題記錄
  lastPlayer1Score?: number // 用於判斷答題是否正確
  timeLimitSeconds?: number // 當前題目的時間限制（server-sourced 優先）
  roundStartedAt?: number // 以 server timestamp 為準，fallback client now
  roundExpiresAt?: number // server 結束時間戳，fallback roundStartedAt + timeLimit
  seed?: string | null
}

export interface ChestItem {
  id: string
  chestType: string
  source: string
  grantedAt: string
  rewards: Record<string, any>
}

export interface ProgressionStatus {
  xp: {
    total: number
    level: number
    progress: number
    nextLevelXp: number
  }
  streak: {
    current: number
    best: number
    todayCompleted: boolean
    nextMilestone?: {
      dayCount: number
      rewardChest?: string | null
      rewardBadge?: string | null
    } | null
  }
  xpBuff?: {
    multiplier: number
    expiresAt: string
  } | null
  totalMatches: number
  totalWins: number
  totalCorrectAnswers: number
  shouldForceTutorial: boolean
  tutorialCompleted: boolean
  chests: ChestItem[]
  badges?: Array<{ badge_code: string; awarded_at: string }>
}

export interface UserStatus {
  dailyEnergyCount: number
  walletBalance: number
  eloRank: number
  dailyEnergyResetAt?: string
  energyLastUpdatedAt?: string // 添加此欄位用於計算羽毛恢復時間
  presetId?: string | null
}

export interface LobbyConfirmState {
  matchId: string
  countdown: number
  players: string[]
  skipUI?: boolean
}

export interface PostMatchInsights {
  matchId: string | null
  winner: string | null
  finalScore: {
    player1: number
    player2: number
  }
  eloChange?: {
    oldElo: number
    newElo: number
    eloDiff: number
  }
  coinsEarned?: number
  coinBreakdown?: {
    base: number
    winner: number
    contract: number
    total: number
  }
  retestSuggestions?: any[]
  recallOverlay?: any
}

type ActiveModal = 'SYSTEM' | 'CUSTOM' | 'UGC_CONTRACT' | 'MATCHMAKING' | 'BATTLE_RESULT' | null
type SystemMode = 'PVE_TRAINING' | 'WEAKNESS_BATTLE' | 'RANKED' | null
type CustomMode = 'CREATE_ROOM' | 'JOIN_ROOM' | null

export interface PlayContextType {
  // WebSocket removed

  startMatch: (params: { type: string; subject?: string | null; timeLimit?: number; origin?: string }) => Promise<{ ok: boolean; error?: string }>

  // User Status
  userStatus: UserStatus | null
  isLoadingStatus: boolean
  refreshStatus: () => Promise<void>

  // Battle State
  battleState: BattleState | null
  setBattleState: React.Dispatch<React.SetStateAction<BattleState | null>>

  // Lobby
  lobbyConfirmState: LobbyConfirmState | null
  setLobbyConfirmState: React.Dispatch<React.SetStateAction<LobbyConfirmState | null>>

  // Modals
  activeModal: ActiveModal
  openSystemModal: () => void
  openCustomModal: () => void
  openUGCContractModal: () => void
  closeModal: () => void

  // System Mode
  systemMode: SystemMode
  setSystemMode: React.Dispatch<React.SetStateAction<SystemMode>>

  // Custom Mode
  customMode: CustomMode
  setCustomMode: React.Dispatch<React.SetStateAction<CustomMode>>

  // Energy
  checkEnergy: () => Promise<{ success: boolean; message?: string; currentEnergy?: number }>
  consumeEnergy: () => Promise<{ success: boolean; message?: string }>

  // Tempo & Arousal
  tempoHint: string
  arousalLevel: number

  // Post Match
  postMatchInsights: PostMatchInsights | null
  setPostMatchInsights: React.Dispatch<React.SetStateAction<PostMatchInsights | null>>

  // PVE countdown (client-side only)
  pveCountdown: number | null
  setPveCountdown: React.Dispatch<React.SetStateAction<number | null>>

  // PVE transition state (waiting for MATCH_FOUND)
  isPveTransitioning: boolean
  setIsPveTransitioning: React.Dispatch<React.SetStateAction<boolean>>

  // Progression
  progression: ProgressionStatus | null
  refreshProgression: () => Promise<void>
  openChest: (chestId: string) => Promise<void>

  // Battle flow state
  battleFlow: BattleFlowState
  setBattleFlow: React.Dispatch<React.SetStateAction<BattleFlowState>>

  // PVE Logic
  advancePveRound: () => void
}

export type BattleFlowState = 'IDLE' | 'QUEUEING' | 'MATCHED' | 'IN_BATTLE' | 'RESULT'

const PlayContext = createContext<PlayContextType | undefined>(undefined)

// WebSocket configuration removed


// WebSocket configuration removed (HTTP-only architecture)

// ============================================
// Play Provider
// ============================================

export function PlayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [battleState, setBattleState] = useState<BattleState | null>(null)
  const [battleFlow, setBattleFlow] = useState<BattleFlowState>('IDLE')
  const [lobbyConfirmState, setLobbyConfirmState] = useState<LobbyConfirmState | null>(null)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [systemMode, setSystemMode] = useState<SystemMode>(null)
  const [customMode, setCustomMode] = useState<CustomMode>(null)
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [tempoHint, setTempoHint] = useState('')
  const [arousalLevel, setArousalLevel] = useState(0)
  const [postMatchInsights, setPostMatchInsights] = useState<PostMatchInsights | null>(null)
  const [pveCountdown, setPveCountdown] = useState<number | null>(null)
  const [isPveTransitioning, setIsPveTransitioning] = useState(false)
  const [progression, setProgression] = useState<ProgressionStatus | null>(null)

  // ============================================
  // Fetch User Status
  // ============================================

  const fetchUserStatus = useCallback(async () => {
    // 如果沒有用戶，清空狀態
    if (!user) {
      setUserStatus(null)
      setIsLoadingStatus(false)
      return
    }

    setIsLoadingStatus(true)
    try {
      const response = await fetch('/api/play/user/status', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const payload = data?.data ?? data

        if (data.success && payload) {
          // 同時獲取用戶的精靈頭像presetId
          let presetId = null
          if (user?.id) {
            try {
              const profileRepo = new ProfileRepo(supabaseBrowser)
              const profile = await profileRepo.getById(user.id)
              presetId = profile?.preset_avatar_id || null
            } catch (profileError) {
              console.warn('[PlayProvider] Failed to fetch user profile:', profileError)
            }
          }

          setUserStatus(prev => {
            // 從標準化的 payload 中取得欄位，並保留既有值避免 undefined 造成倒數重置
            const dailyEnergyCount =
              payload.dailyEnergyCount ?? payload.daily_energy_count ?? prev?.dailyEnergyCount ?? 0
            const walletBalance =
              payload.walletBalance ?? payload.user_wallet_balance ?? payload.coins ?? prev?.walletBalance ?? 0
            const eloRank = payload.eloRank ?? payload.elo_rank ?? prev?.eloRank ?? 1000
            const dailyEnergyResetAt =
              payload.dailyEnergyResetAt ?? payload.daily_energy_reset_at ?? prev?.dailyEnergyResetAt
            const energyLastUpdatedAt =
              payload.energyLastUpdatedAt ?? payload.energy_last_updated_at ?? prev?.energyLastUpdatedAt

            return {
              dailyEnergyCount,
              walletBalance,
              eloRank,
              dailyEnergyResetAt,
              energyLastUpdatedAt,
              presetId,
            }
          })
        } else {
          // API 返回失敗，可能是認證問題
          console.warn('[PlayProvider] User status API returned failure:', data)
          setUserStatus(null)
        }
      } else if (response.status === 401) {
        // 認證失敗，清空狀態
        console.warn('[PlayProvider] User status API returned 401 - authentication required')
        setUserStatus(null)
      } else if (response.status === 403) {
        // 🎯 FIX: 處理 403 Forbidden 錯誤（可能是認證或權限問題）
        console.error('[PlayProvider] User status API returned 403 - forbidden access')
        const errorData = await response.json().catch(() => ({}))
        console.error('[PlayProvider] 403 Error details:', errorData)
        setUserStatus(null)
      } else {
        console.error('[PlayProvider] User status API error:', response.status, response.statusText)
        // 🎯 FIX: 對於其他錯誤狀態，也嘗試解析錯誤訊息
        try {
          const errorData = await response.json().catch(() => ({}))
          console.error('[PlayProvider] API error details:', errorData)
        } catch (e) {
          // 忽略 JSON 解析錯誤
        }
      }
    } catch (error) {
      console.error('[PlayProvider] Failed to fetch user status:', error)
      // 🎯 FIX: 如果是網路錯誤或 CORS 錯誤，記錄詳細資訊
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('[PlayProvider] Network error - check CORS and API availability')
      }
      // 發生錯誤時不清空狀態，保留之前的狀態（避免 UI 閃爍）
    } finally {
      setIsLoadingStatus(false)
    }
  }, [user])

  // 當 user 狀態改變時，重新獲取 userStatus
  useEffect(() => {
    if (user) {
      // 用戶登入後，立即獲取狀態（可能需要等待 session cookie 設置）
      // 如果第一次失敗，等待一小段時間後重試
      fetchUserStatus().catch(() => {
        // 如果第一次失敗，可能是因為 session cookie 還沒設置好
        // 等待 500ms 後重試
        setTimeout(() => {
          fetchUserStatus().catch(console.error)
        }, 500)
      })
    } else {
      // 用戶登出，清空狀態
      setUserStatus(null)
      setIsLoadingStatus(false)
    }
  }, [user, fetchUserStatus])

  const fetchProgressionStatus = useCallback(async () => {
    if (!user) {
      setProgression(null)
      return
    }
    try {
      const response = await fetch('/api/play/progression/status', {
        credentials: 'include',
      })
      if (!response.ok) {
        // 🐛 FIX: Log error details instead of silent failure
        console.warn('[PlayProvider] Progression status API error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        })
        // Try to parse error message
        try {
          const errorData = await response.json()
          console.warn('[PlayProvider] Error details:', errorData)
        } catch (e) {
          // Ignore JSON parse errors
        }
        return
      }
      const data = await response.json()
      if (data.success) {
        setProgression({
          xp: data.progression.xp,
          streak: data.progression.streak,
          xpBuff: data.progression.xpBuff,
          totalMatches: data.progression.totalMatches,
          totalWins: data.progression.totalWins,
          totalCorrectAnswers: data.progression.totalCorrectAnswers,
          shouldForceTutorial: data.progression.shouldForceTutorial,
          tutorialCompleted: data.progression.tutorialCompleted,
          chests: data.chests || [],
          badges: data.badges || [],
        })
      }
    } catch (error) {
      console.error('[PlayProvider] Failed to fetch progression status:', error)
    }
  }, [user])

  useEffect(() => {
    fetchProgressionStatus()
  }, [fetchProgressionStatus])

  const openChest = useCallback(
    async (chestId: string) => {
      await fetch('/api/play/progression/chests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chestId }),
        credentials: 'include',
      })
      await fetchProgressionStatus()
    },
    [fetchProgressionStatus],
  )

  // Refresh user status when battle ends (to get updated Elo and coins)
  useEffect(() => {
    if (postMatchInsights?.matchId && user) {
      // Small delay to ensure Elo update API has completed
      const timer = setTimeout(() => {
        fetchUserStatus().catch(console.error)
      }, 2000) // Wait 2 seconds for Elo update to complete

      return () => clearTimeout(timer)
    }
  }, [postMatchInsights?.matchId, user, fetchUserStatus])

  // ============================================
  // Check Energy (預扣檢查)
  // ============================================

  const checkEnergy = useCallback(async () => {
    try {
      const response = await fetch('/api/play/user/status', {
        credentials: 'include',
      })

      const data = await response.json()
      const payload = data?.data ?? data

      if (data.success && payload) {
        const currentEnergy = payload.dailyEnergyCount ?? payload.daily_energy_count ?? 0
        const hasEnoughEnergy = currentEnergy > 0
        return {
          success: hasEnoughEnergy,
          message: hasEnoughEnergy ? undefined : '羽毛不足',
          currentEnergy,
        }
      } else {
        const errorMessage =
          typeof data?.error === 'string'
            ? data.error
            : data?.error?.message || '無法檢查羽毛'
        return { success: false, message: errorMessage }
      }
    } catch (error) {
      console.error('[PlayProvider] Failed to check energy:', error)
      return { success: false, message: 'Network error' }
    }
  }, [])

  // ============================================
  // Consume Energy (實際消耗)
  // ============================================

  const consumeEnergy = useCallback(async () => {
    try {
      const response = await fetch('/api/play/user/consume-energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        const payload = data?.data ?? data
        const serverEnergy = payload?.dailyEnergyCount ?? payload?.daily_energy_count
        const energyAfterConsume =
          typeof serverEnergy === 'number' ? serverEnergy : undefined
        const timestamp = payload?.energyLastUpdatedAt ?? payload?.energy_last_updated_at ?? new Date().toISOString()

        setUserStatus(prev => prev ? {
          ...prev,
          dailyEnergyCount: energyAfterConsume ?? Math.max(0, prev.dailyEnergyCount - 1),
          // 伺服器在消耗時會更新 energy_last_updated_at，前端同步為 now（或伺服器回傳的值）
          energyLastUpdatedAt: timestamp,
        } : null)
        return { success: true }
      } else {
        return { success: false, message: data.error || 'Failed to consume energy' }
      }
    } catch (error) {
      console.error('[PlayProvider] Failed to consume energy:', error)
      return { success: false, message: 'Network error' }
    }
  }, [])

  // ============================================
  // Start Match (HTTP only)
  // ============================================
  const startMatch = useCallback(async ({ type, subject = null, timeLimit = 20, origin }: { type: string; subject?: string | null; timeLimit?: number; origin?: string }) => {
    // 🎯 HTTP-only PVE Mode
    if (type === 'PVE_TRAINING') {
      const energy = await checkEnergy()
      if (!energy.success) {
        setBattleFlow('IDLE')
        return { ok: false, error: energy.message || '羽毛不足，無法開始對戰' }
      }

      console.log('[PlayProvider] 🚀 Starting PVE match via HTTP:', { type, subject, timeLimit, origin })
      setBattleFlow('QUEUEING')
      setIsPveTransitioning(true)

      try {
        const response = await fetch('/api/play/pve/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            subject,
            timeLimit
          })
        })

        if (!response.ok) throw new Error('Failed to start match')

        const data = await response.json()
        if (!data.success) throw new Error(data.error || 'Unknown error')

        // Initialize Battle State directly
        setBattleState({
          matchId: data.matchId,
          matchType: type,
          isInBattle: true,
          currentQuestionIndex: 0,
          questionList: data.questions,
          player1Score: 0,
          player2Score: 0,
          player1Streak: 0,
          player2Streak: 0,
          playerHasAnswered: false,
          answerRecords: [],
          opponentStatus: 'idle',
          opponentAnswer: null, // 🎯 FIX: Required field for BattleState type
          roundStartedAt: Date.now(),
          roundExpiresAt: Date.now() + (timeLimit || 20) * 1000
        })

        setBattleFlow('IN_BATTLE')
        setIsPveTransitioning(false)
        console.log('[PlayProvider] ✅ PVE Match started locally with', data.questions.length, 'questions')
        return { ok: true }

      } catch (err: any) {
        console.error('[PlayProvider] PVE Start Error:', err)
        setBattleFlow('IDLE')
        setIsPveTransitioning(false)
        return { ok: false, error: '無法啟動對戰，請稍後再試' }
      }
    }

    // PvP is currently disabled
    return { ok: false, error: 'PVP 對戰功能即將推出' }
  }, [checkEnergy, setIsPveTransitioning, user?.id])

  // Auto-confirm Lobby removed


  // ============================================
  // Connect on Mount
  // ============================================

  // WebSocket lazy connection effect removed


  // ============================================
  // Modal Controls
  // ============================================

  const openSystemModal = useCallback(() => {
    setActiveModal('SYSTEM')
  }, [])

  const openCustomModal = useCallback(() => {
    setActiveModal('CUSTOM')
  }, [])

  const openUGCContractModal = useCallback(() => {
    setActiveModal('UGC_CONTRACT')
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
    setSystemMode(null)
    setCustomMode(null)
  }, [])

  // ============================================
  // Context Value
  // ============================================

  const value: PlayContextType = {
    // WebSocket removed from value

    startMatch,
    userStatus,
    isLoadingStatus,
    refreshStatus: fetchUserStatus,
    battleState,
    setBattleState,
    lobbyConfirmState,
    setLobbyConfirmState,
    activeModal,
    openSystemModal,
    openCustomModal,
    openUGCContractModal,
    closeModal,
    systemMode,
    setSystemMode,
    customMode,
    setCustomMode,
    checkEnergy,
    consumeEnergy,
    tempoHint,
    arousalLevel,
    setPostMatchInsights,
    battleFlow,
    setBattleFlow,

    // 🎯 PVE Logic: Optimistic UI & Local State
    advancePveRound: useCallback(() => {
      setBattleState(prev => {
        if (!prev) return null

        const nextIndex = prev.currentQuestionIndex + 1

        // Check if match is finished
        if (nextIndex >= prev.questionList.length) {
          // End of match
          setBattleFlow('RESULT')

          // Generate insights locally first (Optimistic)
          const isWinner = prev.player1Score > prev.player2Score
          const result: PostMatchInsights = {
            matchId: prev.matchId,
            winner: isWinner ? user?.id || 'player' : 'ai',
            finalScore: {
              player1: prev.player1Score,
              player2: prev.player2Score
            },
            eloChange: {
              oldElo: userStatus?.eloRank || 1000,
              newElo: (userStatus?.eloRank || 1000) + (isWinner ? 20 : -10), // Mock calc
              eloDiff: isWinner ? 20 : -10
            },
            coinsEarned: Math.floor(prev.player1Score / 10),
            coinBreakdown: {
              base: Math.floor(prev.player1Score / 10),
              winner: isWinner ? 50 : 0,
              contract: 0,
              total: Math.floor(prev.player1Score / 10) + (isWinner ? 50 : 0)
            }
          }
          setPostMatchInsights(result)
          setActiveModal('BATTLE_RESULT')

          // TODO: Async sync state to server
          fetch('/api/play/pve/finish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              matchId: prev.matchId,
              finalScore: {
                player1: prev.player1Score,
                player2: prev.player2Score
              },
              winnerId: isWinner ? user?.id : 'ai',
              coinsEarned: result.coinsEarned
            })
          }).catch(err => console.error('[PlayContext] Background finish error:', err))

          return {
            ...prev,
            isInBattle: false
          }
        }

        // Next Round
        return {
          ...prev,
          currentQuestionIndex: nextIndex,
          playerHasAnswered: false,
          opponentAnswer: null, // Reset opponent
          opponentStatus: 'thinking',
          roundStartedAt: Date.now(),
          roundExpiresAt: Date.now() + (prev.questionList[nextIndex].timeLimit || 20) * 1000
        }
      })
    }, [user?.id, userStatus?.eloRank]),
    postMatchInsights,
    pveCountdown,
    setPveCountdown,
    isPveTransitioning,
    setIsPveTransitioning,
    progression,
    refreshProgression: fetchProgressionStatus,
    openChest,
  }

  return (
    <PlayContext.Provider value={value}>
      {children}
    </PlayContext.Provider>
  )
}

// ============================================
// Mock Provider (for onboarding/training use cases)
// ============================================

const noop = () => { }
const asyncNoop = async () => { }
const noopDispatch = (() => { }) as React.Dispatch<React.SetStateAction<any>>

export function createMockPlayContextValue(overrides: Partial<PlayContextType> = {}): PlayContextType {
  const base: PlayContextType = {
    // WebSocket removed from mock

    startMatch: async () => ({ ok: true }),
    userStatus: null,
    isLoadingStatus: false,
    refreshStatus: asyncNoop,
    battleState: null,
    setBattleState: noopDispatch,
    lobbyConfirmState: null,
    setLobbyConfirmState: noopDispatch,
    activeModal: null,
    openSystemModal: noop,
    openCustomModal: noop,
    openUGCContractModal: noop,
    closeModal: noop,
    systemMode: null,
    setSystemMode: noopDispatch,
    customMode: null,
    setCustomMode: noopDispatch,
    checkEnergy: async () => ({ success: true }),
    consumeEnergy: async () => ({ success: true }),
    tempoHint: 'steady',
    arousalLevel: 0,
    postMatchInsights: null,
    setPostMatchInsights: noopDispatch,
    pveCountdown: null,
    setPveCountdown: noopDispatch,
    isPveTransitioning: false,
    setIsPveTransitioning: noopDispatch,
    progression: null,
    refreshProgression: asyncNoop,
    openChest: asyncNoop,
    battleFlow: 'IDLE',
    setBattleFlow: noopDispatch,
    advancePveRound: noop,
  }

  return {
    ...base,
    ...overrides,
  }
}

export function PlayMockProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value?: Partial<PlayContextType>
}) {
  const memoizedValue = useMemo(() => createMockPlayContextValue(value ?? {}), [value])
  return <PlayContext.Provider value={memoizedValue}>{children}</PlayContext.Provider>
}

// ============================================
// Hook
// ============================================

export function usePlay() {
  const context = useContext(PlayContext)
  if (context === undefined) {
    throw new Error('usePlay must be used within a PlayProvider')
  }
  return context
}
