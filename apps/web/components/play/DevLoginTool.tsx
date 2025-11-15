'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabaseBrowserClient } from '@/lib/supabase'
import { usePlay } from '@/lib/play-context'
import { LogIn, Loader2, Chrome } from 'lucide-react'

/**
 * 登錄工具
 * 提供 Google OAuth、Email/Password 和開發模式登錄
 */
export function DevLoginTool() {
  const { refreshStatus } = usePlay()
  const [uuid, setUuid] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Google OAuth 登錄
  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: oauthError } = await supabaseBrowserClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=/play`,
        },
      })

      if (oauthError) {
        throw oauthError
      }

      // OAuth redirect will happen automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google 登錄失敗')
      setLoading(false)
    }
  }

  // 方法 1: 使用 UUID 檢查用戶（需要先有 email/password）
  const handleUUIDLogin = async () => {
    if (!uuid.trim()) {
      setError('請輸入 UUID')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uuid }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登錄失敗')
      }

      // 如果用戶存在，提示使用 email/password 登錄或無密碼登錄
      if (data.email) {
        setEmail(data.email)
        
        if (data.hasPassword === false || !data.hasPassword) {
          // 用戶沒有密碼，提供無密碼登錄選項
          setError(`找到用戶: ${data.username || data.email}，但沒有設置密碼。請使用「無密碼登錄」按鈕。`)
        } else {
          setError(`找到用戶: ${data.username || data.email}，請使用 Email/Password 登錄`)
        }
      } else {
        setError('用戶存在但沒有 email，無法自動登錄')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登錄失敗')
    } finally {
      setLoading(false)
    }
  }

  // 方法 3: 無密碼登錄（使用 Admin API）
  const handlePasswordlessLogin = async () => {
    if (!uuid.trim()) {
      setError('請先輸入 UUID')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/dev/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uuid }),
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '登錄失敗')
      }

      if (data.magicLink) {
        // 嘗試直接使用 magic link 登錄
        try {
          const linkUrl = new URL(data.magicLink)
          const token = linkUrl.searchParams.get('token') || data.token
          
          if (token) {
            const { data: sessionData, error: sessionError } = await supabaseBrowserClient.auth.setSession({
              access_token: token,
              refresh_token: '',
            })
            
            if (!sessionError && sessionData.session) {
              await refreshStatus()
              setError(null)
              return
            }
          }
          
          window.open(data.magicLink, '_blank')
          setError('已打開登錄鏈接，請在新窗口中完成登錄，然後刷新此頁面')
        } catch (err) {
          window.open(data.magicLink, '_blank')
          setError('已打開登錄鏈接，請在新窗口中完成登錄，然後刷新此頁面')
        }
      } else {
        setError('無法生成登錄鏈接，請檢查服務器日誌')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登錄失敗')
    } finally {
      setLoading(false)
    }
  }

  // 方法 2: 使用 Email/Password 登錄
  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('請輸入 Email 和密碼')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabaseBrowserClient.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      })

      if (signInError) {
        throw signInError
      }

      if (data.user) {
        await refreshStatus()
        setError(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登錄失敗')
    } finally {
      setLoading(false)
    }
  }

  // 檢查當前登錄狀態
  const checkAuth = async () => {
    const { data: { user } } = await supabaseBrowserClient.auth.getUser()
    if (user) {
      alert(`已登錄: ${user.email || user.id}`)
    } else {
      alert('未登錄')
    }
  }

  return (
    <Card className="border-2 border-dashed p-4">
      <div className="mb-4 flex items-center gap-2">
        <LogIn className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">登錄</h3>
      </div>

      {/* Google OAuth 登錄 */}
      <div className="mb-4">
        <Button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full"
          size="sm"
          variant="outline"
        >
          <Chrome className="mr-2 h-4 w-4" />
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '使用 Google 登錄'}
        </Button>
      </div>

      {/* 分隔線 */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">或</span>
        </div>
      </div>

      {/* UUID 登錄（開發模式） */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 space-y-2">
          <label className="text-sm font-medium">UUID 登錄（測試用）</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              placeholder="輸入用戶 UUID"
              className="flex-1 rounded-md border px-3 py-2 text-sm"
            />
            <Button
              onClick={handleUUIDLogin}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '查找'}
            </Button>
          </div>
          {uuid && (
            <Button
              onClick={handlePasswordlessLogin}
              disabled={loading}
              size="sm"
              className="w-full"
              variant="default"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '無密碼登錄'}
            </Button>
          )}
        </div>
      )}

      {/* Email/Password 登錄 */}
      <div className="mb-4 space-y-2">
        <label className="text-sm font-medium">Email/Password 登錄</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密碼"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <Button
          onClick={handleEmailLogin}
          disabled={loading}
          className="w-full"
          size="sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '登錄'}
        </Button>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className="mb-2 rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 檢查狀態 */}
      <Button
        onClick={checkAuth}
        variant="ghost"
        size="sm"
        className="w-full text-xs"
      >
        檢查登錄狀態
      </Button>
    </Card>
  )
}
