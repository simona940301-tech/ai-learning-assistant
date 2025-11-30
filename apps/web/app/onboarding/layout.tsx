'use client'

import { SimpleErrorBoundary } from '@/components/error-boundary'

/**
 * Onboarding Layout - 允許匿名訪問
 * 這個 layout 不包含 AuthGuard，允許未登入用戶進行測驗
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SimpleErrorBoundary>
      {/* 🎯 關鍵：不包含 AuthGuard，允許匿名訪問 */}
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </SimpleErrorBoundary>
  )
}