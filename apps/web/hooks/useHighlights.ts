'use client'

import { useState, useEffect, useCallback } from 'react'
import { track } from '@/lib/telemetry'

export interface Highlight {
  id: string
  file_id: string
  page_number: number
  text: string
  rects: Array<{ x: number; y: number; width: number; height: number }>
  color: string
  created_at: string
}

/**
 * Hook for managing text highlights
 */
export function useHighlights(fileId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(false)

  // Load highlights for a file
  const loadHighlights = useCallback(async () => {
    if (!fileId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/backpack/annotations?file_id=${fileId}`)
      
      if (!response.ok) {
        throw new Error('Failed to load highlights')
      }

      const { annotations } = await response.json()
      const textHighlights = annotations
        .filter((a: any) => a.annotation_type === 'text-highlight')
        .map((a: any) => ({
          id: a.id,
          file_id: a.file_id,
          page_number: a.page_number,
          text: a.data.text || '',
          rects: a.data.rects || [],
          color: a.data.color || '#FFF59D',
          created_at: a.created_at,
        }))

      setHighlights(textHighlights)
    } catch (err) {
      console.error('[useHighlights] Failed to load highlights:', err)
    } finally {
      setLoading(false)
    }
  }, [fileId])

  // Create a new highlight
  const createHighlight = useCallback(async (
    pageNumber: number,
    text: string,
    rects: Array<{ x: number; y: number; width: number; height: number }>,
    color: string = '#FFF59D'
  ) => {
    if (!fileId) return null

    try {
      const response = await fetch('/api/backpack/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          page_number: pageNumber,
          annotation_type: 'text-highlight',
          data: {
            text,
            rects,
            color,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create highlight')
      }

      const { annotation } = await response.json()
      const highlight: Highlight = {
        id: annotation.id,
        file_id: annotation.file_id,
        page_number: annotation.page_number,
        text: annotation.data.text,
        rects: annotation.data.rects,
        color: annotation.data.color,
        created_at: annotation.created_at,
      }

      setHighlights((prev) => [...prev, highlight])
      track('backpack.reader.highlight.create', {
        file_id: fileId,
        page: pageNumber,
      })

      return highlight
    } catch (err) {
      console.error('[useHighlights] Failed to create highlight:', err)
      return null
    }
  }, [fileId])

  // Delete a highlight
  const deleteHighlight = useCallback(async (highlightId: string) => {
    try {
      const response = await fetch(`/api/backpack/annotations?id=${highlightId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete highlight')
      }

      setHighlights((prev) => prev.filter((h) => h.id !== highlightId))
      track('backpack.reader.highlight.delete', {
        file_id: fileId,
        highlight_id: highlightId,
      })
    } catch (err) {
      console.error('[useHighlights] Failed to delete highlight:', err)
    }
  }, [fileId])

  // Load highlights on mount and when fileId changes
  useEffect(() => {
    loadHighlights()
  }, [loadHighlights])

  return {
    highlights,
    loading,
    createHighlight,
    deleteHighlight,
    reload: loadHighlights,
  }
}
