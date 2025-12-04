'use client'

import { UnifiedLoader } from './unified-loader'

interface PremiumLoaderProps {
  message?: string
  className?: string
}

/**
 * 🎯 統一載入器 (Issue #1.5.1)
 * PremiumLoader 現在使用 UnifiedLoader 作為底層實作
 * 保持向後兼容，但統一視覺樣式
 */
export function PremiumLoader({ message, className = '' }: PremiumLoaderProps) {
  return <UnifiedLoader message={message} fullScreen={true} className={className} />
}

