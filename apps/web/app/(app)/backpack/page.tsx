import React, { Suspense } from 'react'
import { BackpackContent } from './BackpackContent'
import { AppBar } from '@/components/layout/app-bar'

export default function BackpackPage() {
  return (
    <>
      <AppBar title="背包" showBack />
      <main className="pt-14 pb-20 min-h-screen bg-background">
        <Suspense fallback={<div className="p-4">載入中...</div>}>
          <BackpackContent />
        </Suspense>
      </main>
    </>
  )
}
