'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trophy, Sparkles, X, TrendingUp, TrendingDown, Coins } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { KnowledgeCurveHeatmap } from './KnowledgeCurveHeatmap'
import { useAuth } from '@/lib/auth-context'
import { usePlay } from '@/lib/play-context'
import { RetestCards } from '@/components/battle/RetestCards'
import { PostMatchRecallOverlay } from '@/components/battle/PostMatchRecallOverlay'

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

/**
 * 完整結果動畫組件（3 秒序列）
 * 
 * 動畫階段：
 * 1. 分數與勝負顯示（0-1 秒）
 * 2. 獎勵獲得彈窗（1-2 秒）
 * 3. 知識曲線視覺化更新（2-3 秒）
 */
export function BattleResultModal({
  onClose,
  player1Score = 0,
  player2Score = 0,
  isWinner = false,
  skillMastery: propSkillMastery,
  rewards = {},
}: BattleResultModalProps) {
  const { user } = useAuth()
  const { postMatchInsights, setPostMatchInsights, userStatus } = usePlay()
  const [animationPhase, setAnimationPhase] = useState<'score' | 'rewards' | 'mastery' | 'complete'>('score')
  const [skillMastery, setSkillMastery] = useState<Record<string, number>>(propSkillMastery || {})
  const [overlayDismissed, setOverlayDismissed] = useState(false)
  const [eloChange, setEloChange] = useState<{ oldElo: number; newElo: number; eloDiff: number } | null>(null)

  useEffect(() => {
    setOverlayDismissed(false)
  }, [postMatchInsights?.matchId])

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
    if (Object.keys(skillMastery).length === 0 && user) {
      fetch('/api/play/user/skill-mastery', {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.skillMastery) {
            setSkillMastery(data.skillMastery)
          }
        })
        .catch((error) => {
          console.error('[BattleResultModal] Failed to fetch skill mastery:', error)
        })
    }
  }, [user]) // 移除 skillMastery 依賴，避免無限循環

  useEffect(() => {
    // 階段 1: 分數顯示（1 秒）
    const timer1 = setTimeout(() => {
      setAnimationPhase('rewards')
    }, 1000)

    // 階段 2: 獎勵顯示（1 秒）
    const timer2 = setTimeout(() => {
      setAnimationPhase('mastery')
    }, 2000)

    // 階段 3: 知識曲線更新（1 秒）
    const timer3 = setTimeout(() => {
      setAnimationPhase('complete')
    }, 3000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  const resolvedPlayer1Score = postMatchInsights?.finalScore?.player1 ?? player1Score
  const resolvedPlayer2Score = postMatchInsights?.finalScore?.player2 ?? player2Score
  const resolvedIsWinner = postMatchInsights?.winner
    ? postMatchInsights.winner === user?.id
    : isWinner
  const scoreDiff = resolvedPlayer1Score - resolvedPlayer2Score
  const coinBreakdown = postMatchInsights?.coinBreakdown || (postMatchInsights?.coinsEarned ? {
    base: 50, // 默認底注
    winner: resolvedIsWinner ? 30 : 0, // 默認勝利獎勵
    contract: 0, // 默認無合約
    total: postMatchInsights.coinsEarned,
  } : undefined)

  const handleClose = useCallback(() => {
    setPostMatchInsights(null)
    // Refresh user status to get updated Elo and coins after battle
    fetch('/api/play/user/status', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          // Update userStatus via context if available
          // This will be handled by PlayProvider's useEffect
        }
      })
      .catch(console.error)
    onClose()
  }, [onClose, setPostMatchInsights])

  const matchId = postMatchInsights?.matchId ?? null

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md overflow-hidden p-0" aria-describedby="battle-result-description">
        <div className="relative min-h-[500px] bg-gradient-to-br from-blue-50 to-purple-50 p-6">
          {/* Phase 1: Score Display */}
          <AnimatePresence mode="wait">
            {animationPhase === 'score' && (
              <motion.div
                key="score"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex h-full min-h-[500px] flex-col items-center justify-center"
              >
                <motion.div
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  {resolvedIsWinner ? (
                    <Trophy className="mx-auto h-24 w-24 text-yellow-500" />
                  ) : (
                    <Trophy className="mx-auto h-24 w-24 text-gray-400" />
                  )}
                </motion.div>

                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className={`mb-8 text-3xl font-bold ${resolvedIsWinner ? 'text-green-600' : 'text-gray-600'}`}
                >
                  {resolvedIsWinner ? '🎉 恭喜獲勝！' : '對戰結束'}
                </motion.h2>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="w-full space-y-4"
                >
                  <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-md">
                    <span className="text-lg font-medium">你的分數</span>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className="text-2xl font-bold text-blue-600"
                    >
                      {resolvedPlayer1Score}
                    </motion.span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-md">
                    <span className="text-lg font-medium">對手分數</span>
                    <span className="text-2xl font-bold text-purple-600">{resolvedPlayer2Score}</span>
                  </div>
                  {scoreDiff !== 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className={`text-center text-sm ${resolvedIsWinner ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {resolvedIsWinner ? `領先 ${Math.abs(scoreDiff)} 分` : `落後 ${Math.abs(scoreDiff)} 分`}
                    </motion.div>
                  )}
                  
                  {/* Elo Change Display (PVP only) */}
                  {eloChange && eloChange.eloDiff !== 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className={`flex items-center justify-center gap-2 rounded-lg p-3 ${
                        eloChange.eloDiff > 0
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {eloChange.eloDiff > 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-sm font-semibold">
                        Elo {eloChange.eloDiff > 0 ? '+' : ''}{eloChange.eloDiff}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({eloChange.oldElo} → {eloChange.newElo})
                      </span>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Phase 2: Rewards */}
            {animationPhase === 'rewards' && (
              <motion.div
                key="rewards"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex h-full min-h-[500px] flex-col items-center justify-center"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="mb-6"
                >
                  <Sparkles className="h-20 w-20 text-yellow-500" />
                </motion.div>

                <h3 className="mb-6 text-2xl font-bold">獲得獎勵</h3>

                <div className="w-full space-y-2.5">
                  {/* Coins Reward - 細分展示 */}
                  {(rewards.coins || postMatchInsights?.coinsEarned) && (
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="rounded-xl bg-gradient-to-r from-yellow-500/90 to-orange-500/90 p-4 text-white shadow-lg backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-base font-medium flex items-center gap-2">
                          <Coins className="h-5 w-5" />
                          金幣獎勵
                        </span>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.2, type: 'spring' }}
                          className="text-2xl font-bold"
                        >
                          +{rewards.coins || postMatchInsights?.coinsEarned || 0}
                        </motion.span>
                      </div>
                      
                      {/* 金幣來源細分 */}
                      {coinBreakdown && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ delay: 0.3 }}
                          className="space-y-1.5 border-t border-white/20 pt-3 mt-3"
                        >
                          {coinBreakdown.base > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between text-sm opacity-90"
                            >
                              <span>底注獎勵</span>
                              <span className="font-semibold">+{coinBreakdown.base}</span>
                            </motion.div>
                          )}
                          {coinBreakdown.winner > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                              className="flex items-center justify-between text-sm opacity-90"
                            >
                              <span className="flex items-center gap-1">
                                <Trophy className="h-3 w-3" />
                                勝利獎勵
                              </span>
                              <span className="font-semibold">+{coinBreakdown.winner}</span>
                            </motion.div>
                          )}
                          {coinBreakdown.contract > 0 && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                              className="flex items-center justify-between text-sm opacity-90"
                            >
                              <span className="flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                合約獎勵
                              </span>
                              <span className="font-semibold">+{coinBreakdown.contract}</span>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                  
                  {/* Elo Change (if available) */}
                  {eloChange && eloChange.eloDiff !== 0 && (
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className={`flex items-center justify-between rounded-xl p-4 shadow-lg backdrop-blur-sm ${
                        eloChange.eloDiff > 0
                          ? 'bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white'
                          : 'bg-gradient-to-r from-gray-500/90 to-gray-600/90 text-white'
                      }`}
                    >
                      <span className="text-base font-medium flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        Elo 排名
                      </span>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                        className="flex items-center gap-2"
                      >
                        {eloChange.eloDiff > 0 ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                        <span className="text-xl font-bold">
                          {eloChange.eloDiff > 0 ? '+' : ''}{eloChange.eloDiff}
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                  
                  {rewards.experience && (
                    <motion.div
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-500/90 to-cyan-500/90 p-4 text-white shadow-lg backdrop-blur-sm"
                    >
                      <span className="text-base font-medium flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        經驗值
                      </span>
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.25, type: 'spring' }}
                        className="text-xl font-bold"
                      >
                        +{rewards.experience}
                      </motion.span>
                    </motion.div>
                  )}
                </div>

                {postMatchInsights?.retestSuggestions?.length ? (
                  <div className="mt-8 w-full">
                    <RetestCards matchId={matchId} suggestions={postMatchInsights.retestSuggestions} />
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Phase 3: Mastery Curve Heatmap */}
            {animationPhase === 'mastery' && (
              <motion.div
                key="mastery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full min-h-[500px] flex-col items-center justify-center overflow-y-auto"
              >
                <div className="w-full max-w-2xl px-4">
                  <KnowledgeCurveHeatmap skillMastery={skillMastery} />
                </div>
              </motion.div>
            )}

            {/* Phase 4: Complete */}
            {animationPhase === 'complete' && (
              <motion.div
                key="complete"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-[500px] flex-col items-center justify-center"
              >
                <Button onClick={handleClose} className="w-full" size="lg">
                  返回
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close Button (always visible) */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/50"
            aria-label="關閉"
          >
            <X className="h-5 w-5" />
          </button>
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
