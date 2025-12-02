/**
 * Integration tests for /api/solve-simple route
 *
 * Tests the complete flow of the API route including:
 * - Subject detection from prompt
 * - Correct routing to subject-specific pipelines
 * - Response format validation
 */

import { describe, it, expect } from 'vitest'
import { POST } from '../app/api/solve-simple/route'
import { NextRequest } from 'next/server'

// Helper to create a mock NextRequest
function createMockRequest(body: any): NextRequest {
  const url = 'http://localhost:3000/api/solve-simple'
  const request = new NextRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return request
}

describe('/api/solve-simple integration tests', () => {
  describe('English question handling', () => {
    it('should detect and process English MCQ question', async () => {
      const englishPrompt = `Imagery is found throughout literature. It allows readers to use their imagination to visualize scenes. Which of the following best describes imagery?`

      const request = createMockRequest({
        prompt: englishPrompt,
        mode: 'step',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const json = await response.json()

      // Should detect as English
      expect(json.subject).toBe('English')
      expect(json.phase).toBe('solve')
      expect(json.session_id).toBeDefined()

      // Should have explanation structure
      expect(json.explanation).toBeDefined()
      expect(json.explanation.summary).toBeDefined()
      expect(json.explanation.steps).toBeInstanceOf(Array)

      // Options should look like text (no heavy math symbols)
      const responseText = JSON.stringify(json)
      // Should not contain heavy math operators for English question
      expect(responseText).not.toMatch(/[√∫∑∏]/)
    })

    it('should handle English grammar question', async () => {
      const request = createMockRequest({
        prompt: 'Choose the correct vocabulary word to complete the sentence about grammar rules.',
        mode: 'fast',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.subject).toBe('English')
      expect(json.phase).toBe('solve')
    })
  })

  describe('Math question handling', () => {
    it('should detect and process Math cosine law question', async () => {
      const mathPrompt = `已知三角形的兩邊長為 a=3 和 b=4，夾角為 60°，求第三邊長 c。請使用餘弦定理 c^2 = a^2 + b^2 - 2ab cos C。`

      const request = createMockRequest({
        prompt: mathPrompt,
        mode: 'step',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const json = await response.json()

      // Should detect as Math
      expect(json.subject).toBe('MathA')
      expect(json.phase).toBe('solve')

      // Should have keypoint information
      expect(json.keypoint).toBeDefined()
      expect(json.keypoint.code).toBeDefined()

      // Should have explanation with steps
      expect(json.explanation).toBeDefined()
      expect(json.explanation.steps).toBeInstanceOf(Array)
      expect(json.explanation.steps.length).toBeGreaterThan(0)
    })

    it('should handle vector question as Math', async () => {
      const request = createMockRequest({
        prompt: '設向量 u = (2, 3) 和 v = (1, -1)，求內積 u·v。',
        mode: 'step',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.subject).toBe('MathA')
    })

    it('should handle regression/statistics question as Math', async () => {
      const request = createMockRequest({
        prompt: '給定數據點，求迴歸直線方程式。',
        keypoint_code: 'STAT_REGRESSION_LINE',
        mode: 'step',
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.keypoint.code).toBe('STAT_REGRESSION_LINE')
    })
  })

  describe('Subject detection logging', () => {
    it('should log subject detection for English', async () => {
      // This test verifies that console.log is called with the correct format
      const consoleSpy = vi.spyOn(console, 'log')

      const request = createMockRequest({
        prompt: 'This is an English grammar question about vocabulary.',
        mode: 'step',
      })

      await POST(request)

      // Should log the detected subject
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[subject detected]'),
        expect.any(String),
        expect.stringContaining('→'),
        expect.any(String)
      )

      consoleSpy.mockRestore()
    })

    it('should log provided subject when explicit', async () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const request = createMockRequest({
        prompt: 'Some question',
        subject: 'MathA',
        mode: 'step',
      })

      await POST(request)

      // Should log that subject was provided
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[subject provided]'),
        'MathA'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Error handling', () => {
    it('should return 400 for invalid request (missing required fields)', async () => {
      const request = createMockRequest({
        // Missing all required fields: session_id, question_id, and prompt
        mode: 'step',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBe('invalid_request')
    })

    it('should return 400 for invalid mode', async () => {
      const request = createMockRequest({
        prompt: 'test',
        mode: 'invalid_mode',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Contract v2 compliance', () => {
    it('should return Contract v2 compliant response', async () => {
      const request = createMockRequest({
        prompt: 'Test question',
        mode: 'step',
      })

      const response = await POST(request)
      const json = await response.json()

      // Check Contract v2 required fields
      expect(json.phase).toBe('solve')
      expect(json.subject).toBeDefined()
      expect(json.subject_confidence).toBe(1.0)
      expect(json.keypoint).toBeDefined()
      expect(json.keypoint.id).toBeDefined()
      expect(json.keypoint.code).toBeDefined()
      expect(json.keypoint.name).toBeDefined()

      expect(json.explanation).toBeDefined()
      expect(json.explanation.summary).toBeDefined()
      expect(json.explanation.steps).toBeInstanceOf(Array)
      expect(json.explanation.checks).toBeInstanceOf(Array)
      expect(json.explanation.error_hints).toBeInstanceOf(Array)
      expect(json.explanation.extensions).toBeInstanceOf(Array)

      expect(json.telemetry).toBeDefined()
      expect(json.telemetry.latency_ms).toBeGreaterThanOrEqual(0)

      expect(json.ui).toBeDefined()
      expect(json.ui.show_explanation).toBe(true)
      expect(json.ui.enable_save).toBe(true)
    })
  })

  describe('Mode variations', () => {
    it('should return empty steps array for fast mode', async () => {
      const request = createMockRequest({
        prompt: 'Test question',
        mode: 'fast',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.explanation.steps).toEqual([])
    })

    it('should return steps for step mode', async () => {
      const request = createMockRequest({
        prompt: 'Test question',
        mode: 'step',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.explanation.steps.length).toBeGreaterThan(0)
    })
  })
})
