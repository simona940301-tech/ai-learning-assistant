import { OptionKey } from '@/lib/explain-normalizer'
import { createHash } from 'crypto'

export type ReadingOption = {
  key: OptionKey
  text: string
}

export type ReadingQuestionBlock = {
  id: number
  qid: string
  stem: string
  options: ReadingOption[]
  answer?: OptionKey
  evidence?: string
  reason?: string
  groupId: string
  raw: string
}

export type ParsedReading = {
  passage: string
  questions: ReadingQuestionBlock[]
  groupId: string
  warnings: string[]
}

// Question number pattern: supports (), ()(1), Q1, etc.
const Q_MARK = new RegExp(
  String.raw`^ *(?:\(\s*\))? *(?:\( *\d+ *\)|Q *\d+\.?|第 *\d+ *題)`,
  'i'
)

// Split pattern for multiple questions
const SPLIT_Q = new RegExp(
  String.raw`(?=^ *(?:\(\s*\))? *(?:\( *\d+ *\)|Q *\d+\.?|第 *\d+ *題))`,
  'gmi'
)

// Option pattern: supports (A), （A）, (a), etc.
const OPT = /(?:\(|（)([A-Da-d])(?:\)|）)\s*/g

const ANSWER_REGEX = /(?:答案|正確答案|Answer)\s*[：:]\s*([A-D])/i
const QUESTION_HEADER_CAPTURE = /^ *(?:\(\s*\))? *(?:\( *(\d+) *\)|Q *(\d+) *\.?|第 *(\d+) *題)/i
const EMPTY_PREFIX_REGEX = /^ *\(\s*\)\s*(?:\( *\d+ *\)|Q *\d+\.?|第 *\d+ *題)/i

type OptionSlice = {
  key: OptionKey
  text: string
  start: number
  end: number
}

type ExtractedOptions = {
  slices: OptionSlice[]
  inline: boolean
}

function pushWarning(warnings: string[], message: string) {
  if (!warnings.includes(message)) {
    warnings.push(message)
  }
}

/**
 * Robust normalization: fullwidth → halfwidth, special spaces, brackets
 */
function normalizeInput(raw: string, warnings: string[]): string {
  if (!raw) return ''
  let text = raw

  // Detect fullwidth brackets and parentheses
  if (/[（）。．Ａ-Ｚａ-ｚ０-９]/.test(text)) {
    pushWarning(warnings, 'Fullwidth brackets normalized')
  }

  // Detect empty prefix pattern ()
  if (/(?:\(\s*\)|（\s*）)\s*(?:\( *\d+ *\)|\( *[０-９]+ *\)|Q *\d+\.?|第 *\d+ *題)/.test(text)) {
    pushWarning(warnings, 'Found () before (1)')
  }

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Fullwidth ASCII → Halfwidth (A-Z, a-z, 0-9)
  text = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))

  // Fullwidth punctuation → Halfwidth
  text = text.replace(/（/g, '(').replace(/）/g, ')').replace(/。/g, '.').replace(/．/g, '.')

  // Special spaces → Normal space (U+00A0, U+3000)
  text = text.replace(/\u00a0/g, ' ').replace(/\u3000/g, ' ')

  // Compress multiple spaces
  text = text.replace(/[ \t]+/g, ' ')

  // Remove trailing spaces on lines
  text = text.replace(/[ \t]+\n/g, '\n')

  // Force line break before inline question numbers to ensure they split correctly
  // Matches: "text." + optional space + "() (1)" or "(1)" or "Q1"
  text = text.replace(
    /([.)»"』''"?！？。．]|(?:\)|\]))\s*((?:\(\s*\))?\(\s*\d+\s*\)|Q\s*\d+\.?|第\s*\d+\s*題)/g,
    '$1\n$2'
  )

  return text.trim()
}

function toOptionKey(value: string): OptionKey {
  const upper = value.trim().toUpperCase()
  if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') {
    return upper as OptionKey
  }
  return 'A'
}

function generateGroupId(passage: string): string {
  const source = passage.trim()
  if (!source) return ''
  const hash = createHash('md5').update(source).digest('hex')
  return `reading-${hash.slice(0, 8)}`
}

/**
 * Clean stem: remove question header, quotes, extra whitespace
 */
function cleanStem(text: string): string {
  if (!text) return ''
  const cleaned = text
    .replace(Q_MARK, '')
    .replace(/^(?:問題|Question)\s*[：:]\s*/i, '')
    .replace(/^["""]+|["""]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned
}

/**
 * Remove passage prefix if stem accidentally starts with passage text
 */
function removePassagePrefix(stem: string, passage: string): string {
  if (!stem || !passage) return stem
  const fragment = passage.slice(0, Math.min(200, Math.floor(passage.length * 0.3))).trim()
  if (!fragment) return stem
  const lowerStem = stem.toLowerCase()
  const lowerFragment = fragment.toLowerCase()
  if (lowerStem.startsWith(lowerFragment)) {
    return stem.slice(fragment.length).replace(/^[.。，,、：:]\s*/, '').trim()
  }
  return stem
}

/**
 * Extract options from text, supporting both inline and multi-line formats
 * 
 * CRITICAL: Prevents passage text from being included in option text
 */
function extractOptions(text: string, warnings: string[]): ExtractedOptions | null {
  const matches = Array.from(text.matchAll(OPT))
  if (matches.length < 2) return null

  // Find boundaries: stop at next question marker, answer indicator, or end of reasonable option text
  const nextQuestionMarker = text.search(SPLIT_Q)
  const answerMatch = text.match(ANSWER_REGEX)
  const answerBoundary = answerMatch?.index ?? text.length
  const reasonableEnd = Math.min(
    nextQuestionMarker > 0 ? nextQuestionMarker : text.length,
    answerBoundary,
    matches[matches.length - 1].index! + 500 // Max 500 chars for last option
  )

  const slices: OptionSlice[] = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const next = matches[i + 1]
    const start = match.index ?? 0
    
    // CRITICAL FIX: Don't let last option extend beyond reasonable boundary
    // For last option, stop at next question marker, answer, or reasonable limit
    let end: number
    if (next) {
      end = next.index ?? reasonableEnd
    } else {
      // Last option: find clear boundary
      const afterOption = start + 200 // Max 200 chars for last option text
      const nextQInText = text.slice(start).search(SPLIT_Q)
      const answerInText = text.slice(start).search(ANSWER_REGEX)
      
      end = Math.min(
        reasonableEnd,
        nextQInText > 0 ? start + nextQInText : afterOption,
        answerInText > 0 ? start + answerInText : afterOption
      )
    }

    const key = toOptionKey(match[1])

    const segment = text.slice(start, end)
    let stripped = segment.replace(/^(?:\(|（)[A-Da-d](?:\)|）)\s*/, '').trim()
    
    // CRITICAL FIX: Remove any passage-like text that might have leaked in
    // Check if option text is suspiciously long (>150 chars might contain passage)
    if (stripped.length > 150) {
      // Try to find natural sentence/line break
      const sentenceEnd = Math.max(
        stripped.search(/[.!?]\s+/),
        stripped.search(/\n\n/),
        stripped.search(/Q\d+|\( *\d+ *\)/)
      )
      if (sentenceEnd > 0 && sentenceEnd < stripped.length) {
        stripped = stripped.slice(0, sentenceEnd + 1).trim()
        pushWarning(warnings, `Option ${key} truncated (possible passage leak)`)
      }
    }
    
    // Stop at answer indicator if present
    stripped = stripped.replace(/(?:答案|正確答案|Answer)\s*[：:]\s*[A-D]\s*.*$/i, '')
    
    // Stop at next question marker
    const nextQInStripped = stripped.search(/Q\d+|\( *\d+ *\)|第 *\d+ *題/)
    if (nextQInStripped > 0) {
      stripped = stripped.slice(0, nextQInStripped).trim()
    }
    
    stripped = stripped
      .replace(/\(\s*\)\s*$/i, '') // Remove trailing empty brackets
      .trim()
    
    if (!stripped || stripped.length === 0) continue

    slices.push({
      key,
      text: stripped,
      start,
      end,
    })
  }

  if (!slices.length) {
    return null
  }

  // Check if options are inline (no newlines between them)
  const inlineRegion = text.slice(slices[0].start, slices[slices.length - 1].end)
  const inline = !/\n/.test(inlineRegion)

  if (inline) {
    pushWarning(warnings, 'Options inline (A-D)')
  }

  // Check for missing options
  const expectedKeys: OptionKey[] = ['A', 'B', 'C', 'D']
  const foundKeys = new Set(slices.map((s) => s.key))
  const missingKeys = expectedKeys.filter((k) => !foundKeys.has(k))
  if (missingKeys.length > 0) {
    pushWarning(warnings, `Options missing: ${missingKeys.join(', ')}`)
  }

  return { slices, inline }
}

/**
 * Parse a single question chunk
 */
function parseQuestionChunk(
  chunk: string,
  index: number,
  passage: string,
  warnings: string[]
): ReadingQuestionBlock | null {
  const trimmed = chunk.trim()
  if (!trimmed) return null

  if (EMPTY_PREFIX_REGEX.test(trimmed)) {
    pushWarning(warnings, 'Found () before (1)')
  }

  const headerMatch = trimmed.match(QUESTION_HEADER_CAPTURE)
  const headerLength = headerMatch ? headerMatch[0].length : 0
  let remainder = trimmed.slice(headerLength).trim()

  if (!remainder) {
    remainder = trimmed
  }

  const optionData = extractOptions(remainder, warnings)
  let answer: OptionKey | undefined

  if (optionData) {
    const lastSlice = optionData.slices[optionData.slices.length - 1]
    const trailing = remainder.slice(lastSlice.end)
    const answerMatch = trailing.match(ANSWER_REGEX)
    if (answerMatch) {
      answer = toOptionKey(answerMatch[1])
    }
  } else {
    const answerMatch = remainder.match(ANSWER_REGEX)
    if (answerMatch) {
      answer = toOptionKey(answerMatch[1])
      remainder = remainder.replace(ANSWER_REGEX, '').trim()
    }
  }

  // Extract stem (text before options)
  const stemSource = optionData ? remainder.slice(0, optionData.slices[0].start).trim() : remainder
  let stem = cleanStem(stemSource)
  stem = removePassagePrefix(stem, passage)

  if (!stem) {
    stem = cleanStem(remainder) || remainder.split('\n')[0]?.trim() || `Question ${index + 1}`
  }

  // Build options array with passage contamination check
  const options: ReadingOption[] = optionData
    ? optionData.slices
        .filter((slice) => slice.text && slice.text.length > 0)
        .slice(0, 4)
        .map((slice) => {
          let optionText = slice.text.replace(/\s+/g, ' ').trim()
          
          // CRITICAL: Remove passage text that might have leaked into options
          // Check if option contains passage-like content (long sentences, multiple paragraphs)
          if (passage) {
            const passageStart = passage.slice(0, 100).toLowerCase()
            const optionLower = optionText.toLowerCase()
            
            // If option starts with passage text, remove it
            if (optionLower.startsWith(passageStart)) {
              optionText = optionText.slice(100).trim()
              pushWarning(warnings, `Option ${slice.key} had passage prefix removed`)
            }
            
            // Check for passage sentence fragments (common patterns)
            const passageSentences = passage.split(/[.!?]\s+/).filter(s => s.length > 20)
            for (const sentence of passageSentences.slice(0, 3)) {
              const sentenceStart = sentence.slice(0, 30).toLowerCase()
              if (optionText.toLowerCase().includes(sentenceStart) && optionText.length > 100) {
                // Likely contains passage, truncate at first option-like boundary
                const optionEnd = optionText.search(/\n\n|(?=[A-D]\))|答案|Answer/i)
                if (optionEnd > 0 && optionEnd < optionText.length) {
                  optionText = optionText.slice(0, optionEnd).trim()
                  pushWarning(warnings, `Option ${slice.key} truncated (passage contamination detected)`)
                }
              }
            }
          }
          
          return {
          key: slice.key,
            text: optionText,
          }
        })
    : []

  return {
    id: index + 1,
    qid: `Q${index + 1}`,
    stem,
    options,
    answer,
    evidence: '',
    reason: '',
    groupId: '',
    raw: trimmed,
  }
}

/**
 * Main parser function
 */
export function parseReading(raw: string): ParsedReading {
  if (!raw || !raw.trim()) {
    return {
      passage: '',
      questions: [],
      groupId: '',
      warnings: ['Empty input'],
    }
  }

  // ====== Guard: Skip non-pure reading (numbered blanks or word-level choices) ======
  // Import normalizeInput from router (or use local version)
  const normalizeInputForGuard = (text: string): string => {
    return text
      .normalize("NFKC")
      .replace(/\u3000/g, " ")
      .replace(/\u00A0|\u200B|\uFEFF/g, "")
      .replace(/[（）]/g, (m) => (m === "（" ? "(" : ")"))
      .replace(/[０-９]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 65248))
      .replace(/\s{2,}/g, " ")
      .replace(/\)\(/g, ") (")
      .trim()
  }
  
  const detectChoiceShapeForGuard = (arr: string[]): 'sentences' | 'words/phrases' | 'mixed' | 'none' => {
    if (!arr || arr.length === 0) return 'none'
    const sentenceLike = arr.filter((t) => {
      const s = t.trim()
      const tokens = s.split(/\s+/).length
      return /^[A-Z]/.test(s) && /[.?!]$/.test(s) && tokens >= 6
    }).length
    const wordLike = arr.filter((t) => {
      const s = t.trim()
      const tokens = s.split(/\s+/).length
      return !/[.?!]$/.test(s) && tokens <= 5
    }).length
    if (sentenceLike / arr.length >= 0.6) return 'sentences'
    if (wordLike / arr.length >= 0.6) return 'words/phrases'
    return 'mixed'
  }
  
  const normalized = normalizeInputForGuard(raw)
  
  // Guard 1: Skip if has numbered blanks (should be E6/E7)
  if (/\(\d+\)/.test(normalized)) {
    console.log('[reading-parser]', JSON.stringify({ 
      skip: true, 
      reason: 'numbered blanks found',
      normalized: normalized.substring(0, 100)
    }))
    return {
      passage: '',
      questions: [],
      groupId: '',
      warnings: ['Skipped: Has numbered blanks (likely E6/E7, not E4)'],
    }
  }
  
  // Guard 2: Skip if choices are word-level (extract from text)
  const optionMatches = Array.from(normalized.matchAll(/(?:\(|（)([A-Da-d])(?:\)|）)\s*([^\n(]+)/g))
  const extractedOptions = optionMatches.slice(0, 4).map(m => m[2]?.trim() || '').filter(Boolean)
  
  if (extractedOptions.length > 0) {
    const choicesShape = detectChoiceShapeForGuard(extractedOptions)
    if (choicesShape === 'words/phrases') {
      console.log('[reading-parser]', JSON.stringify({ 
        skip: true, 
        reason: 'word-level choices',
        choicesShape,
        sampleOptions: extractedOptions.slice(0, 2)
      }))
      return {
        passage: '',
        questions: [],
        groupId: '',
        warnings: ['Skipped: Word-level choices (likely E1/E7, not E4)'],
      }
    }
  }

  const warnings: string[] = []
  const normalizedForParser = normalizeInput(raw, warnings)
  const lines = normalizedForParser.split(/\n/)

  // Find first question line
  let firstQLine = -1
  for (let i = 0; i < lines.length; i++) {
    if (Q_MARK.test(lines[i])) {
      firstQLine = i
      break
    }
  }

  const optionMatches = Array.from(normalizedForParser.matchAll(OPT))

  let passage = ''
  let qaBlock = ''
  let fallbackSingle = false

  if (firstQLine > -1) {
    // Found question header
    passage = lines.slice(0, firstQLine).join('\n').trim()
    qaBlock = lines.slice(firstQLine).join('\n')
  } else if (optionMatches.length >= 3) {
    // No question header, but found options
    fallbackSingle = true
    pushWarning(warnings, 'Detected options but no question header')

    // Try to find passage boundary by looking for options
    const firstOptionIndex = optionMatches[0].index ?? 0
    const textBeforeOptions = normalizedForParser.slice(0, firstOptionIndex)

    // Look for last paragraph or sentence boundary before options
    const lastDoubleNewline = textBeforeOptions.lastIndexOf('\n\n')
    const lastSentenceEnd = Math.max(
      textBeforeOptions.lastIndexOf('. '),
      textBeforeOptions.lastIndexOf('.\n')
    )

    const boundary = Math.max(lastDoubleNewline, lastSentenceEnd)
    if (boundary > 0) {
      passage = textBeforeOptions.slice(0, boundary + 1).trim()
      qaBlock = normalizedForParser.slice(boundary + 1).trim()
    } else {
      passage = ''
      qaBlock = normalizedForParser
    }
  } else {
    // No question markers detected
    const fallbackPassage = normalizedForParser.trim()
    pushWarning(warnings, 'No question markers detected')
    const groupId = fallbackPassage ? generateGroupId(fallbackPassage) : ''
    return {
      passage: fallbackPassage,
      questions: [],
      groupId,
      warnings,
    }
  }

  // Split question block into individual questions
  const questionChunks = qaBlock
    ? qaBlock.split(SPLIT_Q).map((chunk) => chunk.trim()).filter((chunk) => chunk.length > 0)
    : []

  const questions: ReadingQuestionBlock[] = []

  if (questionChunks.length === 0 && fallbackSingle) {
    const single = parseQuestionChunk(qaBlock, 0, passage, warnings)
    if (single) {
      questions.push(single)
    }
  } else {
    questionChunks.forEach((chunk, idx) => {
      const parsed = parseQuestionChunk(chunk, idx, passage, warnings)
      if (parsed) {
        questions.push(parsed)
      }
    })
  }

  if (!questions.length) {
    pushWarning(warnings, 'No valid questions parsed')
  }

  const baseForGroup = passage || normalized
  const groupId = baseForGroup ? generateGroupId(baseForGroup) : ''

  questions.forEach((question, idx) => {
    question.id = idx + 1
    question.qid = `Q${idx + 1}`
    question.groupId = groupId
    if (!question.options.length) {
      pushWarning(warnings, `Question ${question.qid} missing options`)
    }
  })

  if (process.env.NODE_ENV !== 'production') {
    console.log('[reading-parser]', {
      passageLength: passage.length,
      questionCount: questions.length,
      groupId,
      warnings,
    })
  }

  return {
    passage,
    questions,
    groupId,
    warnings,
  }
}
