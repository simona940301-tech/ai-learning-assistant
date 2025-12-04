'use client'

import { Button } from '@/components/ui/button'
import { Zap, BookOpen, Upload } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

/**
 * 🎯 Primary Action Section - 極簡設計
 * 唯一亮色 CTA：開始對戰
 */
export function PrimaryActionSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="space-y-3"
    >
      {/* Primary CTA - 唯一橙色按鈕 */}
      <Link href="/play" className="block">
        <Button
          className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-base font-semibold shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
        >
          <Zap className="h-5 w-5 mr-2" />
          開始對戰
        </Button>
      </Link>

      {/* Secondary Actions - 低調灰色 */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/ask">
          <Button
            variant="ghost"
            className="w-full h-11 rounded-xl bg-white/60 hover:bg-white text-[#7A6A57] hover:text-[#4A3728]"
          >
            <BookOpen className="h-4 w-4 mr-2" />
            AI 解析
          </Button>
        </Link>
        <Link href="/backpack">
          <Button
            variant="ghost"
            className="w-full h-11 rounded-xl bg-white/60 hover:bg-white text-[#7A6A57] hover:text-[#4A3728]"
          >
            <Upload className="h-4 w-4 mr-2" />
            上傳到背包
          </Button>
        </Link>
      </div>
    </motion.div>
  )
}

