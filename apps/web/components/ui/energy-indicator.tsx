'use client'

import { useRouter } from 'next/navigation'
import { useEnergyStatus } from '@/lib/hooks/useEnergyStatus'
import { EnergyBadge } from '@/components/status/EnergyBar'
import Image from 'next/image'

/**
 * EnergyIndicator - 統一的能量顯示組件（已重構，使用新的 useEnergyStatus hook）
 * 
 * 功能：
 * - 顯示當前羽毛數量 (x/8)
 * - 顯示恢復倒數時間 (30分鐘/1點)
 * - 點擊跳轉到任務列表
 * 
 * @deprecated 建議直接使用 EnergyBar 或 EnergyBadge 組件
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
    const { energy, maxEnergy, isFull, formattedTime, isLoading } = useEnergyStatus()

    const handleClick = () => {
        if (clickable) {
            router.push('/play') // 跳轉到 Play 頁面查看任務
        }
    }

    if (isLoading) {
        return (
            <div className={`flex items-center gap-2 ${className}`}>
                <div className="h-6 w-20 animate-pulse rounded bg-muted" />
            </div>
        )
    }

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
                <span className="text-sm font-bold text-foreground tabular-nums">
                    {energy}/{maxEnergy}
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
                    <span className="text-[16px] font-bold text-foreground tabular-nums">
                        {energy}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                        /{maxEnergy}
                    </span>
                </div>
                <div className="text-[10px] font-medium" style={{
                    color: isFull ? '#528555' : '#D97706'
                }}>
                    {isFull ? 'Full' : `${formattedTime} 後 +1`}
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
            <span className="font-medium tabular-nums">{cost}</span>
        </span>
    )
}
