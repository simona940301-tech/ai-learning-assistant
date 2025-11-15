'use client'

import { TabBar } from '@/components/layout/tab-bar'
import { AskProvider } from '@/lib/ask-context'
import { AuthProvider } from '@/lib/auth-context'
import { PlayProvider } from '@/lib/play-context'
import { SimpleErrorBoundary } from '@/components/error-boundary'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SimpleErrorBoundary>
      <AuthProvider>
        <AskProvider>
          <PlayProvider>
            <div className="min-h-screen pb-16">
              {children}
              <TabBar />
            </div>
          </PlayProvider>
        </AskProvider>
      </AuthProvider>
    </SimpleErrorBoundary>
  )
}
