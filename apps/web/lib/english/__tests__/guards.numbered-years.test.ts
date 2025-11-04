import { describe, it, expect } from 'vitest'

/**
 * Test: Numbered blank guard (refined)
 *
 * Purpose: Ensure years like (2018), (2021) don't trigger numbered blank detection,
 * while cloze blanks like (1), (2), (15) do trigger it.
 */

const hasNumberedBlank = (s: string) => /\((?!19\d{2}|20\d{2}|[1-9]\d{2,})\d+\)/.test(s)

describe('numbered blank guard (refined)', () => {
  it('treats cloze blanks as numbered blanks', () => {
    expect(hasNumberedBlank('Text (1) more (2) text (15)')).toBe(true)
    expect(hasNumberedBlank('Fill in (3) and (4)')).toBe(true)
    expect(hasNumberedBlank('Only (99) here')).toBe(true)
  })

  it('does NOT treat years as numbered blanks', () => {
    expect(hasNumberedBlank('In (2018), ...')).toBe(false)
    expect(hasNumberedBlank('Since (1995), ...')).toBe(false)
    expect(hasNumberedBlank('GDP (2021) report')).toBe(false)
    expect(hasNumberedBlank('Year (1900) was significant')).toBe(false)
    expect(hasNumberedBlank('By (2099), predictions show')).toBe(false)
  })

  it('does NOT treat large numbers as blanks', () => {
    expect(hasNumberedBlank('the (100) days program')).toBe(false)
    expect(hasNumberedBlank('page (256)')).toBe(false)
    expect(hasNumberedBlank('section (999)')).toBe(false)
  })

  it('allows bare years and still detects real blanks', () => {
    const s = 'In 2018, the study showed that (1) and (2) are missing.'
    expect(hasNumberedBlank(s)).toBe(true)
  })

  it('handles mixed content correctly', () => {
    const s1 = 'Obama (44th president) spoke in (2015) about issue (1).'
    expect(hasNumberedBlank(s1)).toBe(true) // Detects (1)

    const s2 = 'Obama (44th president) spoke in (2015).'
    expect(hasNumberedBlank(s2)).toBe(false) // Only years/large numbers
  })

  it('edge case: single digit edge (1) vs (10) vs (100)', () => {
    expect(hasNumberedBlank('(1)')).toBe(true)
    expect(hasNumberedBlank('(9)')).toBe(true)
    expect(hasNumberedBlank('(10)')).toBe(true)
    expect(hasNumberedBlank('(99)')).toBe(true)
    expect(hasNumberedBlank('(100)')).toBe(false) // 3 digits
  })
})
