import { NextResponse } from 'next/server'
import {
  ApiErrorCode,
  ERROR_CODE_TO_STATUS,
  ERROR_MESSAGES,
  type PaginationMeta
} from '@/lib/types/api'

/**
 * 統一的 API 回應建構器
 *
 * @example
 * // 成功回應
 * return Api.success({ userId: '123', name: 'John' })
 *
 * // 分頁回應
 * return Api.success(users, Api.paginate(1, 20, 100))
 *
 * // 錯誤回應
 * return Api.unauthorized()
 * return Api.badRequest('Invalid input', { field: 'email' })
 * return Api.customError(ApiErrorCode.INSUFFICIENT_BALANCE, '金幣不足')
 */
export class ApiResponseBuilder {
  /**
   * 建立成功回應
   * @param data 回應資料
   * @param meta 可選的 metadata (分頁、時間戳等)
   */
  static success<T>(data: T, meta?: Record<string, any>): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      ...(meta && { meta })
    })
  }

  /**
   * 建立自定義錯誤回應（使用標準錯誤代碼）
   * @param code 標準錯誤代碼
   * @param customMessage 可選的自定義訊息（覆蓋預設訊息）
   * @param details 開發用的詳細資訊
   */
  static customError(
    code: ApiErrorCode,
    customMessage?: string,
    details?: any
  ): NextResponse {
    const message = customMessage || ERROR_MESSAGES[code]
    const status = ERROR_CODE_TO_STATUS[code]

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          ...(details && { details })
        }
      },
      { status }
    )
  }

  /**
   * 建立錯誤回應（向後相容，建議使用 customError）
   * @deprecated 請使用 customError 並傳入 ApiErrorCode
   */
  static error(
    code: string,
    message: string,
    status: number = 400,
    details?: any
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          ...(details && { details })
        }
      },
      { status }
    )
  }

  // ============================================================================
  // 常用錯誤快捷方法
  // ============================================================================

  /**
   * 401 Unauthorized - 需要認證
   */
  static unauthorized(message?: string): NextResponse {
    return this.customError(ApiErrorCode.AUTH_REQUIRED, message)
  }

  /**
   * 403 Forbidden - 權限不足
   */
  static forbidden(message?: string): NextResponse {
    return this.customError(ApiErrorCode.FORBIDDEN, message)
  }

  /**
   * 404 Not Found - 資源不存在
   */
  static notFound(resource?: string): NextResponse {
    const message = resource ? `${resource} 不存在` : undefined
    return this.customError(ApiErrorCode.NOT_FOUND, message)
  }

  /**
   * 400 Bad Request - 輸入錯誤
   */
  static badRequest(message: string, details?: any): NextResponse {
    return this.customError(ApiErrorCode.INVALID_INPUT, message, details)
  }

  /**
   * 400 Validation Error - 資料驗證失敗
   */
  static validationError(message: string, details?: any): NextResponse {
    return this.customError(ApiErrorCode.VALIDATION_ERROR, message, details)
  }

  /**
   * 500 Internal Server Error - 伺服器錯誤
   */
  static serverError(message?: string, details?: any): NextResponse {
    return this.customError(ApiErrorCode.INTERNAL_ERROR, message, details)
  }

  /**
   * 429 Too Many Requests - 速率限制
   */
  static rateLimited(message?: string): NextResponse {
    return this.customError(ApiErrorCode.RATE_LIMIT, message)
  }

  /**
   * 503 Service Unavailable - 服務不可用
   */
  static serviceUnavailable(message?: string): NextResponse {
    return this.customError(ApiErrorCode.SERVICE_UNAVAILABLE, message)
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * 建立分頁 metadata
   */
  static paginate(
    page: number,
    pageSize: number,
    total: number
  ): PaginationMeta {
    const totalPages = Math.ceil(total / pageSize)
    return {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }

  /**
   * 建立帶時間戳的 metadata
   */
  static withTimestamp(meta?: Record<string, any>): Record<string, any> {
    return {
      ...meta,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * 簡化的 alias，方便使用
 *
 * @example
 * import { Api } from '@/lib/api/response'
 *
 * export async function GET() {
 *   const user = await getUser()
 *   if (!user) return Api.unauthorized()
 *   return Api.success(user)
 * }
 */
export const Api = ApiResponseBuilder
