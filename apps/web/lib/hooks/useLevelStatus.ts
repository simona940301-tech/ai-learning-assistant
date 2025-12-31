'use client'

import { useMemo } from 'react'
import { usePlay } from '@/lib/play-context'

/**
 * 統一的等級狀態 Hook
 * 所有組件都應該透過這個 hook 取得等級/XP 資料，確保單一資料來源
 */
export interface UseLevelStatus {
  level: number
  currentXp: number
  xpToNextLevel: number
  progressPercent: number // 0~100
  isLoading: boolean
}

export function useLevelStatus(): UseLevelStatus {
  const { progression, isLoadingStatus } = usePlay()

  const levelData = useMemo(() => {
    if (!progression?.xp) {
      return {
        level: 1,
        currentXp: 0,
        xpToNextLevel: 100,
        progressPercent: 0,
      }
    }

    const { level, total, progress, nextLevelXp } = progression.xp

    // 🎯 FIX: 正確計算當前等級內的 XP 進度
    // progress 是 0-1 的比例，表示當前等級的完成度
    // currentXp（分子）= 當前等級已獲得的 XP
    // xpToNextLevel（分母）= 升級所需的總 XP
    const currentXp = Math.floor(progress * nextLevelXp)
    const progressPercent = Math.min(100, Math.max(0, progress * 100))

    return {
      level: level || 1,
      currentXp,
      xpToNextLevel: nextLevelXp, // 這是升級所需的總 XP，不是剩餘 XP
      progressPercent,
    }
  }, [progression?.xp])

  return {
    ...levelData,
    isLoading: isLoadingStatus,
  }
}




























