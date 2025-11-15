'use client'

import type { Metadata } from 'next'
import './globals.css'
import EnvChecker from '@/components/EnvChecker'
import { AuthProvider } from '@/lib/auth-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <EnvChecker />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
