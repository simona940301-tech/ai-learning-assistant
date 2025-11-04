const MATH_PATTERN =
  /(\d+\s*(?:=|>|<|≠|≈)\s*\d+)|[=+\-*/√^%∑∫π]|\\(?:frac|sum|int|sqrt|pi)|\b(?:cos|sin|tan|cot|sec|csc|log|ln)\b|[{[\\}]/g

const LATEX_PATTERN = /\\begin{.*?}|\\frac|\\sqrt|\\pi|\\theta|\\alpha|\\beta|\\gamma/g

export type HardGuardDecision = {
  subject: 'math' | 'none'
  reason: string
  matchedTokens: string[]
}

/**
 * Hard guard that only promotes math when explicit glyphs/functions are present.
 * Returns the guard decision plus matched tokens for logging/telemetry.
 */
export function runHardGuard(text: string): HardGuardDecision {
  if (!text) {
    return { subject: 'none', reason: 'empty', matchedTokens: [] }
  }

  const matches = Array.from(text.matchAll(MATH_PATTERN)).map((m) => m[0]).slice(0, 5)
  const latexMatches = LATEX_PATTERN.test(text) ? ['latex'] : []
  const merged = [...matches, ...latexMatches]

  if (merged.length === 0) {
    return { subject: 'none', reason: 'no_math_tokens', matchedTokens: [] }
  }

  return {
    subject: 'math',
    reason: 'explicit_math_tokens',
    matchedTokens: merged,
  }
}
