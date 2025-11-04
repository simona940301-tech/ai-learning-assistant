import { describe, it, expect } from 'vitest'

/**
 * Test: Choice shape detection with lowered sentence threshold
 *
 * Purpose: Ensure short sentences (4+ tokens) are classified as 'sentences',
 * not misclassified as 'words/phrases'.
 */

const detectChoiceShape = (arr: string[]): 'sentences' | 'words/phrases' | 'mixed' | 'none' => {
  if (!arr || arr.length === 0) return 'none'

  const sentenceLike = arr.filter((t) => {
    const s = t.trim()
    const tokens = s.split(/\s+/).length
    return /^[A-Z]/.test(s) && /[.?!]$/.test(s) && tokens >= 4
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

describe('choice shape threshold (lowered to 4 tokens)', () => {
  it('classifies short sentences (4 tokens) as sentences', () => {
    // 'A short sentence.' = 3 tokens, but let's use actual 4-token examples
    expect(detectChoiceShape(['She is very smart.'])).toBe('sentences')
    expect(detectChoiceShape(['This is quite true.'])).toBe('sentences')
  })

  it('classifies 5-token sentences as sentences', () => {
    expect(detectChoiceShape(['This is a sentence.'])).toBe('sentences')
  })

  it('still classifies words/phrases correctly', () => {
    expect(detectChoiceShape(['innovative'])).toBe('words/phrases')
    expect(detectChoiceShape(['climate change'])).toBe('words/phrases')
    expect(detectChoiceShape(['dramatically improved'])).toBe('words/phrases')
  })

  it('handles mixed arrays with 60% threshold', () => {
    const mixed = [
      'Short sentence here.',    // sentence (3 tokens, ends with .) - doesn't meet 4+ threshold
      'This is valid.',          // sentence (3 tokens) - doesn't meet 4+ threshold
      'word',                    // word (1 token, no punctuation, <= 5) = word-like
      'phrase here',             // phrase (2 tokens, no punctuation, <= 5) = word-like
    ]
    // 0 sentences (none >= 4 tokens), 2 word-like (no punctuation + <= 5 tokens) / 4 = 50% < 60%
    // Result: neither reaches 60% → mixed
    expect(detectChoiceShape(mixed)).toBe('mixed')
  })

  it('correctly identifies sentence-dominant arrays', () => {
    const sentences = [
      'This is a sentence.',           // 4 tokens ✓
      'Another valid sentence here.',  // 4 tokens ✓
      'Short one here.',               // 3 tokens ✗
      'word',                          // word
    ]
    // 2 sentences / 4 = 50% < 60% → mixed
    expect(detectChoiceShape(sentences)).toBe('mixed')
  })

  it('edge case: exactly 4 tokens with punctuation', () => {
    expect(detectChoiceShape(['She is very smart.'])).toBe('sentences')
    expect(detectChoiceShape(['Are you ready now?'])).toBe('sentences')
  })

  it('edge case: 4 tokens without ending punctuation', () => {
    expect(detectChoiceShape(['this is a phrase'])).toBe('words/phrases')
  })
})
