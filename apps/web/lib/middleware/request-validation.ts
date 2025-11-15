/**
 * Request Validation Middleware
 * 
 * 統一的請求驗證中間件
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createErrorResponse } from './error-handler'

/**
 * 請求驗證中間件
 */
export function withRequestValidation<T extends z.ZodType>(
  schema: T,
  handler: (req: NextRequest, validated: z.infer<T>) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const body = await req.json()
      const validated = schema.parse(body)
      return handler(req, validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          '請求驗證失敗',
          400,
          error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          }))
        )
      }
      throw error
    }
  }
}

/**
 * 查詢參數驗證中間件
 */
export function withQueryValidation<T extends z.ZodType>(
  schema: T,
  handler: (req: NextRequest, validated: z.infer<T>) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url)
      const params = Object.fromEntries(searchParams.entries())
      const validated = schema.parse(params)
      return handler(req, validated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          '查詢參數驗證失敗',
          400,
          error.errors
        )
      }
      throw error
    }
  }
}

