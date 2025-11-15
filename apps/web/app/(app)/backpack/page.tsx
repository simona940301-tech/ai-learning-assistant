import React, { Suspense } from 'react'
import { BackpackContent } from './BackpackContent'

export default function BackpackPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <Suspense fallback={<div className="p-4">載入中...</div>}>
        <BackpackContent />
      </Suspense>
    </main>
  )
}
