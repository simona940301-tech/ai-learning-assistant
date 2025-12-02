/**
 * Unit tests for subject detection
 *
 * Tests the heuristic-based subject classification that determines
 * whether text is English, Math, Chinese, or unknown.
 */

import { describe, it, expect } from 'vitest'
import { detectSubject, mapSubjectToContract, getTemplateForSubject } from '../lib/ai/detectSubject'

describe('detectSubject', () => {
  describe('English questions', () => {
    it('should detect English MCQ with imagery passage', () => {
      const EN_Q = `Imagery is found throughout literature... It allows readers to use their imagination to (1) ____ ... Which of the following best describes imagery?`
      expect(detectSubject(EN_Q)).toBe('english')
    })

    it('should detect English grammar question', () => {
      const EN_Q = `The vocabulary in this passage is mostly related to grammar and sentence structure. Choose the best option to fill in the blank.`
      expect(detectSubject(EN_Q)).toBe('english')
    })

    it('should detect English cloze passage', () => {
      const EN_Q = `Read the following passage and choose the most appropriate word for each blank. This is a common cloze test pattern.`
      expect(detectSubject(EN_Q)).toBe('english')
    })

    it('should handle English text with high letter ratio', () => {
      const EN_Q = `This is predominantly English text with many letters and words that should be classified as English subject matter for educational purposes.`
      expect(detectSubject(EN_Q)).toBe('english')
    })
  })

  describe('Math questions', () => {
    it('should detect Math cosine law question', () => {
      const MATH_Q = `下列哪一個描述最符合「餘弦定理」？ A) c^2=a^2+b^2-2ab cos C ...`
      expect(detectSubject(MATH_Q)).toBe('math')
    })

    it('should detect Math with trigonometry', () => {
      const MATH_Q = `已知三角形的兩邊長為 3 和 4，夾角為 60°，求第三邊長。使用餘弦定理 c^2 = a^2 + b^2 - 2ab cos θ`
      expect(detectSubject(MATH_Q)).toBe('math')
    })

    it('should detect Math with vector operations', () => {
      const MATH_Q = `設向量 u = (2, 3) 和 v = (1, -1)，求內積 u·v = ?`
      expect(detectSubject(MATH_Q)).toBe('math')
    })

    it('should detect Math with symbols and operators', () => {
      const MATH_Q = `Solve: 2x + 5 = 13, x = ?`
      expect(detectSubject(MATH_Q)).toBe('math')
    })

    it('should detect Math with geometry terms', () => {
      const MATH_Q = `在三角形ABC中，若∠A = 90°，則此三角形為直角三角形`
      expect(detectSubject(MATH_Q)).toBe('math')
    })
  })

  describe('Chinese questions', () => {
    it('should detect Chinese text question', () => {
      const ZH_Q = `下列何者為文意選填之常見誤解？請選出最合適的選項。`
      expect(detectSubject(ZH_Q)).toBe('chinese')
    })

    it('should detect Chinese with high Han character ratio', () => {
      const ZH_Q = `請根據以下文章選擇最適當的答案。這是一個關於中國文學歷史的問題，涉及古代詩詞的理解與分析。`
      expect(detectSubject(ZH_Q)).toBe('chinese')
    })

    it('should distinguish Chinese from Math with Chinese characters', () => {
      const ZH_Q = `唐詩宋詞是中國文學的瑰寶，請問下列哪一位詩人屬於盛唐時期？`
      expect(detectSubject(ZH_Q)).toBe('chinese')
    })
  })

  describe('Unknown/edge cases', () => {
    it('should return unknown for empty string', () => {
      expect(detectSubject('')).toBe('unknown')
    })

    it('should return unknown for very short ambiguous text', () => {
      expect(detectSubject('??')).toBe('unknown')
    })

    it('should handle null/undefined gracefully', () => {
      expect(detectSubject(null as any)).toBe('unknown')
      expect(detectSubject(undefined as any)).toBe('unknown')
    })
  })
})

describe('mapSubjectToContract', () => {
  it('should map english to English', () => {
    expect(mapSubjectToContract('english')).toBe('English')
  })

  it('should map math to MathA', () => {
    expect(mapSubjectToContract('math')).toBe('MathA')
  })

  it('should map chinese to Chinese', () => {
    expect(mapSubjectToContract('chinese')).toBe('Chinese')
  })

  it('should map unknown to English as fallback', () => {
    expect(mapSubjectToContract('unknown')).toBe('English')
  })
})

describe('getTemplateForSubject', () => {
  it('should return english-mcq for english', () => {
    expect(getTemplateForSubject('english')).toBe('english-mcq')
  })

  it('should return math-mcq for math', () => {
    expect(getTemplateForSubject('math')).toBe('math-mcq')
  })

  it('should return chinese-mcq for chinese', () => {
    expect(getTemplateForSubject('chinese')).toBe('chinese-mcq')
  })

  it('should return english-mcq for unknown as fallback', () => {
    expect(getTemplateForSubject('unknown')).toBe('english-mcq')
  })
})
