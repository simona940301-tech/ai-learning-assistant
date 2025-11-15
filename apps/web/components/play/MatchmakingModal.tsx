'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePlay } from '@/lib/play-context'
import { Loader2, Lightbulb, AlertCircle, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

export function MatchmakingModal({ onCancel, matchType, subject, timeLimit = 20 }: MatchmakingModalProps) {
  const { sendWebSocketMessage, wsConnected } = usePlay()
  const [isSearching, setIsSearching] = useState(true)
  const [searchElapsed, setSearchElapsed] = useState(0) // 搜索經過時間（秒）
  const [searchRange, setSearchRange] = useState(100) // 當前搜索範圍（±Elo）
  const [knowledgeTips, setKnowledgeTips] = useState<KnowledgeTip[]>([])
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [matchId, setMatchId] = useState<string | null>(null) // 用於取消匹配

  // 從 context 獲取 matchId（當收到 MATCH_FOUND 時）
  const { battleState } = usePlay()
  
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
      setSearchElapsed((prev) => prev + 1)
      
      // 每 5 秒擴大搜索範圍（模擬）
      if (searchElapsed > 0 && searchElapsed % 5 === 0) {
        setSearchRange((prev) => Math.min(prev + 50, 500)) // 最多擴大到 ±500
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isSearching, searchElapsed])

  const currentTip = knowledgeTips[currentTipIndex]

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>正在匹配對手</DialogTitle>
          <DialogDescription>
            {matchType === 'RANKED' ? '排位賽匹配中...' : '弱點會戰匹配中...'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* 匹配動畫和進度 */}
          <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <div className="space-y-2">
              <p className="text-sm font-medium">正在為您尋找合適的對手...</p>
              
              {/* 搜索範圍視覺化 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>搜索範圍</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    ±{searchRange} Elo
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: '20%' }}
                    animate={{ width: `${Math.min(20 + (searchElapsed * 2), 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {!wsConnected && (
                <p className="mt-2 text-xs text-red-500">
                  WebSocket 未連接，請檢查網絡連接
                </p>
              )}
            </div>
          </div>

          {/* 知識點輪播 */}
          {currentTip && (
            <div className="rounded-lg border bg-muted/30 p-4 min-h-[80px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTipIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-2"
                >
                  <div className="flex items-start gap-2">
                    {currentTip.type === 'trivia' ? (
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {currentTip.type === 'trivia' ? '💡 冷知識' : '⚠️ 常見錯誤'}
                      </p>
                      <p className="text-sm leading-relaxed">{currentTip.content}</p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
              
              {/* 知識點指示器 */}
              {knowledgeTips.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {knowledgeTips.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTipIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentTipIndex
                          ? 'w-6 bg-primary'
                          : 'w-1.5 bg-muted-foreground/30'
                      }`}
                      aria-label={`查看知識點 ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 超時提示 */}
        {searchElapsed >= MATCHMAKING_TIMEOUT && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-700 dark:text-orange-400"
          >
            ⏱️ 匹配超時，建議取消後重試
          </motion.div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancelMatch} className="flex-1">
            取消匹配
          </Button>
          {searchElapsed >= MATCHMAKING_TIMEOUT && (
            <Button onClick={onCancel} variant="default" className="flex-1">
              關閉
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

