/**
 * Tests for evidence jumping and highlighting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEvidenceSync } from '../useEvidenceSync'
import type { EvidenceSpan } from '@/lib/reading/types'

describe('useEvidenceSync', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="para-p1">Paragraph 1</div>
      <div id="para-p2">Paragraph 2</div>
      <div id="para-p3">Paragraph 3</div>
    `

    // Mock scrollTo and scrollIntoView
    window.scrollTo = vi.fn()
    Element.prototype.scrollIntoView = vi.fn()
    Element.prototype.focus = vi.fn()

    // Mock console.warn
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('should initialize with empty highlights', () => {
    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4' })
    )

    expect(result.current.highlights).toEqual([])
    expect(result.current.activeQuestionId).toBeUndefined()
  })

  it('should update highlights when jumpToEvidence is called', () => {
    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4' })
    )

    const spans: EvidenceSpan[] = [{ paraId: 'p1' }]

    act(() => {
      result.current.jumpToEvidence(spans, 'q1')
    })

    expect(result.current.highlights).toEqual(spans)
    expect(result.current.activeQuestionId).toBe('q1')
  })

  it('should scroll to first paragraph when evidence clicked', () => {
    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4', scrollOffset: 80 })
    )

    const spans: EvidenceSpan[] = [{ paraId: 'p2' }]

    act(() => {
      result.current.jumpToEvidence(spans)
    })

    const targetElement = document.getElementById('para-p2')
    expect(targetElement).toBeTruthy()

    // scrollIntoView or scrollTo should be called
    waitFor(() => {
      expect(
        Element.prototype.scrollIntoView as any
      ).toHaveBeenCalled()
    })
  })

  it('should focus paragraph for accessibility', () => {
    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4' })
    )

    const spans: EvidenceSpan[] = [{ paraId: 'p1' }]

    act(() => {
      result.current.jumpToEvidence(spans)
    })

    const targetElement = document.getElementById('para-p1')
    waitFor(() => {
      expect(Element.prototype.focus).toHaveBeenCalled()
    })
  })

  it('should clear highlights after duration', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4', highlightDuration: 1000 })
    )

    const spans: EvidenceSpan[] = [{ paraId: 'p1' }]

    act(() => {
      result.current.jumpToEvidence(spans)
    })

    expect(result.current.highlights).toEqual(spans)

    // Fast-forward 1000ms
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    await waitFor(() => {
      expect(result.current.highlights).toEqual([])
    })

    vi.useRealTimers()
  })

  it('should not auto-clear when highlightDuration is 0', async () => {
    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4', highlightDuration: 0 })
    )

    const spans: EvidenceSpan[] = [{ paraId: 'p1' }]

    act(() => {
      result.current.jumpToEvidence(spans)
    })

    expect(result.current.highlights).toEqual(spans)

    // Fast-forward 5000ms
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Highlights should still be there
    expect(result.current.highlights).toEqual(spans)

    vi.useRealTimers()
  })

  it('should clear existing timeout when jumping to new evidence', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4', highlightDuration: 2000 })
    )

    // Jump to first evidence
    act(() => {
      result.current.jumpToEvidence([{ paraId: 'p1' }])
    })

    expect(result.current.highlights).toEqual([{ paraId: 'p1' }])

    // Advance 1000ms (half of duration)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Jump to second evidence (should clear first timeout)
    act(() => {
      result.current.jumpToEvidence([{ paraId: 'p2' }])
    })

    expect(result.current.highlights).toEqual([{ paraId: 'p2' }])

    // Advance another 1000ms
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // First evidence timeout should not fire
    // Second evidence should still be visible (1s left)
    expect(result.current.highlights).toEqual([{ paraId: 'p2' }])

    vi.useRealTimers()
  })

  it('should clear highlights manually', () => {
    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4' })
    )

    act(() => {
      result.current.jumpToEvidence([{ paraId: 'p1' }], 'q1')
    })

    expect(result.current.highlights.length).toBeGreaterThan(0)

    act(() => {
      result.current.clearHighlights()
    })

    expect(result.current.highlights).toEqual([])
    expect(result.current.activeQuestionId).toBeUndefined()
  })

  it('should warn when no spans provided', () => {
    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4' })
    )

    act(() => {
      result.current.jumpToEvidence([])
    })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('No evidence spans provided')
    )
  })

  it('should warn when paragraph element not found', () => {
    const { result } = renderHook(() =>
      useEvidenceSync({ kind: 'E4' })
    )

    act(() => {
      result.current.jumpToEvidence([{ paraId: 'p99' }]) // Non-existent
    })

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Paragraph element not found')
    )
  })
})

describe('isParagraphHighlighted', () => {
  it('should return true for highlighted paragraph', () => {
    const { isParagraphHighlighted } = require('../useEvidenceSync')

    const highlights: EvidenceSpan[] = [
      { paraId: 'p1' },
      { paraId: 'p3' },
    ]

    expect(isParagraphHighlighted('p1', highlights)).toBe(true)
    expect(isParagraphHighlighted('p3', highlights)).toBe(true)
  })

  it('should return false for non-highlighted paragraph', () => {
    const { isParagraphHighlighted } = require('../useEvidenceSync')

    const highlights: EvidenceSpan[] = [{ paraId: 'p1' }]

    expect(isParagraphHighlighted('p2', highlights)).toBe(false)
    expect(isParagraphHighlighted('p3', highlights)).toBe(false)
  })

  it('should return false for empty highlights', () => {
    const { isParagraphHighlighted } = require('../useEvidenceSync')

    expect(isParagraphHighlighted('p1', [])).toBe(false)
  })
})

describe('getHighlightClasses', () => {
  it('should return empty string for non-highlighted paragraph', () => {
    const { getHighlightClasses } = require('../useEvidenceSync')

    const highlights: EvidenceSpan[] = [{ paraId: 'p1' }]

    expect(getHighlightClasses('p2', highlights)).toBe('')
  })

  it('should return class string for highlighted paragraph', () => {
    const { getHighlightClasses } = require('../useEvidenceSync')

    const highlights: EvidenceSpan[] = [{ paraId: 'p1' }]

    const classes = getHighlightClasses('p1', highlights)

    expect(classes).toContain('bg-primary/10')
    expect(classes).toContain('ring-1')
    expect(classes).toContain('ring-primary/40')
    expect(classes).toContain('transition-all')
  })
})
