/**
 * 統一 API 響應構建工具
 * 
 * 用於標準化 Next.js API Route 的響應格式
 * 
 * @example
 * ```typescript
 * import { ok, fail } from '@/lib/utils/api-response-builder'
 * 
 * // 成功響應
 * return NextResponse.json(ok({ id: '123', name: 'Test' }))
 * 
 * // 錯誤響應
 * return NextResponse.json(fail('ERROR_CODE', 'Error message'), { status: 400 })
 * ```
 */

/**
 * 成功響應格式
 */
export interface SuccessResponse<T> {
  success: true
  data: T
}

/**
 * 錯誤響應格式
 */
export interface ErrorResponse {
  success: false
  error: string
  message?: string
}

/**
 * 構建成功響應
 * 
 * @param data - 響應數據
 * @returns 成功響應對象
 * 
 * @example
 * ```typescript
 * return NextResponse.json(ok({ id: '123' }))
 * ```
 */
export function ok<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  }
}

/**
 * 構建錯誤響應
 * 
 * @param errorCode - 錯誤代碼（用於前端識別錯誤類型）
 * @param message - 錯誤消息（可選，用於顯示給用戶）
 * @returns 錯誤響應對象
 * 
 * @example
 * ```typescript
 * return NextResponse.json(fail('SUBJECT_NOT_FOUND', '科目不存在'), { status: 404 })
 * ```
 */
export function fail(errorCode: string, message?: string): ErrorResponse {
  return {
    success: false,
    error: errorCode,
    ...(message && { message }),
  }
}

/**
 * 錯誤代碼映射表
 * 
 * 用於統一管理錯誤代碼，確保前端能正確處理錯誤
 */
export const ERROR_CODES = {
  // 驗證錯誤
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  
  // 業務錯誤
  SUBJECT_NOT_FOUND: 'SUBJECT_NOT_FOUND',
  SUBJECT_REQUIRED: 'SUBJECT_REQUIRED',
  KEYPOINTS_NOT_READY: 'KEYPOINTS_NOT_READY',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  
  // 系統錯誤
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

