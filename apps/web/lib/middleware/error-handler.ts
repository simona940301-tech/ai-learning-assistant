/**
 * Unified Error Handling Middleware
 * 
 * 統一的錯誤處理和響應格式
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export interface ApiError {
  error: string
  message: string
  details?: any
  timestamp: string
}

/**
 * 創建標準錯誤響應
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 500,
  details?: any
): NextResponse<ApiError> {
  return NextResponse.json(
    {
      error: code,
      message,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  )
}

/**
 * 處理 Zod 驗證錯誤
 */
export function handleValidationError(error: ZodError): NextResponse<ApiError> {
  return createErrorResponse(
    'VALIDATION_ERROR',
    '輸入驗證失敗',
    400,
    error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }))
  )
}

/**
 * 處理未知錯誤
 */
export function handleUnknownError(error: unknown): NextResponse<ApiError> {
  console.error('[API Error]', error)

  // 生產環境不洩露詳細錯誤
  const isDevelopment = process.env.NODE_ENV === 'development'
  const message = isDevelopment
    ? error instanceof Error
      ? error.message
      : '未知錯誤'
    : '內部服務器錯誤'

  return createErrorResponse('INTERNAL_SERVER_ERROR', message, 500)
}

/**
 * API 路由錯誤處理包裝器
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return handleValidationError(error)
      }

      return handleUnknownError(error)
    }
  }
}

/**
 * 常見錯誤碼
 */
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  ENERGY_EXHAUSTED: 'ENERGY_EXHAUSTED',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
} as const

