'use client'

import { TabBar } from '@/components/layout/tab-bar'
import { AskProvider } from '@/lib/ask-context'
import { CompanionProvider } from '@/lib/companion-context'
import { TamagotchiWidget } from '@/components/companion/tamagotchi-widget'
import { SimpleErrorBoundary } from '@/components/error-boundary'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SimpleErrorBoundary>
      <AskProvider>
        <CompanionProvider>
          <div className="min-h-screen pb-16">
            {children}
            <TamagotchiWidget />
            <TabBar />
          </div>
        </CompanionProvider>
      </AskProvider>
    </SimpleErrorBoundary>
  )
}
