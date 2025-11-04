'use client'

import { useState, useEffect, useRef } from 'react'
import { track } from '@plms/shared/analytics'

interface TextSelection {
  text: string
  startOffset: number
  endOffset: number
  container: HTMLElement
}

interface Highlight {
  id: string
  text: string
  startOffset: number
  endOffset: number
  note?: string
}

interface MinimalNotesProps {
  containerRef: React.RefObject<HTMLElement>
  questionId: string
  highlights?: Highlight[]
  onSave?: (highlights: Highlight[], notes: Highlight[]) => void
}

/**
 * S3: Minimal Notes
 * Text selection → highlight + note (≤140 chars)
 */
export function MinimalNotes({ containerRef, questionId, highlights: initialHighlights = [], onSave }: MinimalNotesProps) {
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null)
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null)
  const [editingNote, setEditingNote] = useState<string>('')
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleSelection = () => {
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0) {
        setSelectedText(null)
        setToolbarPosition(null)
        return
      }

      const range = selection.getRangeAt(0)
      const text = range.toString().trim()
      
      if (text.length < 3) {
        setSelectedText(null)
        setToolbarPosition(null)
        return
      }

      const containerRect = container.getBoundingClientRect()
      const rangeRect = range.getBoundingClientRect()
      
      setSelectedText({
        text,
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        container,
      })
      
      setToolbarPosition({
        x: rangeRect.left - containerRect.left + rangeRect.width / 2,
        y: rangeRect.top - containerRect.top - 40,
      })
    }

    const handleClick = (e: MouseEvent) => {
      // Close toolbar if clicking outside
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setSelectedText(null)
        setToolbarPosition(null)
        setActiveNoteId(null)
      }
    }

    container.addEventListener('mouseup', handleSelection)
    document.addEventListener('click', handleClick)
    
    return () => {
      container.removeEventListener('mouseup', handleSelection)
      document.removeEventListener('click', handleClick)
    }
  }, [containerRef])

  const handleHighlight = () => {
    if (!selectedText) return
    
    const highlight: Highlight = {
      id: `h-${Date.now()}`,
      text: selectedText.text,
      startOffset: selectedText.startOffset,
      endOffset: selectedText.endOffset,
    }
    
    setHighlights((prev) => [...prev, highlight])
    setSelectedText(null)
    setToolbarPosition(null)
    
    track('notes.create', { type: 'highlight', qid: questionId })
  }

  const handleNote = () => {
    if (!selectedText) return
    
    setActiveNoteId(`n-${Date.now()}`)
    setEditingNote('')
  }

  const saveNote = () => {
    if (!selectedText || !editingNote.trim()) return
    
    const highlight: Highlight = {
      id: activeNoteId || `n-${Date.now()}`,
      text: selectedText.text,
      startOffset: selectedText.startOffset,
      endOffset: selectedText.endOffset,
      note: editingNote.trim().substring(0, 140),
    }
    
    setHighlights((prev) => {
      const filtered = prev.filter((h) => h.id !== activeNoteId)
      return [...filtered, highlight]
    })
    
    setSelectedText(null)
    setToolbarPosition(null)
    setActiveNoteId(null)
    setEditingNote('')
    
    track('notes.create', { type: 'note', qid: questionId })
    
    // Update existing note
    if (activeNoteId && activeNoteId.startsWith('n-')) {
      track('notes.update', { qid: questionId })
    }
  }

  const toggleHighlight = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
    track('notes.delete', { qid: questionId })
  }

  // Render highlights in container
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Simple highlight rendering (would need more sophisticated text range handling in production)
    // For MVP, we'll use CSS classes on parent elements
    
    return () => {
      // Cleanup
    }
  }, [highlights, containerRef])

  return (
    <>
      {/* Floating Toolbar */}
      {toolbarPosition && selectedText && (
        <div
          ref={toolbarRef}
          className="fixed z-50 flex gap-1 rounded-lg border border-border bg-background shadow-lg p-1"
          style={{
            left: `${toolbarPosition.x}px`,
            top: `${toolbarPosition.y}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <button
            type="button"
            onClick={handleHighlight}
            className="rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            高亮
          </button>
          <button
            type="button"
            onClick={handleNote}
            className="rounded px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
          >
            筆記
          </button>
        </div>
      )}

      {/* Note Editor */}
      {activeNoteId && selectedText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-background p-4 shadow-lg">
            <div className="mb-2 text-sm font-medium">添加筆記</div>
            <textarea
              value={editingNote}
              onChange={(e) => setEditingNote(e.target.value)}
              maxLength={140}
              placeholder="輸入筆記（最多140字）"
              className="w-full rounded border border-border bg-background p-2 text-sm"
              rows={3}
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveNoteId(null)
                  setEditingNote('')
                }}
                className="rounded px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveNote}
                className="rounded px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10"
              >
                保存
              </button>
            </div>
            <div className="mt-1 text-right text-[10px] text-muted-foreground">
              {editingNote.length}/140
            </div>
          </div>
        </div>
      )}

      {/* Note Markers */}
      {highlights.filter((h) => h.note).map((highlight) => (
        <button
          key={highlight.id}
          type="button"
          onClick={() => {
            setActiveNoteId(highlight.id)
            setEditingNote(highlight.note || '')
          }}
          className="absolute inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[10px] text-foreground shadow-sm"
          style={{
            // Position would need to be calculated from offsets
            // Simplified for MVP
          }}
        >
          🗒️
        </button>
      ))}
    </>
  )
}

