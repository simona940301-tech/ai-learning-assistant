'use client'

import { useLevelStatus } from '@/lib/hooks/useLevelStatus'

/**
 * LevelBar - 極簡主義等級 + XP 連體元件
 *
 * 等級圓形與 XP bar 視覺上連成一體：
 * - 等級圓形：右側無圓角，與 XP bar 緊貼
 * - XP bar：左側無圓角，形成連續的「膠囊」形狀
 */
export function LevelBar() {
  const { level, currentXp, xpToNextLevel, progressPercent, isLoading } = useLevelStatus()

  if (isLoading) {
    return (
      <div className="flex items-center w-full">
        <div className="h-[34px] w-[34px] rounded-l-full bg-[#E6D3BF] animate-pulse" style={{ opacity: 0.9 }} />
        <div className="flex-1 h-[7px] bg-[#E6D3BF] animate-pulse" style={{ opacity: 0.9 }} />
      </div>
    )
  }

  const totalXp = Math.max(currentXp + xpToNextLevel, 1)
  const clampedProgress = Math.min(Math.max(progressPercent ?? 0, 0), 100)

  return (
    <div className="flex items-center min-w-0" aria-label="Level and experience" style={{ gap: '0', height: '34px' }}>
      {/* Level circle - 右側無圓角，與 XP bar 銜接，直徑 32-36px */}
      <div className="flex-shrink-0 relative z-10 flex items-center">
        <div 
          className="flex items-center justify-center border bg-[#F5E9D8] text-[#6A4A3C] shadow-none"
          style={{ 
            width: '34px', 
            height: '34px',
            borderRadius: '50% 0 0 50%', 
            borderRight: 'none',
            borderWidth: '1px',
            borderColor: '#D9C0A6',
            borderStyle: 'solid',
          }}
        >
          <span className="text-sm font-semibold tabular-nums">{level}</span>
        </div>
      </div>

      {/* XP bar 容器 - 包含數字和 bar，緊湊設計 */}
      <div className="relative flex-1 min-w-[100px] -ml-[1px] flex flex-col" style={{ height: '34px', justifyContent: 'center' }}>
        {/* XP 數字顯示在上方 */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-start px-1" style={{ height: '14px' }}>
          <span className="text-[10px] font-medium text-[#6A4A3C] tabular-nums leading-tight">
            {currentXp} / {xpToNextLevel}
          </span>
        </div>

        {/* XP bar - 左側無圓角，與圓形銜接，高度 6-8px */}
        <div className="relative flex items-center" style={{ height: '8px', marginTop: 'auto' }}>
          {/* 背景 */}
          <div 
            className="absolute inset-0 bg-[#E6D3BF]" 
            style={{ borderRadius: '0 999px 999px 0' }} 
          />
          
          {/* 填充 */}
          <div
            className="absolute inset-0 bg-[#C49A6C] transition-all duration-500 ease-out"
            style={{ 
              width: `${clampedProgress}%`,
              borderRadius: '0 999px 999px 0',
              minWidth: clampedProgress > 0 ? '2px' : '0',
            }}
          />
        </div>
      </div>
    </div>
  )
}
