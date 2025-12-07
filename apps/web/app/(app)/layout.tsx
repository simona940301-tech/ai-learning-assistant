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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // PWA auto-update detection
  const { updateAvailable, refreshApp } = useServiceWorkerUpdate()

  return (
    <SimpleErrorBoundary>
      {/* 🎯 vConsole Mobile Debugger - 只在 ?debug=true 時啟用 */}
      {process.env.NODE_ENV !== 'production' && (
        <>
          <Script
            src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"
            strategy="afterInteractive"
          />
          <Script id="init-vconsole" strategy="afterInteractive">
            {`
              if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
                window.addEventListener('load', function() {
                  if (window.VConsole) {
                    new window.VConsole();
                    console.log('📱 vConsole activated - check bottom-right corner');
                  }
                });
              }
            `}
          </Script>
        </>
      )}

      {/* 🎯 Full-Screen App: 吃滿整個視窗，使用 100dvh 處理動態視口 */}
      <div className="flex h-[100dvh] w-full flex-col bg-background text-foreground">
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

