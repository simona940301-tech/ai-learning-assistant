'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trophy, Sparkles, X, TrendingUp, TrendingDown, Coins } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { KnowledgeCurveHeatmap } from './KnowledgeCurveHeatmap'
import { useAuth } from '@/lib/auth-context'
import { usePlay } from '@/lib/play-context'
import { RetestCards } from '@/components/battle/RetestCards'
import { PostMatchRecallOverlay } from '@/components/battle/PostMatchRecallOverlay'
import { CoinCounter, XPCounter, EloChange } from '@/components/ui/count-up'
import { GameHaptics } from '@/lib/haptics'
import { useLearningChain } from '@/lib/hooks/useLearningChain'
import { sendBattleEndAction } from '@/lib/chick/action-bus'
import { useChickStore } from '@/src/store/chickStore'

interface BattleResultModalProps {
  onClose: () => void
  player1Score?: number
  player2Score?: number
  isWinner?: boolean
  skillMastery?: Record<string, number> // 知識點掌握度 { skillId: masteryLevel (0-1) }
  rewards?: {
    coins?: number
    experience?: number
  }
}

type CelebrationLayer = 1 | 2 | 3 | 4

export function BattleResultModal({
  onClose,
  player1Score = 0,
  player2Score = 0,
  isWinner = false,
  skillMastery: propSkillMastery,
  rewards = {},
}: BattleResultModalProps) {
  const { user } = useAuth()
  const {
    postMatchInsights,
    setPostMatchInsights,
    userStatus,
    progression,
    refreshProgression,
    openSystemModal,
  } = usePlay()
  const [skillMastery, setSkillMastery] = useState<Record<string, number>>(propSkillMastery || {})
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const [eloChange, setEloChange] = useState<{ oldElo: number; newElo: number; eloDiff: number } | null>(null)
  const [showLevelCelebration, setShowLevelCelebration] = useState(false)
  const lastLevelRef = useRef(progression?.xp.level || 1)
  const [activeLayer, setActiveLayer] = useState<CelebrationLayer>(1)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Learning chain navigation hooks
  const { goToWrongBook } = useLearningChain()
  const refreshChickStatus = useChickStore(state => state.refreshAfterBattleOrExplanation)

  // 🎯 關鍵修復：將 resolvedIsWinner 定義移到所有使用它的 useEffect 之前
  // 避免 "Cannot access before initialization" 錯誤
  const resolvedPlayer1Score = postMatchInsights?.finalScore?.player1 ?? player1Score
  const resolvedPlayer2Score = postMatchInsights?.finalScore?.player2 ?? player2Score
  const resolvedIsWinner = postMatchInsights?.winner
    ? postMatchInsights.winner === user?.id
    : isWinner

  useEffect(() => {
    setOverlayDismissed(false)
  }, [postMatchInsights?.matchId])

  // Send battle end event to Chick system
  useEffect(() => {
    if (!postMatchInsights?.matchId) return

    const questionsCorrect = postMatchInsights?.finalScore?.player1 ?? 0
    const questionsTotal = (postMatchInsights?.finalScore?.player1 ?? 0) + (postMatchInsights?.finalScore?.player2 ?? 0)

    sendBattleEndAction({
      battleResult: resolvedIsWinner ? 'win' : (resolvedPlayer1Score === resolvedPlayer2Score ? 'draw' : 'loss'),
      questionsCorrect,
      questionsTotal: Math.max(questionsTotal, 1),
    }).then(() => {
      // Refresh Chick status after battle
      refreshChickStatus()
    })
  }, [postMatchInsights?.matchId, resolvedIsWinner, resolvedPlayer1Score, resolvedPlayer2Score, refreshChickStatus])

  useEffect(() => {
    setActiveLayer(1)
    const timers: Array<ReturnType<typeof setTimeout>> = []
    timers.push(setTimeout(() => setActiveLayer(2), 2000))
    timers.push(setTimeout(() => setActiveLayer(3), 4000))

    // 🎮 勝負觸覺反饋
    if (resolvedIsWinner) {
      GameHaptics.celebrate()
    } else {
      GameHaptics.fail()
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [postMatchInsights?.matchId, resolvedIsWinner])

  // Fetch Elo change and coinBreakdown after battle (if PVP)
  useEffect(() => {
    if (!postMatchInsights?.matchId || !userStatus?.eloRank) return

    // 如果有 coinBreakdown，不需要再獲取
    if (postMatchInsights.coinBreakdown && postMatchInsights.eloChange) {
      setEloChange(postMatchInsights.eloChange)
      return
    }

    // 等待 Elo 更新 API 完成後獲取（Rust 伺服器異步調用）
    const timer = setTimeout(() => {
      // 刷新用戶狀態獲取更新後的 Elo
      fetch('/api/play/user/status', {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.eloRank && userStatus.eloRank) {
            const diff = data.eloRank - userStatus.eloRank
            if (diff !== 0) {
              setEloChange({
                oldElo: userStatus.eloRank,
                newElo: data.eloRank,
                eloDiff: diff,
              })
            }
          }
        })
        .catch(console.error)

      // 嘗試從 Elo 更新 API 獲取 coinBreakdown（如果知道 matchId）
      // 注意：這需要一個查詢 API，暫時使用 fallback 邏輯
    }, 2500) // 等待 Rust 伺服器調用 Elo 更新 API 完成

    return () => clearTimeout(timer)
  }, [postMatchInsights?.matchId, postMatchInsights?.coinBreakdown, postMatchInsights?.eloChange, userStatus?.eloRank])

  // P12: 從 API 獲取 skill_mastery_json（如果未提供）
  useEffect(() => {
    if (!user) return
    if (Object.keys(skillMastery).length > 0) return

    let cancelled = false
    async function fetchSkillMastery() {
      try {
        const response = await fetch('/api/play/user/skill-mastery', {
          credentials: 'include',
        })
        const contentType = response.headers.get('content-type') || ''
        if (!response.ok || !contentType.includes('application/json')) {
          console.warn('[BattleResultModal] Skill mastery API unavailable, skipping update.')
          return
        }
        const data = await response.json()
        if (!cancelled && data.success && data.skillMastery) {
          setSkillMastery(data.skillMastery)
        }
      } catch (error) {
        console.error('[BattleResultModal] Failed to fetch skill mastery:', error)
      }
    }

    fetchSkillMastery()
    return () => {
      cancelled = true
    }
  }, [user, skillMastery])

  useEffect(() => {
    if (!progression) return
    if (progression.xp.level > (lastLevelRef.current || 1)) {
      setShowLevelCelebration(true)
      lastLevelRef.current = progression.xp.level
      const timer = setTimeout(() => setShowLevelCelebration(false), 2200)
      return () => clearTimeout(timer)
    }
  }, [progression, progression?.xp.level])

  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const handleScroll = () => {
      if (node.scrollTop > 40) {
        setActiveLayer(prev => (prev < 4 ? 4 : prev))
      }
    }
    node.addEventListener('scroll', handleScroll)
    return () => node.removeEventListener('scroll', handleScroll)
  }, [])

  // resolvedPlayer1Score, resolvedPlayer2Score, resolvedIsWinner 已在上方定義
  const scoreDiff = resolvedPlayer1Score - resolvedPlayer2Score
  const handleClose = useCallback(() => {
    setPostMatchInsights(null)
    refreshProgression()
    onClose()
  }, [onClose, setPostMatchInsights, refreshProgression])

  const matchId = postMatchInsights?.matchId ?? null
  const suggestions = useMemo(() => {
    const raw = postMatchInsights?.retestSuggestions ?? []
    const seen = new Set<string>()
    return raw.filter((item: any) => {
      const key = item?.concept_id || item?.label || item?.id
      if (!key) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [postMatchInsights?.retestSuggestions])
  const coinsEarned = rewards.coins ?? postMatchInsights?.coinsEarned ?? 0
  const xpEarned = rewards.experience ?? 0
  const levelProgress = progression ? Math.round((progression.xp.progress || 0) * 100) : null
  const handleRevealAll = useCallback(() => setActiveLayer(4), [])
  const handleShare = useCallback(async () => {
    if (typeof navigator === 'undefined') return
    const summary = `我在 PLMS ${resolvedIsWinner ? '贏得' : '完成'} 一場對戰：${resolvedPlayer1Score} vs ${resolvedPlayer2Score}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PLMS 對戰戰報', text: summary })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(summary)
        alert('戰報已複製，快去分享吧！')
      }
    } catch (error) {
      console.error('[BattleResultModal] Failed to share:', error)
    }
  }, [resolvedIsWinner, resolvedPlayer1Score, resolvedPlayer2Score])
  const handleRematch = useCallback(() => {
    handleClose()
    setTimeout(() => openSystemModal(), 300)
  }, [handleClose, openSystemModal])

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl overflow-hidden p-0" aria-describedby="battle-result-description">
          <DialogHeader className="sr-only">
            <DialogTitle>對戰結果</DialogTitle>
            <DialogDescription id="battle-result-description">顯示本場勝負、獎勵與戰後建議</DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[calc(100vh-4rem)] flex-col bg-gradient-to-b from-[#05070E] to-[#101525] text-white">
            <div className="relative border-b border-white/10 px-6 py-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Layered Celebration</p>
                <Button variant="ghost" size="sm" className="text-white/70" onClick={handleRevealAll}>
                  查看詳細
                </Button>
              </div>
              <AnimatePresence>
                {showLevelCelebration && progression && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-6 -top-3 rounded-xl border border-yellow-300/40 bg-yellow-100/80 px-4 py-2 text-center text-sm font-semibold text-yellow-800 shadow"
                  >
                    Level Up · 進入 Lv {progression.xp.level}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {activeLayer >= 1 && (
                  <motion.div
                    key={`layer-1-${resolvedPlayer1Score}-${resolvedPlayer2Score}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 space-y-5 text-center"
                  >
                    <h2 className="text-4xl font-semibold flex items-center justify-center gap-3">
                      {resolvedIsWinner ? (
                        <>
                          <img src="/congrats.png" alt="恭喜" className="w-12 h-12 object-contain" />
                          恭喜獲勝
                        </>
                      ) : scoreDiff === 0 ? (
                        <>
                          🤝 精彩平局
                        </>
                      ) : (
                        '已全力以赴'
                      )}
                    </h2>
                    <p className="text-sm text-white/70">
                      {scoreDiff === 0
                        ? '雙方都值得掌聲'
                        : resolvedIsWinner
                          ? `你領先 ${Math.abs(scoreDiff)} 分贏下此戰`
                          : `差 ${Math.abs(scoreDiff)} 分，下一場就是逆襲！`}
                    </p>
                    <div className="grid grid-cols-3 items-center gap-4 text-4xl font-black">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">你</p>
                        <p>{resolvedPlayer1Score}</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/70">vs</p>
                        <p className="text-base text-white/50">差距 {Math.abs(scoreDiff)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">對手</p>
                        <p className="text-white/70">{resolvedPlayer2Score}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {activeLayer >= 2 && (
                <motion.section
                  key="layer-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
                >
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    {/* 🪙 金幣計數器 (Mario風格) */}
                    <CoinCounter
                      amount={coinsEarned}
                      onChange={() => GameHaptics.collectCoin()}
                    />

                    {/* ⭐ 經驗值計數器 */}
                    <XPCounter xp={xpEarned} />

                    {/* 📊 Elo變化 */}
                    {eloChange && eloChange.eloDiff !== 0 && (
                      <EloChange
                        oldElo={eloChange.oldElo}
                        newElo={eloChange.newElo}
                      />
                    )}
                  </div>
                  {levelProgress !== null && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>等級 Lv {progression?.xp.level}</span>
                        <span>{levelProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, Math.max(0, levelProgress))}%` }} />
                      </div>
                    </div>
                  )}
                </motion.section>
              )}

              {activeLayer >= 3 && suggestions.length > 0 && (
                <motion.section key="layer-3-cards" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <RetestCards matchId={matchId} suggestions={suggestions.slice(0, 3)} />
                </motion.section>
              )}

              {activeLayer >= 3 && (
                <motion.section
                  key="layer-3-growth"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="mb-3 flex items-center justify-between text-sm text-white/70">
                    <span>戰後掌握度</span>
                    <Sparkles className="h-4 w-4 text-white/60" />
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/20 p-3">
                    <KnowledgeCurveHeatmap skillMastery={skillMastery} />
                  </div>
                </motion.section>
              )}
            </div>

            <div className="border-t border-white/10 bg-black/40 p-4">
              {activeLayer < 4 && (
                <p className="text-xs text-white/60">滑動或點擊「查看詳細」可立即解鎖完整戰報</p>
              )}
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                {activeLayer >= 4 && (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 border-white/30 text-white hover:bg-white/10"
                      onClick={() => {
                        goToWrongBook()
                        handleClose()
                      }}
                    >
                      錯題本
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.6)] hover:bg-indigo-400"
                      onClick={handleRematch}
                    >
                      再來一局
                    </Button>
                  </>
                )}
                <Button onClick={() => {
                  handleClose()
                  window.location.href = '/home'
                }} className="flex-1 rounded-xl bg-white text-slate-900 hover:bg-slate-100" size="lg">
                  返回首頁
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PostMatchRecallOverlay
        matchId={matchId}
        payload={postMatchInsights?.recallOverlay ?? null}
        visible={!!postMatchInsights?.recallOverlay && !overlayDismissed}
        onDismiss={() => setOverlayDismissed(true)}
      />
    </>
  )
}
