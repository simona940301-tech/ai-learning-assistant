/**
 * PassageDock: Fixed passage viewer for long-form questions
 *
 * Design Principles:
 * - Sticky at top with safe area support
 * - Smooth scrolling and highlighting
 * - Remembers scroll position via localStorage
 * - Minimalist visual design
 * - Accessible keyboard navigation
 */

'use client'

import { useEffect, useRef, useCallback, memo } from 'react'
import type { PassageVM, EvidenceSpan } from '@/lib/reading/types'
import { sanitizePassage } from '@/lib/sanitize'
import { getHighlightClasses } from './useEvidenceSync'
import { trackPassageScroll } from '@/lib/telemetry'
import { Card, CardContent } from '@/components/ui/card'

export interface PassageDockProps {
  /** Passage data with paragraphs */
  passage: PassageVM

  /** Currently highlighted evidence spans */
  highlights: EvidenceSpan[]

  /** Question type for telemetry */
  kind: string

  /** Storage key for scroll position */
  storageKey?: string

  /** Maximum height (CSS value) */
  maxHeight?: string

  /** Show paragraph numbers */
  showParagraphNumbers?: boolean

  /** Custom class name */
  className?: string
}

/**
 * PassageDock component
 *
 * Usage:
 * ```tsx
 * <PassageDock
 *   passage={passage}
 *   highlights={highlights}
 *   kind="E4"
 *   storageKey="reading-passage-scroll"
 * />
 * ```
 */
export const PassageDock = memo(function PassageDock({
  passage,
  highlights,
  kind,
  storageKey = 'passage-dock-scroll',
  maxHeight = '40vh',
  showParagraphNumbers = false,
  className = '',
}: PassageDockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Restore scroll position on mount
  useEffect(() => {
    if (!containerRef.current) return

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { scrollTop } = JSON.parse(saved)
        containerRef.current.scrollTop = scrollTop
      }
    } catch (error) {
      console.warn('[PassageDock] Failed to restore scroll position:', error)
    }
  }, [storageKey])

  // Save scroll position on scroll (throttled)
  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) return

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return

      const scrollTop = containerRef.current.scrollTop

      // Save to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify({ scrollTop }))
      } catch (error) {
        console.warn('[PassageDock] Failed to save scroll position:', error)
      }

      // Track telemetry
      const firstVisiblePara = getFirstVisibleParagraph(containerRef.current)
      if (firstVisiblePara) {
        trackPassageScroll({
          kind,
          paraId: firstVisiblePara,
          scrollTop,
        })
      }

      scrollTimeoutRef.current = null
    }, 500) // Throttle to 500ms
  }, [kind, storageKey])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  return (
    <Card
      className={`sticky top-[env(safe-area-inset-top,0)] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 ${className}`}
    >
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">原文</h3>
          <span className="text-xs text-muted-foreground">
            {passage.paragraphs.length} 段
          </span>
        </div>

        {/* Scrollable passage container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="overflow-y-auto px-4 py-3"
          style={{ maxHeight }}
          role="region"
          aria-label="閱讀文章原文"
        >
          <div className="space-y-3">
            {passage.paragraphs.map((para, index) => {
              const highlightClass = getHighlightClasses(para.id, highlights)
              const isHighlighted = highlightClass !== ''

              return (
                <div
                  key={para.id}
                  id={`para-${para.id}`}
                  className={`
                    text-[15px] leading-relaxed
                    ${highlightClass}
                    ${isHighlighted ? 'px-2 py-1' : ''}
                    focus:outline-none focus:ring-2 focus:ring-primary/50
                  `}
                  tabIndex={isHighlighted ? 0 : -1}
                  role="article"
                  aria-label={`段落 ${index + 1}`}
                >
                  {/* Optional paragraph number */}
                  {showParagraphNumbers && (
                    <span className="inline-block w-6 text-xs text-muted-foreground mr-2">
                      {index + 1}.
                    </span>
                  )}

                  {/* Sanitized paragraph content */}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: sanitizePassage(para.text),
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

/**
 * Get the ID of the first visible paragraph in the container
 */
function getFirstVisibleParagraph(container: HTMLDivElement): string | null {
  const paragraphs = container.querySelectorAll('[id^="para-"]')

  for (const para of Array.from(paragraphs)) {
    const rect = para.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    // Check if paragraph is visible in viewport
    if (rect.top >= containerRect.top && rect.top <= containerRect.bottom) {
      return para.id.replace('para-', '')
    }
  }

  return null
}

/**
 * Utility: Split passage text into paragraphs
 *
 * Use when passage doesn't have pre-segmented paragraphs
 */
export function segmentPassage(rawText: string): PassageVM['paragraphs'] {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  return lines.map((text, index) => ({
    id: `p${index + 1}`,
    text,
  }))
}

/**
 * Utility: Create PassageVM from raw text
 */
export function createPassageVM(rawText: string): PassageVM {
  return {
    raw: rawText,
    paragraphs: segmentPassage(rawText),
  }
}
