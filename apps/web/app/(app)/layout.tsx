'use client'

import { TabBar } from '@/components/layout/tab-bar'
import { AskProvider } from '@/lib/ask-context'
import { PlayProvider } from '@/lib/play-context'
import { SimpleErrorBoundary } from '@/components/error-boundary'
import { CompanionProvider } from '@/lib/companion-context'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { ReunionGate } from '@/components/chick/ReunionGate'
import { UpdateNotification } from '@/components/layout/UpdateNotification'
import { useServiceWorkerUpdate } from '@/lib/hooks/useServiceWorkerUpdate'
import Script from 'next/script'
import { VConsoleLoader } from '@/components/debug/VConsoleLoader'
import { Suspense } from 'react'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // PWA auto-update detection
  const { updateAvailable, refreshApp } = useServiceWorkerUpdate()

  return (
    <SimpleErrorBoundary>
      {/* 🚀 SOTA FIX: vConsole Mobile Debugger - 解鎖生產環境調試 */}
      {/* 移除 NODE_ENV 限制，只依賴 URL 參數 ?debug=true */}
      {/* 這是業界標準的「線上除錯後門」*/}
      <Suspense fallback={null}>
        <VConsoleLoader />
      </Suspense>

      {/* 🎯 Full-Screen App: 吃滿整個視窗，使用 100dvh 處理動態視口 */}
      <div
        className="flex h-[100dvh] w-full flex-col bg-background text-foreground"
        style={{
          overscrollBehavior: 'none', // 🎯 SOTA: Prevent rubber-band scroll
        }}
      >
        <AuthGuard requireAuth={true}>
          <AskProvider>
            <PlayProvider>
              <CompanionProvider>
                {/* 🎯 中間內容區 - flex-1 + min-h-0 確保正確填充剩餘空間 */}
                {/* 頂部 safe-area 由 CSS 變數處理，底部由 TabBar 處理 */}
                <main
                  className="app-scroll flex-1 min-h-0"
                  style={{
                    paddingTop: 'env(safe-area-inset-top, 0px)',
                  }}
                >
                  <ReunionGate />
                  {children}
                </main>

                {/* 底部 TabBar - 固定在底部，內部處理 safe-area-inset-bottom */}
                <TabBar />

                {/* PWA Update Notification */}
                {updateAvailable && <UpdateNotification onRefresh={refreshApp} />}
              </CompanionProvider>
            </PlayProvider>
          </AskProvider>
        </AuthGuard>
      </div>
    </SimpleErrorBoundary>
  )
}

