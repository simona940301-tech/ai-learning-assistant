'use client'

import { useLevelStatus } from '@/lib/hooks/useLevelStatus'

/**
 * LevelBar - 極簡 Candy 風格的等級 + XP 連體元件
 *
 * - Level badge：淺棕漸層膠囊、柔和內陰影
 * - XP bar：米白透明底、淺棕→深棕漸層填充，頂部 1px 高光，180ms ease-out
 * - 視覺上成為單一膠囊，保持寬鬆間距與深棕前景色
 */
export function LevelBar() {
  const { level, currentXp, xpToNextLevel, progressPercent, isLoading } = useLevelStatus()
  const xpBarHeight = 19 // +20% height for a thicker bar

  if (isLoading) {
    return (
      <div className="flex items-center w-full">
        <div
          className="h-[34px] min-w-[54px] rounded-full bg-[#E6D3BF] animate-pulse"
          style={{ opacity: 0.9 }}
        />
        <div
          className="flex-1 h-[11px] ml-[-10px] bg-[#E6D3BF] animate-pulse"
          style={{ opacity: 0.9, borderRadius: '999px' }}
        />
      </div>
    )
  }

  const clampedProgress = Math.min(Math.max(progressPercent ?? 0, 0), 100)

  return (
    <div
      className="flex items-center min-w-0 w-full"
      aria-label="Level and experience"
      style={{ gap: '0px', height: '44px' }}
    >
      {/* Level badge：柔和膠囊，與 XP bar 高度貼齊且緊貼相連 */}
      <div className="relative z-10 flex-shrink-0">
        <div
          className="inline-flex items-center justify-center"
          style={{
            minHeight: `${xpBarHeight * 1.12}px`,
            padding: '5px 13px',
            borderRadius: '999px',
            background: '#E9E0D5',
            boxShadow: 'inset 0 0 0 0.6px rgba(107,74,54,0.18)',
          }}
        >
          <span
            className="text-sm font-bold tabular-nums"
            style={{
              color: '#6B4A36',
              textShadow: '0 0.3px 0 rgba(107,74,54,0.45)',
            }}
          >
            {level}
          </span>
        </div>
      </div>

      {/* XP bar：厚底條，文字置中疊在 bar 上 */}
      <div className="relative flex-1 min-w-[200px]" style={{ width: '100%', maxWidth: '520px' }}>
        <div
          className="relative w-full ml-[-10px]"
          style={{
            height: `${xpBarHeight}px`,
            borderRadius: `${xpBarHeight / 2}px`,
            background: '#E9E0D5',
            overflow: 'hidden',
          }}
        >
          <div
            className="absolute inset-y-0 left-0 transition-[width] ease-out"
            style={{
              width: `${clampedProgress}%`,
              background: 'linear-gradient(90deg, #EADCC7 0%, #C9AA8A 100%)',
              borderRadius: `${xpBarHeight / 2}px`,
              minWidth: clampedProgress > 0 ? '2px' : '0',
              transitionDuration: '180ms',
            }}
          />

          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{
                color: '#6B4A36',
                textShadow: '0 0.6px 0 rgba(255,255,255,0.6)',
              }}
            >
              {currentXp} / {xpToNextLevel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
