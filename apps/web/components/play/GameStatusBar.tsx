'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { usePlay } from '@/lib/play-context'

/**
 * GameStatusBar - 像素風格遊戲狀態欄
 * 
 * 顯示：
 * - XP 進度條（像素風格，精確數字）
 * - 羽毛狀態（8格滿顯示Full，否則30分鐘倒數）
 * - 錢包餘額
 * - 連擊天數
 */
export function GameStatusBar() {
  const { progression, userStatus, refreshStatus } = usePlay()
  const [timeUntilNextFeather, setTimeUntilNextFeather] = useState<number | null>(null)
  const [isFull, setIsFull] = useState(false)

  // 計算羽毛恢復時間
  useEffect(() => {
    if (!userStatus) return

    const calculateTimeUntilNext = () => {
      const currentFeathers = userStatus.dailyEnergyCount ?? 0
      const maxFeathers = 8
      
      if (currentFeathers >= maxFeathers) {
        setIsFull(true)
        setTimeUntilNextFeather(null)
        return
      }

      setIsFull(false)
      
      // 計算距離下次恢復的時間
      // 每 30 分鐘恢復一點
      const intervalMs = 30 * 60 * 1000 // 30分鐘
      const now = new Date().getTime()
      
      // 如果有 energyLastUpdatedAt，從那裡計算
      // 否則假設從現在開始倒數
      if (userStatus.energyLastUpdatedAt) {
        const lastUpdated = new Date(userStatus.energyLastUpdatedAt).getTime()
        const timeSinceUpdate = now - lastUpdated
        const intervalsPassed = Math.floor(timeSinceUpdate / intervalMs)
        const nextRecoveryTime = lastUpdated + (intervalsPassed + 1) * intervalMs
        const timeUntilNext = nextRecoveryTime - now
        
        if (timeUntilNext <= 0) {
          // 應該已經恢復了，刷新狀態
          refreshStatus()
          setTimeUntilNextFeather(intervalMs)
        } else {
          setTimeUntilNextFeather(timeUntilNext)
        }
      } else {
        // 沒有更新時間，使用固定 30 分鐘倒數
        setTimeUntilNextFeather(intervalMs)
      }
    }

    const updateTimer = () => {
      const currentFeathers = userStatus.dailyEnergyCount ?? 0
      const maxFeathers = 8
      
      if (currentFeathers >= maxFeathers) {
        setIsFull(true)
        setTimeUntilNextFeather(null)
        return
      }

      setIsFull(false)
      
      // 更新倒數時間
      setTimeUntilNextFeather(prev => {
        if (prev === null || prev <= 0) {
          // 倒數結束，應該已經恢復了，刷新狀態
          refreshStatus()
          return 30 * 60 * 1000 // 重新開始 30 分鐘倒數
        }
        return Math.max(0, prev - 1000) // 每秒減 1 秒
      })
    }

    calculateTimeUntilNext()
    const interval = setInterval(updateTimer, 1000) // 每秒更新

    return () => clearInterval(interval)
  }, [userStatus?.dailyEnergyCount, userStatus?.energyLastUpdatedAt, refreshStatus])

  // 格式化倒數時間
  const formatCountdown = (ms: number | null): string => {
    if (ms === null || ms <= 0) return 'Full'
    
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // XP 數據
  const xpData = useMemo(() => {
    if (!progression?.xp) return null
    
    const { total, level, progress, nextLevelXp } = progression.xp
    // 計算當前等級內的 XP
    const xpInCurrentLevel = Math.floor(progress * nextLevelXp)
    const xpToNextLevel = nextLevelXp - xpInCurrentLevel
    
    return {
      level,
      total,
      currentLevelXp: xpInCurrentLevel,
      xpToNextLevel,
      progress: Math.min(100, Math.max(0, progress * 100)),
    }
  }, [progression?.xp])

  if (!progression || !userStatus || !xpData) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-[13px] text-muted-foreground">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const featherCount = userStatus.dailyEnergyCount ?? 0
  const walletBalance = userStatus.walletBalance ?? 0
  const streakDays = progression.streak?.current ?? 0

  return (
    <div className="flex items-center justify-center gap-3 py-3 px-4">
      {/* XP 進度條 - 像素風格 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-start min-w-[120px]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[13px] font-bold text-foreground" style={{ 
              fontFamily: 'monospace',
              imageRendering: 'pixelated',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)'
            }}>
              Lv{xpData.level}
            </span>
            <span className="text-[11px] text-muted-foreground" style={{ 
              fontFamily: 'monospace',
              imageRendering: 'pixelated'
            }}>
              {xpData.currentLevelXp.toLocaleString()}/{xpData.currentLevelXp + xpData.xpToNextLevel}
            </span>
          </div>
          {/* 像素風格進度條 */}
          <div className="relative w-full h-4 border-2 border-foreground/20 rounded-sm bg-background overflow-hidden" style={{
            imageRendering: 'pixelated',
            boxShadow: 'inset 2px 2px 0px rgba(0,0,0,0.1)'
          }}>
            <div 
              className="h-full bg-gradient-to-r from-[#528555] to-[#6BA86F] transition-all duration-300"
              style={{
                width: `${xpData.progress}%`,
                imageRendering: 'pixelated',
                boxShadow: 'inset -2px -2px 0px rgba(0,0,0,0.1)'
              }}
            />
            {/* 像素風格分段線 */}
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-[1px] bg-foreground/10"
                style={{ left: `${(i + 1) * 10}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 分隔符 - 像素風格 */}
      <div className="text-muted-foreground/30" style={{ fontFamily: 'monospace' }}>▸</div>

      {/* 羽毛狀態 - 大圖標 + 數字 + Full/倒數 */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="relative">
          <Image
            src="/featherpoint.png"
            alt="羽毛"
            width={32}
            height={32}
            className="object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1">
            <span className="text-[16px] font-bold text-foreground" style={{ 
              fontFamily: 'monospace',
              imageRendering: 'pixelated',
              textShadow: '1px 1px 0px rgba(0,0,0,0.1)'
            }}>
              {featherCount}
            </span>
            <span className="text-[11px] text-muted-foreground" style={{ fontFamily: 'monospace' }}>
              /8
            </span>
          </div>
          <div className="text-[10px] font-medium" style={{ 
            fontFamily: 'monospace',
            imageRendering: 'pixelated',
            color: isFull ? '#528555' : '#D97706'
          }}>
            {isFull ? 'Full' : formatCountdown(timeUntilNextFeather)}
          </div>
        </div>
      </div>

      {/* 分隔符 */}
      <div className="text-muted-foreground/30" style={{ fontFamily: 'monospace' }}>▸</div>

      {/* 錢包餘額 */}
      <div className="flex items-center gap-1 min-w-[60px]">
        <span className="text-[13px] font-bold text-foreground" style={{ 
          fontFamily: 'monospace',
          imageRendering: 'pixelated',
          textShadow: '1px 1px 0px rgba(0,0,0,0.1)'
        }}>
          {walletBalance.toLocaleString()}
        </span>
      </div>

      {/* 分隔符 */}
      <div className="text-muted-foreground/30" style={{ fontFamily: 'monospace' }}>▸</div>

      {/* 連擊天數 */}
      <div className="flex items-center gap-1 min-w-[50px]">
        <span className="text-[13px] font-bold text-foreground" style={{ 
          fontFamily: 'monospace',
          imageRendering: 'pixelated',
          textShadow: '1px 1px 0px rgba(0,0,0,0.1)'
        }}>
          {streakDays}天
        </span>
      </div>
    </div>
  )
}

