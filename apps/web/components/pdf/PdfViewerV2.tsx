'use client'

/**
 * PdfViewerV2 - GoodNotes-level PDF Viewer with Native Selection
 *
 * This is the next-generation PDF viewer that uses native Selection API
 * instead of custom drag-based selection. This provides:
 *
 * ✅ Native iOS/Android selection handles
 * ✅ System copy/paste menu integration
 * ✅ Better accessibility (screen readers)
 * ✅ More reliable multi-line selection
 * ✅ Professional-grade text selection experience
 *
 * Key Components:
 * - useNativePdfSelection: Tracks native text selection via selectionchange
 * - SelectionActionBar: GoodNotes-style action toolbar (7 actions)
 * - PdfTextLayer: pdf.js textLayer with user-select: text
 * - OcrTextLayer: OCR-generated selectable text layer
 *
 * Architecture:
 * 1. pdf.js renders PDF canvas + textLayer
 * 2. textLayer has user-select: text (native selection enabled)
 * 3. selectionchange event fires when user selects text
 * 4. SelectionActionBar appears with smart positioning
 * 5. Actions convert DOMRects to PDF coordinates for storage
 */

import { useState, useCallback, useMemo } from 'react'
import { useNativePdfSelection } from '@/hooks/useNativePdfSelection'
import { useIsIOS } from '@/hooks/useIsIOS'
import { SelectionActionBar } from './SelectionActionBar'
import { clientRectsToNormalized, unionRects } from '@/lib/pdf/coordinate-utils'
import { track } from '@/lib/telemetry'
import { toast } from 'sonner'

interface PdfViewerV2Props {
  /** Container ref from parent (for page element queries) */
  containerRef: React.RefObject<HTMLDivElement>
  /** Current viewport map (pageNumber -> viewport) */
  viewportMap: Map<number, any>
  /** Current scale */
  scale: number
  /** Highlight creation callback */
  onHighlight?: (
    pageNumber: number,
    text: string,
    rects: Array<{ x: number; y: number; width: number; height: number }>,
    color: string
  ) => void
  /** Ask AI callback */
  onAskAI?: (text: string, pageNumber: number) => void
}

/**
 * PdfViewerV2 - Selection Management Layer
 *
 * This component doesn't render the PDF itself - that's done by the parent.
 * Instead, it manages the selection state and action bar positioning.
 */
export function PdfViewerV2({
  containerRef,
  viewportMap,
  scale,
  onHighlight,
  onAskAI,
}: PdfViewerV2Props) {
  const isIOS = useIsIOS()
  const { selection, clearSelection } = useNativePdfSelection(
    containerRef,
    '.textLayer, .ocrTextLayer'
  )

  /**
   * Extract page number from selection container
   */
  const getPageNumberFromSelection = useCallback(
    (containerElement: Element | null): number => {
      if (!containerElement) return 1

      // Find parent with data-page-number attribute
      const pageElement = containerElement.closest('[data-page-number]') as HTMLElement
      if (!pageElement) return 1

      return parseInt(pageElement.dataset.pageNumber || '1', 10)
    },
    []
  )

  /**
   * Convert selection to PDF coordinates for storage
   */
  const convertSelectionToPDFCoords = useCallback(
    (selection: any, pageNumber: number) => {
      const viewport = viewportMap.get(pageNumber)
      if (!viewport || !containerRef.current) return null

      const pageElement = containerRef.current.querySelector(
        `[data-page-number="${pageNumber}"]`
      ) as HTMLElement
      if (!pageElement) return null

      // Convert DOMRects to normalized coordinates (0-1 range)
      const normalizedRects = clientRectsToNormalized(
        selection.rects,
        pageElement,
        viewport
      )

      return {
        pageNumber,
        text: selection.text,
        normalizedRects,
      }
    },
    [viewportMap, containerRef]
  )

  /**
   * Action: Copy to clipboard
   */
  const handleCopy = useCallback(() => {
    if (!selection) return

    navigator.clipboard
      .writeText(selection.text)
      .then(() => {
        console.log('[PdfViewerV2] Text copied to clipboard')
        track('pdf.selection.copy.success')
      })
      .catch((err) => {
        console.error('[PdfViewerV2] Failed to copy:', err)
        track('pdf.selection.copy.error')
      })

    clearSelection()
  }, [selection, clearSelection])

  /**
   * Action: Highlight text
   */
  const handleHighlight = useCallback(
    (color: string) => {
      if (!selection || !onHighlight) return

      const pageNumber = getPageNumberFromSelection(selection.containerElement)
      const pdfCoords = convertSelectionToPDFCoords(selection, pageNumber)

      if (!pdfCoords) {
        console.error('[PdfViewerV2] Failed to convert selection to PDF coords')
        return
      }

      onHighlight(pageNumber, pdfCoords.text, pdfCoords.normalizedRects, color)
      clearSelection()
    },
    [selection, onHighlight, getPageNumberFromSelection, convertSelectionToPDFCoords, clearSelection]
  )

  /**
   * Action: Strikeout text
   * TODO: Implement strikeout annotation
   */
  const handleStrikeout = useCallback(() => {
    if (!selection) return

    // console.log('[PdfViewerV2] Strikeout not yet implemented')
    track('pdf.selection.strikeout')
    toast.info('Strikeout feature coming soon!')
    // TODO: Create strikeout annotation
    clearSelection()
  }, [selection, clearSelection])

  /**
   * Action: Define (dictionary lookup)
   * Uses Web Speech API or fallback to custom dictionary
   */
  const handleDefine = useCallback(() => {
    if (!selection) return

    const text = selection.text.trim()

    // Try to open system dictionary (iOS only)
    if (isIOS && 'getSelection' in window) {
      // iOS will show "Look Up" in system menu
      // We can't programmatically trigger it, so just log
      console.log('[PdfViewerV2] Use iOS "Look Up" for:', text)
    } else {
      // Fallback: Open custom dictionary or Google search
      const searchUrl = `https://www.google.com/search?q=define+${encodeURIComponent(text)}`
      window.open(searchUrl, '_blank', 'noopener,noreferrer')
    }

    track('pdf.selection.define', { text: text.substring(0, 20) })
    clearSelection()
  }, [selection, isIOS, clearSelection])

  /**
   * Action: Speak (TTS)
   * Uses Web Speech Synthesis API
   */
  const handleSpeak = useCallback(() => {
    if (!selection) return

    const text = selection.text

    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      window.speechSynthesis.speak(utterance)

      track('pdf.selection.speak', { length: text.length })
    } else {
      console.warn('[PdfViewerV2] Speech synthesis not supported')
      track('pdf.selection.speak.unsupported')
    }

    clearSelection()
  }, [selection, clearSelection])

  /**
   * Action: Add comment
   * TODO: Implement comment annotation
   */
  const handleComment = useCallback(() => {
    if (!selection) return

    // console.log('[PdfViewerV2] Comment not yet implemented')
    track('pdf.selection.comment')
    toast.info('Commments feature coming soon!')
    // TODO: Open comment input dialog
    clearSelection()
  }, [selection, clearSelection])

  /**
   * Action: Ask AI
   */
  const handleAskAI = useCallback(() => {
    if (!selection || !onAskAI) return

    const pageNumber = getPageNumberFromSelection(selection.containerElement)
    onAskAI(selection.text, pageNumber)
    clearSelection()
  }, [selection, onAskAI, getPageNumberFromSelection, clearSelection])

  /**
   * Calculate action bar position
   */
  const actionBarAnchor = useMemo(() => {
    if (!selection || selection.rects.length === 0) return null

    // Use union of all rects for multi-line selection
    return unionRects(selection.rects)
  }, [selection])

  /**
   * Container bounds for action bar edge detection
   */
  const containerBounds = useMemo(() => {
    if (!containerRef.current) {
      return new DOMRect(0, 0, window.innerWidth, window.innerHeight)
    }
    return containerRef.current.getBoundingClientRect()
  }, [containerRef, selection]) // Recalculate when selection changes

  if (!selection || !actionBarAnchor) {
    return null
  }

  return (
    <SelectionActionBar
      anchorRect={actionBarAnchor}
      containerRect={containerBounds}
      onCopy={handleCopy}
      onHighlight={handleHighlight}
      onStrikeout={handleStrikeout}
      onDefine={handleDefine}
      onSpeak={handleSpeak}
      onComment={handleComment}
      onAskAI={handleAskAI}
      isIOS={isIOS}
      minimized={false} // TODO: Detect iOS system menu visibility
    />
  )
}
