import { buildExplainView } from '@/lib/explain-normalizer'
import type { ExplainCard } from '@/lib/contracts/explain'
import { parseReading, type ParsedReading, type ReadingQuestionBlock } from '@/lib/english/reading-parser'

type OptionLabel = 'A' | 'B' | 'C' | 'D'
const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const

// Lazy load dictionary to avoid blocking
let dictCache: Record<string, { pos?: string; zh?: string }> | null = null

// Normalize word to base form for dictionary lookup
function normalizeWord(word: string): string {
  const lower = word.toLowerCase().trim()
  // Remove common suffixes for better dictionary matching
  return lower.replace(/(ing|ed|s|es|ly|er|est)$/, '')
}

// Lookup word in dictionary
function lookupWord(word: string): { pos?: string; zh?: string } {
  // Return empty if dict not loaded yet
  if (!dictCache) {
    return {}
  }

  const normalized = normalizeWord(word)

  // Try exact match first
  if (dictCache[word.toLowerCase()]) {
    return dictCache[word.toLowerCase()]
  }

  // Try normalized form
  if (dictCache[normalized]) {
    return dictCache[normalized]
  }

  return {}
}

// Load dictionary asynchronously
if (typeof window !== 'undefined') {
  import('@/data/enDictLite.json')
    .then((module) => {
      dictCache = module.default as Record<string, { pos?: string; zh?: string }>
    })
    .catch(() => {
      // Fallback to empty dict if load fails
      dictCache = {}
    })
}

function toZeroBasedAnswer(input: number | string | null | undefined): number | null {
  if (input == null) return null
  if (typeof input === 'number' && Number.isFinite(input)) {
    const idx = Math.round(input) - 1
    return idx >= 0 ? idx : null
  }
  const normalized = String(input).trim()
  if (!normalized) return null
  if (/^\d+$/.test(normalized)) {
    const idx = parseInt(normalized, 10) - 1
    return idx >= 0 ? idx : null
  }
  const letterIndex = LETTERS.indexOf(normalized.toUpperCase() as typeof LETTERS[number])
  return letterIndex >= 0 ? letterIndex : null
}

export interface OptionVM {
  label: OptionLabel
  text: string
  pos?: string
  zh?: string
  reason?: string
  correct?: boolean
}

export interface ExplainBaseVM {
  id: string
  kind: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'GENERIC'
  order?: number
  stem: {
    en: string
    zh?: string
  }
  options?: OptionVM[]
  answer?: {
    label: string
    text: string
  }
  vocab?: VocabItemVM[]
}

export interface VocabularyVM extends ExplainBaseVM {
  kind: 'E1'
  meta?: {
    reasonLine?: string
  }
}

export interface GrammarVM extends ExplainBaseVM {
  kind: 'E2'
  meta: {
    ruleName?: string
    pattern?: string
    relatedRules?: string[]
    reasonLine?: string
    examples?: {
      correct?: string
      incorrect?: string
      correctHighlight?: string
      incorrectHighlight?: string
    }
  }
}

export interface ClozeVM extends ExplainBaseVM {
  kind: 'E3'
  article?: {
    en: string
    zh?: string
  }
  meta: {
    blankIndex: number
    totalBlanks: number
    discourseTag?: '因果' | '轉折' | '遞進' | '舉例' | '對比' | '定義' | '時間'
    sentenceSpan?: { start: number; end: number }
    snippet?: string
    reasonLine?: string
  }
}

export interface ParagraphOrganizationVM extends ExplainBaseVM {
  kind: 'E6'
  article?: {
    en: string
    zh?: string
  }
  blanks: Array<{
    blankIndex: number
    selectedAnswer: {
      label: string
      text: string
      zh?: string
    }
    explanation: {
      connection: string // 篇章銜接句
      reason: string // 理由＋依據（合併）
      evidence?: {
        text: string
        paragraphIndex: number
        sentenceIndex?: number
      }
      discourseTag?: '因果' | '轉折' | '遞進' | '舉例' | '對比' | '定義' | '時間'
    }
  }>
  meta?: {
    hasMultipleBlanks: boolean
  }
}

export interface ContextualCompletionVM extends ExplainBaseVM {
  kind: 'E7'
  article?: {
    en: string
    zh?: string
  }
  questions: Array<{
    qid: string
    blankIndex: number
    sentenceSpan?: { start: number; end: number }
    explanation: {
      reason: string // 理由＋依據（合併，≤2行）
      evidence?: {
        text: string
        paragraphIndex: number
        sentenceIndex?: number
      }
      phrases?: string[] // 常見搭配（1-3組）
    }
  }>
  translation?: {
    full: string // 標準譯文
    keywords: Array<{
      term: string
      zh: string
    }>
  }
  meta?: {
    totalQuestions: number
  }
}

export interface ReadingQuestionVM {
  qid: string
  stem: string
  options: string[]
  answerIndex?: number
  answerLetter?: OptionLabel
  answerText?: string
  reason: string
  evidence: Array<{
    paragraphIndex: number
    sentenceIndex?: number
    text: string
    zh?: string
  }>
  // Professional explanation fields
  reasoning?: string // Original AI reasoning
  reasoningSteps?: string[] // Adaptive reasoning steps (deprecated in favor of reasoningText)
  reasoningText?: string // Professional zh-TW reasoning (concise, type-specific)
  optionNotes?: OptionNote[] // Wrong choices only: (A)/(B)/(C) format
  evidenceOneLine?: string // Exactly ONE line of evidence
  counterpoints?: Record<string, string> // Option letter -> why wrong (legacy)
  distractors?: DistractorNote[] // Professional categorized analysis (no duplicate labels)
  vocab?: VocabItem[] // Focus vocabulary cards (academic terms only)
  correctNote?: string // Reinforcement for correct answer (main idea questions)
  // Inline explanation fields (new UI structure)
  inlineNotes?: InlineNote[] // Inline notes for ALL options (correct + wrong)
  overviewNotes?: Array<{ key: string; label: string; text: string }> // Overview for Details section
  headerLine?: string // 題型｜難度｜思考線索
  // Flags for UI display logic
  hasReasoning?: boolean
  hasCounterpoints?: boolean
  meta: {
    paragraphIndex: number
    sentenceIndex?: number
    errorTypeTag: string
    questionType?: 'detail' | 'inference' | 'vocab' | 'main' // Question type tag
    keywords: string[]
    strategy?: string // 解題策略提示
    commonMistake?: string
    summary?: string
    difficulty?: string // 難度標籤：簡單 | 中等 | 困難
  }
}

export interface ReadingVM extends ExplainBaseVM {
  kind: 'E4'
  passage: {
    paragraphs: string[]
  }
  questions: ReadingQuestionVM[]
  parserWarning?: string
  meta: {
    totalQuestions: number
    groupId?: string
  }
}

export interface GenericVM extends ExplainBaseVM {
  kind: 'GENERIC'
  meta?: {
    reasonLine?: string
  }
  article?: {
    en: string
    zh?: string
  }
  evidence?: Array<{ en: string; zh?: string }>
}

export interface TranslationVM extends ExplainBaseVM {
  kind: 'E5'
  meta?: {
    reasonLine?: string
    scores?: {
      grammar: number
      wordChoice: number
      fluency: number
      register: number
    }
    improvements?: Array<{
      dimension: string
      suggestion: string
    }>
    examples?: {
      literal?: string
      natural?: string
      incorrect?: string
    }
  }
}

export type ExplainVM = VocabularyVM | GrammarVM | ClozeVM | ReadingVM | TranslationVM | ParagraphOrganizationVM | ContextualCompletionVM | GenericVM

export interface VocabItemVM {
  word: string
  pos?: string
  zh?: string
  example?: string
}

const EMPTY_TOKENS = new Set(['', '-', '--', '—', '— —', '— — —', '無資料'])

const POS_ALIAS: Record<string, string> = {
  noun: 'n.',
  n: 'n.',
  'n.': 'n.',
  名詞: 'n.',
  verbs: 'v.',
  verb: 'v.',
  v: 'v.',
  'v.': 'v.',
  動詞: 'v.',
  adjective: 'adj.',
  adj: 'adj.',
  'adj.': 'adj.',
  形容詞: 'adj.',
  adverb: 'adv.',
  adv: 'adv.',
  'adv.': 'adv.',
  副詞: 'adv.',
  preposition: 'prep.',
  prep: 'prep.',
  'prep.': 'prep.',
  介系詞: 'prep.',
  conjunction: 'conj.',
  conj: 'conj.',
  'conj.': 'conj.',
  連接詞: 'conj.',
}

const READING_STOPWORDS = new Set([
  'the',
  'there',
  'this',
  'that',
  'those',
  'these',
  'and',
  'but',
  'for',
  'with',
  'from',
  'were',
  'have',
  'has',
  'been',
  'being',
  'into',
  'about',
  'after',
  'before',
  'their',
  'would',
  'could',
  'should',
  'because',
  'since',
  'than',
  'then',
  'when',
  'where',
  'what',
  'which',
  'while',
  'whose',
  'upon',
  'through',
  'among',
  'around',
  'between',
  'under',
  'over',
  'therefore',
  'is',
  'are',
  'was',
  'were',
  'be',
  'of',
  'in',
  'on',
  'at',
  'a',
  'an',
  'to',
  'by',
  'it',
  'its',
  'as',
  'or',
  'so',
  'his',
  'her',
  'him',
  'she',
  'he',
  'they',
  'them',
  'we',
  'you',
  'your',
  'reading',
  'passage',
  'article',
])

const DISCOURSE_KEYWORDS: Array<{ tag: ClozeVM['meta']['discourseTag']; patterns: RegExp[] }> = [
  { tag: '因果', patterns: [/\bbecause\b/i, /\bsince\b/i, /\btherefore\b/i, /\bthus\b/i, /\bso\b/i] },
  { tag: '轉折', patterns: [/\bhowever\b/i, /\bbut\b/i, /\byet\b/i, /\bnevertheless\b/i, /\bthough\b/i] },
  { tag: '遞進', patterns: [/\bmoreover\b/i, /\bfurthermore\b/i, /\bin addition\b/i, /\balso\b/i] },
  { tag: '舉例', patterns: [/\bfor example\b/i, /\bfor instance\b/i, /\bsuch as\b/i] },
  { tag: '對比', patterns: [/\bwhereas\b/i, /\bwhile\b/i, /\bon the other hand\b/i] },
  { tag: '定義', patterns: [/\bmeans\b/i, /\bdefined as\b/i, /\brefers to\b/i] },
  { tag: '時間', patterns: [/\bwhen\b/i, /\bafter\b/i, /\bbefore\b/i, /\bduring\b/i, /\buntil\b/i] },
]

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripNoise(value: string): string {
  return value
    .replace(/\(—+\)/g, ' ')
    .replace(/(?:—\s*){2,}/g, ' ')
    .replace(/語境[:：]\s*題幹[：「『“”"']?.*$/gi, ' ')
    .replace(/題幹[:：]/gi, ' ')
}

function sanitizeText(input?: string): string {
  if (!input) return ''
  const withoutFullWidthSpace = input.replace(/\u3000/g, ' ')
  const cleaned = normalizeWhitespace(stripNoise(withoutFullWidthSpace.replace(/\u00a0/g, ' ')))
  if (!cleaned) return ''
  if (EMPTY_TOKENS.has(cleaned)) return ''
  return cleaned
}

function sanitizeMultiline(input?: string): string {
  if (!input) return ''
  return input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => sanitizeText(line))
    .filter(Boolean)
    .join('\n')
}

function normalizePos(value?: string): string | undefined {
  const sanitized = sanitizeText(value)
  if (!sanitized) return undefined

  const segments = sanitized
    .split(/[\/,]/)
    .map((segment) => segment.trim())
    .filter(Boolean)

  if (!segments.length) return undefined

  const mapped = Array.from(
    new Set(
      segments.map((segment) => {
        const lower = segment.toLowerCase().replace(/\.$/, '')
        const mappedValue = POS_ALIAS[lower] ?? segment
        return /\.$/.test(mappedValue) ? mappedValue : `${mappedValue}.`
      })
    )
  )

  return mapped.join('/')
}

function summarizeReason(value?: string, maxLength = 30): string | undefined {
  const sanitized = sanitizeText(value)
  if (!sanitized) return undefined

  const punctuationIndex = sanitized.search(/[。！？?!]/)
  const sentence = punctuationIndex !== -1 ? sanitized.slice(0, punctuationIndex + 1) : sanitized

  if (sentence.length <= maxLength) {
    return sentence
  }

  return `${sentence.slice(0, maxLength).trimEnd()}…`
}

/**
 * 清理證據句：移除題號、題幹與多餘標記，只保留純句子
 */
function sanitizeEvidence(text: string): string {
  if (!text) return ''
  
  // 移除問題標記和題號
  let cleaned = text
    .replace(/（\s*）\s*\([0-9]+\)/g, '')
    .replace(/\([0-9]+\)|（[0-9]+）/g, '')
    .replace(/Q\d+[：:]\s*/gi, '')
    .replace(/問題\s*\d+[：:]\s*/gi, '')
    .replace(/Question\s*\d+[：:]\s*/gi, '')
  
  // 移除常見的問題前綴
  cleaned = cleaned.replace(/^(?:Why|What|How|When|Where|Which)[^.!?]*[?!]\s*/i, '')
  
  // 移除引號
  cleaned = cleaned.replace(/^["""]|["""]$/g, '')
  
  // 移除多餘空白
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

/**
 * 截斷理由：永遠一句話，≤30 字
 */
function truncateReason(text: string, maxLength = 30): string {
  if (!text) return ''

  // 移除多餘空白
  let cleaned = text.replace(/\s+/g, ' ').trim()

  // 如果超過最大長度，截斷並添加省略號
  if (cleaned.length > maxLength) {
    // 嘗試在句號、問號、驚嘆號處截斷
    const sentenceEnd = cleaned.slice(0, maxLength).match(/[.!?。！？]$/)
    if (sentenceEnd) {
      return cleaned.slice(0, maxLength).trim()
    }
    // 否則在空格處截斷
    const spaceIndex = cleaned.slice(0, maxLength).lastIndexOf(' ')
    if (spaceIndex > maxLength * 0.7) {
      return cleaned.slice(0, spaceIndex).trim() + '…'
    }
    return cleaned.slice(0, maxLength).trim() + '…'
  }

  return cleaned
}

/**
 * Gentle sanitize: Remove markdown fences, normalize whitespace, trim
 * Preserves Chinese characters, punctuation, and content
 */
function gentleSanitize(input: string): string {
  if (!input) return ''
  // Remove markdown code fences
  let cleaned = input.replace(/^```[a-z]*\n?|\n?```$/gi, '').trim()
  // Remove leading/trailing quotes
  cleaned = cleaned.replace(/^["""']|["""']$/g, '').trim()
  // Normalize whitespace (preserve single spaces)
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

/**
 * Extract enhanced explanation fields from AI response
 * Supports key name variations (case-insensitive, snake_case/camelCase)
 * Uses gentle sanitization with fallback to raw value
 */
function extractExplanation(aiAnswer: any): {
  answer?: string
  reasoning?: string
  counterpoints?: Record<string, string>
  commonMistake?: string
  evidence?: string
} {
  const result: {
    answer?: string
    reasoning?: string
    counterpoints?: Record<string, string>
    commonMistake?: string
    evidence?: string
  } = {}
  const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true'

  // Helper: Find key case-insensitively
  const findKey = (obj: any, ...names: string[]): string | undefined => {
    return Object.keys(obj || {}).find((k) =>
      names.some((name) => k.toLowerCase() === name.toLowerCase())
    )
  }

  // 1. Answer (key variants: answer/Answer/ANSWER)
  const answerKey = findKey(aiAnswer, 'answer')
  const answerValue = answerKey ? aiAnswer[answerKey] : aiAnswer.answer

  if (answerValue !== undefined && answerValue !== null) {
    const rawValue = String(answerValue).trim()
    if (rawValue.length > 0) {
      const gentleCleaned = gentleSanitize(rawValue)
      if (gentleCleaned.length > 0) {
        result.answer = gentleCleaned
      } else if (rawValue.length > 10) {
        result.answer = rawValue
      }
    }
  }

  // 2. Reasoning (key variants: reasoning/Reasoning/REASONING)
  const reasoningKey = findKey(aiAnswer, 'reasoning')
  const reasoningValue = reasoningKey ? aiAnswer[reasoningKey] : aiAnswer.reasoning

  if (reasoningValue !== undefined && reasoningValue !== null) {
    const rawValue = String(reasoningValue).trim()
    if (rawValue.length > 0) {
      const gentleCleaned = gentleSanitize(rawValue)
      if (gentleCleaned.length > 0) {
        result.reasoning = gentleCleaned
      } else if (rawValue.length > 10) {
        result.reasoning = rawValue
      }
    }
  }

  // 3. Counterpoints (key variants: counterpoints/counterPoints/COUNTERPOINTS)
  const counterpointsKey = findKey(aiAnswer, 'counterpoints', 'counterPoints')
  const counterpointsValue = counterpointsKey
    ? aiAnswer[counterpointsKey]
    : aiAnswer.counterpoints

  if (counterpointsValue && typeof counterpointsValue === 'object') {
    const cleaned: Record<string, string> = {}
    Object.entries(counterpointsValue).forEach(([key, value]) => {
      const cleanedKey = String(key).toUpperCase().trim()
      const rawValue = String(value || '').trim()

      // Validate key is A-D and value is not empty
      if (/^[A-D]$/.test(cleanedKey) && rawValue.length > 0) {
        const gentleCleaned = gentleSanitize(rawValue)
        if (gentleCleaned.length > 0) {
          cleaned[cleanedKey] = gentleCleaned
        } else if (rawValue.length > 5) {
          cleaned[cleanedKey] = rawValue
        }
      }
    })
    if (Object.keys(cleaned).length > 0) {
      result.counterpoints = cleaned
    }
  }

  // 4. Common Mistake (key variants: commonMistake/common_mistake/COMMON_MISTAKE)
  const commonMistakeKey = findKey(aiAnswer, 'commonMistake', 'common_mistake', 'commonmistake')
  const commonMistakeValue = commonMistakeKey
    ? aiAnswer[commonMistakeKey]
    : aiAnswer.commonMistake || aiAnswer.common_mistake

  if (commonMistakeValue !== undefined && commonMistakeValue !== null) {
    const rawValue = String(commonMistakeValue).trim()
    if (rawValue.length > 0) {
      const gentleCleaned = gentleSanitize(rawValue)
      if (gentleCleaned.length > 0) {
        result.commonMistake = gentleCleaned
      } else if (rawValue.length > 10) {
        result.commonMistake = rawValue
      }
    }
  }

  // 5. Evidence (key variants: evidence/Evidence/EVIDENCE)
  const evidenceKey = findKey(aiAnswer, 'evidence')
  const evidenceValue = evidenceKey ? aiAnswer[evidenceKey] : aiAnswer.evidence

  if (evidenceValue !== undefined && evidenceValue !== null) {
    const rawValue = String(evidenceValue).trim()
    if (rawValue.length > 0) {
      const gentleCleaned = gentleSanitize(rawValue)
      if (gentleCleaned.length > 0) {
        result.evidence = gentleCleaned
      } else if (rawValue.length > 10) {
        result.evidence = rawValue
      }
    }
  }

  // Boundary logging (dev-only)
  if (DEBUG) {
    console.log('[presenter.boundary] raw keys:', Object.keys(aiAnswer || {}))
    console.log('[presenter.boundary] answer:', result.answer ? result.answer.substring(0, 40) : 'missing')
    console.log('[presenter.boundary] reasoning:', result.reasoning ? result.reasoning.substring(0, 40) : 'missing')
    console.log('[presenter.boundary] counterpoints keys:', result.counterpoints ? Object.keys(result.counterpoints) : 'missing')
    console.log('[presenter.boundary] commonMistake:', result.commonMistake ? result.commonMistake.substring(0, 40) : 'missing')
    console.log('[presenter.boundary] evidence:', result.evidence ? result.evidence.substring(0, 60) : 'missing')
  }

  return result
}

function detectDiscourseTag(sentence?: string): ClozeVM['meta']['discourseTag'] | undefined {
  if (!sentence) return undefined
  for (const entry of DISCOURSE_KEYWORDS) {
    if (entry.patterns.some((pattern) => pattern.test(sentence))) {
      return entry.tag
    }
  }
  return undefined
}

function extractRules(detail?: string): string[] | undefined {
  const sanitized = sanitizeText(detail)
  if (!sanitized) return undefined

  const matches = sanitized.match(/[A-Za-z]+↔[A-Za-z]+/g)
  if (matches && matches.length) {
    return Array.from(new Set(matches))
  }

  return undefined
}

function resolveOrder(card: any): number | undefined {
  const candidates = [
    card?.order,
    card?.index,
    card?.meta?.order,
    card?.metadata?.order,
    card?.sequence,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate
    }
  }

  return undefined
}

function toOptionVM(options: any[]): OptionVM[] {
  return options.map((option) => ({
    label: option.key as OptionLabel,
    text: sanitizeText(option.word ?? option.text ?? '') || (option.word ?? option.text ?? ''),
    pos: normalizePos(option.pos),
    zh: sanitizeText(option.zh),
    reason: summarizeReason(option.reason),
    correct: option.correct,
  }))
}

function enrichVocab(items: Array<{ word: string; pos?: string; zh?: string; note?: string }> | undefined): VocabItemVM[] {
  if (!Array.isArray(items) || !items.length) return []
  const enriched = items
    .map((item) => {
      const word = sanitizeText(item.word) || '-'
      const dictEntry = lookupWord(word)

      return {
        word,
        pos: normalizePos(item.pos) ?? dictEntry.pos ?? '-',
        zh: sanitizeText(item.zh) || dictEntry.zh || '-',
        example: sanitizeText(item.note) || undefined,
      }
    })
    .filter((item) => item.word && item.word !== '-')
  return enriched
}

function extractSentenceSpan(text: string, markerRegex: RegExp) {
  const matches = [...text.matchAll(markerRegex)]
  if (!matches.length) return undefined

  const firstMatch = matches[0]
  const index = firstMatch.index ?? 0

  const sentences = text.split(/(?<=[.!?。！？])/)
  let cursor = 0

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    const length = sentence.length
    const start = cursor
    const end = cursor + length
    if (index >= start && index < end) {
      return {
        start,
        end,
        snippet: trimmed,
      }
    }
    cursor = end
  }

  // fallback: return vicinity around match
  const window = 80
  const snippet = text.slice(Math.max(0, index - window), Math.min(text.length, index + window))
  return {
    start: Math.max(0, index - 10),
    end: Math.min(text.length, index + (firstMatch[0]?.length ?? 0) + 10),
    snippet: normalizeWhitespace(snippet),
  }
}

function splitParagraphs(article?: string) {
  if (!article) return []
  return article
    .split(/\n{2,}/)
    .map((paragraph, index) => ({
      id: `p-${index + 1}`,
      en: sanitizeText(paragraph),
    }))
    .filter((paragraph) => paragraph.en.length > 0)
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2 && !READING_STOPWORDS.has(token))
    )
  )
}

function scoreSentence(questionTokens: string[], sentenceTokens: string[]): number {
  if (!sentenceTokens.length) return 0
  let score = 0
  const sentenceSet = new Set(sentenceTokens)
  questionTokens.forEach((token) => {
    if (sentenceSet.has(token)) {
      score += 2
    }
    if (token.length > 4 && Array.from(sentenceSet).some((word) => word.startsWith(token.slice(0, 4)))) {
      score += 1
    }
  })
  return score
}

function detectErrorTypeTag(text: string): '細節' | '推論' | '主旨' | '詞義' {
  const lower = text.toLowerCase()
  if (/(main idea|title|purpose|author|primarily|mainly)/.test(lower)) return '主旨'
  if (/(infer|imply|suggest|probably|likely|reason)/.test(lower)) return '推論'
  if (/(closest|meaning|word|phrase|refer)/.test(lower)) return '詞義'
  return '細節'
}

function extractKeywords(text: string, limit = 6): string[] {
  const tokens = tokenize(text).filter((token) => token.length > 3)
  return tokens.slice(0, limit)
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}…`
}

function selectEvidence(
  question: { stem: string; options: Array<{ text?: string } | string> },
  paragraphs: string[]
): { paragraphIndex: number; sentenceIndex?: number; sentence: string } {
  const optionTexts = question.options.map((option) =>
    typeof option === 'string' ? option : option.text ?? ''
  )
  const tokens = tokenize(`${question.stem} ${optionTexts.join(' ')}`)
  if (!paragraphs.length || !tokens.length) {
    return { paragraphIndex: 0, sentence: paragraphs[0] ?? '' }
  }

  let bestScore = -1
  let bestParagraphIndex = 0
  let bestSentenceIndex: number | undefined
  let bestSentence = ''

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const sentences = splitIntoSentences(paragraph)
    if (!sentences.length) {
      const fallbackScore = scoreSentence(tokens, tokenize(paragraph))
      if (fallbackScore > bestScore) {
        bestScore = fallbackScore
        bestParagraphIndex = paragraphIndex
        bestSentenceIndex = undefined
        bestSentence = paragraph
      }
      return
    }

    sentences.forEach((sentence, sentenceIndex) => {
      const sentenceTokens = tokenize(sentence)
      const score = scoreSentence(tokens, sentenceTokens)
      if (score > bestScore) {
        bestScore = score
        bestParagraphIndex = paragraphIndex
        bestSentenceIndex = sentenceIndex
        bestSentence = sentence
      }
    })
  })

  if (!bestSentence) {
    return { paragraphIndex: 0, sentence: paragraphs[0] ?? '' }
  }

  return {
    paragraphIndex: bestParagraphIndex,
    sentenceIndex: bestSentenceIndex,
    sentence: bestSentence,
  }
}

function fallbackParagraphsFrom(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function prepareVocabularyVM(card: ExplainCard, base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>): VocabularyVM {
  const reasonLine =
    summarizeReason(card.correct?.reason) ??
    summarizeReason(data.options.find((option) => option.correct)?.reason) ??
    undefined

  return {
    ...base,
    kind: 'E1',
    meta: reasonLine ? { reasonLine } : undefined,
  }
}

function prepareGrammarVM(card: ExplainCard, base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>): GrammarVM {
  const ruleName = sanitizeText(card.cues?.[0]) || sanitizeText(card.steps?.[0]?.title)
  const patternCandidate =
    card.steps?.find((step) => /骨架|pattern|結構/i.test(step.title ?? ''))?.detail ??
    card.steps?.[0]?.detail
  const pattern = sanitizeText(patternCandidate)

  const correctOption = data.options.find((option) => option.correct)
  const reasonLine =
    summarizeReason(card.correct?.reason) ??
    summarizeReason(correctOption?.reason) ??
    summarizeReason(card.steps?.find((step) => /理由|原因|why/i.test(step.title ?? ''))?.detail)

  const relatedRules =
    extractRules(card.steps?.map((step) => `${step.title} ${step.detail ?? ''}`).join(' ')) ??
    extractRules(card.cues?.join(' '))

  const examplesCandidate = card.steps?.find((step) => /例句|example/i.test(step.title ?? ''))?.detail
  let examples: GrammarVM['meta']['examples'] | undefined
  if (examplesCandidate) {
    const lines = examplesCandidate.split(/[;；]/).map((line) => line.trim())
    if (lines.length) {
      examples = {
        correct: lines.find((line) => /✓|正確|correct/i.test(line)),
        incorrect: lines.find((line) => /✗|錯誤|incorrect/i.test(line)),
      }
    }
  }

  return {
    ...base,
    kind: 'E2',
    options: base.options,
    answer: base.answer,
    meta: {
      ruleName,
      pattern,
      relatedRules,
      reasonLine,
      examples,
    },
  }
}

/**
 * Professional Reading Explanation Utilities
 * Minimal, category-based analysis with zh-TW reasoning
 */

// --- Token helpers (no external deps) ---
const splitTokens = (s: string) =>
  (s || '').toLowerCase().replace(/[^a-z0-9\s\-']/g, ' ')
    .split(/\s+/).filter(Boolean)

function jaccard(a: string, b: string): number {
  const A = new Set(splitTokens(a))
  const B = new Set(splitTokens(b))
  if (!A.size || !B.size) return 0
  let inter = 0
  A.forEach(t => { if (B.has(t)) inter++ })
  return inter / (A.size + B.size - inter)
}

/**
 * Extract exactly ONE line from evidence (no extra context)
 */
export function toOneLineEvidence(raw?: string): string {
  if (!raw) return ''
  const line = raw.split(/(?<=[.!?。！？])\s+/)[0] || raw
  return line.trim()
}

/**
 * Concept sets for main idea quality checking
 */
const SHIFT_KEYWORDS = ['nclb', 'essa', 'shift', 'transition', 'reform', 'from', 'to', 'replace', 'replacing', 'change']
const FOCUS_KEYWORDS = ['assessment', 'standardized', 'personalized', 'student-centered', 'test', 'evaluation']
const STOPWORDS = ['following', 'which', 'that', 'these', 'those', 'states', 'about', 'under', 'between']

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

/**
 * Professional zh-TW reasoning - MUST be specific to the actual question content
 * NO template/generic wording like "依上下文判斷"
 */
export function buildReasoningSpecific(qType?: string, ctx?: {
  passageCue?: string  // e.g., "from ... to ...", "whether to ..."
  topic?: string       // e.g., "教育評量的轉向"
  focus?: string       // e.g., "assessment / student-centered"
}): string {
  if (qType === 'main') {
    const topic = ctx?.topic || '主題轉變'
    const passageCue = ctx?.passageCue || '前者'
    const focus = ctx?.focus || '後者'
    return `本文核心在「${topic}」，由 ${passageCue} 過渡到 ${focus}；最佳標題需同時涵蓋轉變與焦點。`
  }

  if (qType === 'vocab') {
    const targetWord = ctx?.focus || '目標詞'
    const syntaxCue = ctx?.passageCue || 'whether to / choice'
    return `本題聚焦語境中之「${targetWord}」；其所處句式（如 ${syntaxCue}）指涉「抉擇」，故義為具體選擇或難題。`
  }

  if (qType === 'inference') {
    const cue = ctx?.passageCue || '該句'
    return `先鎖定含因果/對比訊號的句子，再由語境推得作者意圖；本題依據 ${cue} 得出結論。`
  }

  // detail - can be concise
  return '以證據句直對題意，選出語義一致的選項。'
}

/**
 * Legacy reasoning function - kept for backward compatibility
 */
export function reasoningZhTW(qType?: string): string {
  return buildReasoningSpecific(qType)
}

/**
 * Distractor analysis with professional category labels
 */
export type DistractorNote = {
  option: string
  label: string
  detail: string
  high: boolean
}

/**
 * Option analysis note format: (A)/(B)/(C) + categorized reasons
 */
export type OptionNote = {
  key: string // "(A)", "(B)", "(C)"
  label: string // Categorized label
  text: string // Concise reason (zh-TW)
  high?: boolean // High similarity flag
}

export function analyzeOptions(opts: {
  options: string[]
  answerIndex: number
  evidenceLine: string
  keywords?: string[]
  questionType?: string
  stem?: string
}): DistractorNote[] {
  const { options, answerIndex, evidenceLine, keywords = [], questionType, stem } = opts
  const kw = keywords.join(' ')
  const alpha = (i: number) => String.fromCharCode(65 + i)

  return options.map((text, i) => {
    if (i === answerIndex) return null as any

    const sim = Math.max(jaccard(text, evidenceLine), jaccard(text, kw))
    const isHigh = sim >= 0.40

    // Professional label taxonomy with question-type awareness
    let label = '語意不符'
    let detail = '與文本核心不一致或未對應證據。'

    // Main idea specific rules
    if (questionType === 'main') {
      const hasShift = containsAny(text, SHIFT_KEYWORDS)
      const hasFocus = containsAny(text, FOCUS_KEYWORDS)
      const hasComputer = /\bcomputer(-based)?\b/i.test(text)
      const hasScope = /\b(only|mainly|four|components?|parts?)\b/i.test(text)

      if (hasFocus && !hasShift) {
        label = '高誘答（對比缺失）'
        detail = '僅提評量取向，未呈現從 NCLB 到 ESSA 的制度轉變。'
        return { option: alpha(i), label, detail, high: true }
      }
      if (hasComputer) {
        label = '焦點錯置'
        detail = '聚焦於電腦／工具，偏離文本主軸（制度轉變與評量改革）。'
        return { option: alpha(i), label, detail, high: false }
      }
      if (hasScope) {
        label = '範圍錯置'
        detail = '範圍過窄或過廣（如僅列構成），無法概括全文主旨。'
        return { option: alpha(i), label, detail, high: false }
      }
    }

    // General categorization for other question types
    const hasShiftPattern = /\bfrom\b.*\bto\b/i.test(text)
    const hasCausal = /\b(because|cause|lead|result)\b/i.test(text)
    const hasScope = /\b(all|every|only|mainly|primarily)\b/i.test(text)
    const hasNegation = /\b(no|not|never|without|lack)\b/i.test(text)

    if (hasScope) {
      label = '範圍錯置'
      detail = '範圍過窄或過廣，未準確覆蓋文本焦點。'
    } else if (hasCausal) {
      label = '因果混淆'
      detail = '因果方向或關聯與原文不一致。'
    } else if (hasShiftPattern) {
      label = '焦點錯置'
      detail = '忽略文本的轉變/對比重點。'
    } else if (hasNegation) {
      label = '語意反轉'
      detail = '帶有否定語氣，與原文方向相反。'
    }

    if (isHigh && label === '語意不符') {
      detail = '與題幹/關鍵詞高度相似，但語意焦點與證據句不匹配。請注意因果方向與主題差異。'
    }

    return { option: alpha(i), label, detail, high: isHigh }
  }).filter(Boolean) as DistractorNote[]
}

/**
 * Vocabulary card item for focused academic terms
 */
export type VocabItem = {
  headword: string
  pos?: string
  ipa?: string
  zh?: string
  hasExamples?: boolean
  examples?: string[]
}

/**
 * Extract focus vocabulary from keywords (academic terms only, filter stopwords)
 */
export function extractFocusVocab(keywords: string[] = []): VocabItem[] {
  const ACADEMIC_WHITELIST = ['standardized', 'personalized', 'assessment', 'student-centered', 'accountability', 'curriculum', 'evaluation', 'transition']

  const filtered = (keywords || [])
    .filter(k => k && k.length >= 6)
    .filter(k => !STOPWORDS.includes(k.toLowerCase()))
    .filter(k => {
      // Prefer whitelist terms
      const lower = k.toLowerCase()
      return ACADEMIC_WHITELIST.some(w => lower.includes(w)) || /^[a-z]+ed$|^[a-z]+tion$|^[a-z]+ment$/.test(lower)
    })

  return filtered.slice(0, 3).map(w => ({ headword: w }))
}

/**
 * Inline note type for option-level explanations
 * Shows under each option when clicked/selected
 */
export type InlineNote = {
  key: string           // "(A)", "(B)", "(C)", "(D)"
  kind: 'correct' | 'wrong'
  label?: string        // Category label for wrong options
  text: string          // Concise explanation (max 90 chars for wrong, 160 for correct)
  trapRank?: number     // 1 = low, 2 = high trap (誘答力高)
  trapNote?: string     // Short note for high-trap options (max 60 chars)
}

/**
 * Categorize wrong option with professional labels
 * Fixed 5 categories: 焦點錯置 / 範圍錯置 / 對比缺失 / 語意反轉 / 語意不符
 */
function categorizeWrongOption(optionText: string, evidenceLine: string, keywords: string[]): { label: string; text: string } {
  const t = optionText.toLowerCase()

  // 語意反轉: negation keywords
  if (/\b(not|never|without|lack)\b/.test(t)) {
    return { label: '語意反轉', text: '含否定或相反語氣，與原文方向相反。' }
  }

  // 範圍錯置: scope keywords
  if (/\b(only|mainly|just|four|components?|parts?)\b/.test(t)) {
    return { label: '範圍錯置', text: '範圍過窄或過廣，無法概括題意。' }
  }

  // 對比缺失: has focus but lacks shift/contrast
  const hasContrast = /\bfrom\b.*\bto\b/.test(t)
  const hasFocusTerm = /student-centered|assessment|computer/.test(t)
  if (hasFocusTerm && !hasContrast) {
    return { label: '對比缺失', text: '僅取單一面向，缺少文本中的轉變或對比。' }
  }

  // 焦點錯置: tool/computer focus without main shift
  if (/\bcomputer(-based)?\b/.test(t) && !hasContrast) {
    return { label: '焦點錯置', text: '聚焦工具層面，偏離文本核心。' }
  }

  // Default: 語意不符
  return { label: '語意不符', text: '未精準對應原文重點。' }
}

/**
 * Build inline notes for ALL options (correct + wrong)
 * Correct: "正解依據：..." (references evidence)
 * Wrong: category label + concise reason
 * High-trap options (trapRank === 2) get a trapNote for inline display
 */
export function buildInlineNotes(opts: {
  options: string[]
  answerIndex: number
  evidenceLine: string
  keywords?: string[]
}): InlineNote[] {
  const { options, answerIndex, evidenceLine, keywords = [] } = opts
  const kwJoin = keywords.slice(0, 3).join('、') || '關鍵概念'

  return options.map((opt, i) => {
    const key = '(' + String.fromCharCode(65 + i) + ')'

    if (i === answerIndex) {
      // Correct option: reference evidence with key concepts
      return {
        key,
        kind: 'correct',
        text: `正解依據：證據句點出 ${kwJoin}，與此選項一致。`
      }
    }

    // Wrong option: categorize + explain
    const { label, text } = categorizeWrongOption(opt, evidenceLine, keywords)
    
    // Calculate similarity to determine trap rank
    const t = opt.toLowerCase()
    const evidenceLower = evidenceLine.toLowerCase()
    const kwLower = keywords.join(' ').toLowerCase()
    
    // Jaccard similarity (reuse existing logic)
    const sim = Math.max(
      jaccard(t, evidenceLower),
      jaccard(t, kwLower)
    )
    
    // trapRank: 2 = high (≥0.4), 1 = low (<0.4)
    const trapRank = sim >= 0.4 ? 2 : 1
    
    // Generate trap note for high-trap options (concise, student-friendly)
    let trapNote: string | undefined
    if (trapRank === 2) {
      // Extract key issue from categorization (concise, student-friendly)
      if (label === '對比缺失') {
        trapNote = '僅涵蓋法案名稱對比，未涉及文中「抉擇」焦點。'
      } else if (label === '範圍錯置') {
        // Try to be more specific based on option content
        const hasEndContent = /文末|end|later|finally/i.test(opt)
        trapNote = hasEndContent 
          ? '與文末「評量理念」相關，但段落二未談及。'
          : '範圍過窄或過廣，無法概括題意。'
      } else if (label === '焦點錯置') {
        trapNote = '聚焦工具層面，忽略文本核心轉變。'
      } else if (label === '語意反轉') {
        trapNote = '帶有否定語氣，與原文方向相反。'
      } else {
        // Generic high-trap note (avoid vague terms)
        trapNote = '與題幹關鍵詞相似，但語意焦點不匹配。'
      }
    }
    
    return { key, kind: 'wrong', label, text, trapRank, trapNote }
  })
}

/**
 * Build overview notes for "Details" section (wrong choices only)
 */
export function buildOverviewNotes(inlineNotes: InlineNote[]): Array<{ key: string; label: string; text: string }> {
  return inlineNotes
    .filter(n => n.kind === 'wrong')
    .map(n => ({ key: n.key, label: n.label || '語意不符', text: n.text }))
}

/**
 * Build option notes for wrong choices: (A)/(B)/(C) + categorized reasons
 */
export function buildOptionNotes(opts: {
  options: string[]
  answerIndex: number
  evidenceLine: string
  keywords?: string[]
}): OptionNote[] {
  const { options, answerIndex, evidenceLine, keywords = [] } = opts
  const kwJoin = keywords.join(' ')
  const abc = (i: number) => '(' + String.fromCharCode(65 + i) + ')'

  return options
    .map((opt, i) => {
      if (i === answerIndex) return null as any

      const t = (opt || '').toLowerCase()
      const sim = Math.max(jaccard(t, evidenceLine.toLowerCase()), jaccard(t, kwJoin.toLowerCase()))
      const isHigh = sim >= 0.4

      const neg = /\b(no|not|never|without|lack)\b/.test(t)
      const scope = /\b(only|mainly|just|four|components?)\b/.test(t)
      const contrast = /\bfrom\b.*\bto\b/.test(t)
      const computer = /\bcomputer(-based)?\b/.test(t)
      const studentCentered = /student-centered/.test(t) && !contrast

      let label = '語意不符'
      let text = '未精準對應原文重點。'

      if (neg) {
        label = '語意反轉'
        text = '帶有否定語氣，與原文方向相反。'
      } else if (scope) {
        label = '範圍錯置'
        text = '範圍過窄或過廣，無法概括題意。'
      } else if (computer && !contrast) {
        label = '焦點錯置'
        text = '聚焦工具層面，偏離文本核心。'
      } else if (studentCentered) {
        label = '對比缺失'
        text = '僅提取其一面向，忽略文本中的轉變或對比。'
      }

      if (isHigh) text += '（與題幹或關鍵詞高度相似，易誤選）'

      return { key: abc(i), label, text, high: isHigh }
    })
    .filter(Boolean) as OptionNote[]
}

/**
 * Extract vocabulary - pick academic/focus terms; drop function words
 */
const FUNCTION_WORDS = new Set(['which', 'that', 'those', 'these', 'following', 'states', 'therefore', 'however', 'while', 'after'])

export function extractVocab(keywords: string[] = []): VocabItem[] {
  const filtered = (keywords || [])
    .filter(w => w && w.length >= 6 && !FUNCTION_WORDS.has(w.toLowerCase()))
    .slice(0, 3)

  return filtered.map(w => ({ headword: w }))
}

/**
 * Generate correct answer reinforcement note for main idea questions
 */
export function generateCorrectNote(opts: {
  questionType?: string
  answerText?: string
  evidence?: string
  stem?: string
}): string {
  const { questionType, answerText = '', evidence = '', stem = '' } = opts

  if (questionType === 'main') {
    const hasShift = containsAny(answerText, SHIFT_KEYWORDS)
    const hasFocus = containsAny(answerText, FOCUS_KEYWORDS)

    if (hasShift && hasFocus) {
      return '此選項同時涵蓋制度轉變（NCLB → ESSA）與評量焦點（assessment）。'
    }
  }

  return ''
}

/**
 * Detect question type from stem text
 */
function detectQuestionType(stem: string, errorTag: string): 'detail' | 'inference' | 'vocab' | 'main' {
  const lower = stem.toLowerCase()

  // Vocabulary questions
  if (/(closest|meaning|word|phrase|refer|definition)/i.test(lower)) {
    return 'vocab'
  }

  // Main idea / purpose questions
  if (/(main idea|title|purpose|author|primarily|mainly|best describes|passage is about)/i.test(lower)) {
    return 'main'
  }

  // Inference questions
  if (/(infer|imply|suggest|probably|likely|reason|conclude|assume|indicate)/i.test(lower)) {
    return 'inference'
  }

  // Detail questions (default)
  return 'detail'
}

/**
 * Extract concise reason - remove redundant phrases, focus on core logic
 */
function extractConciseReason(raw: string): string {
  if (!raw) return ''

  // Remove common redundant patterns
  let cleaned = raw
    .replace(/Step\s*\d+[:：]?\s*/gi, '')
    .replace(/^\s*[-–•]\s*/gm, '')
    .replace(/首先|其次|最後|然後/g, '')
    .replace(/根據.*?[，,]\s*/g, '')
    .trim()

  // Take first meaningful sentence
  const sentences = cleaned.split(/[.!?。！？]/).filter(Boolean)
  if (sentences.length === 0) return cleaned

  const firstSentence = sentences[0].trim()

  // If too long, truncate intelligently
  if (firstSentence.length > 100) {
    const commaIndex = firstSentence.indexOf('，')
    if (commaIndex > 30 && commaIndex < 80) {
      return firstSentence.substring(0, commaIndex + 1).trim()
    }
    return firstSentence.substring(0, 80).trim() + '…'
  }

  return firstSentence || cleaned
}

/**
 * Extract reasoning chain for inference questions (usually 2 steps)
 */
function extractReasonChain(raw: string): string[] {
  if (!raw) return []

  // Clean and split into sentences
  const cleaned = raw
    .replace(/Step\s*\d+[:：]?\s*/gi, '')
    .replace(/^\s*[-–•]\s*/gm, '')
    .trim()

  const sentences = cleaned
    .split(/[.!?。！？]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 2)

  if (sentences.length === 0) return []
  if (sentences.length === 1) return [sentences[0]]

  // Add emoji prefixes for visual clarity
  return [
    '1️⃣ ' + sentences[0],
    '✅ ' + sentences[1]
  ]
}

/**
 * Explain word in context for vocabulary questions
 */
function explainWordContext(raw: string, stem: string): string {
  if (!raw) return '根據上下文判斷詞義。'

  const cleaned = extractConciseReason(raw)

  // If already contextual, return as-is
  if (/上下文|語境|context/i.test(cleaned)) {
    return cleaned
  }

  // Otherwise prefix with context hint
  return '依上下文，' + cleaned
}

/**
 * Summarize main idea reasoning
 */
function summarizeMainIdea(raw: string): string {
  if (!raw) return '全文主要討論此主題。'

  const cleaned = extractConciseReason(raw)

  // If already about main idea, return as-is
  if (/主旨|主要|全文|passage|mainly/i.test(cleaned)) {
    return cleaned
  }

  // Otherwise add main idea context
  return '本文主要：' + cleaned
}

/**
 * 🎯 Get adaptive reasoning steps based on question type
 */
function getReasoningSteps(
  reasoning: string | undefined,
  questionType: 'detail' | 'inference' | 'vocabulary' | 'main',
  stem: string
): string[] {
  // If no reasoning provided, return fallback
  if (!reasoning || reasoning.trim().length === 0) {
    const fallbacks: Record<typeof questionType, string> = {
      detail: '此題屬於細節理解，答案依據證據句判定。',
      inference: '依文中線索推論得出答案。',
      vocabulary: '依上下文判斷詞義。',
      main: '綜合全文理解主旨。'
    }
    return [fallbacks[questionType]]
  }

  // Apply type-specific processing
  switch (questionType) {
    case 'detail':
      // Single concise sentence for detail questions
      return [extractConciseReason(reasoning)]

    case 'inference':
      // Two-step logical chain for inference
      const chain = extractReasonChain(reasoning)
      return chain.length > 0 ? chain : [extractConciseReason(reasoning)]

    case 'vocabulary':
      // Context-aware explanation for vocabulary
      return [explainWordContext(reasoning, stem)]

    case 'main':
      // Main idea summary
      return [summarizeMainIdea(reasoning)]

    default:
      return [extractConciseReason(reasoning)]
  }
}

function prepareClozeVM(card: ExplainCard, base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>): ClozeVM {
  const article = sanitizeMultiline(card.question)
  const zhArticle = sanitizeMultiline(card.translation)
  const blankMatches = card.question.match(/\((\d+)\)/)
  const blankIndex = blankMatches ? Number(blankMatches[1]) : 1
  const totalBlanks = card.question.match(/\(\d+\)/g)?.length ?? 1

  const span = extractSentenceSpan(card.question, /\(\d+\)|____+/)
  const discourseTag = detectDiscourseTag(span?.snippet)

  const correctOption = data.options.find((option) => option.correct)
  const reasonLine =
    summarizeReason(card.correct?.reason) ??
    summarizeReason(correctOption?.reason) ??
    summarizeReason(card.cues?.join(' '))

  return {
    ...base,
    kind: 'E3',
    article: article
      ? {
          en: article,
          zh: zhArticle || undefined,
        }
      : undefined,
    meta: {
      blankIndex,
      totalBlanks,
      discourseTag,
      sentenceSpan: span ? { start: span.start, end: span.end } : undefined,
      snippet: span?.snippet,
      reasonLine,
    },
  }
}

function prepareReadingVM(card: ExplainCard, base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>): ReadingVM {
  const parsed = parseReading(card.question ?? '')

  const meta = card.meta as any
  const passageText =
    sanitizeMultiline(meta?.article) ||
    parsed.passage ||
    sanitizeMultiline(card.translation) ||
    sanitizeMultiline(card.question ?? '') ||
    base.stem.en ||
    ''

  const paragraphs =
    passageText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean).length > 0
      ? passageText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      : passageText.split(/\n+/).map((p) => p.trim()).filter(Boolean)

  const aiQuestions = Array.isArray(meta?.questions) ? meta.questions : []
  const groupId = parsed.groupId || meta?.groupId || ''

  // Debug: Log meta.questions structure
  const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true'
  if (DEBUG) {
    console.log('[prepareReadingVM] card.meta:', {
      exists: !!meta,
      keys: meta ? Object.keys(meta) : [],
      hasQuestions: !!meta?.questions,
      questionsType: typeof meta?.questions,
      questionsIsArray: Array.isArray(meta?.questions),
    })
    console.log('[prepareReadingVM] meta.questions:', {
      isArray: Array.isArray(meta?.questions),
      length: aiQuestions.length,
      sample: aiQuestions[0] ? {
        id: aiQuestions[0].id,
        keys: Object.keys(aiQuestions[0]),
        reasoning: aiQuestions[0].reasoning ? String(aiQuestions[0].reasoning).substring(0, 40) : 'missing',
        counterpoints: aiQuestions[0].counterpoints ? Object.keys(aiQuestions[0].counterpoints) : 'missing',
      } : null,
    })
  }

  const questionBlocks =
    parsed.questions.length > 0
      ? parsed.questions
      : [
          {
            id: 1,
            qid: 'Q1',
            stem: base.stem.en || sanitizeText(card.question ?? ''),
            options:
              data.options.map((option) => ({
                key: option.key,
                text: option.word || option.zh || '',
              })) ?? [],
            answer: data.answerKey,
            evidence: '',
            reason: '',
            groupId,
            raw: card.question ?? '',
          },
        ]

  const readingQuestions: ReadingQuestionVM[] = questionBlocks.map((block, blockIndex) => {
    // 從 AI 答案中獲取對應的數據
    // 嘗試多種 ID 匹配策略
    const aiAnswer = 
      aiQuestions.find((aq: any) => aq.id === block.id) ||
      aiQuestions.find((aq: any) => aq.id === blockIndex + 1) ||
      aiQuestions.find((aq: any) => Number(aq.id) === block.id) ||
      aiQuestions.find((aq: any) => Number(aq.id) === blockIndex + 1) ||
      aiQuestions[blockIndex] ||
      {}
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ReadingExplain] Processing Q${blockIndex + 1}:`, {
        blockId: block.id,
        blockIndex: blockIndex + 1,
        aiQuestionsLength: aiQuestions.length,
        aiQuestionsIds: aiQuestions.map((aq: any) => aq.id),
        aiAnswerKeys: Object.keys(aiAnswer),
        hasReasoning: !!aiAnswer.reasoning,
        reasoningRaw: aiAnswer.reasoning,
        reasoningPreview: aiAnswer.reasoning ? String(aiAnswer.reasoning).substring(0, 80) + '...' : 'missing',
        hasCounterpoints: !!aiAnswer.counterpoints,
        counterpointsRaw: aiAnswer.counterpoints,
        counterpointsKeys: aiAnswer.counterpoints ? Object.keys(aiAnswer.counterpoints) : [],
        counterpointsValues: aiAnswer.counterpoints ? Object.values(aiAnswer.counterpoints).map((v: any) => String(v).substring(0, 40)) : [],
        hasCommonMistake: !!aiAnswer.common_mistake,
        commonMistakeRaw: aiAnswer.common_mistake,
      })
    }
    
    const derivedOptions =
      block.options && block.options.length > 0
        ? block.options
        : data.options.map((option) => ({ key: option.key, text: option.word }))

    const options = derivedOptions.map((option) => sanitizeText(option.text) || option.text || '')

    // 優先使用 AI 答案，否則使用 parser 解析的答案
    // CRITICAL FIX: Extract answer letter correctly from various formats
    let answerCandidate = ''
    
    if (aiAnswer.answer) {
      // Extract letter from formats like "C", "C — Option Text", "C - Option Text"
      const answerMatch = String(aiAnswer.answer).match(/^([A-D])/i)
      if (answerMatch) {
        answerCandidate = answerMatch[1].toUpperCase()
      }
    }
    
    // Fallback to parser answer
    if (!answerCandidate && block.answer) {
      const parserMatch = String(block.answer).match(/^([A-D])/i)
      if (parserMatch) {
        answerCandidate = parserMatch[1].toUpperCase()
      }
    }
    
    // Last fallback to data.answerKey
    if (!answerCandidate && data.answerKey) {
      const keyMatch = String(data.answerKey).match(/^([A-D])/i)
      if (keyMatch) {
        answerCandidate = keyMatch[1].toUpperCase()
      }
    }

    const answerIndex = toZeroBasedAnswer(answerCandidate)
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[ReadingExplain] Q${blockIndex + 1} answer extraction:`, {
        aiAnswerRaw: aiAnswer.answer,
        blockAnswer: block.answer,
        dataAnswerKey: data.answerKey,
        extractedCandidate: answerCandidate,
        answerIndex,
        answerLetter: answerIndex != null ? LETTERS[answerIndex] : undefined,
      })
    }
    const answerLetter =
      answerIndex != null && answerIndex >= 0 && answerIndex < 4
        ? (LETTERS[answerIndex] as OptionLabel)
        : undefined
    const answerText = answerIndex != null && answerIndex >= 0 && answerIndex < options.length ? options[answerIndex] : undefined

    // 使用 AI 生成的 evidence，或 fallback
    const evidenceText = sanitizeMultiline(aiAnswer.evidence || block.evidence || '')
    const sanitizedEvidence = sanitizeEvidence(evidenceText)
    const evidenceSelection = sanitizedEvidence
      ? selectEvidenceFromText(sanitizedEvidence, paragraphs)
      : selectEvidence({ ...block, options }, paragraphs)
    
    // 提取 error_tag（優先使用 AI 返回的，否則從題幹推斷）
    // Key compatibility: error_tag/errorTag/ERROR_TAG
    const errorTagKey = Object.keys(aiAnswer || {}).find(
      (k) => k.toLowerCase() === 'error_tag' || k.toLowerCase() === 'errortag'
    )
    const errorTagRaw = errorTagKey
      ? aiAnswer[errorTagKey]
      : aiAnswer.error_tag || detectErrorTypeTag(block.stem)
    const errorTag = errorTagRaw ? sanitizeText(errorTagRaw) : '細節理解'
    const providedReason = sanitizeText(aiAnswer.reason) || sanitizeText(block.reason) || ''
    const truncatedReason = truncateReason(providedReason, 30)
    const fallbackReason = '此題屬於〈細節理解〉，答案依據證據句判定。'

    // Extract enhanced explanation fields FIRST (before other processing)
    const explanation = extractExplanation(aiAnswer)

    // 提取教學邏輯欄位（鍵名兼容）
    // Key compatibility: strategy/Strategy/STRATEGY
    const strategyKey = Object.keys(aiAnswer || {}).find(
      (k) => k.toLowerCase() === 'strategy'
    )
    const aiStrategy = strategyKey
      ? gentleSanitize(String(aiAnswer[strategyKey] || ''))
      : gentleSanitize(String(aiAnswer.strategy || ''))

    // Key compatibility: summary/Summary/SUMMARY
    const summaryKey = Object.keys(aiAnswer || {}).find(
      (k) => k.toLowerCase() === 'summary'
    )
    const summary = summaryKey
      ? gentleSanitize(String(aiAnswer[summaryKey] || ''))
      : gentleSanitize(String(aiAnswer.summary || ''))

    const evidenceEntries: ReadingQuestionVM['evidence'] = []
    if (evidenceSelection.sentence) {
      const cleanedEvidence = sanitizeEvidence(evidenceSelection.sentence)
      if (cleanedEvidence) {
        // Key compatibility: evidence_zh/evidenceZh/EVIDENCE_ZH
        const evidenceZhKey = Object.keys(aiAnswer || {}).find(
          (k) => k.toLowerCase() === 'evidence_zh' || k.toLowerCase() === 'evidencezh'
        )
        const evidenceZhValue = evidenceZhKey
          ? aiAnswer[evidenceZhKey]
          : aiAnswer.evidence_zh || aiAnswer.evidenceZh
        const evidenceZh = evidenceZhValue ? gentleSanitize(String(evidenceZhValue)) : undefined

        evidenceEntries.push({
          paragraphIndex: evidenceSelection.paragraphIndex,
          sentenceIndex: evidenceSelection.sentenceIndex,
          text: cleanedEvidence,
          zh: evidenceZh || undefined,
        })
      }
    }

    // 如果沒有 evidence，至少添加一個 fallback
    if (!evidenceEntries.length && paragraphs.length > 0) {
      const fallbackSentence = sanitizeEvidence(paragraphs[0] || '')
      if (fallbackSentence) {
        const evidenceZhKey = Object.keys(aiAnswer || {}).find(
          (k) => k.toLowerCase() === 'evidence_zh' || k.toLowerCase() === 'evidencezh'
        )
        const evidenceZhValue = evidenceZhKey
          ? aiAnswer[evidenceZhKey]
          : aiAnswer.evidence_zh || aiAnswer.evidenceZh
        const evidenceZh = evidenceZhValue ? gentleSanitize(String(evidenceZhValue)) : undefined

        evidenceEntries.push({
          paragraphIndex: 0,
          sentenceIndex: undefined,
          text: fallbackSentence,
          zh: evidenceZh || undefined,
        })
      }
    }

    const primaryEvidence = evidenceEntries[0]

    // Presenter Boundary: Log after extraction/mapping
    const hasReasoning = !!explanation.reasoning && explanation.reasoning.length > 0
    let finalCounterpoints = explanation.counterpoints

    // Remove correct answer from counterpoints if present
    if (finalCounterpoints && answerLetter) {
      const corrected: Record<string, string> = {}
      Object.entries(finalCounterpoints).forEach(([key, value]) => {
        if (key !== answerLetter) {
          corrected[key] = value
        }
      })
      if (Object.keys(corrected).length > 0) {
        finalCounterpoints = corrected
      } else {
        finalCounterpoints = undefined
      }
    }

    const hasCounterpoints = !!finalCounterpoints && Object.keys(finalCounterpoints).length > 0
    const hasCommonMistake = !!explanation.commonMistake && explanation.commonMistake.length > 0

    // Professional explanation mapping
    const questionType = detectQuestionType(block.stem, errorTag)
    // Normalize questionType for getReasoningSteps (vocab -> vocabulary)
    const normalizedQuestionType: 'detail' | 'inference' | 'vocabulary' | 'main' = 
      questionType === 'vocab' ? 'vocabulary' : questionType
    const reasoningSteps = getReasoningSteps(explanation.reasoning, normalizedQuestionType, block.stem)

    // ONE line evidence extraction
    const primaryEvidenceText = primaryEvidence?.text || ''
    const evidenceOneLine = toOneLineEvidence(primaryEvidenceText)
    
    // Extract keywords FIRST (used in reasoning generation)
    const keywords = extractKeywords(block.stem)

    // Build specific reasoning based on question content (not generic template)
    // Extract context from stem and evidence for more specific reasoning
    const stemLower = block.stem.toLowerCase()
    const evidenceLower = evidenceOneLine.toLowerCase()
    const hasWhether = /whether|dilemma|choice|decision/i.test(stemLower + evidenceOneLine)
    const hasFromTo = /\bfrom\b.*\bto\b/i.test(evidenceOneLine)
    const hasMainIdea = /title|main idea|best (describes|title)/i.test(stemLower)
    
    // Extract specific words/phrases for more concrete reasoning
    const stemWords = keywords
    const targetWord = stemWords.find(w => /dilemma|refer|meaning|word|phrase/i.test(w)) || stemWords[0]
    
    // Build natural, teacher-like reasoning text
    // Priority: Use AI-generated reasoning if available (should be natural, no "解題步驟")
    // Fallback: Generate natural reasoning if AI didn't provide it
    let reasoningText = ''
    
    // Use AI-generated reasoning directly (should already be natural, teacher-like)
    if (hasReasoning && explanation.reasoning) {
      // Remove any "解題步驟" markers and format markers if LLM accidentally included them
      reasoningText = explanation.reasoning
        .replace(/【解題步驟】/g, '')
        .replace(/^步驟[一二三四五六七八九十\d]+[：:]\s*/gm, '')
        .replace(/^\d+[\.\)]\s*/gm, '')
        .replace(/^[一二三四五六七八九十]+[\.\)]\s*/gm, '')
        .replace(/「以自然語氣說明」「指出」「引用」/g, '')
        .replace(/^以自然語氣說明[：:]\s*/g, '')
        .replace(/^指出[：:]\s*/g, '')
        .replace(/^引用[：:]\s*/g, '')
        .replace(/請直接引用.*?。/g, '')
        .replace(/請引用.*?。/g, '')
        .trim()
        
      // If reasoning still contains step-like patterns, try to extract natural text
      if (/^(步驟|定位|分析|比對|選出)/.test(reasoningText)) {
        // Try to extract the actual explanation after step markers
        const naturalMatch = reasoningText.match(/(?:步驟[一二三四五六七八九十\d]+[：:]\s*)?(.+)/)
        if (naturalMatch && naturalMatch[1]) {
          reasoningText = naturalMatch[1].trim()
        }
      }
    } else {
      // Fallback: Generate natural reasoning (only if AI didn't provide it)
      // This should rarely happen if prompt is correct
    if (questionType === 'vocab' && hasWhether && targetWord) {
      const hasReplace = /replace|computer-based|assessment/i.test(evidenceLower)
      const contextPhrase = hasReplace ? '是否更換電腦化測驗' : '抉擇'
        reasoningText = `題幹中的「${targetWord}」在文中指的是 whether 子句表達的「${contextPhrase}」。根據上下文，這個詞彙對應正確選項的語義。`
    } else if (questionType === 'main' && hasFromTo) {
      const nclbMatch = /nclb|standardized/i.test(evidenceLower)
      const essaMatch = /essa|student-centered|personalized/i.test(evidenceLower)
      const fromPhrase = nclbMatch ? 'NCLB 的標準化測驗' : '前者'
      const toPhrase = essaMatch ? 'ESSA 的個別化評量' : '後者'
        reasoningText = `文章的核心轉變是從 ${fromPhrase} 轉向 ${toPhrase}。正確標題需同時包含轉變過程與核心焦點。`
    } else if (questionType === 'inference') {
      const hasCause = /because|cause|result|lead/i.test(evidenceLower)
        const cue = hasCause ? '因果' : '對比'
        reasoningText = `根據證據句中的${cue}邏輯關係，可以推論出作者的意圖。`
    } else {
      const keyTerm = stemWords[0] || '題意'
        reasoningText = `根據文章中的證據句，正確答案與「${keyTerm}」的語義一致。`
      }
    }
    
    // Ensure reasoning is not empty
    if (!reasoningText || reasoningText.trim().length === 0) {
      reasoningText = '根據文章內容，正確答案與題幹要求一致。'
    }

    // Question-type aware distractor analysis (legacy)
    const distractors = analyzeOptions({
      options,
      answerIndex: answerIndex ?? 0,
      evidenceLine: evidenceOneLine,
      keywords,
      questionType,
      stem: block.stem
    })

    // Option notes for wrong choices only: (A)/(B)/(C) format
    const optionNotes = buildOptionNotes({
      options,
      answerIndex: answerIndex ?? 0,
      evidenceLine: evidenceOneLine,
      keywords
    })

    // Vocabulary extraction (compact)
    const vocab = extractVocab(keywords)

    // Correct answer reinforcement note
    const correctNote = generateCorrectNote({
      questionType,
      answerText,
      evidence: evidenceOneLine,
      stem: block.stem
    })

    // Strategy hint for question type (use AI strategy if available, otherwise generate)
    const finalStrategy = aiStrategy || (questionType === 'main'
      ? '先找「轉變/對比」語塊，再確認焦點是否在「評量」。'
      : questionType === 'inference'
      ? '定位關鍵句 → 推論因果關係'
      : questionType === 'vocab'
      ? '上下文語境判斷'
      : '直接對應證據句')

    // Difficulty assessment
    const difficulty = '中等' // Default; could be enhanced with AI classification

    // NEW: Inline notes for option-level explanations
    const inlineNotes = buildInlineNotes({
      options,
      answerIndex: answerIndex ?? 0,
      evidenceLine: evidenceOneLine,
      keywords
    })

    // NEW: Overview notes for Details section
    const overviewNotes = buildOverviewNotes(inlineNotes)

    // NEW: Header line for Core section (題型｜難度｜思考線索)
    const questionTypeLabel = questionType === 'main' ? '主旨題' :
                              questionType === 'vocab' ? '詞義題' :
                              questionType === 'inference' ? '推論題' : '細節題'
    const thinkingCue = questionType === 'main' ? '轉變對比' :
                        questionType === 'vocab' ? '語境句式' :
                        questionType === 'inference' ? '因果推論' : '證據對應'
    const headerLine = `${questionTypeLabel}｜${difficulty}｜${thinkingCue}`

    const DEBUG = process.env.DEBUG === '1' || process.env.DEBUG === 'true'
    if (DEBUG) {
      console.log(`[presenter.boundary] Q${blockIndex + 1} reasoning:`, hasReasoning ? explanation.reasoning!.substring(0, 40) : 'missing')
      console.log(`[presenter.boundary] Q${blockIndex + 1} questionType:`, questionType)
      console.log(`[presenter.boundary] Q${blockIndex + 1} reasoningSteps:`, reasoningSteps)
      console.log(`[presenter.boundary] Q${blockIndex + 1} reasoningText:`, reasoningText)
      console.log(`[presenter.boundary] Q${blockIndex + 1} evidenceOneLine:`, evidenceOneLine)
      console.log(`[presenter.boundary] Q${blockIndex + 1} distractors:`, distractors.length)
      console.log(`[presenter.boundary] Q${blockIndex + 1} counterpoints:`, hasCounterpoints ? Object.keys(finalCounterpoints!) : 'missing')
      console.log(`[presenter.boundary] Q${blockIndex + 1} commonMistake:`, hasCommonMistake ? explanation.commonMistake!.substring(0, 40) : 'missing')
    }

    return {
      qid: block.qid || `Q${blockIndex + 1}`,
      stem: sanitizeText(block.stem),
      options,
      answerIndex: answerIndex ?? undefined,
      answerLetter,
      answerText,
      reason: truncatedReason || fallbackReason,
      evidence: evidenceEntries,
      // Professional explanation fields
      reasoning: explanation.reasoning,
      reasoningSteps, // Deprecated; kept for backward compatibility
      reasoningText, // Professional zh-TW reasoning (concise, type-specific)
      evidenceOneLine, // ONE line evidence
      counterpoints: finalCounterpoints, // Legacy
      distractors, // Question-type aware categorized analysis (legacy)
      optionNotes, // Wrong choices only: (A)/(B)/(C) format
      vocab, // Compact vocabulary list
      correctNote, // Correct answer reinforcement (optional)
      // NEW: Inline explanation fields
      inlineNotes, // Inline notes for ALL options (correct + wrong)
      overviewNotes, // Overview for Details section
      headerLine, // 題型｜難度｜思考線索
      // Display flags
      hasReasoning,
      hasCounterpoints,
      meta: {
        paragraphIndex: primaryEvidence?.paragraphIndex ?? 0,
        sentenceIndex: primaryEvidence?.sentenceIndex,
        errorTypeTag: errorTag || '細節理解',
        questionType, // Question type tag
        keywords,
        strategy: finalStrategy, // Question-type specific strategy hint
        commonMistake: explanation.commonMistake,
        summary,
        difficulty, // Difficulty label
      },
    }
  })

  const warningSources = [
    ...(Array.isArray(meta?.warnings) ? meta.warnings : []),
    ...parsed.warnings,
  ]
  const parserWarning = warningSources.length ? Array.from(new Set(warningSources)).join('; ') : undefined

  // Final validation log (always show in dev, even without DEBUG flag)
  if (process.env.NODE_ENV !== 'production') {
    const evidenceOk = readingQuestions.every((q) => q.evidence.length > 0)
    const hasExplanation = readingQuestions.some(
      (q) => !!q.reasoning || (!!q.counterpoints && Object.keys(q.counterpoints).length > 0)
    )
    console.log('[ReadingExplain] render group:', groupId, 'qs:', readingQuestions.length, 'evidence:', evidenceOk ? 'ok' : 'miss', 'hasExplanation:', hasExplanation)
    
    // Show detailed explanation status for each question
    readingQuestions.forEach((q, idx) => {
      const hasReasoning = !!q.reasoning && q.reasoning.length > 0
      const hasCounterpoints = !!q.counterpoints && Object.keys(q.counterpoints).length > 0
      const hasCommonMistake = !!q.meta.commonMistake && q.meta.commonMistake.length > 0
      
      console.log(`[ReadingExplain] Q${idx + 1} explanation status:`, {
        hasReasoning,
        reasoningPreview: hasReasoning ? q.reasoning!.substring(0, 40) : 'missing',
        hasCounterpoints,
        counterKeys: hasCounterpoints ? Object.keys(q.counterpoints!) : [],
        hasCommonMistake,
      })
    })
  }

  return {
    ...base,
    kind: 'E4',
    options: undefined,
    answer: undefined,
    passage: {
      paragraphs,
    },
    questions: readingQuestions,
    parserWarning,
    vocab: base.vocab,
    meta: {
      totalQuestions: readingQuestions.length,
      groupId,
    },
  }
}

// 輔助函數：從 evidence 文本中選擇段落和句子
function selectEvidenceFromText(evidenceText: string, paragraphs: string[]): {
  paragraphIndex: number
  sentenceIndex: number | undefined
  sentence: string
} {
  if (!evidenceText || !paragraphs.length) {
    return { paragraphIndex: 0, sentenceIndex: undefined, sentence: paragraphs[0] || '' }
  }

  // 嘗試在段落中查找包含 evidence 文本的句子
  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const paragraph = paragraphs[pIdx]
    const sentences = splitIntoSentences(paragraph)
    
    for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
      const sentence = sentences[sIdx]
      // 簡單匹配：如果 evidence 文本包含在句子中，或句子包含在 evidence 中
      if (evidenceText.includes(sentence) || sentence.includes(evidenceText.slice(0, 50))) {
        return { paragraphIndex: pIdx, sentenceIndex: sIdx, sentence }
      }
    }
  }

  // Fallback：返回第一個段落的第一個句子
  const firstParagraph = paragraphs[0] || ''
  const sentences = splitIntoSentences(firstParagraph)
  return { paragraphIndex: 0, sentenceIndex: 0, sentence: sentences[0] || firstParagraph }
}

function splitIntoSentences(paragraph: string): string[] {
  return paragraph
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function prepareTranslationVM(card: ExplainCard, base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>): TranslationVM {
  const reasonLine =
    summarizeReason(card.correct?.reason) ??
    summarizeReason(data.options.find((option) => option.correct)?.reason) ??
    undefined

  // Extract scores from meta if available
  const meta = card.meta as any
  const scores = meta?.scores
    ? {
        grammar: meta.scores.grammar ?? 0,
        wordChoice: meta.scores.wordChoice ?? 0,
        fluency: meta.scores.fluency ?? 0,
        register: meta.scores.register ?? 0,
      }
    : undefined

  const improvements = meta?.improvements
    ? meta.improvements.map((imp: any) => ({
        dimension: imp.dimension || imp.dim || '',
        suggestion: imp.suggestion || imp.suggest || '',
      }))
    : undefined

  const examples = meta?.examples
    ? {
        literal: meta.examples.literal,
        natural: meta.examples.natural,
        incorrect: meta.examples.incorrect,
      }
    : undefined

  return {
    ...base,
    kind: 'E5',
    meta: {
      reasonLine,
      scores,
      improvements,
      examples,
    },
  }
}

function prepareGenericVM(base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>, card: ExplainCard): GenericVM {
  const reasonLine =
    summarizeReason(card.correct?.reason) ??
    summarizeReason(data.options.find((option) => option.correct)?.reason) ??
    summarizeReason(card.cues?.join(' '))

  return {
    ...base,
    kind: 'GENERIC',
    meta: reasonLine ? { reasonLine } : undefined,
  }
}

function prepareParagraphOrganizationVM(card: ExplainCard, base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>): ParagraphOrganizationVM {
  const article = sanitizeMultiline(card.question)
  const zhArticle = sanitizeMultiline(card.translation)
  
  // Extract blanks and their answers from meta
  const meta = card.meta as any
  const blanks: ParagraphOrganizationVM['blanks'] = []
  
  // Parse blanks from meta.questions or meta.blanks
  const questions = meta?.questions || []
  const options = base.options || []
  
  questions.forEach((q: any, idx: number) => {
    const answerLabel = q.answer?.match(/^([A-D])/)?.[1]?.toUpperCase()
    const selectedOption = options.find((opt) => opt.label === answerLabel) || options[0]
    
    blanks.push({
      blankIndex: idx + 1,
      selectedAnswer: {
        label: selectedOption?.label || 'A',
        text: selectedOption?.text || '',
        zh: q.answerZh || selectedOption?.zh,
      },
      explanation: {
        connection: summarizeReason(q.connection || q.reasoning || '', 60) || '空格前後語意連貫。',
        reason: summarizeReason(q.reason || q.reasoning || '', 80) || '選項符合上下文邏輯。',
        evidence: q.evidence ? {
          text: q.evidence,
          paragraphIndex: q.paragraphIndex || 0,
          sentenceIndex: q.sentenceIndex,
        } : undefined,
        discourseTag: q.discourseTag || detectDiscourseTag(q.reasoning),
      },
    })
  })

  return {
    ...base,
    kind: 'E6',
    article: article
      ? {
          en: article,
          zh: zhArticle || undefined,
        }
      : undefined,
    blanks: blanks.length > 0 ? blanks : [],
    meta: {
      hasMultipleBlanks: blanks.length > 1,
    },
  }
}

function prepareContextualCompletionVM(card: ExplainCard, base: ExplainBaseVM, data: ReturnType<typeof buildExplainView>): ContextualCompletionVM {
  const article = sanitizeMultiline(card.question)
  const zhArticle = sanitizeMultiline(card.translation)
  
  const meta = card.meta as any
  const questions: ContextualCompletionVM['questions'] = []
  
  // Parse questions from meta.questions
  const questionList = meta?.questions || []
  
  questionList.forEach((q: any, idx: number) => {
    const span = extractSentenceSpan(card.question || '', /____+/)
    
    questions.push({
      qid: q.id || `q${idx + 1}`,
      blankIndex: idx + 1,
      sentenceSpan: span ? { start: span.start, end: span.end } : undefined,
      explanation: {
        reason: summarizeReason(q.reasoning || q.reason || '', 120) || '選項符合上下文語意與語法規則。',
        evidence: q.evidence ? {
          text: q.evidence,
          paragraphIndex: q.paragraphIndex || 0,
          sentenceIndex: q.sentenceIndex,
        } : undefined,
        phrases: q.phrases && Array.isArray(q.phrases) ? q.phrases.slice(0, 3) : undefined,
      },
    })
  })

  return {
    ...base,
    kind: 'E7',
    article: article
      ? {
          en: article,
          zh: zhArticle || undefined,
        }
      : undefined,
    questions: questions.length > 0 ? questions : [],
    translation: zhArticle
      ? {
          full: zhArticle,
          keywords: base.vocab?.slice(0, 10).map((v) => ({
            term: v.word || '',
            zh: v.zh || '',
          })) || [],
        }
      : undefined,
    meta: {
      totalQuestions: questions.length,
    },
  }
}

export function presentExplainCard(card: ExplainCard | null): ExplainVM | null {
  if (!card) return null

  const baseView = buildExplainView(card)

  const options = toOptionVM(baseView.options)
  const answer =
    baseView.answerKey || baseView.answerWord
      ? {
          label: baseView.answerKey,
          text: sanitizeText(baseView.answerWord),
        }
      : undefined

  const vocab = enrichVocab(baseView.vocab)

  const base: ExplainBaseVM = {
    id: card.id,
    kind: 'GENERIC',
    order: resolveOrder(card),
    stem: {
      en: sanitizeText(baseView.stemEn),
      zh: sanitizeText(baseView.stemZh),
    },
    options: options.length ? options : undefined,
    answer,
    vocab: vocab.length ? vocab : undefined,
  }

  switch (card.kind) {
    case 'E1':
      return prepareVocabularyVM(card, base, baseView)
    case 'E2':
      return prepareGrammarVM(card, base, baseView)
    case 'E3':
      return prepareClozeVM(card, base, baseView)
    case 'E4':
      return prepareReadingVM(card, base, baseView)
    case 'E5':
      return prepareTranslationVM(card, base, baseView)
    case 'E6':
      return prepareParagraphOrganizationVM(card, base, baseView)
    case 'E7':
      return prepareContextualCompletionVM(card, base, baseView)
    default:
      return prepareGenericVM(base, baseView, card)
  }
}
