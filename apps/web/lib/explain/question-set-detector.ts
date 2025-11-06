/**
 * Question Set Detector
 *
 * Lightweight structural analysis for multi-question English inputs.
 * Uses topology (question markers, blank patterns, option shapes) to infer type.
 *
 * Supported detections:
 *  - reading            → multi-question with per-question ABCD blocks
 *  - cloze              → per-blank single choice (numbered blanks + short options)
 *  - banked_cloze       → shared word bank with blank count <= bank size
 *  - sentence_insertion → sentence-level options inserted into numbered blanks
 */

export type QuestionSetKind =
  | 'reading'
  | 'cloze'
  | 'banked_cloze'
  | 'sentence_insertion'
  | 'unknown'

export interface OptionStat {
  label: string
  text: string
  tokens: number
  endsWithPunctuation: boolean
  isShort: boolean
}

export interface QuestionBlockStat {
  index: number
  stem: string
  options: OptionStat[]
  hasBlankInStem: boolean
}

export interface QuestionSetAnalysis {
  normalized: string
  passage: string
  passageBlankCount: number
  globalBlankCount: number
  questionBlocks: QuestionBlockStat[]
  questionCount: number
  globalOptions: OptionStat[]
  wordBank: OptionStat[]
  questionKind: QuestionSetKind
}

const OPTION_REGEX = /(?:\(|（)\s*([A-Oa-oＡ-Ｏａ-ｏ])\s*(?:\)|）)/g
const QUESTION_MARK_REGEX = /(^|\n|\s)(?:\d+[.)、]|Q\s*\d+[.)]?|\(\s*\d+\s*\)(?=\s*\(\s*[A-J]\s*\)))/gi
const BLANK_REGEX = /\(\s*(?!19\d{2}|20\d{2}|[1-9]\d{2,})\d+\s*\)|_{2,}|\uFF3F{2,}/g

/**
 * Normalize unicode variants and spacing.
 */
export function normalizeInput(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(/\u3000/g, ' ')
    .replace(/\u00A0|\u200B|\uFEFF/g, '')
    .replace(/[（）]/g, (m) => (m === '（' ? '(' : ')'))
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/\s{2,}/g, ' ')
    .replace(/\)\(/g, ') (')
    .replace(/([。．.!?！？])\s*(?=(\d+[.)、]|Q\s*\d+))/g, '$1\n')
    .trim()
}

function countTokens(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function buildOptionStat(label: string, text: string): OptionStat {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  const tokens = countTokens(trimmed)
  const endsWithPunctuation = /[.?!。！？"]$/.test(trimmed)
  const isShort = tokens <= 3 && !endsWithPunctuation
  return {
    label: label.toUpperCase(),
    text: trimmed,
    tokens,
    endsWithPunctuation,
    isShort,
  }
}

function extractOptions(raw: string): OptionStat[] {
  const matches = Array.from(raw.matchAll(OPTION_REGEX))
  if (!matches.length) return []

  const options: OptionStat[] = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const labelRaw = match[1] ?? ''
    const start = (match.index ?? 0) + match[0].length
    const end = i + 1 < matches.length ? matches[i + 1].index ?? raw.length : raw.length
    const slice = raw.slice(start, end)
    options.push(buildOptionStat(labelRaw, slice))
  }
  return options
}

function stripQuestionHeader(chunk: string): string {
  return chunk
    .replace(/^[\s\n]*(?:\d+[.)、]|Q\s*\d+[.)]?|\(\s*\d+\s*\))\s*/, '')
    .trim()
}

function splitQuestionBlocks(normalized: string): string[] {
  const markerMatches = Array.from(normalized.matchAll(QUESTION_MARK_REGEX))
  const indices = markerMatches.map((m) => m.index ?? 0)
  if (!indices.length) return []

  const blocks: string[] = []
  for (let i = 0; i < indices.length; i++) {
    const start = indices[i]
    const end = i + 1 < indices.length ? indices[i + 1] : normalized.length
    const chunk = normalized.slice(start, end).trim()
    if (chunk.length > 0) {
      blocks.push(chunk)
    }
  }
  return blocks
}

function extractPassage(normalized: string, questionBlocks: string[]): string {
  if (!questionBlocks.length) {
    return normalized
  }
  const firstBlock = questionBlocks[0]
  const index = normalized.indexOf(firstBlock)
  if (index <= 0) {
    return ''
  }
  return normalized.slice(0, index).trim()
}

/**
 * Analyse structure of multi-question input.
 */
export function analyseQuestionSet(raw: string): QuestionSetAnalysis {
  const normalized = normalizeInput(raw)
  const questionChunks = splitQuestionBlocks(normalized)
  const passage = extractPassage(normalized, questionChunks)
  const passageBlankMatches = passage.match(BLANK_REGEX) ?? []
  const totalBlankMatches = normalized.match(BLANK_REGEX) ?? []

  const questionBlocks: QuestionBlockStat[] = questionChunks.map((chunk, idx) => {
    const options = extractOptions(chunk)
    const firstOption = options[0]
    const firstOptionIndex = firstOption ? chunk.indexOf(firstOption.text) : -1
    const headerSegment = firstOptionIndex > 0 ? chunk.slice(0, firstOptionIndex).trim() : chunk
    const stem = stripQuestionHeader(headerSegment)
    const hasBlankInStem = /_{2,}|\(\s*\)|___/.test(stem)
    return {
      index: idx,
      stem: stem || stripQuestionHeader(chunk),
      options,
      hasBlankInStem,
    }
  })

  const wordBank = passage ? extractOptions(passage) : []
  const globalOptions = extractOptions(normalized)

  const analysis: QuestionSetAnalysis = {
    normalized,
    passage,
    passageBlankCount: passageBlankMatches.length,
    globalBlankCount: totalBlankMatches.length,
    questionBlocks,
    questionCount: questionBlocks.length,
    globalOptions,
    wordBank,
    questionKind: 'unknown',
  }

  analysis.questionKind = determineKind(analysis)
  return analysis
}

function determineKind(analysis: QuestionSetAnalysis): QuestionSetKind {
  const { questionCount, questionBlocks, passageBlankCount, globalBlankCount, wordBank, normalized } = analysis

  const hasWordBank = wordBank.length >= 4
  const bankShortRatio = hasWordBank
    ? wordBank.filter((opt) => opt.isShort).length / wordBank.length
    : 0
  const bankSentenceRatio = hasWordBank
    ? wordBank.filter((opt) => opt.endsWithPunctuation || opt.tokens >= 8).length / wordBank.length
    : 0

  if (hasWordBank && passageBlankCount >= 1 && questionCount === 0) {
    if (bankSentenceRatio >= 0.6) {
      return 'sentence_insertion'
    }
    if (bankShortRatio >= 0.6) {
      return 'banked_cloze'
    }
  }

  if (questionCount >= 1) {
    const totalOptions = questionBlocks.reduce((sum, block) => sum + block.options.length, 0)
    const shortOptions = questionBlocks.reduce(
      (sum, block) => sum + block.options.filter((opt) => opt.isShort).length,
      0,
    )
    const sentenceOptions = questionBlocks.reduce(
      (sum, block) =>
        sum + block.options.filter((opt) => opt.endsWithPunctuation || opt.tokens >= 6).length,
      0,
    )
    const blankStemCount = questionBlocks.filter((block) => block.hasBlankInStem).length
    const avgOptionsPerQuestion = totalOptions / questionCount

    const shortOptionRatio = totalOptions > 0 ? shortOptions / totalOptions : 0
    const sentenceOptionRatio = totalOptions > 0 ? sentenceOptions / totalOptions : 0
    const blankStemRatio = questionCount > 0 ? blankStemCount / questionCount : 0

    const hasPerQuestionABCD = avgOptionsPerQuestion >= 3.5

    const fewPassageBlanks = passageBlankCount <= Math.max(1, Math.round(questionCount / 2))

    if (passageBlankCount >= Math.max(1, questionCount) && shortOptionRatio >= 0.6 && sentenceOptionRatio < 0.5) {
      return 'cloze'
    }

    if (hasPerQuestionABCD && questionCount >= 2 && fewPassageBlanks && sentenceOptionRatio >= 0.2 && blankStemRatio <= 0.5) {
      return 'reading'
    }

    if (sentenceOptionRatio >= 0.6 && passageBlankCount >= 1) {
      return 'sentence_insertion'
    }
  }

  if (hasWordBank && passageBlankCount >= 2 && wordBank.length >= passageBlankCount) {
    return bankSentenceRatio >= 0.6 ? 'sentence_insertion' : 'banked_cloze'
  }

  if (!questionCount && globalBlankCount >= 2) {
    const options = analysis.globalOptions
    const shortRatio = options.length ? options.filter((opt) => opt.isShort).length / options.length : 0
    const sentenceRatio = options.length
      ? options.filter((opt) => opt.endsWithPunctuation || opt.tokens >= 6).length / options.length
      : 0

    if (sentenceRatio >= 0.6) return 'sentence_insertion'
    if (shortRatio >= 0.6) return 'banked_cloze'
  }

  if (questionCount >= 2) {
    // Fallback: treat as reading if multiple question markers exist with ABCD blocks
    const abcdMatches = normalized.match(/[（(][A-D][)）]/g)
    if (abcdMatches && abcdMatches.length >= questionCount * 3) {
      return 'reading'
    }
  }

  return 'unknown'
}

/**
 * Detect question set kind directly.
 */
export function detectQuestionSetKind(raw: string): QuestionSetKind {
  return analyseQuestionSet(raw).questionKind
}
