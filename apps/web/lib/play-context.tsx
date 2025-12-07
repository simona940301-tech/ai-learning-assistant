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
  // WebSocket
  wsConnected: boolean
  sendWebSocketMessage: (message: any) => void
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
}

export type BattleFlowState = 'IDLE' | 'QUEUEING' | 'MATCHED' | 'IN_BATTLE' | 'RESULT'

const PlayContext = createContext<PlayContextType | undefined>(undefined)

// ============================================
// WebSocket URL
// ============================================

// Support legacy env name NEXT_PUBLIC_WS_URL to avoid silent misconfig on prod
// ⚠️ 請使用 NEXT_PUBLIC_BATTLE_WS_URL，NEXT_PUBLIC_WS_URL 已棄用
const WS_URL =
  process.env.NEXT_PUBLIC_BATTLE_WS_URL ||
  process.env.NEXT_PUBLIC_WS_URL ||
  'ws://localhost:8080/ws/battle'
const WS_ENABLED =
  (process.env.NEXT_PUBLIC_BATTLE_WS_ENABLED ?? process.env.NEXT_PUBLIC_WS_ENABLED) !== 'false' // Default to true, set to 'false' to disable

// 開發環境警告：檢測到舊的環境變數
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL && !process.env.NEXT_PUBLIC_BATTLE_WS_URL) {
  console.warn(
    '[PlayProvider] ⚠️ NEXT_PUBLIC_WS_URL is deprecated. Please use NEXT_PUBLIC_BATTLE_WS_URL instead.',
    '\n  Current: NEXT_PUBLIC_WS_URL =', process.env.NEXT_PUBLIC_WS_URL,
    '\n  Recommended: NEXT_PUBLIC_BATTLE_WS_URL = wss://battle-ws.fly.dev/ws/battle'
  )
}

// ============================================
// Play Provider
// ============================================

export function PlayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
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

  const messageQueue = useRef<any[]>([])
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const confirmedLobbyMatchesRef = useRef<Set<string>>(new Set())
  const isConnectingRef = useRef(false)
  const hasShownConnectionErrorRef = useRef(false)
  const wsRef = useRef<WebSocket | null>(null)
  const connectionToastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      } else {
        console.error('[PlayProvider] User status API error:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('[PlayProvider] Failed to fetch user status:', error)
      // 發生錯誤時不清空狀態，保留之前的狀態
    } finally {
      setIsLoadingStatus(false)
    }
  }, [user?.id])

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
      if (!response.ok) return
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
  // WebSocket Connection
  // ============================================

  // 使用 ref 存儲最新的 handleServerMessage，避免閉包陷阱
  const handleServerMessageRef = useRef<((message: any) => void) | null>(null)

  const connectWebSocket = useCallback(() => {
    // Check if WebSocket is disabled
    if (!WS_ENABLED) {
      if (!hasShownConnectionErrorRef.current) {
        console.log('[PlayProvider] ⚠️ WebSocket is disabled via NEXT_PUBLIC_BATTLE_WS_ENABLED=false')
        hasShownConnectionErrorRef.current = true
      }
      return
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) {
      return
    }

    // 使用 ref 來檢查連接狀態，避免依賴問題
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('[PlayProvider] ⚠️ WebSocket already connected, skipping')
      return
    }

    // Don't attempt connection if we've exceeded max retries
    if (reconnectAttempts.current >= 5) {
      if (!hasShownConnectionErrorRef.current) {
        console.warn('[PlayProvider] ⚠️ WebSocket connection disabled after max retry attempts. Server may not be running.')
        hasShownConnectionErrorRef.current = true
      }
      return
    }

    isConnectingRef.current = true

    // Only log connection attempt for first few tries to reduce console noise
    if (reconnectAttempts.current < 2) {
      console.log('[PlayProvider] 🔌 Connecting to WebSocket:', WS_URL)
    }

    const websocket = new WebSocket(WS_URL)

    websocket.onopen = () => {
      console.log('[PlayProvider] ✅ WebSocket connected')
      setWsConnected(true)
      reconnectAttempts.current = 0
      isConnectingRef.current = false
      hasShownConnectionErrorRef.current = false

      // Clear any pending connection toast
      if (connectionToastTimeoutRef.current) {
        clearTimeout(connectionToastTimeoutRef.current)
        connectionToastTimeoutRef.current = null
      }

      // 連接成功，清除斷線提示並顯示成功提示
      if (typeof window !== 'undefined' && reconnectAttempts.current > 0) {
        import('@/components/ui/Toast').then(({ toast }) => {
          toast.success('連線已恢復', 2000)
        })
      }

      // 發送認證消息
      if (user?.id) {
        websocket.send(JSON.stringify({
          type: 'AUTH',
          userId: user.id,
        }))
      }

      // 發送排隊的消息
      while (messageQueue.current.length > 0) {
        const message = messageQueue.current.shift()
        websocket.send(JSON.stringify(message))
      }
    }

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('[PlayProvider] 📨 Received message:', message.type)
        // 使用 ref 中最新的 handleServerMessage
        handleServerMessageRef.current?.(message)
      } catch (error) {
        console.error('[PlayProvider] ❌ Failed to parse message:', error)
      }
    }

    websocket.onerror = (error) => {
      isConnectingRef.current = false
      // Only log error for first few attempts to reduce console noise
      if (reconnectAttempts.current < 2) {
        console.error('[PlayProvider] ❌ WebSocket connection failed. Server may not be running at', WS_URL)
      }
    }

    websocket.onclose = (event) => {
      isConnectingRef.current = false
      setWsConnected(false)
      setWs(null)
      wsRef.current = null
      setBattleFlow('IDLE')

      // Only log close event for first few attempts
      if (reconnectAttempts.current < 2) {
        console.log('[PlayProvider] 🔌 WebSocket closed', event.code !== 1000 ? `(code: ${event.code})` : '')
      }

      // 自動重連（最多 5 次）
      if (reconnectAttempts.current < 5) {
        reconnectAttempts.current++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)

        // Only log reconnection attempts for first few tries
        if (reconnectAttempts.current <= 2) {
          console.log(`[PlayProvider] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/5)`)
        }

        // 顯示斷線提示 Toast (only for first 2 attempts to avoid spam)
        // 延遲 2 秒顯示，避免閃爍
        if (typeof window !== 'undefined' && reconnectAttempts.current <= 2) {
          if (connectionToastTimeoutRef.current) clearTimeout(connectionToastTimeoutRef.current)

          connectionToastTimeoutRef.current = setTimeout(() => {
            import('@/components/ui/Toast').then(({ toast }) => {
              toast.loading(`連線中斷，正在嘗試重新連接 (第 ${reconnectAttempts.current} 次 / 5)`)
            })
          }, 2000)
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, delay)
      } else {
        // Max retries reached - stop trying and show final error
        if (!hasShownConnectionErrorRef.current) {
          console.warn('[PlayProvider] ⚠️ WebSocket connection failed after 5 attempts. Server may not be running.')
          hasShownConnectionErrorRef.current = true

          // 顯示重連失敗提示
          if (typeof window !== 'undefined') {
            import('@/components/ui/Toast').then(({ toast }) => {
              toast.error('無法連接到對戰服務器，請確認服務器是否運行', 5000)
            })
          }
        }
      }
    }

    setWs(websocket)
    wsRef.current = websocket
  }, [user])

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
  // Handle Server Messages
  // ============================================

  const handleServerMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'MATCH_FOUND': {
        const questionList = message.question_list || []
        const isPveMatch = systemMode === 'PVE_TRAINING' || message.match_type === 'PVE_TRAINING'

        console.log('[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!', {
          matchId: message.match_id,
          questions: questionList.length,
          isPVE: isPveMatch,
          matchType: message.match_type,
          firstQuestion: questionList[0] ? {
            id: questionList[0].id,
            hasOptions: !!questionList[0].options,
            optionsLength: questionList[0].options?.length,
            optionsType: Array.isArray(questionList[0].options) ? 'array' : typeof questionList[0].options,
            firstOption: questionList[0].options?.[0],
          } : null,
        })

        // 🎯 關鍵修復：PVE 模式在後端已經直接設置為 InBattle 狀態
        // 所以前端收到 MATCH_FOUND 時，如果是 PVE，應該立即設置 isInBattle: true
        // 這樣可以確保在 ROUND_STARTED 到達前，battleState 已經準備好進入對戰頁面
        const newBattleState = {
          isInBattle: isPveMatch, // PVE 模式立即進入對戰，PVP 需要等待 lobby 確認
          matchId: message.match_id,
          questionList,
          currentQuestionIndex: 0,
          player1Score: 0,
          player2Score: 0,
          player1Streak: 0,
          player2Streak: 0,
          playerHasAnswered: false,
          opponentStatus: 'idle' as OpponentStatus,
          opponentAnswer: null,
          answerRecords: [],
          matchType: message.match_type || null,
          subject: message.subject || null,
          timeLimitSeconds: message.time_limit || questionList[0]?.time_limit,
          seed: message.seed || null,
        }

        console.log('[PlayProvider] 📝 Setting battleState with:', {
          matchId: newBattleState.matchId,
          questionCount: newBattleState.questionList.length,
          isInBattle: newBattleState.isInBattle,
          isPveMatch,
        })

        setBattleState(newBattleState)
        setBattleFlow(isPveMatch ? 'IN_BATTLE' : 'MATCHED')

        // 關閉 PVE 過渡動畫（收到 MATCH_FOUND 表示連線成功）
        if (isPveMatch) {
          console.log('[PlayProvider] ✅ PVE MATCH_FOUND - clearing transition overlay and entering battle')
          setIsPveTransitioning(false)
        }

        break
      }

      case 'LOBBY_CONFIRMING': {
        // 系統對戰（PVE、RANKED、WEAKNESS_BATTLE）都跳過 lobby UI
        const isSystemBattle =
          systemMode === 'PVE_TRAINING' ||
          systemMode === 'RANKED' ||
          systemMode === 'WEAKNESS_BATTLE' ||
          message.match_type?.includes('PVE') ||
          message.match_type === 'PVE_TRAINING' ||
          message.match_type === 'PVE_CHALLENGE' ||
          message.match_type === 'RANKED' ||
          message.match_type === 'WEAKNESS_BATTLE'

        const countdown = message.countdown ?? 0
        const players = message.players || []
        const matchId = message.match_id
        if (!isSystemBattle) {
          setBattleFlow('QUEUEING')
        }

        setLobbyConfirmState(prev => {
          if (!matchId) return prev

          if (prev && prev.matchId === matchId) {
            return {
              ...prev,
              countdown,
              skipUI: isSystemBattle,
            }
          }

          return {
            matchId,
            countdown,
            players,
            skipUI: isSystemBattle,
          }
        })

        // 如果是系統對戰，自動發送確認（使用 ws 直接發送）
        if (isSystemBattle && matchId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log('[PlayProvider] 🚀 Auto-confirming system battle lobby')
          wsRef.current.send(JSON.stringify({
            type: 'CONFIRM_LOBBY',
            match_id: matchId,
          }))
        }
        break
      }

      case 'LOBBY_CONFIRMED':
        console.log('[PlayProvider] ✅ Lobby confirmed')
        setLobbyConfirmState(null)
        setBattleFlow('MATCHED')
        // 大廳確認完成，現在才真正消耗 Energy（僅 PVP 模式）
        if (systemMode !== 'PVE_TRAINING') {
          consumeEnergy().catch(error => {
            console.error('[PlayProvider] Failed to consume energy after lobby confirmation:', error)
            // 即使消耗失敗，也不阻止對戰繼續（避免影響用戶體驗）
          })
        }
        // 等待 ROUND_STARTED
        break

      case 'LOBBY_DISSOLVED':
        console.log('[PlayProvider] ❌ Lobby dissolved:', message.reason)
        setLobbyConfirmState(null)
        setBattleState(null)
        setBattleFlow('IDLE')
        break

      case 'ROUND_STARTED':
        // 🎯 關鍵調試：打印完整的消息對象
        console.log('[PlayProvider] 🎮 Round started:', {
          question_index: message.question_index,
          match_id: message.match_id,
          hasQuestion: !!message.question,
          questionId: message.question?.id,
          fullMessage: message,
        })

        // 清除 lobby state（PVE 和 PVP 都需要）
        setLobbyConfirmState(null)
        setSystemMode(null)
        setBattleFlow('IN_BATTLE')

        setBattleState(prev => {
          const prevInfo = {
            exists: !!prev,
            matchId: prev?.matchId,
            questionCount: prev?.questionList?.length,
            currentIndex: prev?.currentQuestionIndex,
          }
          console.log('[PlayProvider] 🔍 ROUND_STARTED - prev state:', prevInfo)

          // 🎯 防止重複處理：檢查當前問題是否已經是這個 question_index
          // 如果 prev 存在且 currentQuestionIndex 已經等於 message.question_index
          // 且該問題已經在 questionList 中，則跳過更新（避免 React Strict Mode 雙重調用）
          if (prev && prev.currentQuestionIndex === message.question_index) {
            const existingQuestion = prev.questionList?.[message.question_index]
            if (existingQuestion && existingQuestion.id === message.question?.id) {
              console.log('[PlayProvider] ⏭️ Skipping duplicate ROUND_STARTED for q' + message.question_index)
              return prev
            }
          }

          // 詳細記錄以便調試
          if (!prev) {
            console.log('[PlayProvider] 🔴 prev is NULL/UNDEFINED, will use ROUND_STARTED data')
          } else {
            console.log('[PlayProvider] 🟢 prev EXISTS, will update existing state')
          }

          // 🎯 關鍵修復：如果 prev 為 null，使用 ROUND_STARTED 消息中的 question 數據
          // React 18 的自動批處理可能導致 MATCH_FOUND 的狀態更新延遲
          // ROUND_STARTED 消息包含當前題目數據，我們可以直接使用它
          if (!prev) {
            console.warn('[PlayProvider] ⚠️ battleState is null due to React batching, using ROUND_STARTED question data')

            // 從 ROUND_STARTED 消息中提取題目數據
            const currentQuestion = message.question

            console.log('[PlayProvider] 📋 ROUND_STARTED message details:', {
              hasQuestion: !!currentQuestion,
              questionId: currentQuestion?.id,
              matchId: message.match_id,
              questionIndex: message.question_index,
              messageKeys: Object.keys(message),
            })

            if (!currentQuestion) {
              console.error('[PlayProvider] ❌ CRITICAL: No question in ROUND_STARTED message!')
              console.error('[PlayProvider] ❌ Full message:', message)
              return null
            }

            console.log('[PlayProvider] ✅ Creating battleState with question:', currentQuestion.id)

            // 使用 ROUND_STARTED 中的題目創建初始狀態
            // 這樣即使 MATCH_FOUND 的狀態更新延遲，戰鬥也能正常開始
            return {
              isInBattle: true,
              matchId: message.match_id || null,
              questionList: [currentQuestion], // 使用當前題目，後續題目會在下一個 ROUND_STARTED 中到達
              currentQuestionIndex: message.question_index || 0,
              player1Score: 0,
              player2Score: 0,
              player1Streak: 0,
              player2Streak: 0,
              playerHasAnswered: false,
              opponentStatus: 'idle' as OpponentStatus,
              opponentAnswer: null,
              answerRecords: [],
              matchType: message.match_type || null,
              subject: message.subject || null,
              timeLimitSeconds: currentQuestion.time_limit || null,
              roundStartedAt: message.server_now || Date.now(),
              roundExpiresAt: message.round_expires_at || ((message.server_now || Date.now()) + (currentQuestion.time_limit || 0) * 1000),
            }
          }

          console.log('[PlayProvider] ✅ Setting isInBattle = true')

          // 🎯 驗證 matchId 是否匹配
          const currentMatchId = message.match_id
          if (prev.matchId !== currentMatchId) {
            console.warn('[PlayProvider] ⚠️ Match ID mismatch! prev:', prev.matchId, 'current:', currentMatchId)
            console.warn('[PlayProvider] ⚠️ This is likely from a previous match, using ROUND_STARTED data instead')

            // matchId 不匹配，使用 ROUND_STARTED 的數據重新創建狀態
            const currentQuestion = message.question
            if (!currentQuestion) {
              console.error('[PlayProvider] ❌ CRITICAL: No question in ROUND_STARTED message!')
              return null
            }

            return {
              isInBattle: true,
              matchId: currentMatchId,
              questionList: [currentQuestion],
              currentQuestionIndex: message.question_index || 0,
              player1Score: 0,
              player2Score: 0,
              player1Streak: 0,
              player2Streak: 0,
              playerHasAnswered: false,
              opponentStatus: 'idle' as OpponentStatus,
              opponentAnswer: null,
              answerRecords: [],
            }
          }

          // 🎯 關鍵修復：每次 ROUND_STARTED 都必須更新對應索引的題目
          // 因為 MATCH_FOUND 的 questionList 可能不完整（只有第一題有完整數據）
          // 後續題目需要從 ROUND_STARTED 中獲取完整數據
          const currentQuestionIndex = message.question_index ?? 0
          const currentQuestion = message.question

          console.log('[PlayProvider] 🔄 Updating to question index:', {
            messageQuestionIndex: message.question_index,
            currentQuestionIndex,
            prevIndex: prev.currentQuestionIndex,
            questionId: currentQuestion?.id,
            prevQuestionListLength: prev.questionList?.length || 0,
            prevQuestionAtIndex: prev.questionList?.[currentQuestionIndex]?.id,
          })

          // 🎯 關鍵修復：如果收到新的題目數據，必須更新到 questionList 中
          // 即使 questionList 已經有該索引的題目，也要用新的完整數據替換
          let updatedQuestionList = prev.questionList || []
          if (currentQuestion) {
            // 確保 questionList 有足夠的長度
            updatedQuestionList = [...updatedQuestionList]
            while (updatedQuestionList.length <= currentQuestionIndex) {
              // 用當前題目填充空位（臨時，後續會被正確的題目替換）
              updatedQuestionList.push(currentQuestion)
            }
            // 🎯 關鍵：無論如何都要更新當前索引的題目（使用最新的完整數據）
            updatedQuestionList[currentQuestionIndex] = currentQuestion

            console.log('[PlayProvider] 📝 Updated question at index:', currentQuestionIndex, {
              questionId: currentQuestion.id,
              hasOptions: !!currentQuestion.options,
              optionsLength: currentQuestion.options?.length || 0,
              questionListLength: updatedQuestionList.length,
            })
          } else {
            console.warn('[PlayProvider] ⚠️ ROUND_STARTED message has no question data!', message)
          }

          const updatedState = {
            ...prev,
            isInBattle: true,
            questionList: updatedQuestionList,
            currentQuestionIndex, // 🎯 關鍵：使用 message.question_index 更新索引
            playerHasAnswered: false,
            opponentStatus: 'idle' as OpponentStatus,
            opponentAnswer: null,
            matchType: currentMatchId ? (message.match_type || prev.matchType || null) : prev.matchType,
            subject: message.subject || prev.subject || null,
            timeLimitSeconds: currentQuestion?.time_limit || prev.timeLimitSeconds,
            roundStartedAt: message.server_now || Date.now(),
            roundExpiresAt: message.round_expires_at || ((message.server_now || Date.now()) + (currentQuestion?.time_limit || prev.timeLimitSeconds || 0) * 1000),
          }

          console.log('[PlayProvider] ✅ Updated battleState:', {
            currentQuestionIndex: updatedState.currentQuestionIndex,
            questionListLength: updatedState.questionList.length,
            questionId: updatedState.questionList[currentQuestionIndex]?.id,
            fullQuestionList: updatedState.questionList.map((q, idx) => ({ id: q.id, index: idx })),
            // 🎯 關鍵診斷：確認 currentQuestionIndex 是否正確設置
            actualCurrentQuestion: updatedState.questionList[updatedState.currentQuestionIndex]?.id,
            messageQuestionIndex: message.question_index,
            prevCurrentQuestionIndex: prev.currentQuestionIndex,
          })

          // 🎯 關鍵驗證：確保 currentQuestionIndex 正確更新
          if (updatedState.currentQuestionIndex !== currentQuestionIndex) {
            console.error('[PlayProvider] ❌ CRITICAL: currentQuestionIndex mismatch!', {
              expected: currentQuestionIndex,
              actual: updatedState.currentQuestionIndex,
              messageQuestionIndex: message.question_index,
            })
            // 強制修正 - 創建新對象以觸發重新渲染
            return {
              ...updatedState,
              currentQuestionIndex,
            }
          }

          // 🎯 關鍵驗證：確保當前題目存在
          if (!updatedState.questionList[updatedState.currentQuestionIndex]) {
            console.error('[PlayProvider] ❌ CRITICAL: Question at currentQuestionIndex does not exist!', {
              currentQuestionIndex: updatedState.currentQuestionIndex,
              questionListLength: updatedState.questionList.length,
              questionList: updatedState.questionList.map((q, idx) => ({ id: q.id, index: idx })),
              hasCurrentQuestion: !!currentQuestion,
            })
            // 如果題目不存在但有 currentQuestion，強制添加
            if (currentQuestion) {
              const fixedQuestionList = [...updatedQuestionList]
              while (fixedQuestionList.length <= currentQuestionIndex) {
                fixedQuestionList.push(currentQuestion)
              }
              fixedQuestionList[currentQuestionIndex] = currentQuestion
              return {
                ...updatedState,
                questionList: fixedQuestionList,
              }
            }
            // 否則返回 null 讓組件處理
            return null
          }

          return updatedState
        })
        break

      case 'OPPONENT_THINKING':
        console.log('[PlayProvider] 🤖 Opponent thinking')
        setBattleState(prev => {
          if (!prev) return null
          return {
            ...prev,
            opponentStatus: 'thinking',
            opponentAnswer: null,
          }
        })
        break

      case 'ROUND_RESOLVED':
        console.log('[PlayProvider] ✅ Round resolved:', {
          player1Score: message.player1_score,
          player2Score: message.player2_score,
          currentQuestionIndex: message.question_index,
        })

        setBattleState(prev => {
          if (!prev) return null
          const oldPlayer2Score = prev.player2Score
          const newPlayer2Score = message.player2_score || 0
          const opponentScoreChanged = newPlayer2Score > oldPlayer2Score
          const opponentStatus: 'hit' | 'miss' = opponentScoreChanged ? 'hit' : 'miss'

          // 推斷 DDA 狀態（根據分數變化）
          // 如果 player1 得分增加，可能答對了（系統可能降低難度）
          // 如果 player1 得分未增加，可能答錯了（系統可能提高難度）
          const player1ScoreChanged = (message.player1_score || prev.player1Score) > prev.player1Score
          let newDdaBand: 'low' | 'target' | 'high' | undefined = prev.ddaBand || 'target'

          // 簡單推斷：連續答對可能提高難度，連續答錯可能降低難度
          if (player1ScoreChanged) {
            // 答對了，根據連擊數推斷難度
            const currentStreak = prev.player1Streak || 0
            if (currentStreak >= 3) {
              newDdaBand = 'high' // 連續答對，難度提高
            } else if (currentStreak === 0) {
              newDdaBand = 'low' // 剛答對，難度降低
            }
          } else {
            // 答錯了，降低難度
            newDdaBand = 'low'
          }

          // 🎯 關鍵修復：重置答題狀態，為下一題做準備
          // 雖然 ROUND_STARTED 也會重置，但提前重置可以避免狀態不一致
          return {
            ...prev,
            player1Score: message.player1_score || prev.player1Score,
            player2Score: newPlayer2Score,
            opponentStatus: opponentStatus,
            ddaBand: newDdaBand,
            playerHasAnswered: false, // 🎯 重置答題狀態
            opponentAnswer: null, // 🎯 重置對手答案
          }
        })

        // 更新 tempo 和 arousal
        if (message.tempo_hint) {
          setTempoHint(message.tempo_hint)
        }
        if (message.arousal_level !== undefined) {
          setArousalLevel(message.arousal_level)
        }

        // 後端會在 ROUND_RESOLVED 後自動發送下一題的 ROUND_STARTED
        break

      case 'QUESTION_DECK_UPDATE':
        setBattleState(prev => {
          if (!prev) return null
          const updated = [...prev.questionList]
          message.questions?.forEach((q: Question, idx: number) => {
            const targetIndex = (message.start_index || 0) + idx
            if (updated[targetIndex]) {
              updated[targetIndex] = q
            }
          })
          return { ...prev, questionList: updated }
        })
        break

      case 'BATTLE_END':
        console.log('[PlayProvider] 🏁 Battle ended:', {
          winner: message.winner,
          finalScore: message.final_score,
        })
        setLobbyConfirmState(null)
        setBattleFlow('RESULT')

        setBattleState(prev => {
          if (!prev) {
            // 即使沒有 battleState，也設置 postMatchInsights
            setPostMatchInsights({
              matchId: message.match_id || null,
              winner: message.winner || null,
              finalScore: message.final_score || {
                player1: 0,
                player2: 0,
              },
              retestSuggestions: message.retest_suggestions || [],
              recallOverlay: message.recall_overlay || null,
            })
            return null
          }

          // 寫入 battle_events（如果 Rust 引擎沒有寫入）
          if (prev.answerRecords && prev.answerRecords.length > 0 && prev.matchId && user?.id) {
            const questionIdArray = prev.answerRecords.map(r => r.questionId)
            const isCorrectArray = prev.answerRecords.map(r => r.isCorrect ?? false)
            const userAnswerArray = prev.answerRecords.map(r => r.userAnswer)

            console.log('[PlayProvider] 📝 Writing battle_events:', {
              matchId: prev.matchId,
              questionCount: questionIdArray.length,
              correctCount: isCorrectArray.filter(c => c).length,
            })

            // 異步寫入，不阻塞 UI
            fetch('/api/play/battle/events', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                user_id: user.id,
                opponent_id: message.opponent_id || null,
                match_id: prev.matchId,
                match_type: message.match_type || prev.matchType || 'PVE_TRAINING',
                question_id_array: questionIdArray,
                is_correct_array: isCorrectArray,
                final_scores: message.final_score || {
                  player1: prev.player1Score || 0,
                  player2: prev.player2Score || 0,
                },
                server_timestamp: Date.now(),
                metadata: {
                  user_answers: userAnswerArray,
                  subject: prev.subject || null,
                  time_limit: prev.timeLimitSeconds || null,
                  seed: prev.seed || null,
                },
              }),
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  console.log('[PlayProvider] ✅ Successfully wrote battle_events:', data.event_id)
                } else {
                  console.warn('[PlayProvider] ⚠️ Failed to write battle_events:', data.error)
                }
              })
              .catch(err => {
                console.error('[PlayProvider] ❌ Error writing battle_events:', err)
              })
          }

          // 設置 postMatchInsights
          // coinBreakdown 將從 Elo 更新 API 返回，這裡先不設置
          setPostMatchInsights({
            matchId: message.match_id || prev.matchId || null,
            winner: message.winner || null,
            finalScore: message.final_score || {
              player1: prev.player1Score || 0,
              player2: prev.player2Score || 0,
            },
            coinsEarned: message.coins_earned, // 如果 Rust 返回了
            // coinBreakdown 將在對戰結束後從 Elo 更新 API 獲取
            retestSuggestions: message.retest_suggestions || [],
            recallOverlay: message.recall_overlay || null,
          })

          return {
            ...prev,
            isInBattle: false,
          }
        })

        setActiveModal('BATTLE_RESULT')
        fetchProgressionStatus().catch((err) => console.error('Failed to refresh progression', err))
        break

      case 'ANSWER_RESULT':
        // 🎯 關鍵修復：只更新分數，不要覆蓋 currentQuestionIndex
        // 因為 ROUND_STARTED 可能同時到達，需要保持 currentQuestionIndex 的更新
        setBattleState(prev => {
          if (!prev) return null

          const newPlayer1Score = message.player1_score ?? prev.player1Score
          const isCorrect = newPlayer1Score > (prev.lastPlayer1Score ?? prev.player1Score)
          const currentQuestion = prev.questionList[prev.currentQuestionIndex]

          // 記錄答題結果
          const answerRecords = [...(prev.answerRecords || [])]
          if (currentQuestion?.id) {
            // 檢查是否已經記錄過這題（避免重複記錄）
            const existingIndex = answerRecords.findIndex(r => r.questionId === currentQuestion.id)
            if (existingIndex >= 0) {
              answerRecords[existingIndex] = {
                ...answerRecords[existingIndex],
                isCorrect,
              }
            } else {
              answerRecords.push({
                questionId: currentQuestion.id,
                isCorrect,
                userAnswer: null,
              })
            }
          }

          return {
            ...prev,
            player1Score: newPlayer1Score,
            player2Score: message.player2_score ?? prev.player2Score,
            lastPlayer1Score: prev.player1Score, // 保存上一次分數
            answerRecords,
            // 🎯 關鍵：保持 currentQuestionIndex 不變，不要重置
            // currentQuestionIndex 應該由 ROUND_STARTED 更新
          }
        })

        if (message.tempo_hint) {
          setTempoHint(message.tempo_hint)
        }
        if (message.arousal_level !== undefined) {
          setArousalLevel(message.arousal_level)
        }
        break

      case 'ERROR':
        console.error('[PlayProvider] ❌ Server error:', message.message)
        break

      default:
        console.warn('[PlayProvider] ⚠️ Unknown message type:', message.type)
    }
  }, [systemMode, consumeEnergy, fetchProgressionStatus, user?.id])

  // Update ref whenever handleServerMessage changes
  useEffect(() => {
    handleServerMessageRef.current = handleServerMessage
  }, [handleServerMessage])

  // ============================================
  // Send WebSocket Message
  // ============================================

  const sendWebSocketMessage = useCallback((message: any) => {
    // Check if WebSocket is disabled
    if (!WS_ENABLED) {
      console.warn('[PlayProvider] ⚠️ WebSocket is disabled, message not sent:', message.type)
      return
    }

    // 使用 ref 來訪問最新的 ws，避免依賴問題
    const currentWs = wsRef.current
    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
      console.log('[PlayProvider] 📤 Sending message:', message.type)
      currentWs.send(JSON.stringify(message))
    } else {
      console.warn('[PlayProvider] ⚠️ WebSocket not connected, queuing message')
      messageQueue.current.push(message)
      // 嘗試連接（只有在未超過最大重試次數時）
      if ((!currentWs || currentWs.readyState === WebSocket.CLOSED) && reconnectAttempts.current < 5) {
        connectWebSocket()
      }
    }
  }, [connectWebSocket])

  // 共用對戰啟動 API：統一能量檢查與 WS 可用性
  const startMatch = useCallback(async ({ type, subject = null, timeLimit = 20, origin }: { type: string; subject?: string | null; timeLimit?: number; origin?: string }) => {
    if (!WS_ENABLED) {
      return { ok: false, error: '對戰服務已停用' }
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setBattleFlow('IDLE')
      return { ok: false, error: '尚未連線，請稍後再試' }
    }

    const energy = await checkEnergy()
    if (!energy.success) {
      setBattleFlow('IDLE')
      return { ok: false, error: energy.message || '羽毛不足，無法開始對戰' }
    }

    // 標記流程進入排隊狀態
    setBattleFlow('QUEUEING')

    // PVE 轉場顯示
    if (type === 'PVE_TRAINING') {
      setIsPveTransitioning(true)
    }

    sendWebSocketMessage({
      type: 'START_MATCH',
      match_type: type,
      subject: subject || null,
      time_limit: timeLimit,
      origin,
    })

    return { ok: true }
  }, [checkEnergy, sendWebSocketMessage, setIsPveTransitioning])

  // ============================================
  // Auto-confirm Lobby (PVE & PVP)
  // ============================================
  //
  // 前端自動幫玩家送出 CONFIRM_LOBBY：
  // - PVE：不需要玩家再按一次確認
  // - PVP：簡化流程，只保留匹配與退出
  useEffect(() => {
    if (!lobbyConfirmState) return
    // 使用 ref 來檢查連接狀態，避免依賴問題
    const currentWs = wsRef.current
    if (!currentWs || currentWs.readyState !== WebSocket.OPEN) return

    const matchId = lobbyConfirmState.matchId
    if (!matchId) return

    if (confirmedLobbyMatchesRef.current.has(matchId)) return
    confirmedLobbyMatchesRef.current.add(matchId)

    sendWebSocketMessage({
      type: 'CONFIRM_LOBBY',
      match_id: matchId,
    })
  }, [lobbyConfirmState, sendWebSocketMessage])

  // ============================================
  // Connect on Mount
  // ============================================

  useEffect(() => {
    if (user && WS_ENABLED) {
      connectWebSocket()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      // 使用 ref 來訪問最新的 ws，避免依賴問題
      const currentWs = wsRef.current
      if (currentWs) {
        currentWs.close()
      }
      isConnectingRef.current = false
    }
  }, [user, connectWebSocket])

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
    wsConnected,
    sendWebSocketMessage,
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
    postMatchInsights,
    setPostMatchInsights,
    pveCountdown,
    setPveCountdown,
    isPveTransitioning,
    setIsPveTransitioning,
    progression,
    refreshProgression: fetchProgressionStatus,
    openChest,
    battleFlow,
    setBattleFlow,
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
    wsConnected: true,
    sendWebSocketMessage: noop,
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
