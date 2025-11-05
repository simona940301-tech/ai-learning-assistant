/**
 * Pre-compiled regex patterns for English question parsing
 *
 * Performance: Define once, reuse in hot paths
 * Safety: Validated patterns with bounded quantifiers
 */

/**
 * Year pattern (4-digit years from 1000-2999)
 * Used to exclude years from blank detection
 *
 * Examples: (1999), (2018), (2150)
 */
export const YEAR_PATTERN = /\b(1[0-9]{3}|2[0-9]{3})\b/g

/**
 * Numbered blank pattern with year exclusion
 * Matches: (1), (2), ( 15 ), but NOT (1999), (2018)
 *
 * Uses negative lookahead to exclude:
 * - 19xx and 20xx (years)
 * - Numbers >= 100 (likely not blanks)
 */
export const NUMBERED_BLANK_PATTERN = /\(\s*(?!19\d{2}|20\d{2}|[1-9]\d{2,})\d+\s*\)/g

/**
 * Numbered blank with capture group (for extracting number)
 */
export const NUMBERED_BLANK_CAPTURE = /\(\s*(?!19\d{2}|20\d{2}|[1-9]\d{2,})(\d+)\s*\)/g

/**
 * Option pattern supporting A-E and fullwidth characters
 * Matches: (A), (B), （Ａ）, ( C ), etc.
 */
export const OPTION_PATTERN = /(?:\(|（)\s*([A-Ea-eＡ-Ｅａ-ｅ])\s*(?:\)|）)\s*/g

/**
 * Answer pattern
 * Matches: "答案：A", "Answer: B", "正確答案: C"
 */
export const ANSWER_PATTERN = /(?:答案|正確答案|Answer)\s*[：:]\s*([A-E])/i

/**
 * Fallback option extraction with bounded length
 * Format: line start + A-D + . or ) + 1-160 chars + line end
 *
 * Bounded quantifier prevents catastrophic backtracking
 * Max 160 chars per option is reasonable for exam questions
 */
export const FALLBACK_OPTION_PATTERN = /^(?:\s*)([A-Ea-e])[.\)]\s*(.{1,160})$/gm

/**
 * Single parenthesis blank (for E1 vocab detection)
 * Matches: "He is ( ) a student"
 */
export const SINGLE_PARENS_BLANK = /\(\s*\)/

/**
 * Fullwidth letter to halfwidth conversion offset
 */
export const FULLWIDTH_OFFSET = 0xfee0

/**
 * Fullwidth uppercase letters
 */
export const FULLWIDTH_UPPERCASE = /[Ａ-Ｚ]/g

/**
 * Fullwidth lowercase letters
 */
export const FULLWIDTH_LOWERCASE = /[ａ-ｚ]/g

/**
 * Sentence-like pattern (for choice shape detection)
 * Must start with capital, end with punctuation, have 4+ tokens
 */
export const SENTENCE_LIKE_PATTERN = /^[A-Z].*[.?!]$/

/**
 * Word/phrase pattern (for choice shape detection)
 * No ending punctuation, <= 5 tokens
 */
export const WORD_PHRASE_PATTERN = /^[^.?!]+$/

/**
 * Dialog pattern for E5 detection
 * Matches: "A: Hello", "B: How are you?"
 */
export const DIALOG_PATTERN = /^[A-Z]:\s*/m

/**
 * Question marker pattern
 * Matches: (1), (2), 1., 2., Q1, Q2, etc.
 */
export const QUESTION_MARKER_PATTERN = /^(?:\(?\d+\)?\.?|\d+\.|Q\d+)/

/**
 * HTML tag pattern for sanitization validation
 */
export const HTML_TAG_PATTERN = /<[^>]+>/g

/**
 * Utility: Normalize fullwidth letters to halfwidth
 */
export function normalizeFullwidth(text: string): string {
  return text
    .replace(FULLWIDTH_UPPERCASE, (m) => String.fromCharCode(m.charCodeAt(0) - FULLWIDTH_OFFSET))
    .replace(FULLWIDTH_LOWERCASE, (m) => String.fromCharCode(m.charCodeAt(0) - FULLWIDTH_OFFSET))
}

/**
 * Utility: Check if string contains year
 */
export function containsYear(text: string): boolean {
  return YEAR_PATTERN.test(text)
}

/**
 * Utility: Extract numbered blanks from text
 */
export function extractNumberedBlanks(text: string): number[] {
  const matches = Array.from(text.matchAll(NUMBERED_BLANK_CAPTURE))
  return matches.map((m) => parseInt(m[1], 10))
}

/**
 * Utility: Safe option extraction with length limit
 * Returns array of {key, text} with deduplication
 */
export function extractOptions(text: string): Array<{ key: string; text: string }> {
  const matches = Array.from(text.matchAll(FALLBACK_OPTION_PATTERN))
  const seen = new Set<string>()
  const options: Array<{ key: string; text: string }> = []

  for (const match of matches) {
    const key = match[1].toUpperCase()
    const text = match[2].trim()

    // Deduplicate by key
    if (text && !seen.has(key)) {
      seen.add(key)
      options.push({ key, text })
    }
  }

  return options
}
