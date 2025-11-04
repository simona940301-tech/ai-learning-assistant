'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SolveRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/ask')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <p>Solve 已移動至 /ask · 正在重新導向...</p>
    </div>
  )
}
