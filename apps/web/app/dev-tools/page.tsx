'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { supabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function DevToolsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isDevelopment = process.env.NODE_ENV === 'development'
  const mockUserDisabled = process.env.NEXT_PUBLIC_DISABLE_MOCK_USER === 'true'

  const [sessionInfo, setSessionInfo] = useState<{
    hasSession: boolean
    userId?: string
  } | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabaseBrowserClient.auth.getSession()
      setSessionInfo({
        hasSession: !!data?.session,
        userId: data?.session?.user?.id,
      })
    }
    checkSession()
  }, [])

  const clearSession = async () => {
    await supabaseBrowserClient.auth.signOut()
    // 清除所有 Supabase 相關的 localStorage
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key)
        }
      })
    }
    setSessionInfo({ hasSession: false })
    router.push('/onboarding/goal')
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="container mx-auto max-w-2xl py-12 px-4">
        <h1 className="text-3xl font-bold mb-8">🛠️ Development Tools</h1>

        <Card className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Mock User Authentication</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enable mock user to bypass authentication in development mode.
            </p>

            <div className="p-4 bg-muted rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">Mock User Status</p>
                <span className={`text-xs px-2 py-1 rounded-full ${mockUserDisabled
                  ? 'bg-red-500/20 text-red-600'
                  : 'bg-green-500/20 text-green-600'
                  }`}>
                  {mockUserDisabled ? 'DISABLED' : 'AUTO-ENABLED'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {mockUserDisabled
                  ? '❌ Mock User 已禁用（測試真實登入流程）'
                  : '✅ 開發環境自動啟用'}
              </p>

              {!mockUserDisabled && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
                  </p>
                  <p className="text-xs text-amber-600">
                    💡 開發環境中無需手動啟用，Mock 用戶自動登入
                  </p>
                </div>
              )}

              {mockUserDisabled && (
                <div className="space-y-2">
                  <p className="text-xs text-blue-600">
                    💡 已禁用 Mock User，可以使用真實的登入流程進行測試
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-2">Session Management</h2>
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div>
                <p className="text-sm font-medium mb-2">Current Session:</p>
                {sessionInfo ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Has Session: {sessionInfo.hasSession ? '✅ Yes' : '❌ No'}
                    </p>
                    {sessionInfo.userId && (
                      <p className="text-xs text-muted-foreground">
                        User ID: {sessionInfo.userId}
                      </p>
                    )}
                    {user && (
                      <p className="text-xs text-muted-foreground">
                        Auth User: {user.id}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                )}
              </div>
              <Button
                variant="destructive"
                onClick={clearSession}
                className="w-full"
              >
                🗑️ 清除 Session 並登出
              </Button>
              <p className="text-xs text-muted-foreground">
                💡 清除所有 Supabase session 資料，回到登入頁面。用於測試完整的登入流程。
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-2">Quick Navigation</h2>
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/preview')}
                className="justify-start"
              >
                → Preview Hub
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/play')}
                className="justify-start"
              >
                → Play / Battle System
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/backpack')}
                className="justify-start"
              >
                → Backpack
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-2">Admin Tools</h2>
            <div className="grid gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/admin/import-questions')}
                className="justify-start"
              >
                📝 Import Questions
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/admin/import-departments')}
                className="justify-start"
              >
                🏫 Import Departments
              </Button>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-2">Environment Info</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node ENV:</span>
                <span className="font-mono">{process.env.NODE_ENV}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supabase URL:</span>
                <span className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_SUPABASE_URL?.split('.')[0]}...
                </span>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>⚠️ Development tools are only available in development mode</p>
        </div>
      </div >
    </AuthGuard >
  )
}
