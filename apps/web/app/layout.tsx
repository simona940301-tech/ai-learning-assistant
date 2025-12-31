import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@/styles/mario-design-system.css'
import { ClientProviders } from '@/components/ClientProviders'
import {
  defaultMetadata,
  defaultViewport,
  appleWebAppMetadata,
  robotsConfig,
  verificationConfig,
} from '@/lib/metadata'

/**
 * Root Layout - Server Component
 *
 * This is the root layout for the entire application.
 * It's a Server Component to enable proper SEO metadata export.
 *
 * All client-side logic has been moved to ClientProviders component.
 */

// ============================================================================
// SEO Metadata Export
// ============================================================================

export const metadata: Metadata = {
  ...defaultMetadata,
  ...appleWebAppMetadata,
  robots: robotsConfig,
  verification: verificationConfig,
}

export const viewport: Viewport = defaultViewport

// ============================================================================
// Root Layout Component
// ============================================================================

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning className="h-full">
      <head>
        {/* Additional mobile-specific meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="h-full">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
