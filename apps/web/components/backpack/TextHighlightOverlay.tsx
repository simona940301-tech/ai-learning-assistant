'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Annotation } from '@/lib/types/annotation'

interface TextHighlightOverlayProps {
  annotations: Annotation[]
  viewport: { width: number; height: number }
  scale: number
  onDelete?: (annotationId: string) => void
  onClick?: (annotationId: string, rect: { x: number; y: number; width: number; height: number }) => void
}

/**
 * 極簡主義文字高亮覆蓋層
 * 
 * 設計原則：
 * - position: fixed + 滾動偏移，確保位置準確
 * - 40% 透明度，不遮擋文字
 * - Hover 顯示刪除按鈕（只在第一個矩形顯示）
 * - z-index 15（低於便利貼 20，高於繪圖 10）
 */
export function TextHighlightOverlay({
  annotations,
  viewport,
  scale,
  onDelete,
  onClick,
}: TextHighlightOverlayProps) {
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null)

  const highlights = useMemo(() => {
    return annotations.filter((ann) => ann.annotation_type === 'text-highlight')
  }, [annotations])

  // 🔍 強制調試：驗證接收到的數據
  console.log('[TextHighlightOverlay] Received data:', {
    annotationsCount: annotations.length,
    highlightsCount: highlights.length,
    viewport,
    scale,
    highlights: highlights.map((h) => ({
      id: h.id,
      rectsCount: h.data.rects?.length || 0,
      rects: h.data.rects?.map((r: any) => ({
        x: r.x,
        y: r.y,
        w: r.w ?? r.width,
        h: r.h ?? r.height,
        isValid: (r.w ?? r.width) > 0 && (r.h ?? r.height) > 0,
      })),
    })),
  })

  if (highlights.length === 0) return null

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 15, // 低於便利貼 20，高於繪圖 10，低於文字層 999
      }}
    >
      {highlights.map((ann) => {
        if (!ann.data.rects || !Array.isArray(ann.data.rects)) {
          console.warn('[TextHighlightOverlay] Invalid rects for annotation:', ann.id)
          return null
        }

        const color = ann.data.color || '#FFEB3B'
        const rects = ann.data.rects

        return (
          <div
            key={ann.id}
            className="pointer-events-auto"
            onMouseEnter={() => setHoveredHighlightId(ann.id)}
            onMouseLeave={() => setHoveredHighlightId(null)}
            onClick={(e) => {
              if (onClick && rects.length > 0) {
                e.stopPropagation()
                // Calculate bounding box of all rects for the anchor
                // For simplicity, use the first rect or calculate union
                // Here we pass the event target's bounding rect if possible, or calculate from data
                // Let's calculate the union of all rects for this annotation
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

                rects.forEach((r: any) => {
                  const x = r.x ?? 0
                  const y = r.y ?? 0
                  const w = r.width ?? r.w ?? 0
                  const h = r.height ?? r.h ?? 0

                  const pxX = (x / viewport.width) * viewport.width * scale
                  const pxY = (y / viewport.height) * viewport.height * scale
                  const pxW = (w / viewport.width) * viewport.width * scale
                  const pxH = (h / viewport.height) * viewport.height * scale

                  minX = Math.min(minX, pxX)
                  minY = Math.min(minY, pxY)
                  maxX = Math.max(maxX, pxX + pxW)
                  maxY = Math.max(maxY, pxY + pxH)
                })

                // Add scroll offset
                const scrollX = typeof window !== 'undefined' ? window.scrollX : 0
                const scrollY = typeof window !== 'undefined' ? window.scrollY : 0

                onClick(ann.id, {
                  x: minX + scrollX,
                  y: minY + scrollY,
                  width: maxX - minX,
                  height: maxY - minY
                })
              }
            }}
          >
            {rects.map((rect: any, idx: number) => {
              // 支援兩種格式：{x, y, w, h} 或 {x, y, width, height}
              const width = rect.width ?? rect.w ?? 0
              const height = rect.height ?? rect.h ?? 0
              const x = rect.x ?? 0
              const y = rect.y ?? 0

              // 🔍 調試：驗證 rect 數據
              if (width === 0 || height === 0 || isNaN(x) || isNaN(y)) {
                console.warn(`[TextHighlightOverlay] Invalid rect at index ${idx}:`, {
                  x,
                  y,
                  width,
                  height,
                  rect,
                })
                return null
              }

              // GoodNotes 策略：rects 是 PDF 內部座標（未縮放），需要應用 scale
              // 同時需要轉換為相對於頁面的座標（0-1 標準化）
              const normalizedX = x / viewport.width
              const normalizedY = y / viewport.height
              const normalizedW = width / viewport.width
              const normalizedH = height / viewport.height

              // 計算實際像素位置（應用 scale）
              const left = normalizedX * viewport.width * scale
              const top = normalizedY * viewport.height * scale
              const pixelWidth = normalizedW * viewport.width * scale
              const pixelHeight = normalizedH * viewport.height * scale

              // 🔍 調試：驗證計算結果
              if (pixelWidth <= 0 || pixelHeight <= 0) {
                console.warn(`[TextHighlightOverlay] Invalid calculated dimensions at index ${idx}:`, {
                  left,
                  top,
                  pixelWidth,
                  pixelHeight,
                  normalizedX,
                  normalizedY,
                  normalizedW,
                  normalizedH,
                })
                return null
              }

              // 計算滾動偏移（確保 fixed 定位正確）
              const scrollX = typeof window !== 'undefined' ? window.scrollX : 0
              const scrollY = typeof window !== 'undefined' ? window.scrollY : 0

              return (
                <div
                  key={idx}
                  className="absolute"
                  style={{
                    left: `${left + scrollX}px`,
                    top: `${top + scrollY}px`,
                    width: `${pixelWidth}px`,
                    height: `${pixelHeight}px`,
                    backgroundColor: color,
                    opacity: 0.4, // 40% 透明度
                    borderRadius: '2px',
                    mixBlendMode: 'multiply',
                    // 🔍 強制確保可見性
                    minWidth: '1px',
                    minHeight: '1px',
                    border: '1px solid rgba(0, 0, 0, 0.1)', // 添加邊框以便調試
                  }}
                >
                  {/* 刪除按鈕：只在第一個矩形且 hover 時顯示 */}
                  {idx === 0 && hoveredHighlightId === ann.id && onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(ann.id)
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-md transition-colors z-50"
                      aria-label="刪除高亮"
                      title="刪除高亮"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
