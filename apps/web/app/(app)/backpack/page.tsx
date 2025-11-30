import React, { Suspense } from 'react'
import { BackpackContentV3 } from './BackpackContentV3'
import { getCurrentUser } from '@/lib/auth/getCurrentUser'

export default async function BackpackPage() {
  const { user, errorType } = await getCurrentUser()

  if (!user) {
    const isInvalidJwt = errorType === 'invalid-jwt'
    const message = isInvalidJwt
      ? '登入狀態失效，請重新整理頁面或重新登入。'
      : '請登入後再使用背包功能。'

    return (
      <main className="min-h-screen bg-background pb-20">
        <div className="mx-auto max-w-2xl px-4 pt-16">
          <div
            className={`rounded-2xl border p-6 text-sm ${
              isInvalidJwt
                ? 'border-destructive/30 bg-destructive/5 text-destructive'
                : 'border-border bg-card text-muted-foreground'
            }`}
          >
            {message}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      <Suspense fallback={<div className="p-4">載入中...</div>}>
        <BackpackContentV3 />
      </Suspense>
    </main>
  )
}
