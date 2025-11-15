'use client'

import { useRef, useEffect, useCallback } from 'react'

interface DragBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface SelectionCaptureLayerProps {
  pageNumber: number
  viewport: { width: number; height: number }
  scale: number
  pageElement: HTMLElement | null // 直接傳入元素，而不是 ref
  onDragBox: (dragBox: DragBox | null) => void
  annotationTool?: 'pen' | 'marker' | 'sticky' | 'eraser' | null
}

/**
 * GoodNotes 級別的選取捕獲層
 * 
 * 設計原則：
 * - 完全透明，覆蓋整個 PDF 頁面
 * - z-index: 1000，位於所有其他層之上
 * - 只監聽滑鼠拖曳事件，記錄 Drag Box 座標
 * - 座標相對於 PDF 頁面容器的（已消除頁面偏移）
 */
export function SelectionCaptureLayer({
  pageNumber,
  viewport,
  scale,
  pageElement,
  onDragBox,
  annotationTool,
}: SelectionCaptureLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)

  // 🔧 強制修正：計算相對於 PDF 頁面容器的座標（PDF 內部座標系統）
  // PDF.js 座標系統說明：
  // - viewport.width/height 是 PDF 內部座標（points，例如 612 x 792）
  // - 頁面實際顯示寬高 = viewport.width * scale (CSS pixels)
  // - textContent.items 的 transform 矩陣使用 PDF 內部座標（points）
  // - SelectionCaptureLayer 捕獲的滑鼠座標需要轉換為 PDF 內部座標
  const getRelativeCoordinates = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!pageElement) {
      console.warn('[SelectionCaptureLayer] pageElement is null')
      return null
    }

    const pageRect = pageElement.getBoundingClientRect()
    
    // 步驟 1: 計算相對於頁面的 CSS 像素座標（已縮放）
    const cssX = clientX - pageRect.left
    const cssY = clientY - pageRect.top
    
    // 步驟 2: 轉換為 PDF 內部座標（PDF points）
    // 關鍵理解：
    // - 頁面實際顯示寬度 = viewport.width * scale (CSS pixels)
    // - CSS 座標相對於頁面 = cssX (CSS pixels)
    // - PDF 座標 = (CSS 座標 / 頁面實際顯示寬度) * viewport.width
    // - 簡化：PDF 座標 = CSS 座標 / scale
    const pdfX = cssX / scale
    
    // 🔧 修復：PDF 座標系 Y 軸從左下角開始（向上為正）
    // CSS Y 座標從左上角開始（向下為正）
    // 需要轉換：PDF Y = viewport.height - (CSS Y / scale)
    const pdfY = viewport.height - (cssY / scale)

    // 🔍 調試：輸出座標轉換過程（用於診斷）
    if (process.env.NODE_ENV === 'development') {
      console.log('[SelectionCaptureLayer] Coordinate conversion:', {
        client: { x: clientX, y: clientY },
        pageRect: { left: pageRect.left, top: pageRect.top, width: pageRect.width, height: pageRect.height },
        css: { x: cssX, y: cssY },
        scale,
        viewport: { width: viewport.width, height: viewport.height },
        pdf: { x: pdfX, y: pdfY },
        note: 'PDF Y axis: bottom-to-top, CSS Y axis: top-to-bottom',
      })
    }

    return { x: pdfX, y: pdfY }
  }, [pageElement, scale, viewport])

  // 處理滑鼠按下
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // 如果正在使用繪圖工具，不處理選取
    if (annotationTool === 'pen' || annotationTool === 'marker' || annotationTool === 'sticky' || annotationTool === 'eraser') {
      return
    }

    const coords = getRelativeCoordinates(e.clientX, e.clientY)
    if (!coords) {
      console.warn('[SelectionCaptureLayer] Failed to get relative coordinates on mousedown')
      return
    }

    // 🔍 調試：只在開發環境輸出
    if (process.env.NODE_ENV === 'development') {
      console.log('[SelectionCaptureLayer] MouseDown:', {
        clientX: e.clientX,
        clientY: e.clientY,
        relativeCoords: coords,
        pageNumber,
      })
    }

    isDraggingRef.current = true
    dragStartRef.current = coords
    onDragBox(null) // 清除之前的選取
  }, [annotationTool, getRelativeCoordinates, onDragBox, pageNumber])

  // 處理滑鼠移動
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !dragStartRef.current) return

    const coords = getRelativeCoordinates(e.clientX, e.clientY)
    if (!coords) return

    const dragBox: DragBox = {
      startX: Math.min(dragStartRef.current.x, coords.x),
      startY: Math.min(dragStartRef.current.y, coords.y),
      endX: Math.max(dragStartRef.current.x, coords.x),
      endY: Math.max(dragStartRef.current.y, coords.y),
    }

    // 🔍 調試：只在開發環境輸出（減少日誌量）
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      // 只輸出 10% 的 mousemove 事件，避免日誌過多
      console.log('[SelectionCaptureLayer] MouseMove (dragging):', {
        dragBox,
        pageNumber,
      })
    }

    onDragBox(dragBox)
  }, [getRelativeCoordinates, onDragBox, pageNumber])

  // 處理滑鼠釋放
  const handleMouseUp = useCallback(() => {
    // 🔍 調試：只在開發環境輸出
    if (process.env.NODE_ENV === 'development') {
      console.log('[SelectionCaptureLayer] MouseUp:', {
        wasDragging: isDraggingRef.current,
        dragStart: dragStartRef.current,
        pageNumber,
      })
    }
    
    isDraggingRef.current = false
    dragStartRef.current = null
  }, [pageNumber])

  // 設置事件監聽器
  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    layer.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      layer.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseDown, handleMouseMove, handleMouseUp])

  // 計算安全尺寸：使用 Math.ceil() 向上取整 + 1 像素安全邊界
  // 注意：這裡應該使用實際的頁面尺寸（已縮放），而不是 viewport.width
  const safeWidth = Math.ceil(viewport.width * scale) + 1
  const safeHeight = Math.ceil(viewport.height * scale) + 1

  // 🔍 調試：輸出尺寸信息（僅在開發環境且首次渲染時）
  const isFirstRenderRef = useRef(true)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isFirstRenderRef.current && pageElement) {
      console.log(`[SelectionCaptureLayer] Page ${pageNumber} dimensions:`, {
        viewport: { width: viewport.width, height: viewport.height },
        scale,
        safeWidth,
        safeHeight,
        pageElement: pageElement ? {
          offsetWidth: pageElement.offsetWidth,
          offsetHeight: pageElement.offsetHeight,
          clientWidth: pageElement.clientWidth,
          clientHeight: pageElement.clientHeight,
        } : null,
      })
      isFirstRenderRef.current = false
    }
  }, [pageNumber, viewport, scale, pageElement, safeWidth, safeHeight])

  // 🔍 調試：檢查 DOM 元素是否正確渲染（僅在開發環境且首次渲染時）
  const isFirstCheckRef = useRef(true)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && layerRef.current && isFirstCheckRef.current) {
      const computedStyle = window.getComputedStyle(layerRef.current)
      console.log(`[SelectionCaptureLayer] Page ${pageNumber} DOM check:`, {
        element: layerRef.current,
        computedStyle: {
          position: computedStyle.position,
          width: computedStyle.width,
          height: computedStyle.height,
          backgroundColor: computedStyle.backgroundColor,
          opacity: computedStyle.opacity,
          zIndex: computedStyle.zIndex,
          pointerEvents: computedStyle.pointerEvents,
          cursor: computedStyle.cursor,
        },
        offsetWidth: layerRef.current.offsetWidth,
        offsetHeight: layerRef.current.offsetHeight,
        clientWidth: layerRef.current.clientWidth,
        clientHeight: layerRef.current.clientHeight,
      })
      isFirstCheckRef.current = false
    }
  }, [pageNumber])

  return (
    <div
      ref={layerRef}
      className="selectionCaptureLayer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0, // 🔧 強制：佔滿整個父容器
        bottom: 0, // 🔧 強制：佔滿整個父容器
        width: '100%', // 🔧 強制：100% 寬度
        height: '100%', // 🔧 強制：100% 高度
        backgroundColor: 'transparent', // 🔧 強制修正：移除紅色背景，設置為透明
        cursor: 'text',
        zIndex: 1000, // 位於所有其他層之上
        pointerEvents: (annotationTool === 'pen' || annotationTool === 'marker' || annotationTool === 'sticky' || annotationTool === 'eraser') ? 'none' : 'auto',
        // 🔧 強制確保覆蓋：移除任何可能限制尺寸的邏輯
        minWidth: '100%',
        minHeight: '100%',
        maxWidth: 'none', // 確保沒有最大寬度限制
        maxHeight: 'none', // 確保沒有最大高度限制
        boxSizing: 'border-box',
        margin: 0,
        padding: 0,
      } as React.CSSProperties}
    />
  )
}

