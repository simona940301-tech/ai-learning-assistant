'use client'

import { motion } from 'framer-motion'
import { Users, MessageCircle, Heart, TrendingUp, Award, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

/**
 * Community Empty State Component
 *
 * Displayed when the community feature is not yet populated or coming soon.
 * Creates anticipation and provides alternative engagement paths.
 *
 * Design Principles:
 * - Build excitement for upcoming features
 * - Clear feature previews
 * - Alternative CTAs to keep users engaged
 * - Professional and welcoming aesthetic
 */

export function CommunityEmptyState() {
  const router = useRouter()

  // Feature previews
  const features = [
    {
      icon: MessageCircle,
      title: '討論區',
      description: '分享學習心得與問題',
      color: 'blue',
      gradient: 'from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
    },
    {
      icon: Users,
      title: '學習小組',
      description: '組隊一起進步',
      color: 'green',
      gradient: 'from-green-50 to-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
    },
    {
      icon: Award,
      title: '排行榜',
      description: '與朋友競爭排名',
      color: 'purple',
      gradient: 'from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-200',
    },
    {
      icon: BookOpen,
      title: '學習筆記分享',
      description: '交流優質筆記資源',
      color: 'orange',
      gradient: 'from-orange-50 to-orange-100',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-200',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 md:p-8">
      {/* Animated Community Icon */}
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
        {/* Main Circle */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 flex items-center justify-center shadow-lg">
          <Users className="w-12 h-12 text-green-600" strokeWidth={1.5} />
        </div>

        {/* Floating Heart */}
        <motion.div
          animate={{
            y: [-5, 5, -5],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -bottom-1 -right-1"
        >
          <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          </div>
        </motion.div>

        {/* Pulse Ring */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -inset-3 rounded-full border-2 border-green-300"
        />
      </motion.div>

      {/* Title & Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8 max-w-md"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          社群功能即將推出
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          我們正在打造一個溫暖的學習社群
          <br />
          讓你與其他學習者交流、分享、一起成長
        </p>
      </motion.div>

      {/* Feature Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-8"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              className={`
                flex items-start gap-4 p-4 rounded-xl
                bg-gradient-to-br ${feature.gradient}
                border ${feature.borderColor}
                shadow-sm hover:shadow-md transition-shadow
              `}
            >
              <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                <Icon className={`w-5 h-5 ${feature.iconColor}`} strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-0.5">
                  {feature.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-sm"
      >
        <Button
          onClick={() => router.push('/home')}
          className="flex-1 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-shadow"
          size="lg"
        >
          返回首頁
        </Button>
        <Button
          onClick={() => router.push('/play')}
          variant="outline"
          className="flex-1 h-12 text-base font-medium border-2 hover:bg-accent"
          size="lg"
        >
          <TrendingUp className="w-5 h-5 mr-2" />
          開始練習
        </Button>
      </motion.div>

      {/* Coming Soon Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm text-blue-700 font-medium">
            敬請期待更多精彩功能
          </span>
        </div>
      </motion.div>
    </div>
  )
}
