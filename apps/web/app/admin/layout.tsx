'use client'

import { AuthGuard } from '@/components/auth/AuthGuard'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-background">
        {children}
      </div>
    </AuthGuard>
  )
}


