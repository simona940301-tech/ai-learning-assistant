/**
 * Multi-question Detector
 * 
 * 偵測輸入是否包含多題（前端兜底，若後端尚未支援 E0）
 */

/**
 * 偵測是否包含多個 A-D 選項塊
 */
export function hasMultipleABCDChunks(src: string): boolean {
  if (!src || src.trim().length === 0) return false
  
  // 統一全形/半形括號
  const normalized = src
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[Ａ-Ｄ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
  
  // 按雙換行分割成塊
  const blocks = normalized.split(/\n{2,}/).filter((b) => b.trim().length > 0)
  
  // 檢查每個塊是否包含完整的 A-D 選項
  const abcdPattern = /\(A\)|\(B\)|\(C\)|\(D\)/i
  const blocksWithABCD = blocks.filter((block) => {
    const hasA = /\(A\)/i.test(block)
    const hasB = /\(B\)/i.test(block)
    const hasC = /\(C\)/i.test(block)
    const hasD = /\(D\)/i.test(block)
    return hasA && hasB && hasC && hasD
  })
  
  return blocksWithABCD.length >= 2
}

/**
 * 偵測閱讀理解是否包含多題
 */
export function hasMultipleReadingQuestions(src: string): boolean {
  if (!src || src.trim().length === 0) return false
  
  // 檢查是否有題號模式（1. 2. 3. 或 Q1 Q2 Q3）
  const questionNumberPattern = /(?:^|\n)\s*(?:\d+[\.、]|Q\d+|Question\s+\d+)/gi
  const matches = src.match(questionNumberPattern)
  
  return matches ? matches.length >= 2 : false
}

/**
 * 綜合偵測：是否包含多題
 */
export function detectMultipleQuestions(src: string): boolean {
  return hasMultipleABCDChunks(src) || hasMultipleReadingQuestions(src)
}

