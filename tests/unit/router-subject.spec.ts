/**
 * Unit tests for router subject detection integration
 *
 * Tests that the router correctly uses subject detection to pick
 * the appropriate MCQ pipeline (english-mcq, math-mcq, chinese-mcq)
 */

import { describe, it, expect, vi } from 'vitest'
import { detectSubject, getTemplateForSubject } from '../lib/ai/detectSubject'

describe('Router subject integration', () => {
  it('should route English questions to english-mcq template', () => {
    const prompt = 'The following passage contains vocabulary related to imagery and grammar.'
    const subject = detectSubject(prompt)
    const template = getTemplateForSubject(subject)

    expect(subject).toBe('english')
    expect(template).toBe('english-mcq')
  })

  it('should route Math questions to math-mcq template', () => {
    const prompt = '已知三角形兩邊為 a=3, b=4，夾角 θ=60°，求第三邊 c。使用餘弦定理。'
    const subject = detectSubject(prompt)
    const template = getTemplateForSubject(subject)

    expect(subject).toBe('math')
    expect(template).toBe('math-mcq')
  })

  it('should route Chinese questions to chinese-mcq template', () => {
    const prompt = '請根據以下文章，選擇最符合文意的選項。這是關於中國古代文學的題目。'
    const subject = detectSubject(prompt)
    const template = getTemplateForSubject(subject)

    expect(subject).toBe('chinese')
    expect(template).toBe('chinese-mcq')
  })

  it('should fallback to english-mcq for unknown subjects', () => {
    const prompt = '???'
    const subject = detectSubject(prompt)
    const template = getTemplateForSubject(subject)

    expect(subject).toBe('unknown')
    expect(template).toBe('english-mcq')
  })

  it('should prioritize Math when detecting mixed content with formulas', () => {
    const prompt = 'Calculate the area: A = πr^2 where r = 5'
    const subject = detectSubject(prompt)
    const template = getTemplateForSubject(subject)

    expect(subject).toBe('math')
    expect(template).toBe('math-mcq')
  })

  it('should detect English even with some numbers', () => {
    const prompt = 'In chapter 3, the author uses 5 different metaphors to describe the imagery in the passage.'
    const subject = detectSubject(prompt)
    const template = getTemplateForSubject(subject)

    expect(subject).toBe('english')
    expect(template).toBe('english-mcq')
  })

  it('should handle edge case: mostly Chinese with some math symbols', () => {
    const prompt = '在三角形中，已知兩邊長為 a 和 b，請選出正確的敘述。'
    const subject = detectSubject(prompt)

    // Should detect as math due to geometric keywords
    expect(subject).toBe('math')
  })
})

describe('Router safety and fallbacks', () => {
  it('should never return an invalid template', () => {
    const testCases = [
      '',
      'test',
      'English question',
      'Math: solve x + 2 = 5',
      '中文題目',
      '???',
      null,
      undefined,
    ]

    for (const testCase of testCases) {
      const subject = detectSubject(testCase as any)
      const template = getTemplateForSubject(subject)

      expect(template).toMatch(/^(english|math|chinese)-mcq$/)
    }
  })

  it('should use English fallback to prevent Math overreach', () => {
    // This is important: when unclear, default to English not Math
    // to avoid showing formula options for English questions
    const ambiguous = 'unclear text'
    const subject = detectSubject(ambiguous)
    const template = getTemplateForSubject(subject)

    // Should either detect as english or fallback to english-mcq
    if (subject === 'unknown') {
      expect(template).toBe('english-mcq')
    } else {
      expect(['english', 'chinese']).toContain(subject)
    }
  })
})
