/**
 * Input Sanitization Utilities
 * 
 * 防止 XSS 攻擊和惡意輸入
 * 使用 DOMPurify（服務器端）和內建清理
 */

import { z } from 'zod'

/**
 * 清理 HTML 標籤（簡單版本，生產環境建議使用 DOMPurify）
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // 移除所有 HTML 標籤
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

/**
 * 清理字符串（移除控制字符和潛在危險字符）
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    return ''
  }

  let cleaned = input
    .trim()
    // 移除控制字符（保留換行和製表符）
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // 移除潛在的腳本標籤
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')

  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength)
  }

  return cleaned
}

/**
 * 驗證和清理 UUID
 */
export function sanitizeUUID(input: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const cleaned = input.trim()
  return uuidRegex.test(cleaned) ? cleaned : null
}

/**
 * 驗證和清理房間代碼（6 位字母數字）
 */
export function sanitizeRoomCode(input: string): string | null {
  const codeRegex = /^[A-Z0-9]{6}$/
  const cleaned = input.trim().toUpperCase()
  return codeRegex.test(cleaned) ? cleaned : null
}

/**
 * Zod Schema 擴展：自動清理字符串
 */
export const sanitizedString = (maxLength?: number) =>
  z.string().transform((val) => sanitizeString(val, maxLength))

/**
 * Zod Schema：清理後的 UUID
 */
export const sanitizedUUIDSchema = z.string().transform((val) => {
  const cleaned = sanitizeUUID(val)
  if (!cleaned) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'Invalid UUID format',
        path: [],
      },
    ])
  }
  return cleaned
})

/**
 * Zod Schema：清理後的房間代碼
 */
export const sanitizedRoomCodeSchema = z.string().transform((val) => {
  const cleaned = sanitizeRoomCode(val)
  if (!cleaned) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'Invalid room code format',
        path: [],
      },
    ])
  }
  return cleaned
})

