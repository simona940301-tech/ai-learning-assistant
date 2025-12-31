/**
 * CSRF Protection Middleware
 * 
 * 使用 Double Submit Cookie 模式防止 CSRF 攻擊
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 生成 CSRF Token
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID()
}

/**
 * 驗證 CSRF Token
 */
export function verifyCSRFToken(
  requestToken: string | null,
  cookieToken: string | null
): boolean {
  if (!requestToken || !cookieToken) {
    return false
  }

  return requestToken === cookieToken
}

/**
 * CSRF 保護中間件
 */
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    // GET 請求不需要 CSRF 保護
    if (req.method === 'GET' || req.method === 'HEAD') {
      return handler(req)
    }

    // 檢查 CSRF Token
    const requestToken = req.headers.get('x-csrf-token')
    const cookieToken = req.cookies.get('csrf-token')?.value

    if (!verifyCSRFToken(requestToken || null, cookieToken || null)) {
      return NextResponse.json(
        {
          error: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token 驗證失敗',
        },
        { status: 403 }
      )
    }

    return handler(req)
  }
}

/**
 * 設置 CSRF Token Cookie（用於 API 響應）
 */
export function setCSRFTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('csrf-token', token, {
    httpOnly: false, // 需要 JavaScript 訪問
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 小時
  })
  return response
}

