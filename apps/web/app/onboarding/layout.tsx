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
      {/* 全局 body 是 overflow: hidden，所以這裡必須允許 overflow-y-auto */}
      <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-background">
        {children}
      </div>
    </SimpleErrorBoundary>
  )
}