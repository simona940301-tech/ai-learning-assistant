'use client'

import { TabBar } from '@/components/layout/tab-bar'
import { SafeAreaLayout } from '@/components/layout/SafeAreaLayout'
import { AskProvider } from '@/lib/ask-context'
import { PlayProvider } from '@/lib/play-context'
import { SimpleErrorBoundary } from '@/components/error-boundary'
import { CompanionProvider } from '@/lib/companion-context'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { ReunionGate } from '@/components/chick/ReunionGate'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SimpleErrorBoundary>
      <SafeAreaLayout enableBottom={false} enableTop={true}>
        {/* 🎯 修復：全局認證保護 - 只保護真正的功能頁面 */}
        <AuthGuard requireAuth={true}>
          <AskProvider>
            <PlayProvider>
              <CompanionProvider>
                {/* Mobile-first: flex column layout, TabBar 固定在底部 */}
                <div className="flex min-h-screen flex-col">
                  {/* 主內容區 - flex-1 佔滿剩餘空間 */}
                  <main className="flex-1 overflow-hidden">
                    <ReunionGate />
                    {children}
                  </main>

                  {/* Tamagotchi Companion - REMOVED from global layout, moved to Play page */}

                  {/* 底部 TabBar - shrink-0 固定高度，永遠貼在底部 */}
                  <div className="shrink-0">
                    <TabBar />
                  </div>
                </div>
              </CompanionProvider>
            </PlayProvider>
          </AskProvider>
        </AuthGuard>
      </SafeAreaLayout>
    </SimpleErrorBoundary>
  )
}
