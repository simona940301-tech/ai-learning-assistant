'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Sparkles, Image as ImageIcon, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Community Empty State Component
 *
 * Displayed when there are no posts yet.
 * Encourages users to create their first post.
 */

export function CommunityEmptyState() {
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
        {/* Main Circle */}
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center shadow-lg">
          <MessageCircle className="w-12 h-12 text-blue-600" strokeWidth={1.5} />
        </div>

        {/* Floating Sparkle */}
        <motion.div
          animate={{
            y: [-5, 5, -5],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-2 -right-2"
        >
          <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
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
          className="absolute -inset-3 rounded-full border-2 border-blue-300"
        />
      </motion.div>

      {/* Title & Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-8 max-w-md"
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          開始分享你的想法
        </h2>
        <p className="text-muted-foreground text-sm md:text-base">
          這裡還沒有貼文
          <br />
          成為第一個分享的人吧！
        </p>
      </motion.div>

      {/* Feature Highlights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8"
      >
        {[
          {
            icon: MessageCircle,
            title: '分享想法',
            color: 'from-blue-50 to-blue-100',
            iconColor: 'text-blue-600',
          },
          {
            icon: ImageIcon,
            title: '上傳圖片',
            color: 'from-purple-50 to-purple-100',
            iconColor: 'text-purple-600',
          },
          {
            icon: Heart,
            title: '互動交流',
            color: 'from-pink-50 to-pink-100',
            iconColor: 'text-pink-600',
          },
        ].map((feature, index) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-br ${feature.color} shadow-sm`}
            >
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <Icon className={`w-5 h-5 ${feature.iconColor}`} strokeWidth={2} />
              </div>
              <span className="text-sm font-medium">{feature.title}</span>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm text-blue-700">
            點擊上方開始發文
          </span>
        </div>
      </motion.div>
    </div>
  )
}
