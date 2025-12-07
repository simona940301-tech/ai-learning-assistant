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

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // PWA auto-update detection
  const { updateAvailable, refreshApp } = useServiceWorkerUpdate()

  return (
    <SimpleErrorBoundary>
      {/* 🎯 Full-Screen App: 吃滿整個視窗，不論桌機或手機 */}
      <div className="flex h-full w-full flex-col bg-background text-foreground">
        <AuthGuard requireAuth={true}>
          <AskProvider>
            <PlayProvider>
              <CompanionProvider>
                {/* 中間內容區 - 唯一可以捲動的地方，使用 app-scroll 隱藏 scrollbar */}
                <main className="app-scroll flex-1 min-h-0">
                  <ReunionGate />
                  {children}
                </main>

                {/* 底部 TabBar - 固定在底部 */}
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

