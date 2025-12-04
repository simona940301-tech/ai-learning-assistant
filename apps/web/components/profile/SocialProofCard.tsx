'use client'

import { TrendingUp, Users, Award } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'

// ============================================
// 🎯 (E) Social Proof 心理學鉤子
// ============================================

interface SocialProofCardProps {
  currentLevel: number
  percentile: number // 超越的用戶百分比 (0-100)
  totalUsers?: number
}

export function SocialProofCard({ currentLevel, percentile, totalUsers = 10000 }: SocialProofCardProps) {
  // 計算排名
  const rank = Math.ceil(totalUsers * (1 - percentile / 100))

  // 根據百分位決定顏色主題
  const getTheme = () => {
    if (percentile >= 90) {
      return {
        gradient: 'from-purple-500 to-pink-500',
        bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        badge: '🏆 頂尖玩家',
      }
    } else if (percentile >= 75) {
      return {
        gradient: 'from-blue-500 to-cyan-500',
        bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        badge: '⭐ 優秀玩家',
      }
    } else if (percentile >= 50) {
      return {
        gradient: 'from-green-500 to-emerald-500',
        bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
        border: 'border-green-200',
        text: 'text-green-700',
        badge: '👍 進步中',
      }
    } else {
      return {
        gradient: 'from-yellow-500 to-orange-500',
        bg: 'bg-gradient-to-br from-yellow-50 to-orange-50',
        border: 'border-yellow-200',
        text: 'text-yellow-700',
        badge: '💪 加油',
      }
    }
  }

  const theme = getTheme()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className={`p-6 ${theme.bg} border-2 ${theme.border}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className={`h-5 w-5 ${theme.text}`} />
              <h3 className={`text-lg font-semibold ${theme.text}`}>你的排名</h3>
            </div>
            <span className="text-sm text-muted-foreground">{theme.badge}</span>
          </div>

          {/* Level Badge */}
          <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${theme.gradient} text-white font-bold shadow-lg`}>
            Lv.{currentLevel}
          </div>
        </div>

        {/* 主要統計數字 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* 百分位 */}
          <div className="text-center p-4 bg-white/60 rounded-2xl">
            <TrendingUp className={`h-6 w-6 ${theme.text} mx-auto mb-2`} />
            <div className={`text-3xl font-bold ${theme.text} mb-1`}>{percentile}%</div>
            <div className="text-xs text-muted-foreground">超越用戶</div>
          </div>

          {/* 排名 */}
          <div className="text-center p-4 bg-white/60 rounded-2xl">
            <Users className={`h-6 w-6 ${theme.text} mx-auto mb-2`} />
            <div className={`text-3xl font-bold ${theme.text} mb-1`}>#{rank}</div>
            <div className="text-xs text-muted-foreground">全站排名</div>
          </div>
        </div>

        {/* 動態進度條 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={`${theme.text}/80 font-medium`}>你的等級超越了全站 {percentile}% 的用戶</span>
          </div>

          <div className="h-3 bg-white/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentile}%` }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
              className={`h-full bg-gradient-to-r ${theme.gradient}`}
            />
          </div>

          {/* 里程碑提示 */}
          {percentile < 90 && (
            <div className="text-xs text-muted-foreground text-center pt-2">
              {percentile >= 75
                ? '🎯 再加油一點就能進入頂尖 10%！'
                : percentile >= 50
                  ? '🚀 繼續努力，目標前 25%！'
                  : '💪 每天練習，快速提升排名！'}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
