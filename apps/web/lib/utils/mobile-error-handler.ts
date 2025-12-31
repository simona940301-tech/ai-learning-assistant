/**
 * Mobile-Friendly Error Handler
 * 
 * Converts technical errors into user-friendly messages with actionable guidance.
 * Optimized for mobile UX with concise, clear messaging.
 */

export interface MobileErrorMessage {
    title: string
    message: string
    action?: string
    severity: 'error' | 'warning' | 'info'
}

/**
 * Get user-friendly error message from any error type
 */
export function getMobileErrorMessage(error: unknown): MobileErrorMessage {
    const errorMsg = error instanceof Error ? error.message : String(error)

    // Network errors
    if (errorMsg.includes('Failed to fetch') || errorMsg.includes('Network error')) {
        return {
            title: '網路連線問題',
            message: '請檢查網路連線後重試',
            action: '重試',
            severity: 'error'
        }
    }

    // CORS / 405 errors
    if (errorMsg.includes('405') || errorMsg.includes('CORS') || errorMsg.includes('preflight')) {
        return {
            title: '上傳失敗',
            message: '請重新整理頁面後再試',
            action: '重新整理',
            severity: 'error'
        }
    }

    // Auth errors
    if (errorMsg.includes('401') || errorMsg.includes('UNAUTHORIZED') || errorMsg.includes('登入')) {
        return {
            title: '登入已過期',
            message: '請重新登入以繼續使用',
            action: '前往登入',
            severity: 'warning'
        }
    }

    // File size errors
    if (errorMsg.includes('413') || errorMsg.includes('過大') || errorMsg.includes('too large')) {
        return {
            title: '檔案過大',
            message: '請選擇小於 10MB 的檔案',
            action: '重新選擇',
            severity: 'warning'
        }
    }

    // Unsupported file type
    if (errorMsg.includes('415') || errorMsg.includes('不支援') || errorMsg.includes('invalid type')) {
        return {
            title: '不支援的檔案格式',
            message: '請上傳 PDF、TXT 或圖片檔案',
            action: '重新選擇',
            severity: 'warning'
        }
    }

    // Text extraction errors
    if (errorMsg.includes('TEXT_TOO_SHORT') || errorMsg.includes('內容太少')) {
        return {
            title: '文件內容不足',
            message: '無法提取足夠的文字內容，請確認檔案包含可讀取的文字',
            action: '選擇其他檔案',
            severity: 'warning'
        }
    }

    // Default fallback
    return {
        title: '操作失敗',
        message: '請稍後再試，或聯繫客服協助',
        action: '確定',
        severity: 'error'
    }
}

/**
 * Get user-friendly message for HTTP status codes
 */
export function getHttpErrorMessage(status: number, statusText: string): MobileErrorMessage {
    switch (status) {
        case 400:
            return {
                title: '請求錯誤',
                message: '請檢查輸入內容後重試',
                action: '重試',
                severity: 'warning'
            }
        case 401:
            return {
                title: '登入已過期',
                message: '請重新登入以繼續使用',
                action: '前往登入',
                severity: 'warning'
            }
        case 403:
            return {
                title: '權限不足',
                message: '您沒有執行此操作的權限',
                action: '確定',
                severity: 'error'
            }
        case 404:
            return {
                title: '找不到資源',
                message: '請求的內容不存在',
                action: '返回',
                severity: 'warning'
            }
        case 413:
            return {
                title: '檔案過大',
                message: '請選擇小於 10MB 的檔案',
                action: '重新選擇',
                severity: 'warning'
            }
        case 415:
            return {
                title: '不支援的檔案格式',
                message: '請上傳 PDF、TXT 或圖片檔案',
                action: '重新選擇',
                severity: 'warning'
            }
        case 429:
            return {
                title: '請求過於頻繁',
                message: '請稍後再試',
                action: '確定',
                severity: 'warning'
            }
        case 500:
        case 502:
        case 503:
            return {
                title: '伺服器錯誤',
                message: '服務暫時無法使用，請稍後再試',
                action: '重試',
                severity: 'error'
            }
        default:
            return {
                title: '操作失敗',
                message: `錯誤代碼: ${status}`,
                action: '確定',
                severity: 'error'
            }
    }
}
