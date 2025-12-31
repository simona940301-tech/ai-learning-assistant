/**
 * Unified Error Handler
 * Provides consistent error handling across the application
 */

import { toast } from '@/components/ui/Toast'

// ============================================
// Error Types
// ============================================

export interface ApiError {
    error: string
    message?: string
    details?: any
}

export interface ErrorHandlerOptions {
    title?: string
    description?: string
    duration?: number
}

// ============================================
// Error Handler Functions
// ============================================

/**
 * 處理 API 錯誤
 * 統一的錯誤顯示邏輯，取代 alert()
 */
export function handleApiError(
    error: unknown,
    context: string,
    options: ErrorHandlerOptions = {}
): void {
    const {
        title = '操作失敗',
        description,
        duration = 5000
    } = options

    // 解析錯誤訊息
    let errorMessage = description || extractErrorMessage(error)

    // Log error for debugging
    console.error(`[${context}] Error:`, error)

    // 顯示 Toast
    const fullMessage = title !== '操作失敗' ? `${title}: ${errorMessage}` : errorMessage
    toast.error(fullMessage, duration as any)
}

/**
 * 處理成功訊息
 */
export function handleSuccess(
    message: string,
    options: {
        title?: string
        duration?: number
    } = {}
): void {
    const {
        title = '成功',
        duration = 3000
    } = options

    const fullMessage = title !== '成功' ? `${title}: ${message}` : message
    toast.success(fullMessage, duration as any)
}

/**
 * 處理警告訊息
 */
export function handleWarning(
    message: string,
    options: {
        title?: string
        duration?: number
    } = {}
): void {
    const {
        title = '注意',
        duration = 4000
    } = options

    const fullMessage = title !== '注意' ? `${title}: ${message}` : message
    toast.warning(fullMessage, duration as any)
}

// ============================================
// Helper Functions
// ============================================

/**
 * 從錯誤對象中提取錯誤訊息
 */
function extractErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
        return error
    }

    if (error instanceof Error) {
        return error.message
    }

    if (typeof error === 'object' && error !== null) {
        const apiError = error as ApiError
        if (apiError.message) {
            return apiError.message
        }
        if (apiError.error) {
            return apiError.error
        }
    }

    return '發生未知錯誤，請稍後再試'
}

/**
 * 處理 Fetch Response 錯誤
 */
export async function handleFetchError(
    response: Response,
    context: string,
    options: ErrorHandlerOptions = {}
): Promise<void> {
    let errorData: ApiError | undefined

    try {
        errorData = await response.json()
    } catch {
        // JSON parse failed, use status text
    }

    const errorMessage = errorData?.message || response.statusText || '請求失敗'

    handleApiError(
        errorMessage,
        context,
        {
            ...options,
            description: options.description || errorMessage
        }
    )
}

// ============================================
// Common Error Scenarios
// ============================================

/**
 * 網路連線錯誤
 */
export function handleNetworkError(context: string): void {
    handleApiError(
        '網路連線錯誤',
        context,
        {
            title: '無法連線',
            description: '請檢查您的網路連線'
        }
    )
}

/**
 * 認證錯誤
 */
export function handleAuthError(context: string): void {
    handleApiError(
        '認證失敗',
        context,
        {
            title: '請先登入',
            description: '您需要登入才能使用此功能'
        }
    )
}

/**
 * 權限錯誤
 */
export function handlePermissionError(context: string): void {
    handleApiError(
        '權限不足',
        context,
        {
            title: '無法執行',
            description: '您沒有權限執行此操作'
        }
    )
}

/**
 * 資源不存在錯誤
 */
export function handleNotFoundError(
    resourceName: string,
    context: string
): void {
    handleApiError(
        `${resourceName}不存在`,
        context,
        {
            title: '找不到資源',
            description: `請求的${resourceName}不存在或已被刪除`
        }
    )
}

/**
 * 驗證錯誤
 */
export function handleValidationError(
    message: string,
    context: string
): void {
    handleApiError(
        message,
        context,
        {
            title: '輸入錯誤',
            description: message
        }
    )
}

// ============================================
// Type-safe Error Handling with Results
// ============================================

export type Result<T, E = Error> =
    | { success: true; data: T }
    | { success: false; error: E }

/**
 * 安全執行異步操作，返回 Result 類型
 */
export async function tryCatch<T>(
    fn: () => Promise<T>,
    context: string
): Promise<Result<T>> {
    try {
        const data = await fn()
        return { success: true, data }
    } catch (error) {
        console.error(`[${context}] Error:`, error)
        return {
            success: false,
            error: error instanceof Error ? error : new Error('Unknown error')
        }
    }
}

// ============================================
// API Error Codes
// ============================================

export const ErrorCodes = {
    // Authentication
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',

    // Validation
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_INPUT: 'INVALID_INPUT',

    // Resources
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    DUPLICATE: 'DUPLICATE',

    // Database
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',

    // Business Logic
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    LIMIT_EXCEEDED: 'LIMIT_EXCEEDED',
    OPERATION_FAILED: 'OPERATION_FAILED',

    // Network
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',

    // Internal
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes]

/**
 * 根據錯誤碼獲取預設訊息
 */
export function getDefaultErrorMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
        UNAUTHORIZED: '請先登入',
        FORBIDDEN: '沒有權限執行此操作',
        VALIDATION_ERROR: '輸入資料格式錯誤',
        MISSING_REQUIRED_FIELD: '缺少必填欄位',
        INVALID_INPUT: '輸入資料無效',
        NOT_FOUND: '找不到請求的資源',
        ALREADY_EXISTS: '資源已存在',
        DUPLICATE: '重複的資料',
        DATABASE_ERROR: '資料庫錯誤',
        CONSTRAINT_VIOLATION: '違反資料約束',
        INSUFFICIENT_BALANCE: '餘額不足',
        LIMIT_EXCEEDED: '超過限制',
        OPERATION_FAILED: '操作失敗',
        NETWORK_ERROR: '網路連線錯誤',
        TIMEOUT: '請求超時',
        INTERNAL_ERROR: '伺服器內部錯誤',
        UNKNOWN_ERROR: '發生未知錯誤'
    }

    return messages[code] || messages.UNKNOWN_ERROR
}
