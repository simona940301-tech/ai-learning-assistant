/**
 * 統一的 API 回應型別定義
 *
 * 用於確保前後端的型別安全和一致性
 */

// ============================================================================
// Core Response Types
// ============================================================================

/**
 * API 成功回應
 */
export type ApiSuccessResponse<T = any> = {
  success: true
  data: T
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    timestamp?: string
    [key: string]: any
  }
}

/**
 * API 錯誤回應
 */
export type ApiErrorResponse = {
  success: false
  error: {
    code: ApiErrorCode
    message: string
    details?: any
  }
}

/**
 * 通用 API 回應（成功或失敗）
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// ============================================================================
// Error Codes
// ============================================================================

/**
 * 標準 API 錯誤代碼
 */
export enum ApiErrorCode {
  // 認證相關 (4xx)
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // 權限相關 (4xx)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 資源相關 (4xx)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',

  // 輸入驗證 (4xx)
  INVALID_INPUT = 'INVALID_INPUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // 業務邏輯 (4xx)
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',

  // 速率限制 (4xx)
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // 伺服器錯誤 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',

  // AI 相關錯誤
  AI_GENERATION_FAILED = 'AI_GENERATION_FAILED',
  AI_RATE_LIMIT = 'AI_RATE_LIMIT',
  EMBEDDING_FAILED = 'EMBEDDING_FAILED'
}

/**
 * 錯誤代碼對應的 HTTP 狀態碼
 */
export const ERROR_CODE_TO_STATUS: Record<ApiErrorCode, number> = {
  [ApiErrorCode.AUTH_REQUIRED]: 401,
  [ApiErrorCode.INVALID_TOKEN]: 401,
  [ApiErrorCode.TOKEN_EXPIRED]: 401,

  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: 403,

  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.RESOURCE_EXISTS]: 409,

  [ApiErrorCode.INVALID_INPUT]: 400,
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: 400,

  [ApiErrorCode.INSUFFICIENT_BALANCE]: 400,
  [ApiErrorCode.OPERATION_NOT_ALLOWED]: 400,
  [ApiErrorCode.CONFLICT]: 409,

  [ApiErrorCode.RATE_LIMIT]: 429,
  [ApiErrorCode.QUOTA_EXCEEDED]: 429,

  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.DATABASE_ERROR]: 500,
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.TIMEOUT]: 504,

  [ApiErrorCode.AI_GENERATION_FAILED]: 500,
  [ApiErrorCode.AI_RATE_LIMIT]: 429,
  [ApiErrorCode.EMBEDDING_FAILED]: 500
}

/**
 * 用戶友善的錯誤訊息
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.AUTH_REQUIRED]: '請先登入',
  [ApiErrorCode.INVALID_TOKEN]: '登入憑證無效，請重新登入',
  [ApiErrorCode.TOKEN_EXPIRED]: '登入已過期，請重新登入',

  [ApiErrorCode.FORBIDDEN]: '您沒有權限執行此操作',
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: '權限不足',

  [ApiErrorCode.NOT_FOUND]: '找不到此資源',
  [ApiErrorCode.RESOURCE_EXISTS]: '資源已存在',

  [ApiErrorCode.INVALID_INPUT]: '輸入資料格式錯誤',
  [ApiErrorCode.VALIDATION_ERROR]: '資料驗證失敗',
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填欄位',

  [ApiErrorCode.INSUFFICIENT_BALANCE]: '餘額不足',
  [ApiErrorCode.OPERATION_NOT_ALLOWED]: '不允許此操作',
  [ApiErrorCode.CONFLICT]: '資料衝突，請重新整理後再試',

  [ApiErrorCode.RATE_LIMIT]: '請求過於頻繁，請稍後再試',
  [ApiErrorCode.QUOTA_EXCEEDED]: '已超過使用額度',

  [ApiErrorCode.INTERNAL_ERROR]: '伺服器發生錯誤，請稍後再試',
  [ApiErrorCode.DATABASE_ERROR]: '資料庫錯誤，請稍後再試',
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服務暫時無法使用',
  [ApiErrorCode.SERVICE_UNAVAILABLE]: '服務暫時無法使用，請稍後再試',
  [ApiErrorCode.TIMEOUT]: '請求逾時，請重試',

  [ApiErrorCode.AI_GENERATION_FAILED]: 'AI 生成失敗，請重試',
  [ApiErrorCode.AI_RATE_LIMIT]: 'AI 請求過於頻繁，請稍後再試',
  [ApiErrorCode.EMBEDDING_FAILED]: '文字向量化失敗'
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * 檢查是否為成功回應
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true
}

/**
 * 檢查是否為錯誤回應
 */
export function isErrorResponse(
  response: ApiResponse
): response is ApiErrorResponse {
  return response.success === false
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * 從 API 回應中提取資料型別
 */
export type ExtractData<T> = T extends ApiSuccessResponse<infer D> ? D : never

/**
 * API 處理函數的回傳型別
 */
export type ApiHandler<T = any> = (
  req: Request
) => Promise<Response> | Response

/**
 * 分頁參數
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分頁回應 metadata
 */
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
