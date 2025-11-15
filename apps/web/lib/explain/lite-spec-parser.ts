/**
 * Lite Spec v1 Parser
 * 
 * 解析模型輸出的 Markdown 格式，抓取固定錨點行的關鍵欄位
 * 
 * 格式範例：
 * Q1. The students ______ the problem calmly.
 * ZH: 學生們冷靜地面對這個問題。
 * ANSWER: B
 * WHY: 作補語描述狀態，需用現在分詞作補語，因此選 facing。
 * OPTIONS:
 * (A) face
 * (B) facing
 * ...
 */

export interface LiteSpecResult {
  question: {
    en: string
    zh?: string
  }
  answer?: string
  why?: string
  focus?: string
  options: Array<{
    label: string
    text: string
    reason?: string
  }>
  evidence: string[]
  traps: string[]
  vocab: Array<{
    word: string
    pos?: string
    zh?: string
  }>
  rawText: string
}

const ANCHOR_PATTERNS = {
  ANSWER: /^ANSWER:\s*(.+)$/i,
  WHY: /^WHY:\s*(.+)$/i,
  FOCUS: /^FOCUS:\s*(.+)$/i,
  ZH: /^ZH:\s*(.+)$/i,
  OPTIONS: /^OPTIONS:/i,
  EVIDENCE: /^EVIDENCE:/i,
  TRAPS: /^TRAPS:/i,
  VOCAB: /^VOCAB:/i,
}

/**
 * 移除重複行（前 20 字相同視為重複）
 */
function deduplicateLines(lines: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  
  for (const line of lines) {
    const prefix = line.slice(0, 20).trim()
    if (!seen.has(prefix)) {
      seen.add(prefix)
      result.push(line)
    }
  }
  
  return result
}

/**
 * 解析題目（第一行 Q\d+\. 開頭或第一行英文句子）
 */
function parseQuestion(lines: string[]): { en: string; zh?: string } {
  if (lines.length === 0) return { en: '' }
  
  // 找第一行題目（Q1. 開頭或英文句子）
  let questionEn = ''
  let questionZh: string | undefined
  
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // 匹配 Q1. 開頭
    if (/^Q\d+\./.test(line)) {
      questionEn = line.replace(/^Q\d+\.\s*/, '')
      break
    }
    
    // 匹配英文句子（至少包含字母和空格）
    if (/^[A-Z][^。！？]*[.!?]?$/.test(line) && /[a-zA-Z]/.test(line)) {
      questionEn = line
      break
    }
  }
  
  // 找 ZH: 行（可能在題目之後）
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(ANCHOR_PATTERNS.ZH)
    if (match) {
      questionZh = match[1].trim()
      break
    }
  }
  
  return { en: questionEn || lines[0] || '', zh: questionZh }
}

/**
 * 解析選項區塊
 */
function parseOptions(lines: string[], startIndex: number): Array<{ label: string; text: string; reason?: string }> {
  const options: Array<{ label: string; text: string; reason?: string }> = []
  let currentOption: { label: string; text: string; reason?: string } | null = null
  
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 遇到下一個錨點或空行，結束選項區塊
    if (!line || Object.values(ANCHOR_PATTERNS).some(pattern => {
      if (pattern === ANCHOR_PATTERNS.OPTIONS) return false
      return pattern.test(line)
    })) {
      break
    }
    
    // 匹配 (A) 或 (B) 等選項
    const optionMatch = line.match(/^\(([A-E])\)\s*(.+)$/i)
    if (optionMatch) {
      if (currentOption) {
        options.push(currentOption)
      }
      currentOption = {
        label: optionMatch[1].toUpperCase(),
        text: optionMatch[2].trim(),
      }
    } else if (currentOption && line.length > 0) {
      // 可能是選項的理由或補充說明（如果沒有理由欄位，作為補充）
      if (!currentOption.reason && line.length < 100) {
        currentOption.reason = line
      }
    }
  }
  
  if (currentOption) {
    options.push(currentOption)
  }
  
  return options
}

/**
 * 解析列表區塊（EVIDENCE, TRAPS）
 */
function parseListBlock(lines: string[], startIndex: number): string[] {
  const items: string[] = []
  
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 遇到下一個錨點或空行，結束區塊
    if (!line || Object.keys(ANCHOR_PATTERNS).some(key => {
      if (key === 'EVIDENCE' || key === 'TRAPS') return false
      return ANCHOR_PATTERNS[key as keyof typeof ANCHOR_PATTERNS].test(line)
    })) {
      break
    }
    
    // 移除列表標記（- 或 1) 或數字.）
    const cleaned = line.replace(/^[-*]\s*/, '').replace(/^\d+[).]\s*/, '').trim()
    if (cleaned) {
      items.push(cleaned)
    }
  }
  
  return items
}

/**
 * 解析 VOCAB 區塊
 */
function parseVocabBlock(lines: string[], startIndex: number): Array<{ word: string; pos?: string; zh?: string }> {
  const vocab: Array<{ word: string; pos?: string; zh?: string }> = []
  
  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 遇到下一個錨點或空行，結束區塊
    if (!line || Object.keys(ANCHOR_PATTERNS).some(key => {
      if (key === 'VOCAB') return false
      return ANCHOR_PATTERNS[key as keyof typeof ANCHOR_PATTERNS].test(line)
    })) {
      break
    }
    
    // 格式：word | POS | 中文
    const parts = line.split('|').map(p => p.trim()).filter(Boolean)
    if (parts.length >= 1) {
      vocab.push({
        word: parts[0],
        pos: parts[1],
        zh: parts[2],
      })
    }
  }
  
  return vocab
}

/**
 * 主解析函數
 */
export function parseLiteSpec(text: string): LiteSpecResult {
  const lines = deduplicateLines(text.split('\n').map(l => l.trim()).filter(Boolean))
  
  const result: LiteSpecResult = {
    question: { en: '' },
    options: [],
    evidence: [],
    traps: [],
    vocab: [],
    rawText: text,
  }
  
  // 解析題目
  result.question = parseQuestion(lines)
  
  // 遍歷所有行，尋找錨點
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // ANSWER
    const answerMatch = line.match(ANCHOR_PATTERNS.ANSWER)
    if (answerMatch) {
      result.answer = answerMatch[1].trim()
      continue
    }
    
    // WHY
    const whyMatch = line.match(ANCHOR_PATTERNS.WHY)
    if (whyMatch) {
      result.why = whyMatch[1].trim().slice(0, 140) // 限制 140 字
      continue
    }
    
    // FOCUS
    const focusMatch = line.match(ANCHOR_PATTERNS.FOCUS)
    if (focusMatch) {
      result.focus = focusMatch[1].trim().slice(0, 60) // 限制 60 字
      continue
    }
    
    // OPTIONS
    if (ANCHOR_PATTERNS.OPTIONS.test(line)) {
      result.options = parseOptions(lines, i)
      continue
    }
    
    // EVIDENCE
    if (ANCHOR_PATTERNS.EVIDENCE.test(line)) {
      result.evidence = parseListBlock(lines, i)
      continue
    }
    
    // TRAPS
    if (ANCHOR_PATTERNS.TRAPS.test(line)) {
      result.traps = parseListBlock(lines, i)
      continue
    }
    
    // VOCAB
    if (ANCHOR_PATTERNS.VOCAB.test(line)) {
      result.vocab = parseVocabBlock(lines, i)
      continue
    }
  }
  
  return result
}

/**
 * 將 Lite Spec 結果轉換為 ExplainVM 格式（用於相容現有組件）
 */
export function liteSpecToVM(lite: LiteSpecResult, kind: 'E1' | 'E2' | 'E3' | 'E4' | 'E5'): Partial<any> {
  return {
    stem: {
      en: lite.question.en,
      zh: lite.question.zh,
    },
    answer: lite.answer ? {
      label: lite.answer,
      text: lite.options.find(opt => opt.label === lite.answer)?.text || '',
    } : undefined,
    options: lite.options.map(opt => ({
      label: opt.label as 'A' | 'B' | 'C' | 'D',
      text: opt.text,
      reason: opt.reason,
      correct: opt.label === lite.answer,
    })),
    meta: {
      reasonLine: lite.why,
      grammarFocus: lite.focus,
      evidence: lite.evidence,
      traps: lite.traps,
    },
    vocab: lite.vocab.map(v => ({
      word: v.word,
      pos: v.pos,
      zh: v.zh,
    })),
  }
}



