'use client'

import Image from 'next/image'
import { useEnergyStatus } from '@/lib/hooks/useEnergyStatus'
import { cn } from '@/lib/utils'

/**
 * Candy Crush 風格的能量膠囊組件
 * 
 * 將羽毛 icon、數字、以及 Full/倒數顯示在同一顆 pill 中
 */
export function EnergyPill() {
  const { energy, maxEnergy, formattedTime, isFull } = useEnergyStatus()

  // Full 狀態時增加 5% 亮度（使用 filter: brightness）
  const brightness = isFull ? 1.05 : 1

  // 確定右側顯示內容：如果 current < max → 顯示倒數，如果 current = max → 顯示 Full
  const displayText = isFull ? 'Full' : (formattedTime && formattedTime !== 'FULL' ? formattedTime : '--:--')

  return (
    <div
      className="relative flex items-center"
      style={{
        height: '36px',
        borderRadius: '18px',
        paddingLeft: '14px',
        paddingRight: '14px',
        background: 'linear-gradient(to bottom, #FCE5D4, #E7C4A5)',
        border: '1px solid #E0C5AC',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        filter: `brightness(${brightness})`,
        transition: 'filter 0.2s ease',
      }}
    >
      {/* 亮面高光 overlay - 覆蓋上 40%，與圓角邊緣貼齊 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: '18px',
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.35) 40%, transparent 40%)',
        }}
      />

      {/* 內容區域 - 使用 relative 確保在高光之上 */}
      <div className="relative flex items-center" style={{ gap: '10px' }}>
        {/* 左側：羽毛 icon (20px) + 數字 */}
        <div className="flex items-center" style={{ gap: '6px' }}>
          <div className="relative" style={{ width: '20px', height: '20px' }}>
            <Image
              src="/featherpoint.png"
              alt="羽毛"
              width={20}
              height={20}
              className="object-contain w-full h-full"
              style={{
                filter: energy === 0
                  ? 'grayscale(100%) opacity(0.6)'
                  : 'none',
                transition: 'all 0.25s ease',
              }}
            />
          </div>
          <span
            className="text-[15px] font-medium tabular-nums"
            style={{
              color: '#5B4634',
              lineHeight: '1.3',
            }}
          >
            {energy} / {maxEnergy}
          </span>
        </div>

        {/* 中間間隔：10px（已在上面的 gap 中設置） */}

        {/* 右側：顯示 Full 或倒數 */}
        <span
          className={cn(
            'text-[15px] font-medium tabular-nums',
            isFull && 'font-semibold'
          )}
          style={{
            color: isFull ? '#4A3628' : '#5B4634',
            lineHeight: '1.3',
          }}
        >
          {displayText}
        </span>
      </div>
    </div>
  )
}

