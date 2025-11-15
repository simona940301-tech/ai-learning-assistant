'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DevToolsPage() {
  const router = useRouter()
  const isDevelopment = process.env.NODE_ENV === 'development'
  const mockUserEnabled = isDevelopment // Always enabled in development

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">🛠️ Development Tools</h1>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Mock User Authentication</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enable mock user to bypass authentication in development mode.
          </p>

          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium">Mock User Status</p>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-600 rounded-full">
                AUTO-ENABLED
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {mockUserEnabled ? '✅ 開發環境永久啟用' : '❌ Production Mode'}
            </p>
            {mockUserEnabled && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
                </p>
                <p className="text-xs text-amber-600">
                  💡 開發環境中無需手動啟用，Mock 用戶自動登入
                </p>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    此設定在開發環境中永久生效，無需手動切換
                  </p>
                </div>
              </div>
            )}
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Battle WS URL:</span>
              <span className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_BATTLE_WS_URL || 'ws://localhost:8080/ws/battle'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <p>⚠️ Development tools are only available in development mode</p>
      </div>
    </div>
  )
}
