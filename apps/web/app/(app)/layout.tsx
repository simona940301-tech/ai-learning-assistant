'use client'

import { TabBar } from '@/components/layout/tab-bar'
import { AskProvider } from '@/lib/ask-context'
import { PlayProvider } from '@/lib/play-context'
import { SimpleErrorBoundary } from '@/components/error-boundary'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SimpleErrorBoundary>
      <AskProvider>
        <PlayProvider>
          <div className="min-h-screen pb-16">
            {children}
            <TabBar />
          </div>
        </PlayProvider>
      </AskProvider>
    </SimpleErrorBoundary>
  )
}
