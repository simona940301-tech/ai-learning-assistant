import { describe, it, expect } from 'vitest'

/**
 * Test: Fullwidth option markers support (A-E)
 *
 * Purpose: Ensure fullwidth letters (Ａ-Ｅ) and fullwidth brackets （）
 * are properly detected and normalized.
 */

// Simulates the normalization in router.ts
const normalizeFullwidth = (s: string) => 
  s
    .replace(/[Ａ-Ｚ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
    .replace(/[ａ-ｚ]/g, (m) => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))

// Simulates OPT pattern in reading-parser.ts (needs to include fullwidth letters)
const OPT = /(?:\(|（)\s*([A-Ea-eＡ-Ｅａ-ｅ])\s*(?:\)|）)\s*/g

const extractOptions = (s: string) => Array.from(s.matchAll(OPT)).map(m => m[1])

describe('fullwidth option markers (A-E support)', () => {
  it('captures fullwidth A-E markers', () => {
    const s = '（Ａ）option1 （Ｂ）option2 （Ｃ）option3 （Ｄ）option4 （Ｅ）option5'
    expect(extractOptions(s)).toEqual(['Ａ', 'Ｂ', 'Ｃ', 'Ｄ', 'Ｅ'])
  })

  it('captures halfwidth A-E markers', () => {
    const s = '(A) option1 (B) option2 (C) option3 (D) option4 (E) option5'
    expect(extractOptions(s)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('handles mixed fullwidth and halfwidth', () => {
    const s = '（Ａ）option1 (B) option2 （Ｃ）option3'
    expect(extractOptions(s)).toEqual(['Ａ', 'B', 'Ｃ'])
  })

  it('tolerates spaces inside brackets', () => {
    const s = '( A ) option1 （ Ｂ ） option2'
    expect(extractOptions(s)).toEqual(['A', 'Ｂ'])
  })

  it('normalizes fullwidth letters to ascii', () => {
    expect(normalizeFullwidth('ＡＢＣＤＥａｂｃｄｅ')).toBe('ABCDEabcde')
  })

  it('supports lowercase options (a-e)', () => {
    const s = '(a) option1 (b) option2 (c) option3 (d) option4 (e) option5'
    expect(extractOptions(s)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('edge case: only E option (五選)', () => {
    const s = 'Choose (E) for this question'
    expect(extractOptions(s)).toEqual(['E'])
  })

  it('edge case: fullwidth E marker', () => {
    const s = '（Ｅ）The fifth option'
    expect(extractOptions(s)).toEqual(['Ｅ'])
  })
})
