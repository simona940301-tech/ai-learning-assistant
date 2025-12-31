'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface NativeSelection {
  text: string
  range: Range
  rects: DOMRect[]
  containerElement: Element | null
}

/**
 * Native PDF Selection Hook
 *
 * Uses browser's native Selection API (selectionchange event) to track text selection.
 * This approach provides:
 * - Native iOS/Android selection handles and system menus
 * - Better accessibility support
 * - More reliable multi-line selection
 * - Compatibility with screen readers
 *
 * Key differences from custom drag-based selection:
 * - Relies on browser's native selection behavior
 * - Works with pdf.js textLayer spans that have user-select: text
 * - No custom drag box implementation
 * - Selection handles appear automatically on mobile
 */
export function useNativePdfSelection(
  containerRef: React.RefObject<HTMLElement>,
  validContainerSelector: string = '.textLayer, .ocrTextLayer'
) {
  const [selection, setSelection] = useState<NativeSelection | null>(null)
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSelectionRef = useRef<NativeSelection | null>(null)

  /**
   * Handles selectionchange event
   * Calculates selection rects using Range.getClientRects()
   */
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()

    // Clear selection if nothing is selected
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      setSelection(null)
      lastSelectionRef.current = null
      return
    }

    const range = sel.getRangeAt(0)
    const text = sel.toString().trim()

    // Ignore very short selections (likely accidental)
    if (text.length < 2) {
      setSelection(null)
      lastSelectionRef.current = null
      return
    }

    // Check if selection is within valid containers (textLayer or ocrTextLayer)
    const commonAncestor = range.commonAncestorContainer
    const containerElement =
      commonAncestor.nodeType === Node.ELEMENT_NODE
        ? (commonAncestor as Element)
        : commonAncestor.parentElement

    if (!containerElement) {
      setSelection(null)
      lastSelectionRef.current = null
      return
    }

    // Validate selection is within textLayer or ocrTextLayer
    const validContainer = containerElement.closest(validContainerSelector)
    if (!validContainer) {
      setSelection(null)
      lastSelectionRef.current = null
      return
    }

    // Get all selection rects (supports multi-line selection)
    const clientRects = range.getClientRects()
    const rects = Array.from(clientRects)

    // Filter out zero-size rects (can happen with line breaks)
    const validRects = rects.filter((rect) => rect.width > 0 && rect.height > 0)

    if (validRects.length === 0) {
      setSelection(null)
      lastSelectionRef.current = null
      return
    }

    const newSelection: NativeSelection = {
      text,
      range,
      rects: validRects,
      containerElement: validContainer,
    }

    // 只在選取內容與上次不同時才更新（避免重複觸發）
    const hasChanged =
      !lastSelectionRef.current ||
      lastSelectionRef.current.text !== text ||
      lastSelectionRef.current.rects.length !== validRects.length

    if (!hasChanged) {
      return
    }

    lastSelectionRef.current = newSelection
    setSelection(newSelection)

    // 僅在開發模式下記錄，且只記錄關鍵訊息
    if (process.env.NODE_ENV === 'development') {
      console.log('[useNativePdfSelection] New selection:', {
        text: text.substring(0, 30) + (text.length > 30 ? '...' : ''),
        length: text.length,
        rectsCount: validRects.length,
      })
    }
  }, [validContainerSelector])

  /**
   * Debounced selection change handler
   * Prevents excessive re-renders during selection
   */
  const handleSelectionChangeDebounced = useCallback(() => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current)
    }

    selectionTimeoutRef.current = setTimeout(() => {
      handleSelectionChange()
    }, 300) // 300ms debounce - 更長的延遲以減少觸發頻率
  }, [handleSelectionChange])

  /**
   * Handle mouseup/touchend events
   * This provides better UX by only checking selection when user finishes selecting
   */
  const handlePointerUp = useCallback(() => {
    // Small delay to let browser finish selection
    setTimeout(() => {
      handleSelectionChange()
    }, 50)
  }, [handleSelectionChange])

  /**
   * Listen to document selectionchange + mouseup/touchend events
   * Primary: mouseup/touchend (when user finishes selecting)
   * Fallback: selectionchange (debounced, for keyboard selection)
   */
  useEffect(() => {
    // Primary: Listen for mouseup/touchend
    document.addEventListener('mouseup', handlePointerUp)
    document.addEventListener('touchend', handlePointerUp)

    // Fallback: Debounced selectionchange for keyboard selection
    document.addEventListener('selectionchange', handleSelectionChangeDebounced)

    return () => {
      document.removeEventListener('mouseup', handlePointerUp)
      document.removeEventListener('touchend', handlePointerUp)
      document.removeEventListener('selectionchange', handleSelectionChangeDebounced)
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
      }
    }
  }, [handlePointerUp, handleSelectionChangeDebounced])

  /**
   * Clear selection programmatically
   */
  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges()
    setSelection(null)
    lastSelectionRef.current = null
  }, [])

  return {
    selection,
    clearSelection,
  }
}
