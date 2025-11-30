'use client'

import { motion } from 'framer-motion'
import { User, Sparkles, Zap, Target, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

/**
 * Profile Empty State Component
 *
 * Displayed when a user first visits their profile page with no data.
 * Provides welcoming onboarding experience with clear calls to action.
 *
 * Design Principles:
 * - Friendly and encouraging tone
 * - Clear visual hierarchy
 * - Multiple pathways to engagement
 * - Stats preview to show what's possible
 */

interface ProfileEmptyStateProps {
  userName?: string
}

export function ProfileEmptyState({ userName = '學習者' }: ProfileEmptyStateProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 md:p-8">
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: 0.1,
        }}
        className="relative mb-6"
      >
        {/* Main Avatar Circle */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center shadow-lg">
          <User className="w-12 h-12 text-blue-600" strokeWidth={1.5} />
        </div>

        {/* Sparkle Animation */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="w-8 h-8 text-yellow-500" fill="currentColor" />
        </motion.div>

        {/* Energy Ring */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -inset-2 rounded-full border-2 border-blue-300 border-dashed"
        />
      </motion.div>

      {/* Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8 max-w-md"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          歡迎來到你的學習中心，{userName}！
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          開始你的學習旅程，累積經驗值，解鎖成就
          <br />
          打造專屬的學習檔案
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col sm:flex-row gap-3 mb-10 w-full max-w-sm"
      >
        <Button
          onClick={() => router.push('/play')}
          className="flex-1 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-shadow"
          size="lg"
        >
          <Zap className="w-5 h-5 mr-2" />
          開始練習
        </Button>
        <Button
          onClick={() => router.push('/ask')}
          variant="outline"
          className="flex-1 h-12 text-base font-medium border-2 hover:bg-accent"
          size="lg"
        >
          <Target className="w-5 h-5 mr-2" />
          提問題目
        </Button>
      </motion.div>

      {/* Stats Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-md"
      >
        <p className="text-center text-xs text-muted-foreground mb-3 uppercase tracking-wide font-medium">
          你的學習數據
        </p>
        <div className="grid grid-cols-3 gap-3">
          {/* XP Card */}
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm"
          >
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">0</div>
              <div className="text-xs text-blue-700 font-medium">經驗值</div>
            </div>
          </motion.div>

          {/* Streak Card */}
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 shadow-sm"
          >
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">0</div>
              <div className="text-xs text-orange-700 font-medium">連續天數</div>
            </div>
          </motion.div>

          {/* Questions Card */}
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 shadow-sm"
          >
            <div className="flex flex-col items-center">
              <div className="text-3xl font-bold text-green-600 mb-1">0</div>
              <div className="text-xs text-green-700 font-medium">完成題目</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Growth Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
          <TrendingUp className="w-4 h-4 text-purple-600" />
          <span className="text-sm text-purple-700 font-medium">
            每天進步一點點，成就不凡的自己
          </span>
        </div>
      </motion.div>
    </div>
  )
}
