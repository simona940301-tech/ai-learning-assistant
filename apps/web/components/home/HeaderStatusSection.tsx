'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Flame, Trophy } from 'lucide-react'
import { motion } from 'framer-motion'

interface HeaderStatusSectionProps {
  name: string
  avatar?: string
  level: number
  streakDays: number
  eloRank: number
}

export function HeaderStatusSection({
  name,
  avatar,
  level,
  streakDays,
  eloRank,
}: HeaderStatusSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-4 mb-5"
    >
      {/* Avatar */}
      <Avatar className="h-14 w-14 shadow-md ring-2 ring-white">
        <AvatarImage
          src={avatar || undefined}
          alt={name}
          className="object-cover"
        />
        <AvatarFallback className="text-lg bg-amber-100 text-[#4A3728] font-semibold">
          {name?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-[#4A3728] truncate">
          {name}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-[#7A6A57]">
          <span className="font-medium">Lv.{level}</span>
          
          {streakDays > 0 && (
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
              {streakDays} 天
            </span>
          )}
          
          <span className="flex items-center gap-1">
            <Trophy className="h-3.5 w-3.5 text-amber-600" />
            {eloRank}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

