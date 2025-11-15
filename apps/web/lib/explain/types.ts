/**
 * 統一型別定義檔
 * 
 * 所有 explain 相關的型別都從這裡匯出，避免交叉引用造成 TS 推斷錯亂
 */

/**
 * Explain 狀態類型
 */
export type ExplainStatus = 'full' | 'basic' | 'raw'

/**
 * 選項詳情（用於英文單字題）
 */
export interface OptionDetail {
  pos?: string // 詞性（part of speech）
  translation?: string // 中文翻譯
}

/**
 * 單題詳解項目
 */
export interface QuestionItem {
  question?: string // 單題題幹（不含選項標記），如果多題共用題幹則為空
  options: string[] // 原始選項列表，格式：["(A) ...", "(B) ...", ...]
  explanation: {
    answer: string // 答案，格式："B among others" 或 "(1) B — among others"
    reasoning: string // 理由（繁體中文）
    counterpoints?: Record<string, string> // 錯誤選項解析，格式：{A: "...", C: "...", D: "..."}，繁體中文
    optionDetails?: Record<string, OptionDetail> // 選項詳情（用於英文單字題），格式：{A: {pos: "noun", translation: "..."}, ...}
  }
  tips?: string // 解題技巧（可選，僅在有意義時顯示，繁體中文）
}

/**
 * 多題共用題幹的資料格式
 */
export interface SharedPassagePayload {
  sharedPassage: string // 共用題幹（完整文章，保留原始格式）
  questions: QuestionItem[] // 各題的選項和詳解（question 字段為空或省略）
  note?: string // 延伸補充（可選，統一在題組最後顯示）
}

/**
 * 獨立題目陣列格式
 */
export type IndependentListPayload = QuestionItem[]

/**
 * Type guard: 判斷是否為 SharedPassagePayload
 * 更嚴謹：避免誤判隨機 JSON
 */
export function isSharedPayload(
  x: unknown
): x is SharedPassagePayload {
  return (
    typeof x === 'object' &&
    x !== null &&
    ('sharedPassage' in x || 'passage' in x) &&
    'questions' in x &&
    Array.isArray((x as any).questions)
  )
}

/**
 * Type guard: 判斷是否為 IndependentListPayload
 * 更嚴謹：避免誤判一般聊天 JSON
 */
export function isIndependentList(
  x: unknown
): x is IndependentListPayload {
  if (!Array.isArray(x)) return false
  // 至少有一個元素包含 'options' 或 'prompt'，避免誤判
  return (
    x.length > 0 &&
    x.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        ('options' in item || 'prompt' in item) &&
        'explanation' in item
    )
  )
}

