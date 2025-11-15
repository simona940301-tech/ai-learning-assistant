'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, GripVertical } from 'lucide-react'
import { track } from '@/lib/telemetry'
import type { Annotation } from '@/lib/types/annotation'

interface StickyNoteLayerProps {
  pageNumber: number
  fileId: string
  tool: 'pen' | 'marker' | 'sticky' | 'eraser' | null
  color: string
  annotations: Annotation[]
  scale: number
  viewport: { width: number; height: number }
  onAnnotationCreate: (annotation: Annotation) => void
  onAnnotationUpdate: (annotation: Annotation) => void
  onAnnotationDelete: (annotationId: string) => void
  onToolChange?: (tool: 'pen' | 'marker' | 'sticky' | 'eraser' | null) => void
}

// 便利貼背景顏色選項（半透明 + 毛玻璃效果）
const BACKGROUND_COLORS = [
  { value: 'transparent', label: '透明', bg: 'bg-transparent', border: 'border-gray-300', color: 'rgba(255, 255, 255, 0.9)' },
  { value: 'yellow', label: '便利貼黃', bg: 'bg-yellow-200/40', border: 'border-yellow-400/60', color: '#FFF59D' },
  { value: 'pink', label: '粉紅', bg: 'bg-pink-200/40', border: 'border-pink-400/60', color: '#FFD1DC' },
  { value: 'blue', label: '淺藍', bg: 'bg-blue-200/40', border: 'border-blue-400/60', color: '#ADD8E6' },
  { value: 'green', label: '淺綠', bg: 'bg-green-200/40', border: 'border-green-400/60', color: '#90EE90' },
]

/**
 * 極簡主義便利貼組件
 * 
 * 設計原則：
 * - 響應式尺寸：根據文字內容自動調整，無多餘留白
 * - 可拖動：整個便利貼都可以拖動
 * - 固定內邊距：12-16px，確保可讀性
 * - 編輯模式：暫時變大，提供舒適的輸入體驗
 * - 空內容處理：顯示最小尺寸和提示文字
 */
export function StickyNoteLayer({
  pageNumber,
  fileId,
  tool,
  color,
  annotations,
  scale,
  viewport,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete,
  onToolChange,
}: StickyNoteLayerProps) {
  // 核心狀態
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState<string>('')
  const [editingBackground, setEditingBackground] = useState<string>('yellow')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [defaultBackground, setDefaultBackground] = useState<string>('transparent')

  const textInputRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const justDraggedRef = useRef(false)
  const pendingCreationRef = useRef<Map<string, Promise<void>>>(new Map())
  const editingIdRef = useRef<string | null>(null)
  const contentRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  // 便利貼陣列（從 annotations 過濾）
  const stickyNotes = annotations.filter((ann) => ann.annotation_type === 'sticky')

  // 追蹤目前編輯中的便利貼 ID
  useEffect(() => {
    editingIdRef.current = editingId
  }, [editingId])

  const waitForPendingCreation = useCallback(async (stickyId?: string | null) => {
    if (!stickyId) return
    const pending = pendingCreationRef.current.get(stickyId)
    if (pending) {
      try {
        await pending
      } catch {
        // 建立失敗已在建立流程中處理
      }
    }
  }, [])

  const persistStickyToServer = useCallback((sticky: Annotation) => {
    const promise = (async () => {
      try {
        const response = await fetch('/api/backpack/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sticky.id,
            file_id: sticky.file_id,
            page_number: sticky.page_number,
            annotation_type: sticky.annotation_type,
            data: sticky.data,
          }),
        })

        if (response.ok) {
          const { annotation: saved } = await response.json()
          onAnnotationUpdate(saved)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[StickyNoteLayer] Failed to create sticky note:', errorData)
          if (editingIdRef.current === sticky.id) {
            setEditingId(null)
            setEditingText('')
          }
          onAnnotationDelete(sticky.id)
        }
      } catch (err) {
        console.error('[StickyNoteLayer] Failed to create sticky note:', err)
        if (editingIdRef.current === sticky.id) {
          setEditingId(null)
          setEditingText('')
        }
        onAnnotationDelete(sticky.id)
      } finally {
        pendingCreationRef.current.delete(sticky.id)
      }
    })()

    pendingCreationRef.current.set(sticky.id, promise)
    return promise
  }, [onAnnotationUpdate, onAnnotationDelete])

  // 保存便利貼文字和尺寸
  const handleSaveSticky = useCallback(
    async (stickyId: string, text: string, bgColor: string) => {
      await waitForPendingCreation(stickyId)

      const sticky = stickyNotes.find((ann) => ann.id === stickyId)
      if (!sticky) return

      // 計算實際內容尺寸（用於保存，但顯示時仍使用響應式）
      const contentEl = contentRefs.current.get(stickyId)
      let actualWidth = 200 // 默認寬度
      let actualHeight = 80 // 默認最小高度

      if (contentEl) {
        const rect = contentEl.getBoundingClientRect()
        actualWidth = Math.max(150, Math.min(400, rect.width / scale))
        actualHeight = Math.max(80, rect.height / scale)
      }

      const updatedAnnotation: Annotation = {
        ...sticky,
        data: {
          ...sticky.data,
          content: text,
          backgroundColor: bgColor,
          width: actualWidth,
          height: actualHeight,
        },
        updated_at: new Date().toISOString(),
      }

      try {
        const response = await fetch('/api/backpack/annotations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: stickyId,
            file_id: sticky.file_id,
            page_number: sticky.page_number,
            annotation_type: sticky.annotation_type,
            data: updatedAnnotation.data,
          }),
        })

        if (response.ok) {
          const { annotation: saved } = await response.json()
          onAnnotationUpdate(saved)
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[StickyNoteLayer] Failed to save sticky note:', errorData)
        }
      } catch (err) {
        console.error('[StickyNoteLayer] Failed to save sticky note:', err)
      }
    },
    [stickyNotes, onAnnotationUpdate, waitForPendingCreation, scale]
  )

  // 完成編輯邏輯
  const handleCompleteEditing = useCallback(async () => {
    if (!editingId) return

    await waitForPendingCreation(editingId)
    const trimmedText = editingText.trim()

    if (trimmedText) {
      await handleSaveSticky(editingId, trimmedText, editingBackground)
    } else {
      // 空文字：刪除便利貼
      try {
        const response = await fetch(`/api/backpack/annotations?id=${editingId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          onAnnotationDelete(editingId)
        }
      } catch (err) {
        console.error('[StickyNoteLayer] Failed to delete empty sticky note:', err)
      }
    }
    
    setEditingId(null)
    setEditingText('')
    if (onToolChange) {
      onToolChange(null)
    }
  }, [editingId, editingText, editingBackground, handleSaveSticky, onAnnotationDelete, onToolChange, waitForPendingCreation])

  // 取消編輯
  const handleCancelEditing = useCallback(async () => {
    if (!editingId) return

    try {
      await waitForPendingCreation(editingId)
      const response = await fetch(`/api/backpack/annotations?id=${editingId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        onAnnotationDelete(editingId)
      }
    } catch (err) {
      console.error('[StickyNoteLayer] Failed to delete sticky note:', err)
    }

    setEditingId(null)
    setEditingText('')
    if (onToolChange) {
      onToolChange(null)
    }
  }, [editingId, onAnnotationDelete, onToolChange, waitForPendingCreation])

  // 智能外部點擊檢測
  useEffect(() => {
    if (!editingId) return

    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement

        if (editorRef.current?.contains(target)) {
          return
        }

        if (target.closest('.sticky-note-display')) {
          return
        }

        if (target === containerRef.current || containerRef.current?.contains(target)) {
          return
        }

        handleCompleteEditing()
      }

      document.addEventListener('mousedown', handleClickOutside, true)

      cleanup = () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [editingId, handleCompleteEditing])

  // 自動聚焦到文字輸入框
  useEffect(() => {
    if (editingId && textInputRef.current) {
      textInputRef.current.focus()
    }
  }, [editingId])

  // 全域拖動事件處理（優化：整個便利貼都可以拖動）
  useEffect(() => {
    if (!draggingId || !dragOffset || !containerRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const sticky = stickyNotes.find((ann) => ann.id === draggingId)
      if (!sticky || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeX = (e.clientX - containerRect.left - dragOffset.x) / scale
      const relativeY = (e.clientY - containerRect.top - dragOffset.y) / scale

      const updatedAnnotation: Annotation = {
        ...sticky,
        data: {
          ...sticky.data,
          x: Math.max(0, relativeX),
          y: Math.max(0, relativeY),
        },
      }
      onAnnotationUpdate(updatedAnnotation)
    }

    const handleMouseUp = async () => {
      if (draggingId) {
        await waitForPendingCreation(draggingId)
      }
      const sticky = stickyNotes.find((ann) => ann.id === draggingId)
      if (sticky) {
        try {
          const response = await fetch('/api/backpack/annotations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: sticky.id,
              file_id: sticky.file_id,
              page_number: sticky.page_number,
              annotation_type: sticky.annotation_type,
              data: sticky.data,
            }),
          })
          if (response.ok) {
            const { annotation: saved } = await response.json()
            onAnnotationUpdate(saved)
            track('backpack.reader.sticky.move', { page: pageNumber })
          }
        } catch (err) {
          console.error('[StickyNoteLayer] Failed to save sticky position:', err)
        }
      }

      justDraggedRef.current = true
      setTimeout(() => {
        setDraggingId(null)
        setDragOffset(null)
        setTimeout(() => {
          justDraggedRef.current = false
        }, 100)
      }, 10)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingId, dragOffset, stickyNotes, scale, onAnnotationUpdate, pageNumber, waitForPendingCreation])

  // 點擊捕獲層
  const handleClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tool !== 'sticky') return
      if (editingId) return

      if (e.target !== e.currentTarget) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / scale
      const y = (e.clientY - rect.top) / scale

      // 檢查是否點擊在現有便利貼上
      const clickedSticky = stickyNotes.find((ann) => {
        const sx = ann.data.x || 0
        const sy = ann.data.y || 0
        const sw = ann.data.width || 200
        const sh = ann.data.height || 150
        return x >= sx && x <= sx + sw && y >= sy && y <= sy + sh
      })

      if (clickedSticky) {
        setEditingId(clickedSticky.id)
        setEditingText(clickedSticky.data.content || '')
        setEditingBackground(clickedSticky.data.backgroundColor || 'yellow')
        return
      }

      // 創建新便利貼（使用最小尺寸）
      const newSticky: Annotation = {
        id: crypto.randomUUID(),
        file_id: fileId,
        page_number: pageNumber,
        annotation_type: 'sticky',
        data: {
          x,
          y,
          width: 200, // 初始寬度，會自動調整
          height: 80, // 最小高度
          content: '',
          backgroundColor: defaultBackground,
          color: color,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onAnnotationCreate(newSticky)
      setEditingId(newSticky.id)
      setEditingText('')
      setEditingBackground(defaultBackground)
      persistStickyToServer(newSticky)

      track('backpack.reader.sticky.create', { page: pageNumber })
    },
    [tool, editingId, scale, stickyNotes, fileId, pageNumber, defaultBackground, color, onAnnotationCreate, persistStickyToServer]
  )

  // 開始拖動（優化：整個便利貼都可以拖動，不只是手柄）
  const handleDragStart = useCallback(
    (e: React.MouseEvent, stickyId: string) => {
      e.stopPropagation()
      e.preventDefault()
      const sticky = stickyNotes.find((ann) => ann.id === stickyId)
      if (!sticky || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const stickyX = (sticky.data.x || 0) * scale
      const stickyY = (sticky.data.y || 0) * scale
      const offsetX = (e.clientX - containerRect.left) - stickyX
      const offsetY = (e.clientY - containerRect.top) - stickyY

      setDraggingId(stickyId)
      setDragOffset({ x: offsetX, y: offsetY })
    },
    [stickyNotes, scale]
  )

  // 點擊便利貼進入編輯模式
  const handleStickyClick = useCallback(
    (stickyId: string) => {
      if (justDraggedRef.current) {
        justDraggedRef.current = false
        return
      }
      if (draggingId) return
      const sticky = stickyNotes.find((ann) => ann.id === stickyId)
      if (!sticky) return

      setEditingId(stickyId)
      setEditingText(sticky.data.content || '')
      setEditingBackground(sticky.data.backgroundColor || 'yellow')
    },
    [draggingId, stickyNotes]
  )

  // 刪除便利貼
  const handleDeleteSticky = useCallback(
    async (stickyId: string, e: React.MouseEvent) => {
      e.stopPropagation()

      if (editingId === stickyId) {
        setEditingId(null)
        setEditingText('')
      }

      try {
        await waitForPendingCreation(stickyId)
        const response = await fetch(`/api/backpack/annotations?id=${stickyId}`, {
          method: 'DELETE',
        })
        if (response.ok) {
          onAnnotationDelete(stickyId)
          track('backpack.reader.sticky.delete', { page: pageNumber })
        }
      } catch (err) {
        console.error('[StickyNoteLayer] Failed to delete sticky note:', err)
      }
    },
    [editingId, onAnnotationDelete, pageNumber, waitForPendingCreation]
  )

  const editingSticky = editingId ? stickyNotes.find((ann) => ann.id === editingId) : null
  const bgConfig = BACKGROUND_COLORS.find((c) => c.value === editingBackground) || BACKGROUND_COLORS[1]

  return (
    <>
      {/* 點擊捕獲層 */}
      {tool === 'sticky' && !editingId && !draggingId && (
        <div
          ref={containerRef}
          className="absolute inset-0 z-15"
          style={{ pointerEvents: 'auto' }}
          onClick={handleClickCapture}
        />
      )}

      {/* 便利貼顯示層：響應式設計 */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {stickyNotes.map((sticky) => {
          const isEditing = editingId === sticky.id
          const isDragging = draggingId === sticky.id
          const bgColor = BACKGROUND_COLORS.find((c) => c.value === sticky.data.backgroundColor || 'yellow') || BACKGROUND_COLORS[1]
          const content = sticky.data.content || ''
          const isEmpty = !content.trim()

          return (
            <motion.div
              key={sticky.id}
              className={`sticky-note-display group absolute rounded-xl shadow-md pointer-events-auto border-2 ${
                isEditing ? 'ring-2 ring-blue-500 border-blue-500' : bgColor.border
              } ${bgColor.bg} backdrop-blur-md transition-all ${
                isDragging ? 'cursor-grabbing opacity-80' : 'cursor-move'
              } ${!isEditing ? 'hover:ring-2 hover:ring-blue-300' : ''}`}
              style={{
                left: `${(sticky.data.x || 0) * scale}px`,
                top: `${(sticky.data.y || 0) * scale}px`,
                // 🎯 響應式尺寸：移除固定寬高，使用 min/max 約束
                minWidth: `${150 * scale}px`, // 最小寬度 150px
                maxWidth: `${400 * scale}px`, // 最大寬度 400px
                width: 'auto', // 自動寬度，根據內容調整
                minHeight: `${80 * scale}px`, // 最小高度 80px
                height: 'auto', // 自動高度，根據內容調整
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onMouseDown={(e) => {
                // 🎯 優化：整個便利貼都可以拖動（除了編輯模式和按鈕）
                if (!isEditing && !draggingId) {
                  const target = e.target as HTMLElement
                  // 如果點擊的是按鈕或輸入框，不拖動
                  if (target.closest('button') || target.closest('textarea') || target.closest('.textbox-editor')) {
                    return
                  }
                  e.stopPropagation()
                  handleDragStart(e, sticky.id)
                }
              }}
              onClick={(e) => {
                if (!isEditing && !draggingId && !justDraggedRef.current) {
                  e.stopPropagation()
                  handleStickyClick(sticky.id)
                }
              }}
            >
              {/* 顯示模式：響應式內容 */}
              {!isEditing && (
                <>
                  {/* 刪除按鈕（hover 時顯示） */}
                  <button
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10 hover:bg-red-600"
                    onClick={(e) => handleDeleteSticky(sticky.id, e)}
                    onMouseDown={(e) => e.stopPropagation()}
                    aria-label="刪除"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* 🎯 文字內容：固定內邊距，自動換行 */}
                  <div
                    ref={(el) => {
                      if (el) {
                        contentRefs.current.set(sticky.id, el)
                      } else {
                        contentRefs.current.delete(sticky.id)
                      }
                    }}
                    className="px-4 py-3 text-gray-800 dark:text-gray-200 text-sm leading-relaxed break-words"
                    style={{
                      // 固定內邊距：12-16px（不隨容器大小改變）
                      padding: `${12 * scale}px ${16 * scale}px`,
                      // 文字溢出處理：自動換行
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      // 確保最小寬度可用於文字
                      minWidth: `${118 * scale}px`, // 150px - 32px padding
                    }}
                  >
                    {isEmpty ? (
                      <span className="text-gray-400 dark:text-gray-500 italic">
                        點擊輸入文字...
                      </span>
                    ) : (
                      <span className="whitespace-pre-wrap">{content}</span>
                    )}
                  </div>
                </>
              )}

              {/* 編輯模式：暫時變大，提供舒適的輸入體驗 */}
              {isEditing && editingSticky && (
                <div 
                  ref={editorRef} 
                  className="textbox-editor w-full flex flex-col rounded-xl"
                  style={{
                    backgroundColor: bgConfig.color,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    opacity: bgConfig.value === 'transparent' ? 0.9 : 0.7,
                    // 🎯 編輯模式：最小高度增加，提供更舒適的輸入體驗
                    minHeight: `${120 * scale}px`,
                    minWidth: `${200 * scale}px`,
                  }}
                >
                  {/* 背景選擇器 */}
                  <div className="flex items-center gap-2 p-2 border-b border-gray-300/50">
                    {BACKGROUND_COLORS.map((bg) => (
                      <button
                        key={bg.value}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          editingBackground === bg.value
                            ? 'border-blue-500 scale-110 ring-2 ring-blue-200'
                            : 'border-gray-300 hover:scale-105'
                        } ${bg.bg}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingBackground(bg.value)
                        }}
                        aria-label={bg.label}
                      />
                    ))}
                  </div>

                  {/* 取消按鈕 */}
                  <button
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center shadow-md z-10 hover:bg-gray-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelEditing()
                    }}
                    aria-label="取消"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* 🎯 文字輸入框：自動調整大小 */}
                  <textarea
                    ref={textInputRef}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="flex-1 p-3 resize-none bg-transparent text-gray-800 dark:text-gray-200 text-sm leading-relaxed focus:outline-none"
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      minHeight: `${60 * scale}px`,
                      // 固定內邊距
                      padding: `${12 * scale}px ${16 * scale}px`,
                      // 自動換行
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                    placeholder="輸入文字..."
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault()
                        handleCancelEditing()
                      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleCompleteEditing()
                      }
                    }}
                  />

                  {/* 確認按鈕 */}
                  <button
                    className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-md z-10 hover:bg-blue-600 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCompleteEditing()
                    }}
                    aria-label="確認"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </>
  )
}
