import { nanoid } from 'nanoid'
import { chatCompletionJSON } from '@/lib/openai'
import type { ExplainCard, EnglishRoute, EnglishQuestionInput } from '@/lib/contracts/explain'
import type { OptionKey } from '@/lib/explain-normalizer'

/**
 * Generate ExplainCard based on English Type
 * Uses OpenAI API to fill template fields
 */
export async function generateTemplateCard(params: {
  route: EnglishRoute
  stem: string
  options: Array<{ key: string; text: string }>
  meta?: Record<string, any>
}): Promise<ExplainCard> {
  const { route, stem, options } = params
  
  // Prepare base card
  const baseCard: ExplainCard = {
    id: nanoid(),
    question: stem,
    kind: route.type === 'FALLBACK' ? 'FALLBACK' : route.type,
    translation: '',
    cues: [],
    options: [],
    steps: [],
    correct: undefined,
    vocab: [],
    nextActions: [
      { label: '換同型題', action: 'drill-similar' },
      { label: '加入錯題本', action: 'save-error' },
    ],
  }
  
  // Route to appropriate template generator
  switch (route.type) {
    case 'E1':
      return generateE1Template(baseCard, stem, options)
    case 'E2':
      return generateE2Template(baseCard, stem, options)
    case 'E3':
      return generateE3Template(baseCard, stem, options)
    case 'E4':
      return generateE4Template(baseCard, stem, options)
    case 'E5':
      return generateE5Template(baseCard, stem, options)
    case 'E6':
      return generateE6Template(baseCard, stem, options)
    case 'E7':
      return generateE7Template(baseCard, stem, options)
    case 'FALLBACK':
    default:
      return generateFallbackTemplate(baseCard, stem, options)
  }
}

/**
 * E1: Meaning & Usage (語意判斷型)
 * Required: translation, cues, options[*].zh, options[*].verdict, correct
 */
async function generateE1Template(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  const prompt = `你是英文題解專家。請針對以下語意判斷題提供結構化分析：

題目：${stem}
選項：
${options.map((o) => `(${o.key}) ${o.text}`).join('\n')}

請以 JSON 格式回答（僅輸出 JSON，不要其他文字）：
{
  "translation": "題幹中譯",
  "cues": ["解題線索1", "解題線索2", "解題線索3"],
  "options": [
    {"key": "A", "text": "access", "zh": "中譯", "verdict": "unfit", "reason": "簡短理由（≤30字）"},
    {"key": "B", "text": "supply", "zh": "中譯", "verdict": "unfit", "reason": "簡短理由（≤30字）"},
    {"key": "C", "text": "attack", "zh": "中譯", "verdict": "fit", "reason": "簡短理由（≤30字）"},
    {"key": "D", "text": "burden", "zh": "中譯", "verdict": "unfit", "reason": "簡短理由（≤30字）"}
  ],
  "correct": {"key": "C", "text": "attack", "reason": "為何正確"},
  "summary": "此題考察名詞語意判斷，核心概念是..."
}

注意：
- verdict 只能是 "fit" 或 "unfit"
- 必須為每個選項提供 zh（中文翻譯）和 reason（判斷理由，≤30字）
- correct.key 必須對應 verdict 為 "fit" 的選項
- summary 用自然語氣總結考點，不要提及「英文」或科目名稱`

  const parsed = await chatCompletionJSON<any>(
    [{ role: 'user', content: prompt }],
    {
      model: 'gpt-4o-mini',
      temperature: 0.3,
    }
  )

  console.log('[E1 Template] LLM response:', {
    hasTranslation: !!parsed.translation,
    cuesCount: parsed.cues?.length ?? 0,
    optionsCount: parsed.options?.length ?? 0,
    hasCorrect: !!parsed.correct,
    hasSummary: !!parsed.summary,
  })

  // Ensure all options have required fields
  const processedOptions = parsed.options?.map((opt: any) => {
    const originalOption = options.find(o => o.key === opt.key)
    return {
      key: opt.key,
      text: opt.text || originalOption?.text || '',
      zh: opt.zh || '未提供翻譯',
      verdict: opt.verdict === 'fit' ? 'fit' : 'unfit',
      reason: opt.reason || '分析中',
    }
  }) || options.map(o => ({
    key: o.key,
    text: o.text,
    zh: '未提供翻譯',
    verdict: 'unknown' as const,
    reason: '分析中',
  }))

  return {
    ...card,
    translation: parsed.translation || '翻譯生成中',
    cues: parsed.cues && parsed.cues.length > 0 ? parsed.cues : ['語意判斷', '名詞選擇'],
    options: processedOptions,
    correct: parsed.correct || {
      key: options[0]?.key || 'A',
      text: options[0]?.text || '',
      reason: '請參考選項分析',
    },
  }
}

/**
 * E2: Grammar & Syntax
 */
async function generateE2Template(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  // Similar structure to E1, but focused on grammar
  return {
    ...card,
    kind: 'E2',
    translation: stem,
    options: options.map(o => ({
      key: o.key,
      text: o.text,
      verdict: 'unknown' as const,
    })),
  }
}

/**
 * E3: Cloze
 */
async function generateE3Template(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  // Similar structure to E1, but focused on cloze
  return {
    ...card,
    kind: 'E3',
    translation: stem,
    options: options.map(o => ({
      key: o.key,
      text: o.text,
      verdict: 'unknown' as const,
    })),
  }
}

/**
 * E4: Reading Comprehension
 */
async function generateE4Template(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  // This is handled by reading-parser.ts and templates.ts separately
  // Return base card structure
  return {
    ...card,
    kind: 'E4',
    translation: stem,
    options: options.map(o => ({
      key: o.key,
      text: o.text,
      verdict: 'unknown' as const,
    })),
  }
}

/**
 * E5: Translation
 */
async function generateE5Template(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  const prompt = `你是對話情境專家。請針對以下對話題提供分析：

題目：${stem}
選項：
${options.map((o) => `(${o.key}) ${o.text}`).join('\n')}

請以 JSON 格式回答（僅輸出 JSON，不要其他文字）：
{
  "translation": "對話中譯",
  "cues": ["語氣/意圖", "情境脈絡"],
  "options": [
    {"key": "A", "verdict": "fit/unfit", "reason": "是否符合語境"},
    ...
  ],
  "correct": {"key": "C", "text": "原文", "reason": "最合適回應"}
}`

  const parsed = await chatCompletionJSON<any>(
    [{ role: 'user', content: prompt }],
    {
      model: 'gpt-4o-mini',
      temperature: 0.3,
    }
  )
  
  return {
    ...card,
    kind: 'E5',
    translation: parsed.translation || '',
    cues: parsed.cues || [],
    options: parsed.options?.map((opt: any) => ({
      key: opt.key,
      text: opt.text || options.find(o => o.key === opt.key)?.text || '',
      zh: opt.zh,
      verdict: opt.verdict || 'unknown',
      reason: opt.reason,
    })) || options.map(o => ({
      key: o.key,
      text: o.text,
      verdict: 'unknown' as const,
    })),
    correct: parsed.correct || undefined,
  }
}

/**
 * E6: Paragraph Organization (篇章結構)
 * 輸入：文章含編號空格 (1)(2)... + 選項為完整句子
 */
async function generateE6Template(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  // Use E6 parser to extract blanks and normalize
  const { parseE6Passage } = await import('./e6-parser')
  const parsed = parseE6Passage(stem)
  
  const blankCount = parsed.blanks.length
  const optionKeys = options.map(o => o.key).join(', ')

  // Optimized prompt - concise and focused on core requirements
  const prompt = `篇章結構題，${blankCount}個空格。請提供 JSON 陣列（僅輸出 JSON）：

文章：
${parsed.normalizedPassage.replace(/<mark[^>]*>____<\/mark>/g, '____')}

選項：
${options.map((o) => `(${o.key}) ${o.text}`).join('\n')}

格式：
[
  {"blankIndex": 1, "answer": "A", "answerZh": "翻譯", "connection": "空格前後邏輯（≥10字）", "reason": "理由（≤30字）", "evidence": "原文句"},
  {"blankIndex": 2, "answer": "B", "answerZh": "翻譯", "connection": "空格前後邏輯（≥10字）", "reason": "理由（≤30字）", "evidence": "原文句"}
]

要求：${blankCount}個物件；answer 為單一字母（${optionKeys}）；connection 和 reason 必填。Output JSON only:`

  const parsedResponse = await chatCompletionJSON<any>(
    [{ role: 'user', content: prompt }],
    {
      model: 'gpt-4o-mini',
      temperature: 0.2, // Lower temperature for reproducibility
      responseFormat: undefined,
    }
  )

  let answers: any[] = []
  if (Array.isArray(parsedResponse)) {
    answers = parsedResponse
  } else if (parsedResponse && typeof parsedResponse === 'object') {
    if (Array.isArray(parsedResponse.blanks)) {
      answers = parsedResponse.blanks
    } else if (Array.isArray(parsedResponse.questions)) {
      answers = parsedResponse.questions
    } else {
      answers = [parsedResponse]
    }
  }

  // Ensure we have answers for all blanks
  if (answers.length < blankCount) {
    console.warn(`[E6 Template] Expected ${blankCount} answers, got ${answers.length}. Filling missing blanks with fallbacks.`)
    // Create fallback answers for missing blanks
    for (let i = answers.length; i < blankCount; i++) {
      answers.push({
        blankIndex: i + 1,
        answer: '',
        answerZh: '',
        connection: '此題以語意場域＋主題句承接為主。',
        reason: '選項符合上下文邏輯。',
        evidence: '',
      })
    }
  }

  // Validate and fallback for missing fields
  const validatedAnswers = answers.map((a: any, idx: number) => {
    const blankIndex = a.blankIndex || idx + 1
    // Support A-J for options (E6 typically has 4-6, but E7 can have up to 10)
    const answer = String(a.answer || '').trim().match(/^([A-J])/i)?.[1]?.toUpperCase() || ''
    
    // Ensure connection is present and not empty
    let connection = String(a.connection || '').trim()
    if (!connection || connection.length < 10) {
      connection = '此題以語意場域＋主題句承接為主。'
      console.warn(`[E6 Template] Blank ${blankIndex} missing connection, using fallback`)
    }
    
    // Ensure reason is present
    let reason = String(a.reason || '').trim()
    if (!reason || reason.length === 0) {
      reason = '選項符合上下文邏輯。'
      console.warn(`[E6 Template] Blank ${blankIndex} missing reason, using fallback`)
    }
    
    // Ensure evidence is present (if available)
    const evidence = String(a.evidence || '').trim()
    
    return {
      blankIndex,
      answer,
      answerZh: String(a.answerZh || '').trim(),
      connection,
      reason,
      evidence: evidence || undefined,
      discourseTag: a.discourseTag || undefined,
    }
  })

  // Build options with Chinese translations
  const optionsWithZh = options.map((opt) => {
    const answerData = validatedAnswers.find((a: any) => a.answer === opt.key)
    return {
      key: opt.key,
      text: opt.text,
      zh: answerData?.answerZh || '',
      verdict: (answerData ? 'fit' : 'unknown') as 'fit' | 'unfit' | 'unknown',
      reason: answerData?.reason || '',
    }
  })

  // Build meta with questions (include anchor IDs for UI)
  const meta = {
    blanks: parsed.blanks,
    normalizedPassage: parsed.normalizedPassage,
    questions: validatedAnswers.map((a: any) => {
      const blank = parsed.blanks.find((b) => b.blankIndex === a.blankIndex) || parsed.blanks[0]
      return {
        id: `blank-${a.blankIndex}`,
        blankIndex: a.blankIndex,
        anchorId: blank?.anchorId || `blank-${a.blankIndex}`,
        answer: a.answer,
        answerZh: a.answerZh,
        connection: a.connection,
        reason: a.reason,
        reasoning: `${a.connection} ${a.reason}`,
        evidence: a.evidence,
        discourseTag: a.discourseTag,
        paragraphIndex: blank?.paragraphIndex || 0,
      }
    }),
    warnings: parsed.warnings,
  }

  return {
    ...card,
    kind: 'E6',
    translation: parsed.normalizedPassage, // Use normalized passage with anchor markers
    options: optionsWithZh,
    correct: validatedAnswers[0] ? {
      key: validatedAnswers[0].answer,
      text: options.find((o) => o.key === validatedAnswers[0].answer)?.text || '',
      reason: validatedAnswers[0].reason,
    } : undefined,
    meta,
  }
}

/**
 * E7: Contextual Completion (文意選填)
 * 輸入：文章含編號空格 + 選項為詞/片語
 */
async function generateE7Template(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  // Extract numbered blanks
  const blankMatches = stem.match(/\(\d+\)/g) ?? []
  const blankCount = blankMatches.length

  const prompt = `你是英文閱讀理解專家。請針對以下文意選填題提供詳解：

文章：
${stem}

選項：
${options.map((o) => `(${o.key}) ${o.text}`).join('\n')}

請為每個空格提供 JSON 格式回答（僅輸出 JSON，不要其他文字）：
[
  {
    "blankIndex": 1,
    "answer": "A",
    "reason": "空格前後語意＋搭配/語法規則＋同近義對比（合併一段，≤2行，≤30字）",
    "evidence": "引用原文詞組（若可定位）",
    "phrases": ["常見搭配1", "常見搭配2"] // 可選，1-3組
  }
]

關鍵要求：
1. answer 欄位必須是單一字母（A-J）
2. reason 必須合併空格前後語意、搭配/語法規則、同近義對比，≤30字
3. evidence 必須是原文詞組或片段（若可定位）
4. phrases 可選，列出常見搭配（1-3組，無則省略）

Output JSON only:`

  const parsed = await chatCompletionJSON<any>(
    [{ role: 'user', content: prompt }],
    {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      responseFormat: undefined,
    }
  )

  let answers: any[] = []
  if (Array.isArray(parsed)) {
    answers = parsed
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.blanks)) {
      answers = parsed.blanks
    } else if (Array.isArray(parsed.questions)) {
      answers = parsed.questions
    } else {
      answers = [parsed]
    }
  }

  // Build options with POS and Chinese (for vocabulary table)
  const optionsWithPosZh = options.map((opt) => {
    const answerData = answers.find((a: any) => a.answer === opt.key)
    return {
      key: opt.key,
      text: opt.text,
      zh: '', // Will be filled by LLM if needed
      pos: '', // Will be inferred from context
      verdict: (answerData ? 'fit' : 'unknown') as 'fit' | 'unfit' | 'unknown',
      reason: answerData?.reason || '',
    }
  })

  // Build meta with questions
  const meta = {
    questions: answers.map((a: any) => ({
      id: `blank-${a.blankIndex}`,
      answer: a.answer,
      reasoning: a.reason,
      reason: a.reason,
      evidence: a.evidence,
      phrases: a.phrases || [],
    })),
  }

  return {
    ...card,
    kind: 'E7',
    translation: stem, // Full article in translation field
    options: optionsWithPosZh,
    correct: answers[0] ? {
      key: answers[0].answer,
      text: options.find((o) => o.key === answers[0].answer)?.text || '',
      reason: answers[0].reason,
    } : undefined,
    meta,
  }
}

/**
 * FALLBACK: Minimal E1-style template
 */
async function generateFallbackTemplate(
  card: ExplainCard,
  stem: string,
  options: Array<{ key: string; text: string }>
): Promise<ExplainCard> {
  const prompt = `請為以下題目提供最基本的分析（JSON格式）：

題目：${stem}
選項：${options.map((o) => `(${o.key}) ${o.text}`).join(', ')}

格式（僅輸出 JSON，不要其他文字）：
{
  "translation": "中譯",
  "options": [{"key": "A", "verdict": "fit/unfit", "reason": "簡短"}, ...],
  "correct": {"key": "C", "text": "原文", "reason": "原因"}
}`

  const parsed = await chatCompletionJSON<any>(
    [{ role: 'user', content: prompt }],
    {
      model: 'gpt-4o-mini',
      temperature: 0.3,
    }
  )
  
  return {
    ...card,
    kind: 'FALLBACK',
    translation: parsed.translation || stem,
    options: parsed.options?.map((opt: any) => ({
      key: opt.key,
      text: opt.text || options.find(o => o.key === opt.key)?.text || '',
      verdict: opt.verdict || 'unknown',
      reason: opt.reason || '分析中',
    })) || options.map(o => ({
      key: o.key,
      text: o.text,
      verdict: 'unknown' as const,
      reason: '分析中',
    })),
    correct: parsed.correct || {
      key: options[0]?.key || 'A',
      text: options[0]?.text || '',
      reason: '請參考其他資料',
    },
  }
}
