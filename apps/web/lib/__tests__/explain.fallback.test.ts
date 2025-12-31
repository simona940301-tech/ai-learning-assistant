import { describe, it, expect } from 'vitest'
import { universalExplainer } from '../ai/universal-explainer'
import { basicExtractor } from '../ai/basic-extractor'
import { minimalFallback } from '../ai/minimal-fallback'

describe('Layered Fallback System', () => {
  describe('minimalFallback', () => {
    it('should always return a valid result', () => {
      const result = minimalFallback('')
      expect(result).toHaveProperty('question')
      expect(result).toHaveProperty('options')
      expect(result).toHaveProperty('answer')
      expect(result).toHaveProperty('reason')
      expect(result.status).toBe('minimal')
    })

    it('should handle malformed input', () => {
      const result = minimalFallback('asdfasdfasdf')
      expect(result.status).toBe('minimal')
      expect(result.answer).toBe('-')
    })

    it('should extract options from text', () => {
      const text = 'Question here (A) option A (B) option B'
      const result = minimalFallback(text)
      expect(result.options.length).toBeGreaterThan(0)
    })
  })

  describe('basicExtractor', () => {
    it('should extract question and options', async () => {
      const text = 'What is the answer? (A) Option A (B) Option B (C) Option C'
      const result = await basicExtractor(text)
      
      expect(result).toHaveProperty('question')
      expect(result).toHaveProperty('options')
      expect(result.status).toBe('basic')
      expect(result.options.length).toBeGreaterThan(0)
    }, 10000) // 10s timeout for AI call

    it('should handle empty input gracefully', async () => {
      const result = await basicExtractor('')
      expect(result.status).toBe('basic')
      expect(result.answer).toBeDefined()
    }, 10000)
  })

  describe('universalExplainer', () => {
    it('should generate explanation for simple question', async () => {
      const text = 'He is a good student. (A) student (B) teacher'
      const result = await universalExplainer(text)
      
      expect(result).toHaveProperty('answer')
      expect(result).toHaveProperty('reason')
      expect(['full', 'basic']).toContain(result.status)
    }, 15000) // 15s timeout for AI call

    it('should handle basic question', async () => {
      const text = 'Question text'
      const result = await universalExplainer(text)
      
      expect(result).toHaveProperty('markdown')
      expect(result).toHaveProperty('status')
      expect(['full', 'basic', 'minimal']).toContain(result.status)
    }, 15000)
  })

  describe('fallback chain', () => {
    it('should never throw errors', async () => {
      // Test that minimal fallback never throws
      expect(() => minimalFallback(null as any)).not.toThrow()
      expect(() => minimalFallback(undefined as any)).not.toThrow()
      expect(() => minimalFallback({} as any)).not.toThrow()
    })
  })
})

