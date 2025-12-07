'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HeaderStatusSection } from '@/components/home/HeaderStatusSection'
import { CompactDreamSchoolCard } from '@/components/home/CompactDreamSchoolCard'
import { PrimaryActionSection } from '@/components/home/PrimaryActionSection'
import { RiskReminderSection } from '@/components/home/RiskReminderSection'
import { ToolsSection } from '@/components/home/ToolsSection'
import { setupBeforeUnloadFlush } from '@plms/shared/analytics'
import { useAuth } from '@/lib/auth-context'
import { levelForXp } from '@/lib/progression/leveling'
import { supabaseBrowserClient } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

interface UserProfile {
  name: string
  avatar: string
  xp: number
}

interface ProgressMeta {
  currentStreak: number
  level: number
}

export default function HomePage() {
  const { user: authUser } = useAuth()

  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<UserProfile>({
    name: '',
    avatar: '',
    xp: 0,
  })
  const [progressMeta, setProgressMeta] = useState<ProgressMeta>({
    currentStreak: 0,
    level: 1,
  })
  const [eloRank, setEloRank] = useState<number>(1000)
  const [targetUniversity, setTargetUniversity] = useState<string | null>(null)
  const [targetDepartment, setTargetDepartment] = useState<string | null>(null)

  // Setup analytics flush on page unload
  useEffect(() => {
    setupBeforeUnloadFlush()
  }, [])

  const loadProfileData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [profileRes, progressionRes, userStatusRes] = await Promise.all([
        fetch('/api/profile', { credentials: 'include', cache: 'no-store' }).catch(() => null),
        fetch('/api/play/progression/status', { credentials: 'include', cache: 'no-store' }).catch(() => null),
        fetch('/api/play/user/status', { credentials: 'include', cache: 'no-store' }).catch(() => null),
      ])

      const [profileData, progressionData, userStatusData] = await Promise.all([
        profileRes?.ok ? profileRes.json() : Promise.resolve(null),
        progressionRes?.ok ? progressionRes.json() : Promise.resolve(null),
        userStatusRes?.ok ? userStatusRes.json() : Promise.resolve(null),
      ])

      // ELO Rank
      if (userStatusData?.success && userStatusData.eloRank) {
        setEloRank(userStatusData.eloRank)
      }

      // XP & Level
      const xpSource =
        progressionData?.success && progressionData.progression?.xp
          ? progressionData.progression.xp.total ?? 0
          : profileData?.profile?.xp ?? 0
      const levelInfo = levelForXp(xpSource)

      // Progression Meta
      if (progressionData?.success && progressionData.progression) {
        const streak = progressionData.progression.streak
        setProgressMeta({
          currentStreak: streak?.current ?? 0,
          level: progressionData.progression.xp?.level ?? levelInfo.level,
        })
      } else {
        setProgressMeta({
          currentStreak: 0,
          level: levelInfo.level,
        })
      }

      // Profile Data
      if (profileData?.success && profileData.profile) {
        const displayName =
          profileData.profile.display_name ||
          profileData.profile.full_name ||
          profileData.profile.username ||
          authUser?.email?.split('@')[0] ||
          '使用者'

        setUser({
          name: displayName,
          avatar: profileData.profile.avatar_url || '',
          xp: levelInfo.currentXp,
        })
      } else if (authUser) {
        setUser({
          name: authUser.email?.split('@')[0] || '使用者',
          avatar: '',
          xp: 0,
        })
      }
    } catch (error) {
      console.error('[HomePage] Failed to fetch profile:', error)
    } finally {
      setIsLoading(false)
    }
  }, [authUser])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  // Fetch target university/department
  useEffect(() => {
    if (!authUser?.id) return

    let cancelled = false

    const fetchTarget = async () => {
      try {
        const { data, error } = await supabaseBrowserClient
          .from('profiles')
          .select('target_university, target_department')
          .eq('id', authUser.id)
          .maybeSingle()

        if (error || !data || cancelled) return

        setTargetUniversity(data.target_university || null)
        setTargetDepartment(data.target_department || null)
      } catch (err) {
        console.error('[HomePage] Failed to fetch target goal:', err)
      }
    }

    fetchTarget()

    return () => {
      cancelled = true
    }
  }, [authUser?.id])

  return (
    <div className="min-h-screen bg-background pb-20">

      <main className="mx-auto max-w-lg px-4 pt-6 pb-24 bg-[#FFFBF0] min-h-screen">
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* 🎯 Section 1: Header Status */}
            <HeaderStatusSection
              name={user.name}
              avatar={user.avatar}
              level={progressMeta.level}
              streakDays={progressMeta.currentStreak}
              eloRank={eloRank}
            />

            {/* 🎯 Section 2: Dream School Ready */}
            <CompactDreamSchoolCard
              streakDays={progressMeta.currentStreak}
              eloRank={eloRank}
              targetUniversity={targetUniversity}
              targetDepartment={targetDepartment}
            />

            {/* 🎯 Section 3: Primary Action */}
            <PrimaryActionSection />

            {/* 🎯 Section 4: Risk Reminders */}
            <RiskReminderSection />

            {/* 🎯 Section 5: Tools */}
            <ToolsSection />

            {/* Footer */}
            <div className="text-center text-xs text-[#A1968A] pt-4 pb-2">
              每日堅持練習，進步看得見
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
