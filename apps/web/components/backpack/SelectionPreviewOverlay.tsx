'use client'

import { useMemo } from 'react'
import type { TextSelection } from '@/hooks/usePdfTextSelection'

interface SelectionPreviewOverlayProps {
  selection: TextSelection | null
  viewport: { width: number; height: number }
  scale: number
  pageElement: HTMLElement | null
}

/**
 * 實時選取預覽層 - 顯示當前選取的文字區域
 * 
 * 用於調試和視覺反饋：
 * - 顯示當前選取的矩形區域
 * - 藍色半透明背景
 * - z-index: 1001，位於所有層之上
 */
export function SelectionPreviewOverlay({
  selection,
  viewport,
  scale,
  pageElement,
}: SelectionPreviewOverlayProps) {
  const previewRects = useMemo(() => {
    if (!selection || !pageElement || selection.rects.length === 0) {
      return []
    }

    const pageRect = pageElement.getBoundingClientRect()
    // 🔧 修復：fixed 定位不需要 scrollX/Y，因為它相對於視窗

    // 將 PDF 內部座標轉換為屏幕座標
    return selection.rects.map((rect) => {
      // 標準化座標（0-1）
      const normalizedX = rect.x / viewport.width
      const normalizedY = rect.y / viewport.height
      const normalizedW = rect.w / viewport.width
      const normalizedH = rect.h / viewport.height

      // 應用 scale 和頁面偏移（fixed 定位直接使用 getBoundingClientRect 的值）
      const left = pageRect.left + normalizedX * viewport.width * scale
      const top = pageRect.top + normalizedY * viewport.height * scale
      const width = normalizedW * viewport.width * scale
      const height = normalizedH * viewport.height * scale

      return {
        left,
        top,
        width,
        height,
        isValid: width > 0 && height > 0 && !isNaN(left) && !isNaN(top),
      }
    })
  }, [selection, viewport, scale, pageElement])

  if (!selection || previewRects.length === 0) {
    return null
  }

  // 🔍 調試日誌
  console.log('[SelectionPreviewOverlay] Rendering preview:', {
    rectsCount: previewRects.length,
    previewRects: previewRects.map((r) => ({
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      isValid: r.isValid,
    })),
    selectionText: selection.text.substring(0, 50),
  })

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 1001, // 位於所有層之上
      }}
    >
      {previewRects.map((rect, idx) => {
        if (!rect.isValid) {
          console.warn(`[SelectionPreviewOverlay] Invalid rect at index ${idx}:`, rect)
          return null
        }

        return (
          <div
            key={idx}
            className="absolute"
            style={{
              left: `${rect.left}px`,
              top: `${rect.top}px`,
              width: `${Math.max(rect.width, 1)}px`, // 確保至少 1px
              height: `${Math.max(rect.height, 1)}px`, // 確保至少 1px
              backgroundColor: 'rgba(100, 150, 255, 0.4)', // 🔧 提高透明度，確保可見
              border: '2px solid rgba(100, 150, 255, 0.8)', // 🔧 加粗邊框，確保可見
              borderRadius: '2px',
              pointerEvents: 'none',
              // 🔧 強制確保可見性
              minWidth: '1px',
              minHeight: '1px',
            }}
          />
        )
      })}
    </div>
  )
}

