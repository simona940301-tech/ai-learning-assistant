'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/telemetry'
import type { Selection } from '@/hooks/useScopedAsk'

interface NoteCanvasProps {
  file: { id: string; kind: 'pdf' | 'image' | 'video' } | null
  onSelectionChange: (sel: Selection | null) => void
  onOpenAsk: () => void
}

export function NoteCanvas({ file, onSelectionChange, onOpenAsk }: NoteCanvasProps) {
  const [toolbar, setToolbar] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  })
  const containerRef = useRef<HTMLDivElement>(null)

  function handleTextSelection() {
    const sel = window.getSelection()
    const text = sel?.toString().trim()

    if (!text || !sel || sel.rangeCount === 0) {
      setToolbar((s) => ({ ...s, visible: false }))
      onSelectionChange(null)
      return
    }

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    // Get page number if in PDF (rough estimate)
    const page = file?.kind === 'pdf' ? Math.floor(rect.top / 800) + 1 : undefined

    setToolbar({
      x: rect.left + rect.width / 2,
      y: rect.top,
      visible: true,
    })

    onSelectionChange({
      text,
      rects: [{ x: rect.left, y: rect.top, width: rect.width, height: rect.height }],
      page,
    })
  }

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection)
    return () => document.removeEventListener('mouseup', handleTextSelection)
  }, [file])

  // Hide toolbar when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setToolbar((s) => ({ ...s, visible: false }))
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleHighlight = () => {
    track('backpack.note.highlight')
    // TODO: Implement highlight
    console.log('[NoteCanvas] Highlight')
    setToolbar((s) => ({ ...s, visible: false }))
  }

  const handleNote = () => {
    track('backpack.note.create')
    // TODO: Implement note
    console.log('[NoteCanvas] Create note')
    setToolbar((s) => ({ ...s, visible: false }))
  }

  const handleAsk = () => {
    track('backpack.ask.open')
    onOpenAsk()
    setToolbar((s) => ({ ...s, visible: false }))
  }

  return (
    <div ref={containerRef} className="h-full relative">
      {/* File Viewer */}
      <div className="h-full overflow-auto p-4">
        {file ? (
          <div className="max-w-4xl mx-auto">
            {file.kind === 'pdf' && (
              <div className="border rounded-lg p-4 bg-muted/30 min-h-[600px]">
                <div className="text-sm opacity-60 mb-4">PDF 檢視器（基礎版）</div>
                <div className="text-sm">
                  {/* TODO: Integrate PDF.js or existing PDF viewer */}
                  檔案 ID: {file.id}
                  <br />
                  請整合現有的 PDF 檢視器組件
                </div>
              </div>
            )}
            {file.kind === 'image' && (
              <div className="border rounded-lg overflow-hidden">
                {/* TODO: Replace with actual image viewer */}
                <div className="text-sm opacity-60 p-4 bg-muted/30">
                  圖片檢視器（基礎版）
                  <br />
                  檔案 ID: {file.id}
                </div>
              </div>
            )}
            {file.kind === 'video' && (
              <div className="border rounded-lg">
                {/* TODO: Replace with actual video player */}
                <div className="text-sm opacity-60 p-4 bg-muted/30">
                  影片播放器（基礎版）
                  <br />
                  檔案 ID: {file.id}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-2">📚</div>
              <div className="text-sm">選擇一個檔案開始閱讀</div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toolbar */}
      {toolbar.visible && (
        <div
          className="fixed z-50"
          style={{
            left: `${toolbar.x}px`,
            top: `${toolbar.y - 40}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="rounded-full border bg-background/90 backdrop-blur-sm px-2 py-1 shadow-lg flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleHighlight}
              className="px-2 text-xs h-7"
            >
              Highlight
            </Button>
            <span className="opacity-30">·</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNote}
              className="px-2 text-xs h-7"
            >
              Note
            </Button>
            <span className="opacity-30">·</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAsk}
              className="px-2 text-xs h-7"
            >
              Ask
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}




