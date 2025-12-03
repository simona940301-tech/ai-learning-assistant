'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AppBar } from '@/components/layout/app-bar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Settings, LogOut, Backpack as BackpackIcon, MessageCircle, Award, Coins, Zap, TrendingUp, Target, Crown, Star, ChevronRight, Home } from 'lucide-react'
import { getAvatarPreset } from '@/lib/avatar/presets'
import { motion } from 'framer-motion'
import { ProfileAvatarModal } from '@/components/profile/ProfileAvatarModal'
import { SkeletonProfile } from '@/components/ui/skeleton'
import { useAuth } from '@/lib/auth-context'
import { EmptyStateManager, useEmptyStateConditions } from '@/components/EmptyStateManager'
import { levelForXp } from '@/lib/progression/leveling'

interface UserProfile {
  name: string
  username: string
  avatar: string
  bio: string
  xp: number
  coins: number
  streak: number
  posts: number
  materials: number
}

interface ProgressionState {
  level: number
  totalXp: number
  currentLevelFloor: number
  nextLevelXp: number
  progress: number
}

export default function ProfilePage() {
  const { user: authUser } = useAuth()
  const { isProfileEmpty } = useEmptyStateConditions()
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserProfile>({
    name: authUser?.email?.split('@')[0] || '使用者',
    username: `@${authUser?.email?.split('@')[0] || 'user'}`,
    avatar: '',
    bio: '熱愛學習的高中生 📚',
    xp: 1240,
    coins: 580,
    streak: 7,
    posts: 23,
    materials: 45,
  })
  const [progression, setProgression] = useState<ProgressionState | null>(null)
  const [eloRank, setEloRank] = useState<number>(1000)

  const resolvePresetId = useCallback((avatarUrl?: string | null) => {
    if (!avatarUrl) return null
    const { AVATAR_PRESETS } = require('@/lib/avatar/presets')
    const matchingPreset = AVATAR_PRESETS.find((preset: any) => preset.imageUrl === avatarUrl)
    return matchingPreset?.id ?? null
  }, [])

  const loadProfileData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [profileRes, progressionRes, userStatusRes] = await Promise.all([
        fetch('/api/profile', { credentials: 'include' }).catch(() => null),
        fetch('/api/play/progression/status', { credentials: 'include' }).catch(() => null),
        fetch('/api/play/user/status', { credentials: 'include' }).catch(() => null),
      ])

      const [profileData, progressionData, userStatusData] = await Promise.all([
        profileRes?.ok ? profileRes.json() : Promise.resolve(null),
        progressionRes?.ok ? progressionRes.json() : Promise.resolve(null),
        userStatusRes?.ok ? userStatusRes.json() : Promise.resolve(null),
      ])
      
      // 獲取 eloRank
      if (userStatusData?.success && userStatusData.eloRank) {
        setEloRank(userStatusData.eloRank)
      } else if (profileData?.profile?.elo_rank) {
        setEloRank(profileData.profile.elo_rank)
      }

      const xpSource = progressionData?.success && progressionData.progression?.xp
        ? progressionData.progression.xp.total ?? 0
        : profileData?.profile?.xp ?? 0
      const levelInfo = levelForXp(xpSource)

      if (progressionData?.success && progressionData.progression?.xp) {
        setProgression({
          level: progressionData.progression.xp.level,
          totalXp: levelInfo.currentXp,
          currentLevelFloor: levelInfo.currentLevelFloor,
          nextLevelXp: progressionData.progression.xp.nextLevelXp,
          progress: progressionData.progression.xp.progress,
        })
      } else {
        setProgression({
          level: levelInfo.level,
          totalXp: levelInfo.currentXp,
          currentLevelFloor: levelInfo.currentLevelFloor,
          nextLevelXp: levelInfo.nextLevelXp,
          progress: levelInfo.progressPct,
        })
      }

      if (profileData?.success && profileData.profile) {
        const presetId = resolvePresetId(profileData.profile.avatar_url)
        setCurrentPresetId(presetId)
        setUser(prev => ({
          ...prev,
          name: profileData.profile.username || prev.name,
          username: `@${profileData.profile.username || prev.username.replace('@', '')}`,
          avatar: profileData.profile.avatar_url || prev.avatar,
          xp: levelInfo.currentXp,
          coins: profileData.profile.coins ?? prev.coins,
          streak: profileData.profile.streak ?? prev.streak,
        }))
      }
    } catch (error) {
      console.error('[ProfilePage] Failed to fetch profile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [resolvePresetId])

  // Fetch user profile data
  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  const handleAvatarUpdate = async (avatarUrl: string) => {
    setUser(prev => ({ ...prev, avatar: avatarUrl }))
    await loadProfileData()
  }

  const resolvedProgression: ProgressionState = progression || (() => {
    const info = levelForXp(user.xp)
    return {
      level: info.level,
      totalXp: info.currentXp,
      currentLevelFloor: info.currentLevelFloor,
      nextLevelXp: info.nextLevelXp,
      progress: info.progressPct,
    }
  })()

  // Calculate derived stats
  const currentLevel = resolvedProgression.level
  const xpInCurrentLevel = resolvedProgression.totalXp - resolvedProgression.currentLevelFloor
  const xpToNextLevel = Math.max(0, resolvedProgression.nextLevelXp - resolvedProgression.totalXp)
  const levelProgress = Math.min(100, Math.max(0, resolvedProgression.progress * 100))
  const weeklyGrowth = 23 // Mock: could be real API data
  const userRanking = 78 // Mock: percentage of users surpassed

  // Personalized motivational message
  const getMotivationalMessage = () => {
    if (user.streak >= 7) return "你的堅持令人驚艷！"
    if (user.streak >= 3) return "連續學習成就解鎖中 🔥"
    if (levelProgress > 80) return "即將升級！繼續加油！"
    if (resolvedProgression.totalXp > 1000) return "你的成長軌跡閃閃發光"
    return "每一步努力都在累積實力"
  }

  return (
    <>
      <AppBar
        title="Profile"
        showEnergy={false}
        rightAction={
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        }
      />

      <main className="mx-auto max-w-lg px-7 py-6 pb-20 bg-[#FFFBF0] min-h-screen">
        {isLoading ? (
          <SkeletonProfile />
        ) : (
          <EmptyStateManager
            type="profile"
            condition={isProfileEmpty(user)}
            userName={user.name}
          >
            <>
              {/* 🎯 PART 1: Hero Section - Profile Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border-2 border-[#E8E1D7]">
                      <AvatarImage
                        src={user.avatar || undefined}
                        alt={user.name}
                        className="object-contain"
                      />
                      <AvatarFallback className="text-lg bg-white text-[#4A3728] font-semibold">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-[#4A3728]">{user.name}</h1>
                    <p className="text-sm text-[#666666]">{user.username}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 h-8 text-sm border-[#E8E1D7] text-[#4A3728] hover:bg-[#F5F5F4] hover:border-[#4A3728]/30"
                      onClick={() => setEditModalOpen(true)}
                    >
                      編輯資料
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* 🎯 PART 2: Level & XP Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-8"
              >
                <Card className="border border-[#E8E1D7] bg-white p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-sm font-medium text-[#666666] mb-2">目前等級</p>
                      <h3 className="text-3xl font-bold text-[#4A3728]">
                        LV.{currentLevel}
                      </h3>
                    </div>
                    <div className="rounded-full bg-[#FED168]/20 p-3">
                      <Crown className="h-6 w-6 text-[#FED168]" />
                    </div>
                  </div>

                  {/* XP Progress Bar - 全新設計 */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-medium text-[#666666]">經驗值</span>
                      <span className="text-sm font-bold text-[#4A3728]">
                        {xpInCurrentLevel.toLocaleString()} / {(xpInCurrentLevel + xpToNextLevel).toLocaleString()}
                      </span>
                    </div>
                    <div className="relative h-3 w-full rounded-full bg-[#E8E1D7] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${levelProgress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-[#FED168] to-[#FFAD00]"
                      />
                    </div>
                    <p className="text-xs text-[#999999] text-right">
                      還差 {xpToNextLevel} XP 升級
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* 🎯 PART 3: Achievement / Badges Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
              >
                <Card className="border border-[#E8E1D7] bg-white p-6 rounded-lg">
                  <h4 className="text-lg font-semibold text-[#4A3728] mb-4">我的獎章</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {/* Achievement Badge 1 - Reading Master */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#F5F5F4] flex items-center justify-center mb-2">
                        <Award className="h-6 w-6 text-[#4A3728]/60" />
                      </div>
                      <span className="text-xs text-[#666666] text-center">閱讀達人</span>
                    </div>

                    {/* Achievement Badge 2 - Problem Solver */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#F5F5F4] flex items-center justify-center mb-2">
                        <Target className="h-6 w-6 text-[#4A3728]/60" />
                      </div>
                      <span className="text-xs text-[#666666] text-center">解題高手</span>
                    </div>

                    {/* Achievement Badge 3 - Streak Master */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#F5F5F4] flex items-center justify-center mb-2">
                        <Zap className="h-6 w-6 text-[#4A3728]/60" />
                      </div>
                      <span className="text-xs text-[#666666] text-center">連勝王者</span>
                    </div>

                    {/* Placeholder for future badges */}
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-[#F5F5F4] border-2 border-dashed border-[#4A3728]/30 flex items-center justify-center mb-2">
                        <span className="text-lg text-[#4A3728]/30 font-bold">+</span>
                      </div>
                      <span className="text-xs text-[#666666] text-center">即將解鎖</span>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* 🎯 PART 4: Streak & Coins */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-8 grid grid-cols-2 gap-4"
              >
                {/* Streak */}
                <Card className="border border-[#E8E1D7] bg-white p-5 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="h-5 w-5 text-[#4A3728]/60" />
                    <p className="text-sm font-medium text-[#666666]">連續學習</p>
                  </div>
                  <div className="text-2xl font-bold text-[#4A3728] mb-1">{user.streak}</div>
                  <p className="text-sm text-[#666666]">天連勝中</p>
                </Card>

                {/* Coins */}
                <Card className="border border-[#E8E1D7] bg-white p-5 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Coins className="h-5 w-5 text-[#4A3728]/60" />
                    <p className="text-sm font-medium text-[#666666]">金幣</p>
                  </div>
                  <div className="text-2xl font-bold text-[#4A3728] mb-1">{user.coins.toLocaleString()}</div>
                  <p className="text-sm text-[#666666]">可兌換獎勵</p>
                </Card>
              </motion.div>

              {/* 🎯 PART 5: Learning Assets */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-8 space-y-4"
              >
                <h4 className="text-lg font-semibold text-[#4A3728] mb-4">我的學習資產</h4>

                <button className="flex w-full items-center justify-between rounded-lg border border-[#E8E1D7] bg-white p-5 hover:bg-[#F5F5F4] transition-colors">
                  <div className="flex items-center gap-4">
                    <BackpackIcon className="h-6 w-6 text-[#4A3728]/60" />
                    <div className="text-left">
                      <div className="font-semibold text-[#4A3728]">我的背包</div>
                      <div className="text-sm text-[#666666]">{user.materials} 個學習素材</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#666666]" />
                </button>

                <button className="flex w-full items-center justify-between rounded-lg border border-[#E8E1D7] bg-white p-5 hover:bg-[#F5F5F4] transition-colors">
                  <div className="flex items-center gap-4">
                    <MessageCircle className="h-6 w-6 text-[#4A3728]/60" />
                    <div className="text-left">
                      <div className="font-semibold text-[#4A3728]">我的發文</div>
                      <div className="text-sm text-[#666666]">{user.posts} 篇社群貢獻</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#666666]" />
                </button>
              </motion.div>

              <Separator className="my-8 bg-[#E8E1D7]" />

              {/* 🎯 PART 6: Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-3"
              >
                <button className="flex w-full items-center gap-4 rounded-lg p-4 text-sm transition-colors hover:bg-[#F5F5F4]">
                  <Settings className="h-5 w-5 text-[#666666]" />
                  <span className="text-[#666666]">設定</span>
                </button>

                <button className="flex w-full items-center gap-4 rounded-lg p-4 text-sm transition-colors hover:bg-red-50">
                  <LogOut className="h-5 w-5 text-red-500" />
                  <span className="text-red-500">登出</span>
                </button>
              </motion.div>
            </>
          </EmptyStateManager>
        )}
      </main>

      {/* Profile Avatar Modal */}
      <ProfileAvatarModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onAvatarUpdate={handleAvatarUpdate}
        currentPresetId={currentPresetId ?? undefined}
      />
    </>
  )
}
