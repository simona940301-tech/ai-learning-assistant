'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePlay } from '@/lib/play-context'
import { AlertCircle, Crosshair, Gauge, Loader2, Lightbulb, Radar, Sparkles, Sword, TrendingUp, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getAdaptiveCountdownDuration } from '@/lib/battle-ui'
import { RadarWaveAnimation } from './RadarWaveAnimation'
import { DataStreamAnimation } from './DataStreamAnimation'
import { MatchmakingMiniGame } from './MatchmakingMiniGame'

interface MatchmakingModalProps {
  onCancel: () => void
  matchType: 'RANKED' | 'WEAKNESS_BATTLE'
  subject?: string
  timeLimit?: number
}

interface KnowledgeTip {
  type: 'trivia' | 'common_mistake'
  content: string
  subject?: string
}

const MATCHMAKING_TIMEOUT = 60 // 60 秒超時

const phases = [
  {
    id: 'scan-nearby',
    window: [0, 10],
    title: '搜索附近玩家',
    subtitle: '快速掃描同段位資料',
    icon: Crosshair,
    accent: 'from-blue-500 via-sky-400 to-cyan-300',
  },
  {
    id: 'expand-range',
    window: [10, 20],
    title: '擴大搜索範圍',
    subtitle: '雷達波紋擴散中',
    icon: Radar,
    accent: 'from-emerald-400 via-cyan-300 to-blue-400',
  },
  {
    id: 'skill-match',
    window: [20, 40],
    title: '分析實力匹配',
    subtitle: '對比 Elo、題型勝率',
    icon: Gauge,
    accent: 'from-purple-400 via-violet-300 to-pink-400',
  },
  {
    id: 'finalize',
    window: [40, 60],
    title: '最終配對中',
    subtitle: '倒數確認連線',
    icon: Sparkles,
    accent: 'from-amber-400 via-orange-400 to-red-400',
  },
]

export function MatchmakingModal({ onCancel, matchType, subject, timeLimit = 20 }: MatchmakingModalProps) {
  const {
    sendWebSocketMessage,
    wsConnected,
    progression,
    setPveCountdown,
    checkEnergy,
    battleState,
  } = usePlay()
  const [isSearching, setIsSearching] = useState(true)
  const [searchElapsed, setSearchElapsed] = useState(0) // 搜索經過時間（秒）
  const [searchRange, setSearchRange] = useState(100) // 當前搜索範圍（±段位）
  const [knowledgeTips, setKnowledgeTips] = useState<KnowledgeTip[]>([])
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [matchId, setMatchId] = useState<string | null>(null) // 用於取消匹配
  const [smartRetryChoice, setSmartRetryChoice] = useState<'AI' | 'WIDE' | null>(null)
  const [telemetry, setTelemetry] = useState(() => ({
    online: 1824,
    ongoing: 214,
  }))
  const smartRetryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showMiniGame, setShowMiniGame] = useState(false)

  // 從 context 獲取 matchId（當收到 MATCH_FOUND 時）
  useEffect(() => {
    if (battleState?.matchId && !matchId) {
      setMatchId(battleState.matchId)
    }
  }, [battleState?.matchId, matchId])

  // 發送匹配請求
  useEffect(() => {
    if (wsConnected) {
      sendWebSocketMessage({
        type: 'START_MATCH',
        match_type: matchType,
        subject: subject || null,
        time_limit: timeLimit,
      })
      setIsSearching(true)
      setSearchElapsed(0)
      setSearchRange(100)
    }
  }, [wsConnected, matchType, subject, timeLimit, sendWebSocketMessage])

  // 獲取知識點提示
  useEffect(() => {
    const fetchTips = async () => {
      try {
        const response = await fetch(`/api/play/matchmaking/knowledge-tips?subject=${subject || ''}`)
        const data = await response.json()
        if (data.success && data.tips) {
          setKnowledgeTips(data.tips)
        }
      } catch (error) {
        console.error('[MatchmakingModal] Failed to fetch knowledge tips:', error)
      }
    }

    if (isSearching) {
      fetchTips()
    }
  }, [isSearching, subject])

  // 知識點輪播（每 4 秒切換）
  useEffect(() => {
    if (knowledgeTips.length === 0) return

    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % knowledgeTips.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [knowledgeTips.length])

  // 取消匹配處理
  const handleCancelMatch = () => {
    if (matchId && wsConnected) {
      sendWebSocketMessage({
        type: 'CANCEL_LOBBY',
        match_id: matchId,
      })
    }
    setIsSearching(false)
    onCancel()
  }

  // 搜索超時處理
  useEffect(() => {
    if (!isSearching) return

    if (searchElapsed >= MATCHMAKING_TIMEOUT) {
      setIsSearching(false)
      // 可以顯示超時提示
    }
  }, [searchElapsed, isSearching])

  // 搜索時間計時和範圍擴大模擬
  useEffect(() => {
    if (!isSearching) return

    const interval = setInterval(() => {
      setSearchElapsed(prev => {
        const newElapsed = prev + 1
        // 15秒後開啟小遊戲
        if (newElapsed === 15 && !showMiniGame) {
          setShowMiniGame(true)
        }
        return newElapsed
      })
      setSearchRange(prev => Math.min(prev + 15, 800))
    }, 1000)

    return () => clearInterval(interval)
  }, [isSearching, showMiniGame])

  // 模擬在線人數 / 對戰場次，增強臨場感
  useEffect(() => {
    const tick = () => {
      setTelemetry(prev => {
        const drift = (Math.random() - 0.5) * 40
        const online = Math.max(800, Math.round(prev.online + drift))
        const ongoing = Math.max(120, Math.round(prev.ongoing + drift * 0.3))
        return { online, ongoing }
      })
    }
    tick()
    const timer = setInterval(tick, 5000)
    return () => clearInterval(timer)
  }, [])

  const currentTip = knowledgeTips[currentTipIndex]
  const adaptiveCountdown = useMemo(() => getAdaptiveCountdownDuration(progression?.totalMatches), [progression?.totalMatches])
  const isTimeout = searchElapsed >= MATCHMAKING_TIMEOUT

  const activePhase = useMemo(() => {
    const found = phases.find(phase => searchElapsed < phase.window[1])
    return found || phases[phases.length - 1]
  }, [searchElapsed])

  const phaseProgress = useMemo(() => {
    const [start, end] = activePhase.window
    const clamped = Math.min(Math.max(searchElapsed - start, 0), end - start)
    const duration = Math.max(end - start, 1)
    return (clamped / duration) * 100
  }, [activePhase, searchElapsed])

  const handleSmartRetry = useCallback(async (mode: 'AI' | 'WIDE') => {
    if (smartRetryChoice) return
    setSmartRetryChoice(mode)
    if (smartRetryTimeout.current) {
      clearTimeout(smartRetryTimeout.current)
      smartRetryTimeout.current = null
    }

    if (mode === 'AI') {
      const energy = await checkEnergy()
      if (!energy.success) {
        setSmartRetryChoice(null)
        return
      }
      setPveCountdown(adaptiveCountdown)
      sendWebSocketMessage({
        type: 'START_MATCH',
        match_type: 'PVE_TRAINING',
        subject: subject || null,
        time_limit: timeLimit,
        origin: 'SMART_RETRY_AI',
      })
      setIsSearching(false)
      onCancel()
      return
    }

    if (matchId && wsConnected) {
      sendWebSocketMessage({
        type: 'CANCEL_LOBBY',
        match_id: matchId,
        reason: 'SMART_RETRY_WIDE',
      })
    }
    setSearchElapsed(0)
    setSearchRange(800)
    sendWebSocketMessage({
      type: 'START_MATCH',
      match_type: matchType,
      subject: subject || null,
      time_limit: timeLimit,
      elo_range: 800,
      widen: true,
    })
    setSmartRetryChoice(null)
  }, [adaptiveCountdown, checkEnergy, matchId, matchType, onCancel, sendWebSocketMessage, setPveCountdown, smartRetryChoice, subject, timeLimit, wsConnected])

  const smartRetryPending = isTimeout && !smartRetryChoice

  useEffect(() => {
    if (!smartRetryPending) return
    smartRetryTimeout.current = setTimeout(() => {
      handleSmartRetry('AI')
    }, 1000)

    return () => {
      if (smartRetryTimeout.current) {
        clearTimeout(smartRetryTimeout.current)
        smartRetryTimeout.current = null
      }
    }
  }, [smartRetryPending, handleSmartRetry])

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-3xl border-0 bg-[#04070f] text-white">
        <DialogHeader className="mb-6 text-left">
          <DialogTitle className="text-2xl font-semibold tracking-tight">{matchType === 'RANKED' ? '排位賽匹配中' : '弱點會戰匹配中'}</DialogTitle>
          <DialogDescription className="text-sm text-white/60">
            Fortnite 式等待系統 · 讓你確切知道進度與下一步
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/60">Stage</p>
                  <h3 className="text-2xl font-bold">{activePhase.title}</h3>
                  <p className="text-sm text-white/70">{activePhase.subtitle}</p>
                </div>
                <div className="flex flex-col items-end text-right text-xs text-white/60">
                  <span className="flex items-center gap-2 text-sm font-medium text-white">
                    <ClockGlyph /> {Math.min(searchElapsed, MATCHMAKING_TIMEOUT).toString().padStart(2, '0')}s
                  </span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />±{searchRange} 等級</span>
                </div>
              </div>

              <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  key={activePhase.id}
                  className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${activePhase.accent}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${phaseProgress}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {phases.map((phase) => {
                  const Icon = phase.icon
                  const isActive = phase.id === activePhase.id
                  const isDone = searchElapsed >= phase.window[1]
                  return (
                    <motion.div
                      key={phase.id}
                      className={`relative overflow-hidden rounded-2xl border px-4 py-3 ${
                        isDone
                          ? 'border-emerald-400/40 bg-emerald-400/10'
                          : isActive
                          ? 'border-white/40 bg-white/10'
                          : 'border-white/10 bg-white/5'
                      }`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {/* 雷達波紋動畫 (階段2) */}
                      {phase.id === 'expand-range' && isActive && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2">
                          <RadarWaveAnimation active theme="blue" size={60} waveCount={2} />
                        </div>
                      )}

                      {/* 數據流動畫 (階段3) */}
                      {phase.id === 'skill-match' && isActive && (
                        <DataStreamAnimation active streamCount={3} theme="purple" />
                      )}

                      <div className="relative z-10 flex items-center gap-3 text-sm font-semibold">
                        <Icon className={`h-4 w-4 ${isDone ? 'text-emerald-300' : 'text-white/70'}`} />
                        <span>{phase.title}</span>
                      </div>
                      <p className="relative z-10 mt-1 text-xs text-white/60">{phase.subtitle}</p>
                    </motion.div>
                  )
                })}
              </div>

              {smartRetryPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4"
                >
                  <p className="text-sm font-semibold text-amber-200">釋出智慧型重試</p>
                  <p className="text-xs text-amber-100/80">1 秒內若無操作，將自動切換到 AI 訓練陪練</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button onClick={() => handleSmartRetry('AI')} className="flex-1" size="sm">
                      切換到 AI 訓練（推薦）
                    </Button>
                    <Button onClick={() => handleSmartRetry('WIDE')} variant="outline" className="flex-1 border-white/40 text-white" size="sm">
                      擴大段位範圍後再試
                    </Button>
                  </div>
                </motion.div>
              )}

              {!wsConnected && (
                <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  WebSocket 未連接，正在重試中...
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.4em] text-white/50">Live Stats</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-white/70">
                    <Users className="h-4 w-4 text-white/60" /> 目前在線
                  </span>
                  <span className="text-lg font-semibold">{telemetry.online.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-white/70">
                    <SwordGlyph /> 進行中的對戰
                  </span>
                  <span className="text-lg font-semibold">{telemetry.ongoing.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {currentTip && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTipIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-white/60">
                      {currentTip.type === 'trivia' ? <Lightbulb className="h-4 w-4 text-yellow-300" /> : <AlertCircle className="h-4 w-4 text-orange-300" />}
                      {currentTip.type === 'trivia' ? '冷知識快問快答' : '常見失誤提醒'}
                    </div>
                    <p className="text-sm leading-relaxed text-white/90">{currentTip.content}</p>
                  </motion.div>
                </AnimatePresence>
                {knowledgeTips.length > 1 && (
                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    {knowledgeTips.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentTipIndex(index)}
                        className={`h-1.5 rounded-full transition-all ${index === currentTipIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}
                        aria-label={`查看知識點 ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={handleCancelMatch} className="flex-1 border-white/40 text-white">
            取消匹配
          </Button>
          <Button onClick={onCancel} className="flex-1 bg-white text-slate-900 hover:bg-white/90">
            返回大廳
          </Button>
        </div>
      </DialogContent>

      {/* 匹配小遊戲 (15秒後自動開啟) */}
      <MatchmakingMiniGame
        visible={showMiniGame}
        onComplete={() => setShowMiniGame(false)}
      />
    </Dialog>
  )
}

function ClockGlyph() {
  return (
    <span className="relative inline-flex items-center justify-center">
      <Loader2 className="h-4 w-4 animate-spin text-white/70" />
    </span>
  )
}

function SwordGlyph() {
  return (
    <span className="inline-flex items-center gap-1 text-white/70">
      <Sword className="h-4 w-4" /> 火線賽局
    </span>
  )
}
