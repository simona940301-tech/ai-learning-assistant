'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { usePlay } from '@/lib/play-context'

/**
 * 統一的能量狀態 Hook
 * 所有組件都應該透過這個 hook 取得能量資料，確保單一資料來源
 */
export interface UseEnergyStatus {
  energy: number
  maxEnergy: number
  isFull: boolean
  nextEnergyAt?: Date
  remainingMs?: number
  formattedTime?: string // 'MM:SS'
  progressPercent?: number // 0~100, 給倒數 bar 使用
  isLoading: boolean
}

const ENERGY_RECOVERY_INTERVAL_MS = 30 * 60 * 1000 // 30 分鐘

/**
 * 計算下一點能量恢復的時間
 * 基於 energyLastUpdatedAt 和恢復間隔（30分鐘）
 */
function calculateNextEnergyAt(
  energy: number,
  maxEnergy: number,
  energyLastUpdatedAt?: string | null
): Date | null {
  if (energy >= maxEnergy) {
    return null // 已滿，不需要恢復
  }

  if (!energyLastUpdatedAt) {
    // 沒有更新時間，假設從現在開始 30 分鐘後恢復
    return new Date(Date.now() + ENERGY_RECOVERY_INTERVAL_MS)
  }

  const lastUpdated = new Date(energyLastUpdatedAt).getTime()
  const now = Date.now()
  const timeSinceUpdate = now - lastUpdated
  const intervalsPassed = Math.floor(timeSinceUpdate / ENERGY_RECOVERY_INTERVAL_MS)
  
  // 計算下一點能量恢復的時間
  const nextRecoveryTime = lastUpdated + (intervalsPassed + 1) * ENERGY_RECOVERY_INTERVAL_MS
  
  return new Date(nextRecoveryTime)
}

/**
 * 格式化時間為 MM:SS
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function useEnergyStatus(): UseEnergyStatus {
  const { userStatus, refreshStatus, isLoadingStatus } = usePlay()

  const [remainingMs, setRemainingMs] = useState<number | undefined>(undefined)
  const [currentTime, setCurrentTime] = useState(Date.now())

  // 計算基礎資料
  const energy = userStatus?.dailyEnergyCount ?? 0
  const maxEnergy = 8
  const isFull = energy >= maxEnergy
  const energyLastUpdatedAt = userStatus?.energyLastUpdatedAt

  console.log('🔍 [useEnergyStatus] Current state:', {
    energy,
    energyLastUpdatedAt,
    userStatus,
  })

  // 計算下一點能量恢復的時間
  // 🔧 FIX: 使用字符串值而不是對象引用作為依賴，避免不必要的重新計算
  const nextEnergyAt = useMemo(() => {
    console.log('🔄 [useEnergyStatus] Recalculating nextEnergyAt with:', {
      energy,
      maxEnergy,
      energyLastUpdatedAt,
      isFull,
    })
    if (isFull) return undefined
    return calculateNextEnergyAt(energy, maxEnergy, energyLastUpdatedAt) ?? undefined
  }, [energy, maxEnergy, energyLastUpdatedAt, isFull])

  // 計算剩餘時間和進度
  useEffect(() => {
    if (!nextEnergyAt || isFull) {
      setRemainingMs(undefined)
      return
    }

    const updateRemaining = () => {
      const now = Date.now()
      const next = nextEnergyAt.getTime()
      const remaining = Math.max(0, next - now)
      
      setRemainingMs(remaining)
      setCurrentTime(now)

      // 如果時間到了，觸發狀態刷新
      if (remaining <= 0) {
        refreshStatus().catch(console.error)
      }
    }

    // 立即計算一次
    updateRemaining()

    // 每秒更新一次
    const interval = setInterval(updateRemaining, 1000)

    return () => clearInterval(interval)
  }, [nextEnergyAt, isFull, refreshStatus])

  // 格式化時間
  const formattedTime = useMemo(() => {
    if (remainingMs === undefined || remainingMs <= 0) {
      return isFull ? 'FULL' : '--:--'
    }
    return formatTime(remainingMs)
  }, [remainingMs, isFull])

  // 計算進度百分比（0~100）
  const progressPercent = useMemo(() => {
    if (isFull || remainingMs === undefined) {
      return 100
    }
    // 進度 = (30分鐘 - 剩餘時間) / 30分鐘 * 100
    const progress = ((ENERGY_RECOVERY_INTERVAL_MS - remainingMs) / ENERGY_RECOVERY_INTERVAL_MS) * 100
    return Math.min(100, Math.max(0, progress))
  }, [remainingMs, isFull])

  return {
    energy,
    maxEnergy,
    isFull,
    nextEnergyAt,
    remainingMs,
    formattedTime,
    progressPercent,
    isLoading: isLoadingStatus,
  }
}




























