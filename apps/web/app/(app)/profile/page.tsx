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
    const presets = Object.values(getAvatarPreset).filter(Boolean)
    const matchingPreset = presets.find(preset => preset?.imageUrl === avatarUrl)
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
        rightAction={
          <Link href="/home">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        }
      />

      <main className="mx-auto max-w-lg p-4 pb-20 bg-[#FFFBF0] min-h-screen">
        {isLoading ? (
          <SkeletonProfile />
        ) : (
          <EmptyStateManager
            type="profile"
            condition={isProfileEmpty(user)}
            userName={user.name}
          >
            <>
              {/* 🎯 PART 1: Hero Section - Compact Profile Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex items-center gap-2">
                    <Avatar className="h-16 w-16 border-2 border-[#FFB01A]/30">
                      <AvatarImage 
                        src={user.avatar || undefined} 
                        alt={user.name}
                        className="object-contain"
                      />
                      <AvatarFallback className="text-lg bg-white text-[#2C2C2C] font-semibold">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {/* Level Badge */}
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#FFB01A] text-xs font-bold text-white shadow-md border-2 border-[#FFFBF0]">
                      {currentLevel}
                    </div>
                    {/* 等級 Icon (金銀銅) - 像素風格 */}
                    {(() => {
                      let tierIcon = null
                      let tierLabel = ''
                      
                      if (eloRank >= 1600) {
                        tierLabel = '鑽石'
                        tierIcon = '/icon/tier-diamond.png.png'
                      } else if (eloRank >= 1400) {
                        tierLabel = '白金'
                        tierIcon = '/icon/tier-platinum.png.png'
                      } else if (eloRank >= 1200) {
                        tierLabel = '金'
                        tierIcon = '/icon/tier-gold.png.png'
                      } else if (eloRank >= 1000) {
                        tierLabel = '銀'
                        tierIcon = '/icon/tier-silver.png.png'
                      } else {
                        tierLabel = '鐵'
                        tierIcon = '/icon/tier-iron.png.png'
                      }
                      
                      return (
                        <div className="flex items-center gap-1.5">
                          <img 
                            src={tierIcon} 
                            alt={tierLabel}
                            className="h-6 w-6 object-contain"
                            style={{ imageRendering: 'pixelated' }}
                            onError={(e) => {
                              // 如果圖片不存在，顯示文字 fallback
                              e.currentTarget.style.display = 'none'
                              const parent = e.currentTarget.parentElement
                              if (parent && !parent.querySelector('.tier-fallback')) {
                                const fallback = document.createElement('span')
                                fallback.className = 'tier-fallback text-xs font-bold text-[#FFB01A] px-1.5 py-0.5 rounded border border-[#FFB01A]/30'
                                fallback.textContent = tierLabel
                                parent.appendChild(fallback)
                              }
                            }}
                          />
                        </div>
                      )
                    })()}
                  </div>

                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-[#2C2C2C]">{user.name}</h1>
                    <p className="text-sm text-[#666666]">{user.username}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 h-7 text-xs border-[#FFB01A]/30 text-[#2C2C2C] hover:bg-[#FFB01A]/10 hover:border-[#FFB01A]"
                      onClick={() => setEditModalOpen(true)}
                    >
                      編輯資料
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* 🎯 PART 2: XP & Level - Primary Progress Indicator */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-4"
              >
                <Card className="overflow-hidden border border-[#E5E5E5] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-medium text-[#666666] uppercase tracking-wider mb-1">目前等級</p>
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-[#FFB01A]">
                          Lv.{currentLevel}
                        </h3>
                        <span className="text-sm font-semibold text-[#10B981] flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          +{weeklyGrowth}%
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="rounded-full bg-[#FFB01A]/10 p-2.5">
                        <Crown className="h-6 w-6 text-[#FFB01A]" />
                      </div>
                      <p className="text-[10px] text-[#666666] mt-1">超越 {userRanking}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[#666666]">XP {xpInCurrentLevel.toLocaleString()}</span>
                      <span className="text-[#666666]">還差 {xpToNextLevel} XP</span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full bg-[#F5F5F4] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${levelProgress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full bg-[#FFB01A]"
                      />
                    </div>
                  </div>

                  {/* Next Level Teaser */}
                  <div className="mt-3 flex items-center gap-2 text-xs text-[#666666]">
                    <Target className="h-3 w-3 text-[#FFB01A]" />
                    <span>升到 Lv.{currentLevel + 1} 解鎖新成就與獎勵</span>
                  </div>
                </Card>
              </motion.div>

              {/* 🎯 PART 3: Streak & Coins */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-4 grid grid-cols-2 gap-3"
              >
                {/* Streak */}
                <Card className="border border-[#E5E5E5] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-[#FF6B35]/10 p-1.5">
                      <Zap className="h-4 w-4 text-[#FF6B35]" fill="currentColor" />
                    </div>
                    <p className="text-xs font-medium text-[#666666] uppercase">連續學習</p>
                  </div>
                  <div className="text-3xl font-black text-[#FF6B35] mb-1">{user.streak}</div>
                  <p className="text-xs text-[#666666]">天連勝中 🔥</p>
                </Card>

                {/* Coins */}
                <Card className="border border-[#E5E5E5] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="rounded-full bg-[#FFB01A]/10 p-1.5">
                      <Coins className="h-4 w-4 text-[#FFB01A]" />
                    </div>
                    <p className="text-xs font-medium text-[#666666] uppercase">金幣</p>
                  </div>
                  <div className="text-3xl font-black text-[#FFB01A] mb-1">{user.coins.toLocaleString()}</div>
                  <p className="text-xs text-[#666666]">可兌換獎勵</p>
                </Card>
              </motion.div>

              {/* 🎯 PART 4: Learning Achievements */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-4"
              >
                <Card className="border border-[#E5E5E5] bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-[#2C2C2C] flex items-center gap-2">
                      <Award className="h-4 w-4 text-[#FFB01A]" />
                      本週學習成就
                    </h4>
                    <ChevronRight className="h-4 w-4 text-[#666666]" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#2C2C2C] mb-1">12</div>
                      <div className="text-[11px] text-[#666666]">閱讀文檔</div>
                    </div>
                    <div className="text-center border-l border-[#E5E5E5]">
                      <div className="text-2xl font-bold text-[#2C2C2C] mb-1">85</div>
                      <div className="text-[11px] text-[#666666]">征服題目</div>
                    </div>
                    <div className="text-center border-l border-[#E5E5E5]">
                      <div className="text-2xl font-bold text-[#2C2C2C] mb-1">4.2h</div>
                      <div className="text-[11px] text-[#666666]">專注時長</div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* 🎯 PART 5: Learning Assets */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6 space-y-3"
              >
                <h4 className="text-xs font-semibold text-[#666666] uppercase tracking-wider px-1">我的學習資產</h4>

                <button className="flex w-full items-center justify-between rounded-xl border border-[#E5E5E5] bg-white p-4 transition-all hover:bg-[#FFFBF0] hover:border-[#FFB01A]/30 active:scale-[0.98] shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#3B82F6]/10 p-2.5 text-[#3B82F6]">
                      <BackpackIcon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-[#2C2C2C]">我的背包</div>
                      <div className="text-xs text-[#666666]">{user.materials} 個學習素材</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#666666]" />
                </button>

                <button className="flex w-full items-center justify-between rounded-xl border border-[#E5E5E5] bg-white p-4 transition-all hover:bg-[#FFFBF0] hover:border-[#FFB01A]/30 active:scale-[0.98] shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-[#A855F7]/10 p-2.5 text-[#A855F7]">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-[#2C2C2C]">我的發文</div>
                      <div className="text-xs text-[#666666]">{user.posts} 篇社群貢獻</div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-[#666666]" />
                </button>
              </motion.div>

              <Separator className="my-6 bg-[#E5E5E5]" />

              {/* 🎯 PART 6: Settings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-2"
              >
                <button className="flex w-full items-center gap-3 rounded-xl p-3 text-sm transition-colors hover:bg-white">
                  <Settings className="h-5 w-5 text-[#666666]" />
                  <span className="text-[#666666]">設定</span>
                </button>

                <button className="flex w-full items-center gap-3 rounded-xl p-3 text-sm transition-colors hover:bg-red-50">
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
        currentPresetId={currentPresetId}
      />
    </>
  )
}
