/**
 * Option Parser v2 - Enhanced parser for complex question formats
 * Supports: 題號+選項組 format like ( ) (1) (A) option (B) option...
 */

export interface ParsedOption {
  key: string
  text: string
  range?: [number, number] // Character range in original text
}

export interface ParsedQuestionBlock {
  qno?: string // Question number marker: (1), Q1, 1, etc.
  passageRange?: [number, number] // Range of passage text
  options: ParsedOption[]
  blankNumbers?: number[] // For cloze tests: [1, 2, 3, ...]
}

export interface ParseResult {
  blocks: ParsedQuestionBlock[]
  warnings: string[]
}

/**
 * Normalize text: fullwidth → halfwidth, normalize whitespace
 */
function normalizeText(text: string): string {
  return text
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/[（(]/g, '(')
    .replace(/[）)]/g, ')')
    .replace(/[。．]/g, '.')
    .replace(/[、,]/g, ',')
    .replace(/\u3000/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Detect question number markers: (1), （1）, Q1, 題1, etc.
 */
function findQuestionNumbers(text: string): Array<{ qno: string; index: number }> {
  const patterns = [
    /[（(]\s*(\d{1,2})\s*[）)]/g, // (1), （1）
    /Q\s*(\d{1,2})\s*[.。、:：]/gi, // Q1., Q1:
    /題\s*(\d{1,2})/g, // 題1
    /^(\d{1,2})\s*[.。、:：]/gm, // 1., 1:
  ]

  const matches: Array<{ qno: string; index: number }> = []

  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    pattern.lastIndex = 0
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        qno: match[0],
        index: match.index,
      })
    }
  }

  // Sort by index and deduplicate
  return matches
    .sort((a, b) => a.index - b.index)
    .filter((m, i, arr) => i === 0 || arr[i - 1].index !== m.index)
}

/**
 * Extract numbered blanks: (1), (2), (3) in passage
 */
function findNumberedBlanks(text: string): Array<{ number: number; index: number }> {
  const pattern = /[（(]\s*(\d{1,2})\s*[）)]/g
  const matches: Array<{ number: number; index: number }> = []

  let match: RegExpExecArray | null
  pattern.lastIndex = 0
  while ((match = pattern.exec(text)) !== null) {
    const num = parseInt(match[1], 10)
    if (!isNaN(num)) {
      matches.push({
        number: num,
        index: match.index,
      })
    }
  }

  return matches
}

/**
 * Extract options with flexible patterns
 * Supports: (A) text, （A）text, A) text, A. text, etc.
 */
function extractOptionsFromText(
  text: string,
  startIndex: number = 0
): { options: ParsedOption[]; endIndex: number } {
  const optionPattern = /(?:[（(]?\s*([A-Eａ-ｅＡ-Ｅa-e])\s*[）).、:]?\s*)([^\n（(]+?)(?=\s*(?:[（(]?\s*[A-Eａ-ｅＡ-Ｅa-e]\s*[）).、:]|\n\n|$))/g

  const options: ParsedOption[] = []
  let lastIndex = startIndex

  // Find first option marker after startIndex
  const textAfterStart = text.slice(startIndex)
  const firstOptionMatch = textAfterStart.match(/(?:^|\s)[（(]?\s*[A-Eａ-ｅＡ-Ｅa-e]\s*[）).、:]/)

  if (!firstOptionMatch) {
    return { options: [], endIndex: startIndex }
  }

  const actualStart = startIndex + (firstOptionMatch.index || 0)
  const searchText = text.slice(actualStart)

  optionPattern.lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = optionPattern.exec(searchText)) !== null) {
    let key = match[1].toUpperCase()
    // Convert fullwidth to halfwidth
    if (key === 'Ａ') key = 'A'
    else if (key === 'Ｂ') key = 'B'
    else if (key === 'Ｃ') key = 'C'
    else if (key === 'Ｄ') key = 'D'
    else if (key === 'Ｅ') key = 'E'

    const optionText = match[2].trim()
    const optionStart = actualStart + match.index
    const optionEnd = actualStart + match.index + match[0].length

    options.push({
      key,
      text: optionText,
      range: [optionStart, optionEnd],
    })

    lastIndex = Math.max(lastIndex, optionEnd)
  }

  return {
    options: options.length >= 2 ? options : [],
    endIndex: lastIndex,
  }
}

/**
 * Parse v2: Enhanced parser for complex formats
 */
export function parseOptionsFromTextV2(raw: string): ParseResult {
  const warnings: string[] = []
  const blocks: ParsedQuestionBlock[] = []

  // Normalize input
  const normalized = normalizeText(raw)
  const originalLength = raw.length

  // Find question numbers
  const questionNumbers = findQuestionNumbers(normalized)

  // Find numbered blanks (for cloze tests)
  const numberedBlanks = findNumberedBlanks(normalized)

  // Case 1: Multiple question numbers → multiple questions
  if (questionNumbers.length >= 2) {
    for (let i = 0; i < questionNumbers.length; i++) {
      const qStart = questionNumbers[i].index
      const qEnd = i < questionNumbers.length - 1 ? questionNumbers[i + 1].index : normalized.length

      const blockText = normalized.slice(qStart, qEnd)
      const { options } = extractOptionsFromText(blockText, 0)

      if (options.length >= 2) {
        blocks.push({
          qno: questionNumbers[i].qno,
          passageRange: [qStart, qEnd],
          options,
        })
      }
    }
  }
  // Case 2: Numbered blanks (2+) → Cloze test
  else if (numberedBlanks.length >= 2) {
    // Find first option marker to separate passage from options
    const firstOptionIndex = normalized.search(/(?:^|\s)[（(]?\s*[A-Eａ-ｅＡ-Ｅa-e]\s*[）).、:]/)
    const passageEnd = firstOptionIndex > 0 ? firstOptionIndex : normalized.length

    const { options } = extractOptionsFromText(normalized, passageEnd)

    if (options.length >= 2) {
      blocks.push({
        passageRange: [0, passageEnd],
        options,
        blankNumbers: numberedBlanks.map((b) => b.number),
      })
    } else {
      warnings.push('Found numbered blanks but could not extract options')
    }
  }
  // Case 3: Single question or no markers → try to extract options anywhere
  else {
    const { options } = extractOptionsFromText(normalized, 0)

    if (options.length >= 2) {
      // Try to find where passage ends (before first option)
      const firstOptionIndex = normalized.search(/(?:^|\s)[（(]?\s*[A-Eａ-ｅＡ-Ｅa-e]\s*[）).、:]/)
      const passageEnd = firstOptionIndex > 0 ? firstOptionIndex : normalized.length

      blocks.push({
        passageRange: [0, passageEnd],
        options,
      })
    } else {
      warnings.push('Could not extract any options')
    }
  }

  // Validate: ensure we found at least one block
  if (blocks.length === 0) {
    warnings.push('No valid question blocks found')
  }

  return {
    blocks,
    warnings,
  }
}

/**
 * Quick check: does text look like it has options?
 */
export function hasOptionMarkers(text: string): boolean {
  const pattern = /(?:^|\s)[（(]?\s*[A-Eａ-ｅＡ-Ｅa-e]\s*[）).、:]/i
  return pattern.test(text)
}

/**
 * Quick check: does text look like cloze test?
 */
export function looksLikeCloze(text: string): boolean {
  const numberedBlanks = findNumberedBlanks(normalizeText(text))
  return numberedBlanks.length >= 2
}

/**
 * Quick check: does text look like reading comprehension?
 */
export function looksLikeReading(text: string): boolean {
  const normalized = normalizeText(text)
  const length = normalized.length
  const questionMarkers = /(?:Q\d+|題\d+|（\s*）\s*[（(]\d+[）)]|Question\s+\d+)/gi

  return length > 300 && questionMarkers.test(normalized)
}




