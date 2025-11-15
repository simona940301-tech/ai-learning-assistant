/**
 * 輕量驗證器：只做 JSON parse 與必填鍵檢
 * 不做內容解析，寬鬆渲染、嚴格日誌
 */

import type {
  SharedPassagePayload,
  IndependentListPayload,
} from '@/lib/explain/types'
import {
  isSharedPayload,
  isIndependentList,
} from '@/lib/explain/types'

export type ExplainResult =
  | SharedPassagePayload
  | IndependentListPayload

export interface ValidationResult {
  valid: boolean
  shape: 'shared' | 'independent' | 'unknown'
  fixed?: ExplainResult
  warnings?: string[]
}

/**
 * 清理 JSON 字串：移除 ```json fenced code 與 BOM
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim()

  // 移除 BOM
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1)
  }

  // 移除 ```json 或 ``` 標記
  cleaned = cleaned.replace(/^```(?:json)?\s*/gm, '')
  cleaned = cleaned.replace(/\s*```$/gm, '')

  // 移除尾逗號（簡單處理，不處理所有情況）
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')

  return cleaned.trim()
}

/**
 * 驗證 SharedPassagePayload 結構
 */
function validateSharedPassage(
  data: unknown
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (!isSharedPayload(data)) {
    return { valid: false, warnings: ['Not a SharedPassagePayload'] }
  }

  // 檢查 sharedPassage
  if (!data.sharedPassage || typeof data.sharedPassage !== 'string') {
    warnings.push('MISSING: sharedPassage')
  }

  // 檢查 questions
  if (!Array.isArray(data.questions) || data.questions.length === 0) {
    warnings.push('MISSING: questions array')
    return { valid: false, warnings }
  }

  // 檢查每題的必填欄位
  data.questions.forEach((q, idx) => {
    if (!q || typeof q !== 'object') {
      warnings.push(`Question ${idx + 1}: Not an object`)
      return
    }

    if (!Array.isArray(q.options) || q.options.length === 0) {
      warnings.push(`Question ${idx + 1}: MISSING: options`)
    }

    if (!q.explanation || typeof q.explanation !== 'object') {
      warnings.push(`Question ${idx + 1}: MISSING: explanation`)
      return
    }

    if (!q.explanation.answer || typeof q.explanation.answer !== 'string') {
      warnings.push(`Question ${idx + 1}: MISSING: explanation.answer`)
    }

    if (
      !q.explanation.reasoning ||
      typeof q.explanation.reasoning !== 'string'
    ) {
      warnings.push(`Question ${idx + 1}: MISSING: explanation.reasoning`)
    }
  })

  // 檢查 note 中的 MISSING 標記
  if (data.note && typeof data.note === 'string') {
    if (data.note.includes('MISSING:')) {
      warnings.push(`Note contains MISSING marker: ${data.note}`)
    }
  }

  return {
    valid: warnings.length === 0 || warnings.every((w) => w.includes('MISSING:')),
    warnings,
  }
}

/**
 * 驗證 IndependentListPayload 結構
 */
function validateIndependentList(
  data: unknown
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (!isIndependentList(data)) {
    return { valid: false, warnings: ['Not a valid IndependentListPayload'] }
  }

  if (data.length === 0) {
    warnings.push('Empty questions array')
  }

  data.forEach((q, idx) => {
    if (!q || typeof q !== 'object') {
      warnings.push(`Question ${idx + 1}: Not an object`)
      return
    }

    if (!Array.isArray(q.options) || q.options.length === 0) {
      warnings.push(`Question ${idx + 1}: MISSING: options`)
    }

    if (!q.explanation || typeof q.explanation !== 'object') {
      warnings.push(`Question ${idx + 1}: MISSING: explanation`)
      return
    }

    if (!q.explanation.answer || typeof q.explanation.answer !== 'string') {
      warnings.push(`Question ${idx + 1}: MISSING: explanation.answer`)
    }

    if (
      !q.explanation.reasoning ||
      typeof q.explanation.reasoning !== 'string'
    ) {
      warnings.push(`Question ${idx + 1}: MISSING: explanation.reasoning`)
    }
  })

  return {
    valid: warnings.length === 0 || warnings.every((w) => w.includes('MISSING:')),
    warnings,
  }
}

/**
 * 確保 ExplainResult 的形狀正確
 * 寬鬆驗證：只要形狀正確就返回 fixed，即使有 warnings
 */
export function ensureExplainShape(raw: unknown): ValidationResult {
  // 如果是字串，先嘗試 parse
  if (typeof raw === 'string') {
    try {
      const cleaned = cleanJsonString(raw)
      const parsed = JSON.parse(cleaned)
      return ensureExplainShape(parsed)
    } catch (error) {
      return {
        valid: false,
        shape: 'unknown',
        warnings: [
          `JSON parse failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
      }
    }
  }

  // 檢查是否為 SharedPassagePayload
  if (isSharedPayload(raw)) {
    const validation = validateSharedPassage(raw)
    return {
      valid: validation.valid,
      shape: 'shared',
      fixed: raw, // ✅ 只要形狀正確就返回，即使有 warnings
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    }
  }

  // 檢查是否為 IndependentListPayload
  if (isIndependentList(raw)) {
    const validation = validateIndependentList(raw)
    return {
      valid: validation.valid,
      shape: 'independent',
      fixed: raw, // ✅ 只要形狀正確就返回，即使有 warnings
      warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
    }
  }

  // ✅ 處理包裝在 { questions: [...] } 對象中的格式（適配 json_object mode）
  if (
    raw &&
    typeof raw === 'object' &&
    'questions' in raw &&
    Array.isArray((raw as any).questions)
  ) {
    const questionsList = (raw as any).questions
    if (isIndependentList(questionsList)) {
      const validation = validateIndependentList(questionsList)
      return {
        valid: validation.valid,
        shape: 'independent',
        fixed: questionsList, // 解包 questions array
        warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
      }
    }
  }

  return {
    valid: false,
    shape: 'unknown',
    warnings: ['Unknown data shape'],
  }
}

