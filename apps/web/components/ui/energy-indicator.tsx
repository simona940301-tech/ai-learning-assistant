'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePlay } from '@/lib/play-context'
import Image from 'next/image'

/**
 * EnergyIndicator - 統一的能量顯示組件
 * 
 * 功能：
 * - 顯示當前羽毛數量 (x/8)
 * - 顯示恢復倒數時間 (30分鐘/1點)
 * - 點擊跳轉到任務列表
 */

interface EnergyIndicatorProps {
    /** 是否顯示為緊湊模式（小尺寸） */
    compact?: boolean
    /** 是否可點擊跳轉到任務 */
    clickable?: boolean
    /** 自定義樣式類名 */
    className?: string
}

export function EnergyIndicator({
    compact = false,
    clickable = true,
    className = ''
}: EnergyIndicatorProps) {
    const router = useRouter()
    const { userStatus, refreshStatus } = usePlay()
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

    const handleClick = () => {
        if (clickable) {
            router.push('/play') // 跳轉到 Play 頁面查看任務
        }
    }

    if (!userStatus) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            </div>
        )
    }

    const featherCount = userStatus.dailyEnergyCount ?? 0
    const countdownText = isFull ? 'Full' : formatCountdown(timeUntilNextFeather)

    if (compact) {
        // 緊湊模式：只顯示圖標和數字
        return (
            <button
                onClick={handleClick}
                disabled={!clickable}
                className={`flex items-center gap-1.5 ${clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'} ${className}`}
                aria-label="能量狀態"
            >
                <Image
                    src="/featherpoint.png"
                    alt="羽毛"
                    width={20}
                    height={20}
                    className="object-contain"
                    style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-sm font-bold text-foreground" style={{ fontFamily: 'monospace' }}>
                    {featherCount}/8
                </span>
            </button>
        )
    }

    // 完整模式：顯示圖標、數字、倒數時間
    return (
        <button
            onClick={handleClick}
            disabled={!clickable}
            className={`flex items-center gap-2 ${clickable ? 'cursor-pointer hover:bg-muted/50 rounded-lg px-3 py-2 transition-colors' : 'cursor-default'} ${className}`}
            aria-label="能量狀態，點擊查看任務"
            title={clickable ? '點擊查看任務' : undefined}
        >
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
                    {isFull ? 'Full' : `${countdownText} 後 +1`}
                </div>
            </div>
        </button>
    )
}

/**
 * EnergyCost - 能量消耗顯示組件
 * 用於按鈕旁顯示需要消耗的羽毛數量
 */
interface EnergyCostProps {
    cost: number
    className?: string
}

export function EnergyCost({ cost, className = '' }: EnergyCostProps) {
    return (
        <span className={`inline-flex items-center gap-1 text-xs ${className}`}>
            <Image
                src="/featherpoint.png"
                alt="消耗"
                width={14}
                height={14}
                className="object-contain"
                style={{ imageRendering: 'pixelated' }}
            />
            <span className="font-medium">{cost}</span>
        </span>
    )
}
