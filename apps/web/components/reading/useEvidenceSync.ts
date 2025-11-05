/**
 * Evidence sync hook for coordinating passage highlighting and scrolling
 *
 * Design Principles:
 * - Single source of truth for active highlights
 * - Smooth transitions with CSS animations
 * - Automatic cleanup and timeout management
 * - Telemetry integration
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { EvidenceSpan, EvidenceSyncState } from '@/lib/reading/types'
import { trackEvidenceView } from '@/lib/telemetry'

export interface UseEvidenceSyncOptions {
  /** Question type for telemetry */
  kind: string

  /** Highlight timeout in ms (0 = no timeout) */
  highlightDuration?: number

  /** Auto-scroll behavior */
  scrollBehavior?: ScrollBehavior

  /** Offset from top when scrolling (in px) */
  scrollOffset?: number
}

/**
 * Hook for managing evidence highlights and passage scrolling
 *
 * Usage:
 * ```tsx
 * const { highlights, jumpToEvidence, clearHighlights } = useEvidenceSync({ kind: 'E4' })
 *
 * // In PassageDock
 * <PassageDock highlights={highlights} ... />
 *
 * // In question card
 * <button onClick={() => jumpToEvidence(question.evidence, question.id)}>
 *   View Evidence
 * </button>
 * ```
 */
export function useEvidenceSync(options: UseEvidenceSyncOptions): EvidenceSyncState {
  const { kind, highlightDuration = 3000, scrollBehavior = 'smooth', scrollOffset = 80 } = options

  const [highlights, setHighlights] = useState<EvidenceSpan[]>([])
  const [activeQuestionId, setActiveQuestionId] = useState<string | undefined>()

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  /**
   * Jump to evidence spans and trigger highlight
   */
  const jumpToEvidence = useCallback(
    (spans: EvidenceSpan[], questionId?: string) => {
      if (!spans || spans.length === 0) {
        console.warn('[useEvidenceSync] No evidence spans provided')
        return
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // Update highlights immediately
      setHighlights(spans)
      setActiveQuestionId(questionId)

      // Track event
      trackEvidenceView({
        kind,
        qid: questionId || 'unknown',
        paraId: spans[0].paraId,
        spans: spans.length,
      })

      // Scroll to first paragraph
      const firstParaId = spans[0].paraId
      const targetElement = document.getElementById(`para-${firstParaId}`)

      if (targetElement) {
        // Calculate scroll position with offset
        const elementTop = targetElement.getBoundingClientRect().top
        const offsetPosition = elementTop + window.pageYOffset - scrollOffset

        window.scrollTo({
          top: offsetPosition,
          behavior: scrollBehavior,
        })

        // Focus for accessibility
        targetElement.focus({ preventScroll: true })
      } else {
        console.warn(`[useEvidenceSync] Paragraph element not found: para-${firstParaId}`)
      }

      // Auto-clear highlights after duration
      if (highlightDuration > 0) {
        timeoutRef.current = setTimeout(() => {
          setHighlights([])
          setActiveQuestionId(undefined)
          timeoutRef.current = null
        }, highlightDuration)
      }
    },
    [kind, highlightDuration, scrollBehavior, scrollOffset]
  )

  /**
   * Clear all highlights immediately
   */
  const clearHighlights = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setHighlights([])
    setActiveQuestionId(undefined)
  }, [])

  return {
    highlights,
    activeQuestionId,
    jumpToEvidence,
    clearHighlights,
  }
}

/**
 * Check if a paragraph is currently highlighted
 */
export function isParagraphHighlighted(paraId: string, highlights: EvidenceSpan[]): boolean {
  return highlights.some((span) => span.paraId === paraId)
}

/**
 * Get highlight class names for a paragraph
 */
export function getHighlightClasses(paraId: string, highlights: EvidenceSpan[]): string {
  if (!isParagraphHighlighted(paraId, highlights)) {
    return ''
  }

  return 'bg-primary/10 ring-1 ring-primary/40 rounded-md transition-all duration-300'
}
