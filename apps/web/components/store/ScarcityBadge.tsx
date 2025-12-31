'use client'

import { Clock, Zap, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================
// 🎯 (E) Scarcity 心理學鉤子
// ============================================

interface ScarcityBadgeProps {
  /**
   * 限時優惠結束時間
   */
  expiresAt: Date | string
  /**
   * 優惠類型
   */
  type?: 'limited-time' | 'limited-stock' | 'hot-sale'
  /**
   * 剩餘數量（如果是限量商品）
   */
  remainingStock?: number
  /**
   * 顯示模式
   */
  variant?: 'badge' | 'banner'
}

function useCountdown(targetDate: Date) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const target = targetDate.getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false })
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

export function ScarcityBadge({
  expiresAt,
  type = 'limited-time',
  remainingStock,
  variant = 'badge',
}: ScarcityBadgeProps) {
  const targetDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  const timeLeft = useCountdown(targetDate)

  // 不顯示已過期的
  if (timeLeft.isExpired) {
    return null
  }

  // 根據剩餘時間計算緊迫程度
  const totalHoursLeft = timeLeft.days * 24 + timeLeft.hours
  const urgencyLevel =
    totalHoursLeft < 6 ? 'critical' : totalHoursLeft < 24 ? 'high' : totalHoursLeft < 72 ? 'medium' : 'low'

  const urgencyColors = {
    critical: {
      bg: 'bg-red-500',
      text: 'text-white',
      border: 'border-red-600',
      pulse: true,
    },
    high: {
      bg: 'bg-orange-500',
      text: 'text-white',
      border: 'border-orange-600',
      pulse: false,
    },
    medium: {
      bg: 'bg-yellow-500',
      text: 'text-white',
      border: 'border-yellow-600',
      pulse: false,
    },
    low: {
      bg: 'bg-blue-500',
      text: 'text-white',
      border: 'border-blue-600',
      pulse: false,
    },
  }

  const colors = urgencyColors[urgencyLevel]

  // Badge 模式（顯示在商品卡片角落）
  if (variant === 'badge') {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="absolute -top-2 -right-2 z-10"
      >
        <div
          className={`px-3 py-1 rounded-full ${colors.bg} ${colors.text} text-xs font-bold shadow-lg border-2 border-white ${colors.pulse ? 'animate-pulse' : ''
            }`}
        >
          {type === 'limited-stock' && remainingStock ? (
            <span>僅剩 {remainingStock} 份</span>
          ) : type === 'hot-sale' ? (
            <span>🔥 熱賣中</span>
          ) : (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeLeft.days > 0 && `${timeLeft.days}天`}
              {timeLeft.hours.toString().padStart(2, '0')}:{timeLeft.minutes.toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </motion.div>
    )
  }

  // Banner 模式（顯示在商品卡片內部）
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`overflow-hidden rounded-xl ${colors.bg} ${colors.text} p-4 shadow-lg`}
      >
        <div className="flex items-center justify-between">
          {/* 左側：圖示與標題 */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              {type === 'limited-stock' ? (
                <Zap className="h-5 w-5" />
              ) : type === 'hot-sale' ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>

            <div>
              <div className="text-sm font-bold mb-0.5">
                {type === 'limited-stock'
                  ? '限量商品'
                  : type === 'hot-sale'
                    ? '熱賣商品'
                    : '限時優惠'}
              </div>
              <div className="text-xs opacity-90">
                {type === 'limited-stock' && remainingStock
                  ? `僅剩 ${remainingStock} 份`
                  : urgencyLevel === 'critical'
                    ? '即將結束！'
                    : '把握機會'}
              </div>
            </div>
          </div>

          {/* 右側：倒數計時 */}
          {type !== 'hot-sale' && (
            <div className="flex items-center gap-2">
              {timeLeft.days > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold">{timeLeft.days}</div>
                  <div className="text-[10px] opacity-80">天</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-2xl font-bold">{timeLeft.hours.toString().padStart(2, '0')}</div>
                <div className="text-[10px] opacity-80">時</div>
              </div>
              <div className="text-xl font-bold">:</div>
              <div className="text-center">
                <div className="text-2xl font-bold">{timeLeft.minutes.toString().padStart(2, '0')}</div>
                <div className="text-[10px] opacity-80">分</div>
              </div>
              {urgencyLevel === 'critical' && (
                <>
                  <div className="text-xl font-bold">:</div>
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="text-2xl font-bold"
                    >
                      {timeLeft.seconds.toString().padStart(2, '0')}
                    </motion.div>
                    <div className="text-[10px] opacity-80">秒</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
