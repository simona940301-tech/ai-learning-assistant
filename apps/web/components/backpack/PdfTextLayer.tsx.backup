'use client'

import { useEffect, useRef } from 'react'

interface PdfTextLayerProps {
  pageNumber: number
  textContent: any // pdf.js TextContent
  viewport: any // pdf.js PageViewport
  scale: number
}

let pdfjsPromise: Promise<any> | null = null
let pdfjsModule: any = null

async function loadPdfJs() {
  if (pdfjsModule) return pdfjsModule
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist')
      .then((mod) => {
        pdfjsModule = mod
        return mod
      })
      .catch((err) => {
        console.error('[PdfTextLayer] Failed to load pdf.js:', err)
        pdfjsPromise = null
        return null
      })
  }
  return pdfjsPromise
}

/**
 * Renders PDF text layer using pdf.js utilities so DOM selection matches the underlying glyph positions.
 */
export function PdfTextLayer({ pageNumber, textContent, viewport, scale }: PdfTextLayerProps) {
  const textLayerRef = useRef<HTMLDivElement>(null)
  const renderTaskRef = useRef<any>(null)
  
  useEffect(() => {
    if (!textContent || !viewport) return
    
    let cancelled = false
    
    async function renderTextLayer() {
      const container = textLayerRef.current
      if (!container) return
      
      const pdfjs = await loadPdfJs()
      if (!pdfjs?.renderTextLayer) return
      
      // Cancel previous render if any
      if (renderTaskRef.current?.cancel) {
        try {
          renderTaskRef.current.cancel()
        } catch (err) {
          // ignore
        }
        renderTaskRef.current = null
      }
      
      container.innerHTML = ''
      
      // P3 強化：使用 Math.ceil() 向上取整 + 1 像素安全邊界，確保完全覆蓋
      const safeWidth = Math.ceil(viewport.width) + 1
      const safeHeight = Math.ceil(viewport.height) + 1
      
      container.style.width = `${safeWidth}px` // 強制擴展尺寸 + 1 像素安全邊界
      container.style.height = `${safeHeight}px` // 強制擴展尺寸 + 1 像素安全邊界
      container.style.left = '0'
      container.style.top = '0'
      
      // 確保文字層的 transform 與 viewport 完全一致，提高選取精度
      // pdf.js 會自動處理 transform，但我們需要確保容器尺寸和位置正確
      container.style.transform = 'scale(1)'
      container.style.transformOrigin = '0 0'
      container.style.position = 'absolute'
      
      // ✨ GoodNotes 升級策略：啟用原生文字選取
      // 讓 iOS/Android 原生把手和系統選單自動出現
      container.style.pointerEvents = 'auto' // 允許文字元素接收滑鼠事件
      container.style.userSelect = 'text' // 啟用原生選取
      container.style.webkitUserSelect = 'text'
      // @ts-ignore - 瀏覽器前綴屬性
      container.style.mozUserSelect = 'text'
      // @ts-ignore - 瀏覽器前綴屬性
      container.style.msUserSelect = 'text'
      container.style.cursor = 'text'
      // z-index 低於 SelectionCaptureLayer (1000)
      container.style.zIndex = '999'
      
      const task = pdfjs.renderTextLayer({
        textContentSource: textContent,
        container,
        viewport,
        textDivs: [],
        textContentItemsStr: [],
        textDivProperties: new WeakMap(),
        isOffscreenCanvasSupported: typeof window !== 'undefined' && 'OffscreenCanvas' in window,
      })
      renderTaskRef.current = task
      
      try {
        await task.promise
        
        // P4 最終檢查：驗證 transform 矩陣
        // 隨機抽樣 3 個文字 <span> 元素，檢查它們的 transform 屬性值
        if (container && typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
          const spans = container.querySelectorAll('span')
          if (spans.length > 0) {
            const sampleSize = Math.min(3, spans.length)
            const sampleIndices = new Set<number>()
            while (sampleIndices.size < sampleSize) {
              sampleIndices.add(Math.floor(Math.random() * spans.length))
            }
            
            console.log(`[PdfTextLayer] Transform Matrix Verification (Page ${pageNumber}):`)
            sampleIndices.forEach((idx, i) => {
              const span = spans[idx] as HTMLElement
              const computedStyle = window.getComputedStyle(span)
              const transform = computedStyle.transform
              const left = computedStyle.left
              const top = computedStyle.top
              const text = span.textContent?.substring(0, 20) || '(empty)'
              
              console.log(`  Sample ${i + 1}:`, {
                text: `"${text}..."`,
                transform: transform || '(none)',
                left,
                top,
                position: computedStyle.position,
                isValid: transform !== 'none' && transform !== '',
              })
            })
          }
        }
      } catch (err: any) {
        if (!cancelled && err?.name !== 'RenderingCancelledException') {
          console.warn('[PdfTextLayer] Failed to render text layer:', err)
        }
      } finally {
        if (renderTaskRef.current === task) {
          renderTaskRef.current = null
        }
      }
    }
    
    renderTextLayer()
    
    return () => {
      cancelled = true
      if (renderTaskRef.current?.cancel) {
        try {
          renderTaskRef.current.cancel()
        } catch (err) {
          // ignore
        }
      }
      renderTaskRef.current = null
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = ''
      }
    }
  }, [textContent, viewport, pageNumber, scale])
  
  // 計算安全尺寸：使用 Math.ceil() 向上取整 + 1 像素安全邊界
  const safeWidth = viewport ? Math.ceil(viewport.width) + 1 : 0
  const safeHeight = viewport ? Math.ceil(viewport.height) + 1 : 0
  
  return (
    <div
      ref={textLayerRef}
      className="textLayer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: viewport ? `${safeWidth}px` : '100%', // 強制擴展尺寸 + 1 像素安全邊界
        height: viewport ? `${safeHeight}px` : '100%', // 強制擴展尺寸 + 1 像素安全邊界
        pointerEvents: 'auto', // ✨ GoodNotes 升級：文字層接收滑鼠事件（啟用原生選取）
        userSelect: 'text', // 啟用原生選取
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text',
        cursor: 'text',
        zIndex: 999, // 極高的 z-index，確保文字層在所有其他元素之上
      } as React.CSSProperties}
    />
  )
}
