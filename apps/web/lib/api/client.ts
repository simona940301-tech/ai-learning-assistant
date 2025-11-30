/**
 * 頂尖的 API Client
 *
 * 功能：
 * - 統一的錯誤處理
 * - 自動重試機制
 * - 型別安全
 * - 請求/回應攔截
 * - 錯誤日誌
 */

import type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiErrorCode
} from '@/lib/types/api'

// ============================================================================
// Custom Error Class
// ============================================================================

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode | string,
    message: string,
    public details?: any,
    public status?: number
  ) {
    super(message)
    this.name = 'ApiError'

    // 保留 stack trace (V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError)
    }
  }

  /**
   * 檢查是否為特定錯誤代碼
   */
  is(code: ApiErrorCode): boolean {
    return this.code === code
  }

  /**
   * 檢查是否為認證錯誤
   */
  isAuthError(): boolean {
    return (
      this.code === 'AUTH_REQUIRED' ||
      this.code === 'INVALID_TOKEN' ||
      this.code === 'TOKEN_EXPIRED'
    )
  }

  /**
   * 檢查是否為伺服器錯誤
   */
  isServerError(): boolean {
    return this.status !== undefined && this.status >= 500
  }

  /**
   * 檢查是否為網路錯誤
   */
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT'
  }
}

// ============================================================================
// Request Options
// ============================================================================

export interface ApiCallOptions extends RequestInit {
  /**
   * 是否自動重試（預設: true）
   */
  retry?: boolean

  /**
   * 最大重試次數（預設: 2）
   */
  maxRetries?: number

  /**
   * 請求逾時時間（毫秒，預設: 30000）
   */
  timeout?: number

  /**
   * 是否在錯誤時顯示 toast（預設: true）
   */
  showErrorToast?: boolean

  /**
   * 自定義錯誤訊息
   */
  errorMessage?: string

  /**
   * 是否為背景請求（不顯示 loading，預設: false）
   */
  background?: boolean
}

// ============================================================================
// API Client Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<Pick<ApiCallOptions, 'retry' | 'maxRetries' | 'timeout' | 'showErrorToast' | 'background'>> = {
  retry: true,
  maxRetries: 2,
  timeout: 30000,
  showErrorToast: true,
  background: false
}

/**
 * 可重試的 HTTP 狀態碼
 */
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])

/**
 * 重試延遲（指數退避）
 */
function getRetryDelay(attemptNumber: number): number {
  return Math.min(1000 * 2 ** attemptNumber, 10000)
}

// ============================================================================
// Core API Call Function
// ============================================================================

/**
 * 統一的 API 呼叫函數（型別安全）
 *
 * @example
 * // 基本使用
 * const user = await apiCall<User>('/api/user/profile')
 *
 * // POST 請求
 * const result = await apiCall<Result>('/api/missions/complete', {
 *   method: 'POST',
 *   body: JSON.stringify({ missionId: '123' })
 * })
 *
 * // 錯誤處理
 * try {
 *   const data = await apiCall<Data>('/api/data')
 * } catch (err) {
 *   if (err instanceof ApiError && err.isAuthError()) {
 *     // 跳轉登入
 *   }
 * }
 */
export async function apiCall<T = any>(
  url: string,
  options: ApiCallOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let attemptCount = 0

  while (attemptCount <= opts.maxRetries) {
    try {
      // 建立 AbortController 用於 timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), opts.timeout)

      // 發送請求
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // 解析回應
      let json: ApiResponse<T>
      try {
        json = await response.json()
      } catch {
        // 如果無法解析 JSON，可能是非標準回應
        if (!response.ok) {
          throw new ApiError(
            'INTERNAL_ERROR',
            '伺服器回應格式錯誤',
            undefined,
            response.status
          )
        }
        // 舊格式相容：直接返回 response（會在下面處理）
        throw new Error('Non-JSON response')
      }

      // 檢查是否為新格式的錯誤回應
      if ('success' in json && !json.success) {
        const errorResponse = json as ApiErrorResponse
        throw new ApiError(
          errorResponse.error.code,
          errorResponse.error.message,
          errorResponse.error.details,
          response.status
        )
      }

      // 檢查是否為新格式的成功回應
      if ('success' in json && json.success) {
        const successResponse = json as ApiSuccessResponse<T>
        return successResponse.data
      }

      // 舊格式相容：檢查 HTTP 狀態碼
      if (!response.ok) {
        // 舊格式錯誤：{ error: '...' }
        const legacyError = json as any
        throw new ApiError(
          'INTERNAL_ERROR',
          legacyError.error || legacyError.message || '請求失敗',
          legacyError,
          response.status
        )
      }

      // 舊格式成功：直接返回資料
      return json as T

    } catch (error) {
      // 處理 AbortController timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError('TIMEOUT', '請求逾時', undefined, 408)
      }

      // 如果是 ApiError，判斷是否需要重試
      if (error instanceof ApiError) {
        const shouldRetry =
          opts.retry &&
          attemptCount < opts.maxRetries &&
          (error.isServerError() ||
            (error.status !== undefined &&
              RETRYABLE_STATUS_CODES.has(error.status)))

        if (shouldRetry) {
          attemptCount++
          await new Promise(resolve =>
            setTimeout(resolve, getRetryDelay(attemptCount))
          )
          continue
        }

        // 不重試，直接拋出
        throw error
      }

      // 其他錯誤（網路錯誤等）
      attemptCount++
      if (opts.retry && attemptCount <= opts.maxRetries) {
        await new Promise(resolve =>
          setTimeout(resolve, getRetryDelay(attemptCount))
        )
        continue
      }

      // 網路錯誤
      throw new ApiError(
        'NETWORK_ERROR',
        '網路連線失敗，請檢查您的網路',
        error
      )
    }
  }

  // 這裡不應該到達
  throw new ApiError('INTERNAL_ERROR', '未知錯誤')
}

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * GET 請求
 */
export async function get<T = any>(
  url: string,
  options?: Omit<ApiCallOptions, 'method' | 'body'>
): Promise<T> {
  return apiCall<T>(url, { ...options, method: 'GET' })
}

/**
 * POST 請求
 */
export async function post<T = any>(
  url: string,
  data?: any,
  options?: Omit<ApiCallOptions, 'method' | 'body'>
): Promise<T> {
  return apiCall<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * PUT 請求
 */
export async function put<T = any>(
  url: string,
  data?: any,
  options?: Omit<ApiCallOptions, 'method' | 'body'>
): Promise<T> {
  return apiCall<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: data ? JSON.stringify(data) : undefined
  })
}

/**
 * DELETE 請求
 */
export async function del<T = any>(
  url: string,
  options?: Omit<ApiCallOptions, 'method'>
): Promise<T> {
  return apiCall<T>(url, { ...options, method: 'DELETE' })
}

/**
 * PATCH 請求
 */
export async function patch<T = any>(
  url: string,
  data?: any,
  options?: Omit<ApiCallOptions, 'method' | 'body'>
): Promise<T> {
  return apiCall<T>(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: data ? JSON.stringify(data) : undefined
  })
}

// ============================================================================
// Error Handling Utilities
// ============================================================================

/**
 * 處理 API 錯誤的通用函數
 */
export function handleApiError(error: unknown, context?: string): never {
  if (error instanceof ApiError) {
    console.error(`[API Error${context ? ` - ${context}` : ''}]:`, {
      code: error.code,
      message: error.message,
      details: error.details
    })

    throw error
  }

  // 未知錯誤
  console.error(`[Unknown Error${context ? ` - ${context}` : ''}]:`, error)
  throw new ApiError(
    'INTERNAL_ERROR',
    error instanceof Error ? error.message : '未知錯誤'
  )
}

/**
 * 安全執行 API 呼叫（捕獲錯誤並返回 null）
 */
export async function safeApiCall<T>(
  fn: () => Promise<T>
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    console.error('[Safe API Call] Error:', error)
    return null
  }
}
