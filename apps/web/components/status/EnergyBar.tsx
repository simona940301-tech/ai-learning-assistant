'use client'

import { useEnergyStatus } from '@/lib/hooks/useEnergyStatus'
import Image from 'next/image'

/**
 * EnergyBar - 簡潔的羽毛體力顯示（適用於頂部 header）
 *
 * 左側：羽毛 icon + 數字（energy/max）
 * 右側：小型倒數膠囊（未滿時顯示）
 */
export function EnergyBar() {
  const { energy, maxEnergy, isFull, formattedTime, isLoading } = useEnergyStatus()

  if (isLoading) {
    return (
      <div className="flex h-9 items-center gap-2 rounded-full border border-[#E8E2D9] bg-[#FBF7EE] px-3 shadow-none">
        <div className="w-5 h-5 rounded-full bg-muted/30 animate-pulse" />
        <div className="h-3.5 w-12 rounded-full bg-muted/30 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex h-9 items-center gap-2 rounded-full border border-[#E8E2D9] bg-gradient-to-b from-[#FDF9F0] to-[#F7F1E6] px-3 shadow-none">
      {/* Icon + 數字 */}
      <div className="flex items-center gap-2">
        <div className="relative flex h-5 w-5 items-center justify-center">
          <Image
            src="/featherpoint.png"
            alt="能量"
            width={20}
            height={20}
            className="object-contain w-full h-full"
            style={{
              filter: energy === 0
                ? 'grayscale(100%) opacity(0.6)'
                : 'brightness(1.05) saturate(1.05)',
              transition: 'all 0.25s ease',
            }}
          />
        </div>
        <div className="flex items-baseline gap-1 text-foreground">
          <span className="text-sm font-semibold tabular-nums">{energy}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">/{maxEnergy}</span>
        </div>
      </div>

      {/* 倒數膠囊 */}
      {!isFull && formattedTime && (
        <span className="ml-1 inline-flex min-w-[54px] items-center justify-center rounded-full border border-[#EDE6DB] bg-white/85 px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          ⏱ {formattedTime}
        </span>
      )}
    </div>
  )
}

/**
 * EnergyBadge - 簡化版本，只顯示數字
 * 適用於只需要顯示剩餘能量數字的場景
 */
export function EnergyBadge() {
  const { energy, maxEnergy, isLoading } = useEnergyStatus()

  if (isLoading) {
    return <div className="w-10 h-10 rounded-full bg-muted/30 animate-pulse" />
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-[#E8E2D9] bg-gradient-to-b from-[#FDF9F0] to-[#F7F1E6] px-2.5 py-1">
      <div className="relative w-6 h-6 flex items-center justify-center">
        <Image
          src="/featherpoint.png"
          alt="能量"
          width={24}
          height={24}
          className="object-contain w-full h-full"
          style={{
            filter: energy === 0
              ? 'grayscale(100%) opacity(0.6)'
              : 'brightness(1.05) saturate(1.05)',
            transition: 'all 0.25s ease',
          }}
        />
      </div>
      <span className="text-sm font-semibold text-foreground tabular-nums">
        {energy}/{maxEnergy}
      </span>
    </div>
  )
}
