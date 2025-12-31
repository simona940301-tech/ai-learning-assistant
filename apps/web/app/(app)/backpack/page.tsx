'use client'

import React from 'react'
import { BackpackContentV3 } from './BackpackContentV3'
import { useAuth } from '@/lib/auth-context'
import { PremiumLoader } from '@/components/ui/premium-loader'

/**
 * 背包頁面 - Client Component
 * 使用客戶端認證檢查，與 AuthGuard 保持一致
 */
export default function BackpackPage() {
  const { user, loading, hasValidSession } = useAuth()

  // 載入中狀態
  if (loading) {
    return <PremiumLoader message="檢查登入狀態..." className="bg-background" />
  }

  // 未登入或無效 session
  if (!user || !hasValidSession) {
    const message = !hasValidSession
      ? '登入狀態失效，請重新整理頁面或重新登入。'
      : '請登入後再使用背包功能。'

    return (
      <main className="min-h-full bg-background">
        <div className="mx-auto max-w-2xl px-4 pt-16">
          <div
            className={`rounded-2xl border p-6 text-sm ${!hasValidSession
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-border bg-card text-muted-foreground'
              }`}
          >
            {message}
          </div>
        </div>
      </main>
    )
  }

  // 已登入，顯示背包內容
  return (
    <main className="min-h-full bg-background">
      <BackpackContentV3 />
    </main>
  )
}
