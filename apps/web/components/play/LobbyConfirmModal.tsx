'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Check, X, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

interface LobbyConfirmModalProps {
  matchId: string
  countdown: number // P5: 服務端權威計時，前端直接使用服務端推送的值
  players: string[]
  onConfirm: () => void
  onCancel: () => void
}

/**
 * 房間確認模態框（15 秒倒數）
 * 
 * P5 更新：移除前端計時邏輯，完全依賴服務端權威計時
 * 
 * 功能：
 * - 顯示匹配成功的玩家列表
 * - 顯示服務端推送的倒數（每秒更新）
 * - 確認/取消按鈕
 * - 服務端自動解散邏輯（15秒超時或未全部確認）
 */
export function LobbyConfirmModal({
  matchId,
  countdown, // P5: 直接使用服務端推送的倒數值，不再前端計算
  players,
  onConfirm,
  onCancel,
}: LobbyConfirmModalProps) {
  const [isConfirmed, setIsConfirmed] = useState(false)

  // P5: 移除前端計時邏輯，倒數完全由服務端控制
  // 前端只負責顯示服務端推送的 countdown 值

  const handleConfirm = () => {
    setIsConfirmed(true)
    onConfirm()
  }

  const isUrgent = countdown <= 5

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="mx-4 w-full max-w-md"
      >
        <Card className="border-2 p-8 shadow-xl">
          <div className="text-center">
            {/* Header */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="mb-6"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="mb-2 text-2xl font-bold">匹配成功！</h2>
              <p className="text-muted-foreground">請確認準備開始對戰</p>
            </motion.div>

            {/* Countdown - P5: 直接顯示服務端推送的值 */}
            <motion.div
              key={countdown}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className={`mb-6 ${isUrgent ? 'text-red-500' : 'text-foreground'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className={`h-6 w-6 ${isUrgent ? 'animate-pulse' : ''}`} />
                <span className="text-4xl font-mono font-bold">
                  {countdown}
                </span>
                <span className="text-lg text-muted-foreground">秒</span>
              </div>
              {isUrgent && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 text-sm text-red-500"
                >
                  即將自動解散
                </motion.p>
              )}
            </motion.div>

            {/* Players List */}
            <div className="mb-6 space-y-2">
              {players.map((player, index) => (
                <motion.div
                  key={player}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between rounded-lg bg-muted p-3"
                >
                  <span className="text-sm font-medium">
                    {index === 0 ? '你' : `玩家 ${index + 1}`}
                  </span>
                  {isConfirmed && index === 0 && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={isConfirmed}
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                disabled={isConfirmed}
              >
                <Check className="mr-2 h-4 w-4" />
                {isConfirmed ? '已確認' : '確認'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

