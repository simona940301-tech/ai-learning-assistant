import { describe, it, expect } from 'vitest'
import {
  safeText,
  safeMatch,
  safeReplace,
  safeSplit,
  safeTrim,
  safeToUpperCase,
  safeToLowerCase,
  safeSubstring,
  safeIncludes,
  safeLength,
  safeExec,
  safeMatchAll,
  safeCharAt,
} from '../safe-text'

describe('safe-text utilities', () => {
  describe('safeText', () => {
    it('should handle string values', () => {
      expect(safeText('hello', '')).toBe('hello')
      expect(safeText('', 'default')).toBe('')
    })

    it('should handle null and undefined', () => {
      expect(safeText(null, 'default')).toBe('default')
      expect(safeText(undefined, 'default')).toBe('default')
    })

    it('should handle numbers and booleans', () => {
      expect(safeText(123, '')).toBe('123')
      expect(safeText(true, '')).toBe('true')
      expect(safeText(false, '')).toBe('false')
    })

    it('should handle objects', () => {
      expect(safeText({ a: 1 }, 'default')).toBe('[object Object]')
      expect(safeText([1, 2, 3], 'default')).toBe('1,2,3')
    })
  })

  describe('safeMatch', () => {
    it('should match strings correctly', () => {
      const result = safeMatch('(A) answer', /^\(?([A-E])\)?\s*/i)
      expect(result).not.toBeNull()
      expect(result?.[1]).toBe('A')
    })

    it('should handle non-string values', () => {
      expect(safeMatch(null, /test/)).toBeNull()
      expect(safeMatch(123, /\d+/)).not.toBeNull()
      expect(safeMatch({}, /test/)).toBeNull()
    })

    it('should return default value on error', () => {
      // Invalid regex pattern - should handle gracefully
      expect(safeMatch('test', /invalid/)).toBeNull()
    })
  })

  describe('safeReplace', () => {
    it('should replace strings correctly', () => {
      expect(safeReplace('hello world', /world/, 'universe')).toBe('hello universe')
      expect(safeReplace('(A) text', /^\([A-E]\)\s*/, '')).toBe('text')
    })

    it('should handle non-string values', () => {
      expect(safeReplace(null, /test/, 'replacement', 'default')).toBe('default')
      expect(safeReplace(123, /\d/, 'X')).toBe('X23')
    })
  })

  describe('safeSplit', () => {
    it('should split strings correctly', () => {
      expect(safeSplit('a|b|c', '|')).toEqual(['a', 'b', 'c'])
      expect(safeSplit('a｜b｜c', '｜')).toEqual(['a', 'b', 'c'])
    })

    it('should handle non-string values', () => {
      expect(safeSplit(null, '|', [])).toEqual([])
      expect(safeSplit(123, '', ['default'])).toEqual(['default'])
    })
  })

  describe('safeTrim', () => {
    it('should trim strings correctly', () => {
      expect(safeTrim('  hello  ', '')).toBe('hello')
      expect(safeTrim('', 'default')).toBe('default')
    })

    it('should handle non-string values', () => {
      expect(safeTrim(null, 'default')).toBe('default')
      expect(safeTrim(123, '')).toBe('123')
    })
  })

  describe('safeToUpperCase', () => {
    it('should convert to uppercase', () => {
      expect(safeToUpperCase('hello', '')).toBe('HELLO')
      expect(safeToUpperCase('a', '')).toBe('A')
    })

    it('should handle non-string values', () => {
      expect(safeToUpperCase(null, 'default')).toBe('default')
      expect(safeToUpperCase(123, '')).toBe('123')
    })
  })

  describe('safeToLowerCase', () => {
    it('should convert to lowercase', () => {
      expect(safeToLowerCase('HELLO', '')).toBe('hello')
      expect(safeToLowerCase('A', '')).toBe('a')
    })

    it('should handle non-string values', () => {
      expect(safeToLowerCase(null, 'default')).toBe('default')
    })
  })

  describe('safeMatchAll', () => {
    it('should match all occurrences', () => {
      const result = safeMatchAll('(A) text (B) text (C) text', /\(([A-E])\)\s*([^\n(]+)/gi)
      expect(result.length).toBe(3)
      expect(result[0][1]).toBe('A')
      expect(result[1][1]).toBe('B')
      expect(result[2][1]).toBe('C')
    })

    it('should handle non-string values', () => {
      expect(safeMatchAll(null, /test/g)).toEqual([])
      expect(safeMatchAll(undefined, /test/g)).toEqual([])
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      expect(safeText('', 'default')).toBe('')
      expect(safeMatch('', /test/)).toBeNull()
      expect(safeReplace('', /test/, 'replacement', 'default')).toBe('default')
    })

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000)
      expect(safeLength(longString)).toBe(10000)
      expect(safeSubstring(longString, 0, 10, '')).toBe('a'.repeat(10))
    })

    it('should handle special characters', () => {
      expect(safeText('測試｜中文', '')).toBe('測試｜中文')
      expect(safeSplit('測試｜中文', '｜')).toEqual(['測試', '中文'])
    })
  })

  describe('real-world scenarios', () => {
    it('should handle answer string parsing', () => {
      const answerString = '(A) if any'
      const match = safeMatch(answerString, /^\(?([A-E])\)?\s*/i)
      expect(match?.[1]).toBe('A')
      
      const answerText = safeTrim(safeReplace(answerString, /^\(?[A-E]\)?\s*/i, ''), '')
      expect(answerText).toBe('if any')
    })

    it('should handle option parsing from distractorNotes', () => {
      const note = { option: '(B) among others', note: '不符合語境｜需要列舉' }
      const optionText = safeText(note.option, '')
      const optionMatch = safeMatch(optionText, /^\(?([A-E])\)?\s*/i)
      const key = optionMatch ? safeToUpperCase(optionMatch[1], '') : safeText(optionText, '')
      const noteText = safeText(note.note, '')
      const text = safeSplit(noteText, '｜')[0] || noteText

      expect(key).toBe('B')
      expect(text).toBe('不符合語境')
    })

    it('should handle malformed API responses', () => {
      // Simulate API returning non-string answer
      const malformedAnswer: any = { value: 'A', label: 'answer' }
      const safeAnswer = safeText(malformedAnswer, '')
      expect(safeAnswer).toBe('[object Object]')
      
      // Should not crash
      const match = safeMatch(safeAnswer, /^\(?([A-E])\)?\s*/i)
      expect(match).toBeNull()
    })
  })
})

