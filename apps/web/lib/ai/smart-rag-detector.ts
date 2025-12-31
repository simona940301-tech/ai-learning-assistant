/**
 * Smart RAG Detector
 * 智能判斷是否需要執行 RAG 檢索
 * 
 * 規則：
 * - 短查詢 (< 15 字)：跳過 RAG
 * - 簡單查詢關鍵字：跳過 RAG
 * - 複雜查詢（"為什麼"、"比較"、"分析"等）：執行 RAG
 */

/**
 * 判斷是否為簡單查詢（可以跳過 RAG）
 */
export function isSimpleQuery(query: string): boolean {
  const trimmed = query.trim()
  
  // 短查詢（< 15 字元）直接跳過 RAG
  if (trimmed.length < 15) {
    return true
  }

  // 簡單查詢模式（單一指令，不需要上下文）
  const simplePatterns = [
    /^(解釋|說明|這是什麼|什麼是|定義)/i,
    /^(翻譯|translation)/i,
    /^[？?]$/, // 只有問號
    /^(總結|摘要|summarize)/i,
  ]

  // 如果匹配簡單模式，且沒有複雜關鍵字，則跳過 RAG
  const hasSimplePattern = simplePatterns.some(pattern => pattern.test(trimmed))
  
  if (hasSimplePattern) {
    // 檢查是否有複雜查詢關鍵字
    const complexKeywords = [
      '為什麼', 'why', '比較', 'compare', '分析', 'analyze',
      '對比', '差異', 'difference', '關係', 'relation',
      '影響', 'effect', '原因', 'cause', '如何', 'how',
      '步驟', 'step', '流程', 'process'
    ]
    
    const hasComplexKeyword = complexKeywords.some(keyword => 
      trimmed.toLowerCase().includes(keyword.toLowerCase())
    )
    
    // 如果有複雜關鍵字，即使匹配簡單模式也要執行 RAG
    return !hasComplexKeyword
  }

  // 預設執行 RAG（安全策略）
  return false
}

/**
 * 判斷是否需要執行 RAG 檢索
 * @param prompt 用戶查詢
 * @param hasSelection 是否有選取文字
 * @returns 是否需要執行 RAG
 */
export function shouldSkipRAG(
  prompt: string,
  hasSelection: boolean
): boolean {
  // 如果有選取文字，且是簡單查詢，則跳過 RAG
  if (hasSelection && isSimpleQuery(prompt)) {
    return true
  }
  
  // 其他情況執行 RAG
  return false
}


























