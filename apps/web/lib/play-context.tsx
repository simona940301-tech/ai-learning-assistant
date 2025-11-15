'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

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

export interface BattleState {
  isInBattle: boolean
  matchId: string | null
  questionList: Question[]
  currentQuestionIndex: number
  player1Score: number
  player2Score: number
  player1Streak: number
  player2Streak: number
  opponentStatus: OpponentStatus
  opponentAnswer: 'A' | 'B' | 'C' | 'D' | null
  hasShield?: boolean
  ddaBand?: 'low' | 'target' | 'high' // DDA 難度區間（根據答題結果推斷）
}

export interface UserStatus {
  dailyEnergyCount: number
  walletBalance: number
  eloRank: number
  dailyEnergyResetAt?: string
}

export interface LobbyConfirmState {
  matchId: string
  countdown: number
  players: string[]
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

interface PlayContextType {
  // WebSocket
  wsConnected: boolean
  sendWebSocketMessage: (message: any) => void
  
  // User Status
  userStatus: UserStatus | null
  isLoadingStatus: boolean
  
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
}

const PlayContext = createContext<PlayContextType | undefined>(undefined)

// ============================================
// WebSocket URL
// ============================================

const WS_URL = process.env.NEXT_PUBLIC_BATTLE_WS_URL || 'ws://localhost:8080/ws/battle'

// ============================================
// Play Provider
// ============================================

export function PlayProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [battleState, setBattleState] = useState<BattleState | null>(null)
  const [lobbyConfirmState, setLobbyConfirmState] = useState<LobbyConfirmState | null>(null)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [systemMode, setSystemMode] = useState<SystemMode>(null)
  const [customMode, setCustomMode] = useState<CustomMode>(null)
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [tempoHint, setTempoHint] = useState('')
  const [arousalLevel, setArousalLevel] = useState(0)
  const [postMatchInsights, setPostMatchInsights] = useState<PostMatchInsights | null>(null)
  
  const messageQueue = useRef<any[]>([])
  const reconnectAttempts = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ============================================
  // Fetch User Status
  // ============================================

  useEffect(() => {
    const fetchUserStatus = async () => {
      try {
        const response = await fetch('/api/play/user/status', {
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUserStatus({
              dailyEnergyCount: data.dailyEnergyCount || 0,
              walletBalance: data.walletBalance || 0,
              eloRank: data.eloRank || 1000,
              dailyEnergyResetAt: data.dailyEnergyResetAt,
            })
          }
        }
      } catch (error) {
        console.error('[PlayProvider] Failed to fetch user status:', error)
      } finally {
        setIsLoadingStatus(false)
      }
    }

    if (user) {
      fetchUserStatus()
    } else {
      setIsLoadingStatus(false)
    }
  }, [user])

  // Refresh user status when battle ends (to get updated Elo and coins)
  useEffect(() => {
    if (postMatchInsights?.matchId && user) {
      // Small delay to ensure Elo update API has completed
      const timer = setTimeout(() => {
        fetch('/api/play/user/status', {
          credentials: 'include',
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setUserStatus({
                dailyEnergyCount: data.dailyEnergyCount || 0,
                walletBalance: data.walletBalance || 0,
                eloRank: data.eloRank || 1000,
                dailyEnergyResetAt: data.dailyEnergyResetAt,
              })
            }
          })
          .catch(console.error)
      }, 2000) // Wait 2 seconds for Elo update to complete

      return () => clearTimeout(timer)
    }
  }, [postMatchInsights?.matchId, user])

  // ============================================
  // WebSocket Connection
  // ============================================

  const connectWebSocket = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      return
    }

    console.log('[PlayProvider] 🔌 Connecting to WebSocket:', WS_URL)
    const websocket = new WebSocket(WS_URL)

    websocket.onopen = () => {
      console.log('[PlayProvider] ✅ WebSocket connected')
      setWsConnected(true)
      reconnectAttempts.current = 0

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
        handleServerMessage(message)
      } catch (error) {
        console.error('[PlayProvider] ❌ Failed to parse message:', error)
      }
    }

    websocket.onerror = (error) => {
      console.error('[PlayProvider] ❌ WebSocket error:', error)
    }

    websocket.onclose = () => {
      console.log('[PlayProvider] 🔌 WebSocket closed')
      setWsConnected(false)
      setWs(null)

      // 自動重連（最多 5 次）
      if (reconnectAttempts.current < 5) {
        reconnectAttempts.current++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000)
        console.log(`[PlayProvider] 🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
        
        // 顯示斷線提示 Toast
        if (typeof window !== 'undefined') {
          import('@/components/ui/Toast').then(({ toast }) => {
            toast.loading(
              `連線中斷，正在嘗試重新連接 (第 ${reconnectAttempts.current} 次 / 5)`,
              0 // 持續顯示直到連接成功
            )
          })
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket()
        }, delay)
      } else {
        console.error('[PlayProvider] ❌ Max reconnection attempts reached')
        // 顯示重連失敗提示
        if (typeof window !== 'undefined') {
          import('@/components/ui/Toast').then(({ toast }) => {
            toast.error('連線失敗，請刷新頁面重試', 5000)
          })
        }
      }
    }

    setWs(websocket)
  }, [user])

  // ============================================
  // Handle Server Messages
  // ============================================

  const handleServerMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'MATCH_FOUND':
        console.log('[PlayProvider] 🎯 MATCH_FOUND EVENT RECEIVED!', {
          matchId: message.match_id,
          questions: message.question_list?.length || 0,
        })
        
        setBattleState(prev => ({
          ...prev || {
            isInBattle: false,
            matchId: null,
            questionList: [],
            currentQuestionIndex: 0,
            player1Score: 0,
            player2Score: 0,
            player1Streak: 0,
            player2Streak: 0,
            opponentStatus: 'idle',
            opponentAnswer: null,
          },
          isInBattle: false, // 等待確認大廳
          matchId: message.match_id,
          questionList: message.question_list || [],
        }))
        
        // 顯示大廳確認
        setLobbyConfirmState({
          matchId: message.match_id,
          countdown: 15,
          players: message.players || [],
        })
        break

      case 'LOBBY_CONFIRMING':
        setLobbyConfirmState(prev => prev ? {
          ...prev,
          countdown: message.countdown || 0,
        } : null)
        break

      case 'LOBBY_CONFIRMED':
        console.log('[PlayProvider] ✅ Lobby confirmed')
        setLobbyConfirmState(null)
        // 大廳確認完成，現在才真正消耗 Energy
        consumeEnergy().catch(error => {
          console.error('[PlayProvider] Failed to consume energy after lobby confirmation:', error)
          // 即使消耗失敗，也不阻止對戰繼續（避免影響用戶體驗）
        })
        // 等待 ROUND_STARTED
        break

      case 'LOBBY_DISSOLVED':
        console.log('[PlayProvider] ❌ Lobby dissolved:', message.reason)
        setLobbyConfirmState(null)
        setBattleState(null)
        break

      case 'ROUND_STARTED':
        console.log('[PlayProvider] 🎮 Round started:', message.question_index)
        setBattleState(prev => {
          if (!prev) return null
          return {
            ...prev,
            isInBattle: true,
            currentQuestionIndex: message.question_index || 0,
            opponentStatus: 'idle',
            opponentAnswer: null,
          }
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
          
          return {
            ...prev,
            player1Score: message.player1_score || prev.player1Score,
            player2Score: newPlayer2Score,
            opponentStatus: opponentStatus,
            ddaBand: newDdaBand,
          }
        })
        
        // 更新 tempo 和 arousal
        if (message.tempo_hint) {
          setTempoHint(message.tempo_hint)
        }
        if (message.arousal_level !== undefined) {
          setArousalLevel(message.arousal_level)
        }
        
        // 2.5 秒後自動進入下一題（由 page.tsx 處理）
        break

      case 'BATTLE_END':
        console.log('[PlayProvider] 🏁 Battle ended:', {
          winner: message.winner,
          finalScore: message.final_score,
        })
        
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
        break

      case 'ANSWER_RESULT':
        // 更新分數和狀態
        setBattleState(prev => {
          if (!prev) return null
          return {
            ...prev,
            player1Score: message.player1_score || prev.player1Score,
            player2Score: message.player2_score || prev.player2Score,
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
  }, [])

  // ============================================
  // Send WebSocket Message
  // ============================================

  const sendWebSocketMessage = useCallback((message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log('[PlayProvider] 📤 Sending message:', message.type)
      ws.send(JSON.stringify(message))
    } else {
      console.warn('[PlayProvider] ⚠️ WebSocket not connected, queuing message')
      messageQueue.current.push(message)
      // 嘗試連接
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        connectWebSocket()
      }
    }
  }, [ws, connectWebSocket])

  // ============================================
  // Connect on Mount
  // ============================================

  useEffect(() => {
    if (user) {
      connectWebSocket()
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (ws) {
        ws.close()
      }
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
  // Check Energy (預扣檢查)
  // ============================================

  const checkEnergy = useCallback(async () => {
    try {
      const response = await fetch('/api/play/user/status', {
        credentials: 'include',
      })
      
      const data = await response.json()
      
      if (data.success) {
        const hasEnoughEnergy = (data.dailyEnergyCount || 0) > 0
        return { 
          success: hasEnoughEnergy, 
          message: hasEnoughEnergy ? undefined : '精力值不足',
          currentEnergy: data.dailyEnergyCount || 0,
        }
      } else {
        return { success: false, message: '無法檢查精力值' }
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
        setUserStatus(prev => prev ? {
          ...prev,
          dailyEnergyCount: Math.max(0, prev.dailyEnergyCount - 1),
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
  // Context Value
  // ============================================

  const value: PlayContextType = {
    wsConnected,
    sendWebSocketMessage,
    userStatus,
    isLoadingStatus,
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
  }

  return (
    <PlayContext.Provider value={value}>
      {children}
    </PlayContext.Provider>
  )
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

