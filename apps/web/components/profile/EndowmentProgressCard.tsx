'use client'

import { Lock, CheckCircle2, Trophy, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { motion } from 'framer-motion'

// ============================================
// 🎯 (E) Endowment Effect 心理學鉤子
// ============================================

export interface AchievementItem {
  id: string
  name: string
  description: string
  icon?: string
  isUnlocked: boolean
  progress?: number // 0-100
  requirement?: string
}

interface EndowmentProgressCardProps {
  title: string
  items: AchievementItem[]
  /**
   * 下一個即將解鎖的成就
   */
  nextItem?: AchievementItem
  /**
   * 顯示模式
   */
  variant?: 'badges' | 'items'
}

export function EndowmentProgressCard({
  title,
  items,
  nextItem,
  variant = 'badges',
}: EndowmentProgressCardProps) {
  const unlockedCount = items.filter((item) => item.isUnlocked).length
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  return (
    <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-semibold text-amber-900">{title}</h3>
        </div>

        <div className="px-3 py-1 bg-amber-500 text-white text-sm font-bold rounded-full">
          {unlockedCount} / {totalCount}
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-amber-700/80">收集進度</span>
          <span className="text-amber-700 font-medium">{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </div>

      {/* Owned Items Grid */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          已擁有 ({unlockedCount})
        </h4>

        {unlockedCount === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            還沒有解鎖任何{variant === 'badges' ? '徽章' : '道具'}，加油！
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {items
              .filter((item) => item.isUnlocked)
              .slice(0, 6) // 只顯示前 6 個
              .map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="aspect-square bg-white/80 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm border border-amber-200/50 hover:shadow-md hover:scale-105 transition-all cursor-pointer group"
                  title={item.description}
                >
                  {item.icon ? (
                    <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                  ) : (
                    <Trophy className="h-8 w-8 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                  )}
                  <div className="text-[10px] text-center text-amber-900 font-medium leading-tight">
                    {item.name}
                  </div>
                </motion.div>
              ))}
          </div>
        )}

        {unlockedCount > 6 && (
          <div className="text-xs text-center text-amber-700/70 mt-3">
            +{unlockedCount - 6} 個已解鎖
          </div>
        )}
      </div>

      {/* Next Achievement (Close to Unlock) */}
      {nextItem && !nextItem.isUnlocked && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-blue-500 rounded-full">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-blue-900">下一個很近！</h4>
                <span className="text-2xl">{nextItem.icon || '🎯'}</span>
              </div>

              <p className="text-xs text-blue-700/80 mb-2">{nextItem.description}</p>

              {nextItem.progress !== undefined && (
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-blue-700/70">進度</span>
                    <span className="text-blue-700 font-medium">{Math.round(nextItem.progress)}%</span>
                  </div>
                  <Progress value={nextItem.progress} className="h-2" />

                  {nextItem.requirement && (
                    <p className="text-[10px] text-blue-600/70 mt-2">{nextItem.requirement}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Locked Items Preview */}
      {items.filter((item) => !item.isUnlocked).length > 0 && !nextItem && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-gray-400" />
            尚未解鎖 ({items.filter((item) => !item.isUnlocked).length})
          </h4>

          <div className="grid grid-cols-4 gap-2">
            {items
              .filter((item) => !item.isUnlocked)
              .slice(0, 4)
              .map((item) => (
                <div
                  key={item.id}
                  className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200"
                  title={item.name}
                >
                  <Lock className="h-6 w-6 text-gray-400" />
                </div>
              ))}
          </div>
        </div>
      )}
    </Card>
  )
}
