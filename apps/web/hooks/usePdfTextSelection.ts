'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface TextSelection {
  text: string
  pageNumber: number
  rects: Array<{ x: number; y: number; w: number; h: number }> // PDF 內部座標（未縮放）
  bboxes: Array<{ x: number; y: number; w: number; h: number }> // 每個選取文字的 bbox
}

interface DragBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

interface TextItem {
  str: string
  transform: number[] // [a, b, c, d, e, f] 轉換矩陣
  width: number
  height: number
  dir: string
  fontName: string
  hasEOL: boolean
}

/**
 * GoodNotes 級別的數據驅動文字選取 Hook
 * 
 * 設計原則：
 * - 使用 pdf.js 提供的精確文字座標 (x, y, w, h)
 * - Box Intersecting 算法：檢查 Drag Box 與文字 bbox 的重疊
 * - 不依賴不穩定的 DOM 座標轉換
 * - 0.8 秒延遲顯示工具列（模擬長按效果）
 */
export function usePdfTextSelection(
  containerRef: React.RefObject<HTMLDivElement>,
  totalPages: number,
  textContentMap: Map<number, any>, // pdf.js TextContent
  viewportMap: Map<number, any>, // pdf.js PageViewport
  scale: number,
  annotationTool?: 'pen' | 'marker' | 'sticky' | 'eraser' | null,
  onTextSelection?: (selection: TextSelection | null) => void
) {
  const [selection, setSelection] = useState<TextSelection | null>(null)
  const [dragBox, setDragBox] = useState<DragBox | null>(null)
  const selectionRef = useRef<TextSelection | null>(null)
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const delayedSelectionRef = useRef<TextSelection | null>(null)
  const onTextSelectionRef = useRef<typeof onTextSelection>()
  onTextSelectionRef.current = onTextSelection

  /**
   * Box Intersecting 算法：檢查 Drag Box 與文字 bbox 的重疊
   */
  const calculateSelectionFromDragBox = useCallback((box: DragBox, pageNumber: number): TextSelection | null => {
    const textContent = textContentMap.get(pageNumber)
    const viewport = viewportMap.get(pageNumber)

    console.log(`[usePdfTextSelection] calculateSelectionFromDragBox called:`, {
      pageNumber,
      dragBox: box,
      hasTextContent: !!textContent,
      itemsCount: textContent?.items?.length || 0,
      hasViewport: !!viewport,
    })

    if (!textContent || !textContent.items || !viewport) {
      console.warn('[usePdfTextSelection] Missing data:', {
        hasTextContent: !!textContent,
        hasItems: !!textContent?.items,
        itemsLength: textContent?.items?.length || 0,
        hasViewport: !!viewport,
      })
      return null
    }

    const items: TextItem[] = textContent.items
    const selectedItems: TextItem[] = []
    const selectedBboxes: Array<{ x: number; y: number; w: number; h: number }> = []

    // 🔍 調試：輸出前幾個文字項目的座標，用於診斷
    const sampleItems = items.slice(0, 5).map((item) => {
      const transform = item.transform || [1, 0, 0, 1, 0, 0]
      return {
        str: item.str?.substring(0, 10),
        x: transform[4] || 0,
        y: transform[5] || 0,
        width: item.width || 0,
        height: item.height || 0,
      }
    })
    console.log(`[usePdfTextSelection] Sample text items (first 5):`, {
      sampleItems,
      dragBox: box,
      viewport: { width: viewport.width, height: viewport.height },
    })

    // 遍歷所有文字物件，檢查與 Drag Box 的重疊
    for (const item of items) {
      if (!item.str || item.str.trim().length === 0) continue

      // 從 transform 矩陣提取位置和尺寸
      // transform: [a, b, c, d, e, f]
      // e = x, f = y
      // ⚠️ 重要：PDF.js 的 transform 矩陣中的座標是 PDF 內部座標（points）
      // 但 Y 座標是相對於 PDF 頁面底部（Y 軸向上為正）
      const transform = item.transform || [1, 0, 0, 1, 0, 0]
      const itemX = transform[4] || 0
      const itemY = transform[5] || 0
      const itemWidth = item.width || 0
      const itemHeight = item.height || 0

      // 🔧 修復：PDF 座標系 Y 軸從左下角開始（向上為正）
      // 需要轉換為從左上角開始（向下為正）
      // PDF Y 座標 = viewport.height - (itemY + itemHeight)
      const itemBbox = {
        x: itemX,
        y: viewport.height - (itemY + itemHeight), // 🔧 轉換 Y 軸方向
        w: itemWidth,
        h: itemHeight,
      }

      // 檢查重疊：使用 AABB (Axis-Aligned Bounding Box) 碰撞檢測
      const isOverlapping =
        box.startX < itemBbox.x + itemBbox.w &&
        box.endX > itemBbox.x &&
        box.startY < itemBbox.y + itemBbox.h &&
        box.endY > itemBbox.y

      if (isOverlapping) {
        selectedItems.push(item)
        selectedBboxes.push(itemBbox)
      }
    }

    console.log(`[usePdfTextSelection] Box Intersecting result:`, {
      totalItems: items.length,
      selectedItemsCount: selectedItems.length,
      selectedBboxesCount: selectedBboxes.length,
      dragBox: box,
      sampleSelectedBbox: selectedBboxes[0],
    })

    if (selectedItems.length === 0) {
      console.warn('[usePdfTextSelection] No overlapping items found')
      return null
    }

    // 串接選取的文字
    const selectedText = selectedItems.map((item) => item.str).join('').trim()

    // 最小選取長度
    if (selectedText.length < 2) {
      console.warn('[usePdfTextSelection] Selected text too short:', selectedText)
      return null
    }

    // 合併重疊的 bbox，生成高亮矩形
    // 簡單策略：按 Y 座標分組，每組生成一個矩形
    const rects: Array<{ x: number; y: number; w: number; h: number }> = []
    
    // 計算平均 bbox 高度，用於判斷是否在同一行
    const avgHeight = selectedBboxes.length > 0
      ? selectedBboxes.reduce((sum, bbox) => sum + bbox.h, 0) / selectedBboxes.length
      : 10 // 默認值，如果沒有 bbox
    
    const sortedBboxes = [...selectedBboxes].sort((a, b) => {
      // 先按 Y 座標排序，再按 X 座標排序
      // 使用平均高度的 0.5 倍作為同一行的閾值
      if (Math.abs(a.y - b.y) < avgHeight * 0.5) {
        // 同一行
        return a.x - b.x
      }
      return a.y - b.y
    })

    // 合併同一行的 bbox
    let currentLine: Array<{ x: number; y: number; w: number; h: number }> = []
    let currentLineY = sortedBboxes[0]?.y || 0

    for (const bbox of sortedBboxes) {
      // 使用平均高度判斷是否在同一行
      if (Math.abs(bbox.y - currentLineY) < avgHeight * 0.5) {
        // 同一行
        currentLine.push(bbox)
      } else {
        // 新行，合併當前行
        if (currentLine.length > 0) {
          const minX = Math.min(...currentLine.map((b) => b.x))
          const maxX = Math.max(...currentLine.map((b) => b.x + b.w))
          const lineY = currentLine[0].y
          const lineH = currentLine[0].h

          rects.push({
            x: minX,
            y: lineY,
            w: maxX - minX,
            h: lineH,
          })
        }
        currentLine = [bbox]
        currentLineY = bbox.y
      }
    }

    // 處理最後一行
    if (currentLine.length > 0) {
      const minX = Math.min(...currentLine.map((b) => b.x))
      const maxX = Math.max(...currentLine.map((b) => b.x + b.w))
      const lineY = currentLine[0].y
      const lineH = currentLine[0].h

      rects.push({
        x: minX,
        y: lineY,
        w: maxX - minX,
        h: lineH,
      })
    }

    // 🔍 強制調試：驗證 rects 數據格式
    console.log('[usePdfTextSelection] Final Rects:', {
      count: rects.length,
      rects: rects.map((r) => ({
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        isValid: r.w > 0 && r.h > 0 && !isNaN(r.x) && !isNaN(r.y),
      })),
      selectedText: selectedText.substring(0, 50),
      pageNumber,
    })

    return {
      text: selectedText,
      pageNumber,
      rects,
      bboxes: selectedBboxes,
    }
  }, [textContentMap, viewportMap])

  // 處理 Drag Box 變化
  useEffect(() => {
    console.log('[usePdfTextSelection] dragBox changed:', {
      dragBox,
      annotationTool,
      hasContainer: !!containerRef.current,
    })

    if (!dragBox) {
      // 清除延遲計時器
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
        selectionTimeoutRef.current = null
      }
      setSelection(null)
      selectionRef.current = null
      delayedSelectionRef.current = null
      onTextSelectionRef.current?.(null)
      return
    }

    // 檢查工具模式
    if (annotationTool === 'pen' || annotationTool === 'marker') {
      console.log('[usePdfTextSelection] Ignoring dragBox because annotationTool is:', annotationTool)
      return
    }

    // 找到 Drag Box 所在的頁面
    const container = containerRef.current
    if (!container) {
      console.warn('[usePdfTextSelection] Container not found')
      return
    }

    const pageContainers = container.querySelectorAll('[data-page-number]')
    let pageNumber = 1

    for (let i = 0; i < pageContainers.length; i++) {
      const pageEl = pageContainers[i] as HTMLElement
      const pageRect = pageEl.getBoundingClientRect()
      
      // 檢查 Drag Box 的中心點是否在頁面內
      const dragBoxCenterX = (dragBox.startX + dragBox.endX) / 2 * scale + pageRect.left
      const dragBoxCenterY = (dragBox.startY + dragBox.endY) / 2 * scale + pageRect.top

      if (
        dragBoxCenterX >= pageRect.left &&
        dragBoxCenterX <= pageRect.right &&
        dragBoxCenterY >= pageRect.top &&
        dragBoxCenterY <= pageRect.bottom
      ) {
        pageNumber = parseInt(pageEl.dataset.pageNumber || '1', 10)
        console.log('[usePdfTextSelection] Found page for dragBox:', {
          pageNumber,
          dragBoxCenter: { x: dragBoxCenterX, y: dragBoxCenterY },
          pageRect: {
            left: pageRect.left,
            top: pageRect.top,
            right: pageRect.right,
            bottom: pageRect.bottom,
          },
        })
        break
      }
    }

    // 使用 Box Intersecting 算法計算選取
    const selectionData = calculateSelectionFromDragBox(dragBox, pageNumber)

    if (!selectionData) {
      console.warn('[usePdfTextSelection] No selection data calculated')
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current)
        selectionTimeoutRef.current = null
      }
      setSelection(null)
      selectionRef.current = null
      delayedSelectionRef.current = null
      onTextSelectionRef.current?.(null)
      return
    }

    console.log('[usePdfTextSelection] Selection data calculated:', {
      text: selectionData.text.substring(0, 50),
      rectsCount: selectionData.rects.length,
      bboxesCount: selectionData.bboxes.length,
    })

    // 🔧 立即顯示選取（移除延遲）
    selectionRef.current = selectionData
    delayedSelectionRef.current = selectionData
    setSelection(selectionData) // 立即設置，立即渲染

    // 清除之前的延遲計時器
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current)
      selectionTimeoutRef.current = null
    }

    // 🔧 工具列延遲顯示（但選取本身立即顯示）
    // 設定 0.3 秒延遲顯示工具列（從 0.8 秒縮短到 0.3 秒）
    selectionTimeoutRef.current = setTimeout(() => {
      // 再次檢查選取是否仍然有效
      if (delayedSelectionRef.current === selectionData && dragBox) {
        console.log('[usePdfTextSelection] Triggering toolbar callback after delay')
        onTextSelectionRef.current?.(selectionData)
      }
      selectionTimeoutRef.current = null
    }, 300) // 縮短到 0.3 秒
  }, [dragBox, annotationTool, containerRef, scale, calculateSelectionFromDragBox])

  // 清除選取
  const clearSelection = useCallback(() => {
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current)
      selectionTimeoutRef.current = null
    }
    setDragBox(null)
    setSelection(null)
    selectionRef.current = null
    delayedSelectionRef.current = null
    onTextSelectionRef.current?.(null)
  }, [])

  return {
    selection,
    dragBox,
    setDragBox,
    clearSelection,
  }
}
