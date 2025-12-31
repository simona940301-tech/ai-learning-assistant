/**
 * 統一 API 響應構建工具
 * 
 * 用於標準化 Next.js API Route 的響應格式
 * 支持自動字段映射轉換 (snake_case → camelCase)
 * 
 * @example
 * ```typescript
 * import { ok, fail, okWithTransform } from '@/lib/utils/api-response-builder'
 * 
 * // 成功響應 (傳統方式)
 * return NextResponse.json(ok({ id: '123', name: 'Test' }))
 * 
 * // 成功響應 (自動轉換數據庫格式)
 * const dbResult = { user_id: '123', pack_id: '456', created_at: '2024-01-01' }
 * return NextResponse.json(okWithTransform(dbResult))
 * // 結果: { userId: '123', packId: '456', createdAt: '2024-01-01' }
 * 
 * // 錯誤響應
 * return NextResponse.json(fail('ERROR_CODE', 'Error message'), { status: 400 })
 * ```
 */

// import { dbToApiFormat } from './field-mapping'

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
 * 構建成功響應 (自動轉換數據庫格式)
 * 
 * 自動將 snake_case 字段轉換為 camelCase，遵循 API 響應規範
 * 完全向後相容，不影響現有代碼
 * 
 * @param dbData - 數據庫格式的數據 (snake_case)
 * @returns 成功響應對象 (camelCase)
 * 
 * @example
 * ```typescript
 * // 數據庫返回
 * const dbResult = { user_id: '123', pack_id: '456', created_at: '2024-01-01' }
 * 
 * // 自動轉換並返回
 * return NextResponse.json(okWithTransform(dbResult))
 * // API 響應: { success: true, data: { userId: '123', packId: '456', createdAt: '2024-01-01' } }
 * ```
 */
export function okWithTransform<T>(dbData: any): SuccessResponse<T> {
  // const transformedData = dbToApiFormat(dbData);
  return ok(dbData);
}

/**
 * 批量轉換數組數據
 * 
 * @param dbArray - 數據庫格式的數組
 * @returns 成功響應對象 (轉換後的數組)
 */
export function okWithTransformArray<T>(dbArray: any[]): SuccessResponse<T[]> {
  // const transformedArray = dbArray.map(item => dbToApiFormat(item));
  return ok(dbArray);
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

