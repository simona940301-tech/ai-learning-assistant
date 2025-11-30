/**
 * 像素藝術圖示組件
 * 16x16 或 32x32 像素風格
 */

export function PixelTrophy({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
      {/* 像素藝術獎盃 */}
      <rect x="4" y="2" width="8" height="2" fill="currentColor" />
      <rect x="5" y="4" width="6" height="1" fill="currentColor" />
      <rect x="6" y="5" width="4" height="6" fill="currentColor" />
      <rect x="3" y="11" width="10" height="1" fill="currentColor" />
      <rect x="2" y="12" width="12" height="2" fill="currentColor" />
      <rect x="7" y="7" width="2" height="2" fill="#000" opacity="0.3" />
    </svg>
  )
}

export function PixelCoin({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
      {/* 像素藝術金幣 */}
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <circle cx="8" cy="8" r="5" fill="#FFD700" />
      <rect x="6" y="7" width="4" height="2" fill="#000" opacity="0.3" />
      <rect x="7" y="6" width="2" height="4" fill="#000" opacity="0.2" />
    </svg>
  )
}

export function PixelStar({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
      {/* 像素藝術星星 */}
      <rect x="7" y="2" width="2" height="2" fill="currentColor" />
      <rect x="6" y="4" width="4" height="1" fill="currentColor" />
      <rect x="5" y="5" width="6" height="1" fill="currentColor" />
      <rect x="4" y="6" width="8" height="1" fill="currentColor" />
      <rect x="5" y="7" width="6" height="1" fill="currentColor" />
      <rect x="6" y="8" width="4" height="1" fill="currentColor" />
      <rect x="7" y="9" width="2" height="2" fill="currentColor" />
      <rect x="2" y="6" width="2" height="1" fill="currentColor" />
      <rect x="12" y="6" width="2" height="1" fill="currentColor" />
    </svg>
  )
}

export function PixelBook({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className} style={{ imageRendering: 'pixelated' }}>
      {/* 像素藝術書本 */}
      <rect x="2" y="3" width="12" height="10" fill="currentColor" />
      <rect x="3" y="4" width="10" height="8" fill="#1a1a2e" />
      <rect x="4" y="5" width="8" height="1" fill="currentColor" opacity="0.3" />
      <rect x="4" y="7" width="8" height="1" fill="currentColor" opacity="0.3" />
      <rect x="4" y="9" width="6" height="1" fill="currentColor" opacity="0.3" />
      <rect x="8" y="3" width="1" height="10" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

