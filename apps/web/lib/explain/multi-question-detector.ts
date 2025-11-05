/**
 * Multi-question Detector
 * 
 * 偵測輸入是否包含多題（前端兜底，若後端尚未支援 E0）
 */

/**
 * 偵測是否包含多個 A-D 選項塊
 * 優化：處理不完整題幹、跨行選項等情況
 */
export function hasMultipleABCDChunks(src: string): boolean {
  if (!src || src.trim().length === 0) return false
  
  // 統一全形/半形括號和字母
  const normalized = src
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[Ａ-Ｄ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
  
  // 移除多餘的換行和空白
  const cleaned = normalized.replace(/\n{3,}/g, '\n\n').trim()
  
  // 按雙換行或明顯的題目分隔符分割成塊
  const blocks = cleaned.split(/\n{2,}|(?=\n\s*\([A-D]\))/).filter((b) => b.trim().length > 0)
  
  // 檢查每個塊是否包含完整的 A-D 選項
  const blocksWithABCD = blocks.filter((block) => {
    // 移除空白和標點干擾
    const cleanBlock = block.replace(/^\s*[\)）]\s*/gm, '').trim()
    
    const hasA = /\(A\)/i.test(cleanBlock)
    const hasB = /\(B\)/i.test(cleanBlock)
    const hasC = /\(C\)/i.test(cleanBlock)
    const hasD = /\(D\)/i.test(cleanBlock)
    
    // 至少需要 3 個選項才能確認為一個題目
    const optionCount = [hasA, hasB, hasC, hasD].filter(Boolean).length
    
    return optionCount >= 3
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

