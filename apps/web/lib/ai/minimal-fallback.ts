/**
 * Minimal Fallback
 * 
 * Layer 3: 最小解釋（保底模板，永遠不失敗）
 * 當 Universal Explainer 和 Basic Extractor 都失敗時使用
 */

import { safeText, safeTrim } from '@/lib/safe-text'

export interface MinimalFallbackResult {
  question: string
  options: Array<{ key: string; text: string }>
  answer: string
  reason: string
  status: 'minimal'
  meta: {
    elapsedMs: number
    layer: 'minimal'
    hint: string
    failureCause?: string
  }
}

/**
 * Extract question and options using minimal rules (always succeeds)
 */
function extractMinimal(text: string): {
  question: string
  options: Array<{ key: string; text: string }>
} {
  const safeText = safeTrim(text, '')
  
  // Extract options: (A) text, （A）text, A) text, etc.
  const optionPattern = /[（(]\s*([A-EＡ-Ｅａ-ｅ])\s*[）)]\s*([^\n(（]+)/gi
  const options: Array<{ key: string; text: string }> = []
  const fullWidthMap: Record<string, string> = {
    'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E',
    'ａ': 'A', 'ｂ': 'B', 'ｃ': 'C', 'ｄ': 'D', 'ｅ': 'E',
  }
  
  let match: RegExpMatchArray | null
  while ((match = optionPattern.exec(safeText)) !== null) {
    const key = (fullWidthMap[match[1]] || match[1]).toUpperCase()
    const text = safeTrim(match[2] || '', '')
    if (text.length > 0) {
      options.push({ key, text })
    }
  }
  
  // Extract question (everything before first option)
  let question = safeText
  if (options.length > 0) {
    const firstOptionIndex = safeText.search(/[（(]\s*[A-EＡ-Ｅａ-ｅ]\s*[）)]/i)
    if (firstOptionIndex > 0) {
      question = safeText.substring(0, firstOptionIndex).trim()
    }
  }
  
  // If no question found, use first 100 chars
  if (!question || question.length === 0) {
    question = safeText.substring(0, 100).trim() || '無法解析題目'
  }
  
  return { question, options }
}

/**
 * Minimal Fallback - Always returns a result
 */
export function minimalFallback(inputText: string): MinimalFallbackResult {
  const start = Date.now()
  const text = safeText(inputText, '')
  
  // Extract question and options
  const { question, options } = extractMinimal(text)
  
  // Default answer (first option if available, otherwise '-')
  const answer = options.length > 0 ? options[0].key : '-'
  
  // Default reason
  const reason = text.length > 0
    ? '請檢查題目格式，或重新輸入題目以獲得完整解析。'
    : '無法生成詳細解析，請輸入題目內容。'
  
  const hint = text.length === 0
    ? 'empty_input'
    : options.length === 0
    ? 'no_options'
    : 'minimal_extraction'
  
  return {
    question,
    options,
    answer,
    reason,
    status: 'minimal',
    meta: {
      elapsedMs: Date.now() - start,
      layer: 'minimal',
      hint,
    },
  }
}


