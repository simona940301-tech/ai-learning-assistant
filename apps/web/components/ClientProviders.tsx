'use client'

import { useEffect, type ReactNode } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { installGlobalFetchGuard } from '@/lib/api-client'
import { Toaster } from 'sonner'
import EnvChecker from '@/components/EnvChecker'
import { GuidanceProvider } from '@/components/guidance/GuidanceProvider'

import { OfflineBanner } from '@/components/pwa/OfflineBanner'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'
import { UpdatePrompt } from '@/components/pwa/UpdatePrompt'

/**
 * Client Providers Component
 *
 * Wraps all client-side providers and effects that were previously in root layout.
 * This allows the root layout to be a Server Component for proper SEO metadata.
 *
 * Providers included:
 * - AuthProvider: Authentication state management
 * - Toaster: Global toast notifications (sonner)
 * - EnvChecker: Development environment validation
 * - GuidanceProvider: User guidance system
 *
 * PWA Components:
 * - OfflineBanner: Shows network status
 * - InstallPrompt: Handles PWA installation
 * - UpdatePrompt: Handles app updates
 *
 * Effects:
 * - installGlobalFetchGuard: API error handling middleware
 */
interface ClientProvidersProps {
  children: ReactNode
}

export function ClientProviders({ children }: ClientProvidersProps) {
  // Install global fetch guard on mount
  useEffect(() => {
    installGlobalFetchGuard()
  }, [])

  return (
    <AuthProvider>
      <GuidanceProvider>
        <EnvChecker />
        <OfflineBanner />
        <InstallPrompt />
        <UpdatePrompt />
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={3000}
          toastOptions={{
            classNames: {
              toast: 'backdrop-blur-md',
              title: 'font-medium',
              description: 'text-sm',
            },
          }}
        />
      </GuidanceProvider>
    </AuthProvider>
  )
}
