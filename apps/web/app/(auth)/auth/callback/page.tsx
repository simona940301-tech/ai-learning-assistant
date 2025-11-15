'use client'

export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { supabaseBrowserClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    // Wait for auth state to update
    const timer = setTimeout(async () => {
      if (user) {
        // Check if user has completed onboarding
        const { data } = await supabaseBrowserClient
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()

        // Get redirect URL from current URL
        const urlParams = new URLSearchParams(window.location.search)
        const redirectTo = urlParams.get('redirect') || '/play'

        if (data?.onboarding_completed) {
          // Already completed onboarding, go to app
          router.push(redirectTo)
        } else {
          // Not completed, go to goal selection
          router.push('/onboarding/goal')
        }
      } else {
        // If still not authenticated, redirect to onboarding
        router.push('/onboarding')
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [user, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-4xl animate-spin">⏳</div>
        <p className="text-muted-foreground">正在處理登入...</p>
      </div>
    </div>
  )
}

