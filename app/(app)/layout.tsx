'use client'

import { TabBar } from '@/components/layout/tab-bar'
import { AskProvider } from '@/lib/ask-context'
import { SimpleErrorBoundary } from '@/components/error-boundary'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SimpleErrorBoundary>
      <AskProvider>
        <div className="min-h-screen pb-16">
          {children}
          <TabBar />
        </div>
      </AskProvider>
    </SimpleErrorBoundary>
  )
}
