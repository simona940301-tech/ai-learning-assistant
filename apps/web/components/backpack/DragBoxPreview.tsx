'use client'

import { useMemo } from 'react'

interface DragBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface DragBoxPreviewProps {
  dragBox: DragBox | null
  viewport: { width: number; height: number }
  scale: number
  pageElement: HTMLElement | null
  pageNumber: number
}

/**
 * 實時拖曳預覽層 - 顯示拖曳過程中的選取框
 * 
 * 用於提供「拖曳感」：
 * - 顯示當前拖曳的矩形區域
 * - 藍色半透明背景
 * - z-index: 1001，位於所有層之上
 * - 只在拖曳時顯示
 */
export function DragBoxPreview({
  dragBox,
  viewport,
  scale,
  pageElement,
  pageNumber,
}: DragBoxPreviewProps) {
  const previewRect = useMemo(() => {
    if (!dragBox || !pageElement) {
      return null
    }

    const pageRect = pageElement.getBoundingClientRect()
    
    // 將 PDF 內部座標轉換為屏幕座標
    // dragBox 的座標已經是 PDF 內部座標（points），且 Y 軸已經轉換為從左上角開始
    // 需要轉換為 CSS 像素座標
    
    // 標準化座標（0-1）
    const normalizedStartX = dragBox.startX / viewport.width
    const normalizedStartY = dragBox.startY / viewport.height
    const normalizedEndX = dragBox.endX / viewport.width
    const normalizedEndY = dragBox.endY / viewport.height
    
    // 計算矩形尺寸（確保為正）
    const normalizedW = Math.abs(normalizedEndX - normalizedStartX)
    const normalizedH = Math.abs(normalizedEndY - normalizedStartY)
    
    // 應用 scale 和頁面偏移
    // 使用較小的座標作為起始點
    const startX = Math.min(normalizedStartX, normalizedEndX)
    const startY = Math.min(normalizedStartY, normalizedEndY)
    
    const left = pageRect.left + startX * viewport.width * scale
    const top = pageRect.top + startY * viewport.height * scale
    const width = normalizedW * viewport.width * scale
    const height = normalizedH * viewport.height * scale

    return {
      left,
      top,
      width: Math.abs(width), // 確保寬度為正
      height: Math.abs(height), // 確保高度為正
      isValid: Math.abs(width) > 0 && Math.abs(height) > 0 && !isNaN(left) && !isNaN(top),
    }
  }, [dragBox, viewport, scale, pageElement])

  if (!dragBox || !previewRect || !previewRect.isValid) {
    return null
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 1001, // 位於所有層之上
      }}
    >
      <div
        className="absolute"
        style={{
          left: `${previewRect.left}px`,
          top: `${previewRect.top}px`,
          width: `${Math.max(previewRect.width, 1)}px`, // 確保至少 1px
          height: `${Math.max(previewRect.height, 1)}px`, // 確保至少 1px
          backgroundColor: 'rgba(100, 150, 255, 0.3)', // 半透明藍色背景
          border: '2px solid rgba(100, 150, 255, 0.8)', // 藍色邊框
          borderRadius: '2px',
          pointerEvents: 'none',
          // 🔧 強制確保可見性
          minWidth: '1px',
          minHeight: '1px',
          // 🔧 添加過渡效果，讓拖曳更流暢
          transition: 'none', // 禁用過渡，確保實時跟隨
        }}
      />
    </div>
  )
}

