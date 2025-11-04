import { describe, it, expect } from 'vitest'

/**
 * Test: E1 blank detector (single parens with or without space)
 *
 * Purpose: Ensure both '( )' and '()' patterns are detected for E1 vocabulary questions.
 */

const hasSingleParensBlank = (s: string) => /\(\s*\)/.test(s) || /\(\)/.test(s)

describe('E1 blank detector', () => {
  it('matches () with space', () => {
    expect(hasSingleParensBlank('He is ( ) a student.')).toBe(true)
    expect(hasSingleParensBlank('The result was ( ) surprising.')).toBe(true)
  })

  it('matches () without space', () => {
    expect(hasSingleParensBlank('He is () a student.')).toBe(true)
    expect(hasSingleParensBlank('The result was () surprising.')).toBe(true)
  })

  it('matches () with multiple spaces', () => {
    expect(hasSingleParensBlank('He is (  ) a student.')).toBe(true)
    expect(hasSingleParensBlank('He is (   ) a student.')).toBe(true)
  })

  it('does NOT match numbered blanks', () => {
    expect(hasSingleParensBlank('Fill in (1) here.')).toBe(false)
    expect(hasSingleParensBlank('Text (2) and (3) missing.')).toBe(false)
  })

  it('does NOT match years', () => {
    expect(hasSingleParensBlank('In (2018), Obama spoke.')).toBe(false)
    expect(hasSingleParensBlank('Since (1995), GDP grew.')).toBe(false)
  })

  it('matches multiple () blanks in multi-question E1', () => {
    const multiQ = 'He is ( ) smart. She is ( ) tall.'
    expect(hasSingleParensBlank(multiQ)).toBe(true)
  })

  it('edge case: empty parens at start/end', () => {
    expect(hasSingleParensBlank('() is the answer.')).toBe(true)
    expect(hasSingleParensBlank('The answer is ().')).toBe(true)
  })

  it('edge case: fullwidth parens (after normalization)', () => {
    // Assuming normalization already converted （ ） → ( )
    expect(hasSingleParensBlank('He is ( ) smart.')).toBe(true)
  })
})
