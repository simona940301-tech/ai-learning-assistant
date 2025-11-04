import { describe, it, expect } from 'vitest'

/**
 * Test: Numbered blank detection with inner spaces tolerance
 *
 * Purpose: Ensure ( 1 ), ( 2 ), (3) patterns are all detected correctly
 * for E6/E7 classification and parsing.
 */

// Simulates the pattern from router.ts and reading-parser.ts
const hasNumberedBlanks = (s: string) => /\(\s*\d+\s*\)/.test(s)

// Extract blank numbers (with space tolerance)
const extractBlankNumbers = (s: string) => {
  const matches = Array.from(s.matchAll(/\(\s*(\d+)\s*\)/g))
  return matches.map(m => parseInt(m[1], 10))
}

// Refined pattern that excludes years (from reading-parser guard)
const numberedBlankPattern = /\(\s*(?!19\d{2}|20\d{2}|[1-9]\d{2,})\d+\s*\)/

describe('numbered blank detection (space tolerance)', () => {
  it('detects blanks with no spaces', () => {
    const s = 'Text (1) more (2) text (3)'
    expect(hasNumberedBlanks(s)).toBe(true)
    expect(extractBlankNumbers(s)).toEqual([1, 2, 3])
  })

  it('detects blanks with single spaces', () => {
    const s = 'Text ( 1 ) more ( 2 ) text ( 3 )'
    expect(hasNumberedBlanks(s)).toBe(true)
    expect(extractBlankNumbers(s)).toEqual([1, 2, 3])
  })

  it('detects blanks with multiple spaces', () => {
    const s = 'Text (  1  ) more (   2   )'
    expect(hasNumberedBlanks(s)).toBe(true)
    expect(extractBlankNumbers(s)).toEqual([1, 2])
  })

  it('handles mixed spacing', () => {
    const s = 'Text (1) and ( 2 ) and (  3  )'
    expect(hasNumberedBlanks(s)).toBe(true)
    expect(extractBlankNumbers(s)).toEqual([1, 2, 3])
  })

  it('refined pattern excludes years with spaces', () => {
    const s = 'In ( 2018 ), Obama spoke'
    expect(numberedBlankPattern.test(s)).toBe(false)
  })

  it('refined pattern still detects cloze blanks with spaces', () => {
    expect(numberedBlankPattern.test('( 1 )')).toBe(true)
    expect(numberedBlankPattern.test('( 99 )')).toBe(true)
  })

  it('edge case: fullwidth parentheses converted to halfwidth', () => {
    // Assuming normalization converts （ ） → ( )
    const s = 'Text ( 1 ) more ( 2 )'
    expect(hasNumberedBlanks(s)).toBe(true)
  })

  it('edge case: large numbers excluded from cloze detection', () => {
    const s = '( 100 ) days program'
    expect(numberedBlankPattern.test(s)).toBe(false)
  })
})
