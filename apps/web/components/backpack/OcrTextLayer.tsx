'use client'

import { useEffect, useRef } from 'react'

interface OCRBoundingBox {
  x: number // Normalized 0-1
  y: number // Normalized 0-1
  width: number // Normalized 0-1
  height: number // Normalized 0-1
  text: string
  confidence?: number
}

interface OcrTextLayerProps {
  pageNumber: number
  bboxes: OCRBoundingBox[]
  viewport: { width: number; height: number }
}

/**
 * Renders OCR text layer from bbox_json for text selection
 * Used when PDF has no native text layer (scanned PDFs)
 */
export function OcrTextLayer({ pageNumber, bboxes, viewport }: OcrTextLayerProps) {
  const textLayerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!bboxes || bboxes.length === 0 || !textLayerRef.current) return
    
    const textLayerDiv = textLayerRef.current
    textLayerDiv.innerHTML = '' // Clear previous content
    
    const fragment = document.createDocumentFragment()
    
    bboxes.forEach((bbox, index) => {
      if (!bbox.text || bbox.text.trim().length === 0) return
      
      // Convert normalized coordinates (0-1) to pixel positions
      // 使用 Math.ceil() 向上取整 + 1 像素安全邊界，確保完全覆蓋
      const left = Math.ceil(bbox.x * viewport.width)
      const top = Math.ceil(bbox.y * viewport.height)
      const width = Math.ceil(bbox.width * viewport.width) + 1 // +1 像素安全邊界
      const height = Math.ceil(bbox.height * viewport.height) + 1 // +1 像素安全邊界
      
      const span = document.createElement('span')
      span.textContent = bbox.text
      span.style.position = 'absolute'
      span.style.left = `${left}px`
      span.style.top = `${top}px`
      span.style.width = `${width}px`
      span.style.height = `${height}px`
      span.style.whiteSpace = 'pre-wrap'
      span.style.opacity = '0' // Invisible but selectable
      span.style.pointerEvents = 'auto'
      // 強制設置文字選取屬性（使用 !important 級別的設置）
      // 確保游標繼承：使用 cursor: inherit 讓子元素繼承父容器的 cursor: text
      span.style.userSelect = 'text'
      span.style.cursor = 'inherit' // 繼承父容器的 cursor: text
      span.style.fontSize = `${Math.ceil(height * 0.8)}px` // Estimate font size from height (向上取整)
      span.style.lineHeight = `${Math.ceil(height)}px` // 向上取整
      // @ts-ignore - CSS vendor prefixes
      span.style.webkitUserSelect = 'text'
      // @ts-ignore - CSS vendor prefixes
      span.style.MozUserSelect = 'text'
      // @ts-ignore - CSS vendor prefixes
      span.style.msUserSelect = 'text'
      // 確保 pointer-events 正確設置
      span.style.pointerEvents = 'auto'
      
      fragment.appendChild(span)
    })
    
    textLayerDiv.appendChild(fragment)
  }, [bboxes, viewport, pageNumber])
  
  // 計算安全尺寸：使用 Math.ceil() 向上取整 + 1 像素安全邊界
  const safeWidth = Math.ceil(viewport.width) + 1
  const safeHeight = Math.ceil(viewport.height) + 1
  
  return (
    <div
      ref={textLayerRef}
      className="ocrTextLayer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${safeWidth}px`, // 強制擴展尺寸 + 1 像素安全邊界
        height: `${safeHeight}px`, // 強制擴展尺寸 + 1 像素安全邊界
        pointerEvents: 'auto',
        userSelect: 'text',
        WebkitUserSelect: 'text', // React requires capitalized vendor prefix
        MozUserSelect: 'text',
        msUserSelect: 'text',
        cursor: 'text',
        zIndex: 999, // 極高的 z-index，確保文字層在所有其他元素之上
        // 強制覆蓋任何可能的父容器樣式
        isolation: 'isolate', // 創建新的堆疊上下文，確保 z-index 生效
      } as React.CSSProperties}
    />
  )
}

