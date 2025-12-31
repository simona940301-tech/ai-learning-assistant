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

const glyphWidthCache = new Map<string, number>()
let measureCanvas: HTMLCanvasElement | null = null
let measureContext: CanvasRenderingContext2D | null = null

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

function getMeasureContext() {
  if (typeof document === 'undefined') return null
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas')
    measureContext = measureCanvas.getContext('2d')
  }
  return measureContext
}

function buildFontString(style: CSSStyleDeclaration) {
  const fontStyle = style.fontStyle || 'normal'
  const fontWeight = style.fontWeight || '400'
  const fontSize = style.fontSize || '16px'
  const fontFamily = style.fontFamily || 'sans-serif'
  return `${fontStyle} ${fontWeight} ${fontSize} ${fontFamily}`
}

function measureSpanTextWidth(text: string, style: CSSStyleDeclaration): number | null {
  if (!text) return null
  const ctx = getMeasureContext()
  if (!ctx) return null
  const font = buildFontString(style)
  if (!font) return null
  
  ctx.font = font
  let total = 0
  
  for (const char of text) {
    const cacheKey = `${font}::${char}`
    let width = glyphWidthCache.get(cacheKey)
    
    if (width === undefined) {
      width = ctx.measureText(char).width
      if (!isFinite(width)) {
        return null
      }
      glyphWidthCache.set(cacheKey, width)
    }
    
    total += width
  }
  
  return total
}

async function waitForFontsReady(timeoutMs = 400): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document) || !document.fonts?.ready) {
    return true
  }
  
  try {
    const readyPromise = document.fonts.ready.then(() => true).catch(() => false)
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), timeoutMs)
    )
    return await Promise.race([readyPromise, timeoutPromise])
  } catch {
    return false
  }
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
      
      // 🎯 頂尖修復：使用 layoutViewport 的精確尺寸（與 Canvas CSS 尺寸一致）
      // 不再需要 +1 像素安全邊界，因為我們使用精確的 layoutViewport 尺寸
      const safeWidth = Math.floor(viewport.width)
      const safeHeight = Math.floor(viewport.height)
      
      // 🎯 頂尖修復：設置 Text Layer 容器的 CSS 尺寸（必須與 Canvas 的 CSS 大小一致）
      // 使用 layoutViewport 的尺寸，確保與 Canvas 完美對齊
      container.style.width = `${Math.floor(viewport.width)}px`
      container.style.height = `${Math.floor(viewport.height)}px`
      container.style.left = '0'
      container.style.top = '0'
      
      // 🎯 頂尖修復：設置 CSS 變數，供 PDF.js 內部計算使用
      // 這確保了 PDF.js 的文字定位計算基於正確的 scale
      container.style.setProperty('--scale-factor', `${scale}`)
      
      // 確保文字層的 transform 與 viewport 完全一致，提高選取精度
      // pdf.js 會自動處理 transform，但我們需要確保容器尺寸和位置正確
      container.style.transform = 'scale(1)'
      container.style.transformOrigin = '0 0' // 關鍵：確保縮放原點在左上角
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
      
      // 🎯 頂尖修復：使用 layoutViewport 來計算文字位置
      // 這是修復選取錯位的關鍵：Text Layer 必須使用 layoutViewport（不乘以 dpr）
      // 而不是 outputViewport（乘以 dpr），這樣才能與 Canvas 的 CSS 尺寸對齊
      const task = pdfjs.renderTextLayer({
        textContentSource: textContent,
        container,
        viewport, // 使用 layoutViewport（已從 BackpackReader 傳入）
        textDivs: [],
        textContentItemsStr: [],
        textDivProperties: new WeakMap(),
        isOffscreenCanvasSupported: typeof window !== 'undefined' && 'OffscreenCanvas' in window,
      })
      renderTaskRef.current = task
      
      try {
        await task.promise
        
        const fontsReady = await waitForFontsReady(350)
        const canMeasure = fontsReady && !!getMeasureContext()
        let measuredCount = 0
        let fallbackCount = 0
        
        // 🎯 終極修復：放棄 transform: scaleX()，改用 span 的絕對寬度
        // 這是解決 CJK 文字選取精度問題的最終方案
        // 避免 CSS transform 的精度損失，直接計算並設置 span.style.width
        if (container && typeof window !== 'undefined' && textContent?.items) {
          const spans = container.querySelectorAll('span')
          
          // 檢測是否為中文文字（簡單啟發式：檢查是否包含中文字元）
          const hasChineseChars = Array.from(spans).some((span) => {
            const text = span.textContent || ''
            // 中文字元範圍：\u4e00-\u9fff（CJK 統一表意文字）
            return /[\u4e00-\u9fff]/.test(text)
          })
          
          if (hasChineseChars && spans.length > 0) {
            // 🎯 終極方案：動態字元邊界修復 (Dynamic Character Edge Correction)
            // 針對不同字元類型應用不同的壓縮係數，這是達到原生選取體驗的關鍵
            // 標點符號經常佔用整個字元寬度，但實際字形很小，導致選取框過大
            const CJK_CHAR_FACTOR = 0.98 // 標準中文字的壓縮係數
            const CJK_PUNCTUATION_FACTOR = 0.75 // 中文標點符號的激進壓縮係數
            
            // 中文標點符號正則表達式
            const CJK_PUNCTUATION_REGEX = /[，。！？、；：""''（）【】《》〈〉「」『』〔〕…—～·]/
            
            // 針對中文文字進行終極修復
            spans.forEach((span) => {
              const htmlSpan = span as HTMLElement
              const spanText = htmlSpan.textContent || ''
              const computedStyle = window.getComputedStyle(htmlSpan)
              const transform = computedStyle.transform
              
              // 只處理包含中文的 span
              if (!/[\u4e00-\u9fff]/.test(spanText)) {
                // 非中文 span 只設置基本屬性
                htmlSpan.style.padding = '0'
                htmlSpan.style.margin = '0'
                htmlSpan.style.transformOrigin = '0% 0%'
                
                // 🎯 終極修復：確保 line-height 與 font-size 完美匹配（非中文也需要）
                const spanFontSize = parseFloat(computedStyle.fontSize) || 16
                htmlSpan.style.fontSize = `${spanFontSize}px`
                htmlSpan.style.lineHeight = '1.0'
                htmlSpan.style.height = `${spanFontSize}px`
                
                htmlSpan.style.userSelect = 'text'
                htmlSpan.style.webkitUserSelect = 'text'
                htmlSpan.style.pointerEvents = 'auto'
                htmlSpan.style.cursor = 'text'
                
                // 🎯 終極修復：確保 width 屬性不被其他 CSS 規則干擾
                htmlSpan.style.boxSizing = 'border-box'
                htmlSpan.style.minWidth = '0'
                htmlSpan.style.maxWidth = 'none'
                
                return
              }
              
              // 🎯 終極修復：從 transform 矩陣中提取 scaleX 和計算邏輯寬度
              if (transform && transform !== 'none') {
                try {
                  // 優先解析 matrix() 形式（PDF.js 標準格式）
                  const matrixMatch = transform.match(/matrix\(([^)]+)\)/)
                  if (matrixMatch) {
                    const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()))
                    if (values.length >= 4) {
                      // values[0] 是 scaleX（水平縮放），values[3] 是 scaleY（垂直縮放）
                      // values[1] 和 values[2] 是旋轉/傾斜分量
                      // values[4] 和 values[5] 是平移分量（tx, ty）
                      
                      const scaleX = values[0]
                      const scaleY = values[3]
                      
                      const measuredWidth = canMeasure ? measureSpanTextWidth(spanText, computedStyle) : null
                      const rect = htmlSpan.getBoundingClientRect()
                      let adjustedWidth: number | null = null
                      
                      if (measuredWidth && isFinite(measuredWidth)) {
                        adjustedWidth = measuredWidth * scaleX
                        measuredCount++
                      } else if (rect.width > 0) {
                        // 🎯 終極方案：動態字元邊界修復（測量失敗時的保險係數）
                        let compressionFactor = CJK_CHAR_FACTOR
                        if (spanText.length === 1) {
                          const char = spanText
                          if (CJK_PUNCTUATION_REGEX.test(char)) {
                            compressionFactor = CJK_PUNCTUATION_FACTOR
                          } else if (/[\u4e00-\u9fff]/.test(char)) {
                            compressionFactor = CJK_CHAR_FACTOR
                          }
                        } else if (CJK_PUNCTUATION_REGEX.test(spanText)) {
                          compressionFactor = (CJK_CHAR_FACTOR + CJK_PUNCTUATION_FACTOR) / 2
                        }
                        
                        adjustedWidth = rect.width * compressionFactor
                        fallbackCount++
                      }
                      
                      if (adjustedWidth && isFinite(adjustedWidth)) {
                        // 🎯 終極方案：直接設置絕對寬度，取代 transform: scaleX()
                        // 這樣可以避免 CSS transform 的精度損失問題
                        htmlSpan.style.width = `${adjustedWidth}px`
                      }
                      
                      // 🎯 終極修復：確保 line-height 與 font-size 完美匹配
                      // 從 computedStyle 獲取字體大小，確保高度精確
                      const fontSize = parseFloat(computedStyle.fontSize) || parseFloat(computedStyle.height) || 16
                      htmlSpan.style.height = `${fontSize}px`
                      htmlSpan.style.fontSize = `${fontSize}px` // 確保字體大小正確
                      htmlSpan.style.lineHeight = '1.0' // 關鍵：防止行高導致垂直重疊
                      
                      // 🎯 終極修復：將 transform 矩陣中的 scaleX 設為 1
                      // 只保留其他變換（旋轉、傾斜、平移），讓 CSS width 屬性生效
                      // 這樣 width 屬性就能完全控制 span 的寬度，不再依賴 transform: scaleX()
                      htmlSpan.style.transform = `matrix(1, ${values[1]}, ${values[2]}, ${scaleY}, ${values[4] || 0}, ${values[5] || 0})`
                      
                      // 開發模式日誌（可選，用於調試）
                      if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
                        // 隨機抽樣 1% 的 span 進行日誌記錄，避免日誌過多
                        const charType = CJK_PUNCTUATION_REGEX.test(spanText) ? 'punctuation' : 'char'
                        console.log(`[PdfTextLayer] Dynamic fix applied: width=${(adjustedWidth || 0).toFixed(2)}px (measured=${measuredWidth ? measuredWidth.toFixed(2) : 'n/a'}, rendered=${rect.width.toFixed(2)}px, type=${charType}, scaleX=${scaleX.toFixed(4)})`)
                      }
                    }
                  } else {
                    // 如果是 scaleX(value) 形式（較少見）
                    const scaleXMatch = transform.match(/scaleX\(([^)]+)\)/)
                    if (scaleXMatch) {
                      const scaleX = parseFloat(scaleXMatch[1])
                      
                      // 計算邏輯寬度（scaleX 形式）
                      const currentWidth = parseFloat(computedStyle.width)
                      if (!isNaN(currentWidth) && currentWidth > 0) {
                        const measuredWidth = canMeasure ? measureSpanTextWidth(spanText, computedStyle) : null
                        const rect = htmlSpan.getBoundingClientRect()
                        const renderedWidth = rect.width > 0 ? rect.width : currentWidth * scaleX
                        let adjustedWidth: number | null = null
                        
                        if (measuredWidth && isFinite(measuredWidth)) {
                          adjustedWidth = measuredWidth * scaleX
                          measuredCount++
                        } else {
                          // 🎯 終極方案：動態字元邊界修復
                          let compressionFactor = CJK_CHAR_FACTOR
                          if (spanText.length === 1 && CJK_PUNCTUATION_REGEX.test(spanText)) {
                            compressionFactor = CJK_PUNCTUATION_FACTOR
                          }
                          adjustedWidth = renderedWidth * compressionFactor
                          fallbackCount++
                        }
                        
                        if (adjustedWidth && isFinite(adjustedWidth)) {
                          // 設置絕對寬度
                          htmlSpan.style.width = `${adjustedWidth}px`
                        }
                        
                        // 確保 line-height 與 font-size 完美匹配
                        const fontSize = parseFloat(computedStyle.fontSize) || 16
                        htmlSpan.style.height = `${fontSize}px`
                        htmlSpan.style.fontSize = `${fontSize}px`
                        htmlSpan.style.lineHeight = '1.0'
                        
                        // 移除 scaleX，只保留其他變換（如果有的話）
                        htmlSpan.style.transform = 'scaleX(1)'
                      }
                    }
                  }
                } catch (err) {
                  // 如果解析失敗，跳過這個 span（不影響其他 span）
                  if (process.env.NODE_ENV === 'development') {
                    console.warn('[PdfTextLayer] Failed to apply ultimate fix:', err, transform)
                  }
                }
              }
              
              // 🎯 頂尖修復：確保所有 span 都有正確的 CSS 屬性
              // 這些屬性對於精確的文字選取至關重要
              htmlSpan.style.padding = '0'
              htmlSpan.style.margin = '0'
              
              // 🎯 終極修復：確保 line-height 與 font-size 完美匹配
              // 這是防止選取行間距問題的關鍵
              // 從 computedStyle 獲取字體大小，確保高度精確
              const spanFontSize = parseFloat(computedStyle.fontSize) || 16
              htmlSpan.style.fontSize = `${spanFontSize}px` // 確保字體大小正確
              htmlSpan.style.lineHeight = '1.0' // 關鍵：防止行高導致垂直重疊
              htmlSpan.style.height = `${spanFontSize}px` // 確保高度與字體大小一致
              
              htmlSpan.style.letterSpacing = '0'
              htmlSpan.style.wordSpacing = '0'
              
              // 🎯 頂尖修復：確保每個 span 都有 transform-origin: 0% 0%
              // 這是確保每個字元縮放正確對齊的關鍵
              htmlSpan.style.transformOrigin = '0% 0%'
              
              // 🎯 終極修復：確保 width 屬性不被其他 CSS 規則干擾
              htmlSpan.style.boxSizing = 'border-box'
              htmlSpan.style.minWidth = '0'
              htmlSpan.style.maxWidth = 'none'
              
              // 🎯 修復：確保文字選取功能正常
              // 這些屬性對於文字選取至關重要
              htmlSpan.style.userSelect = 'text'
              htmlSpan.style.webkitUserSelect = 'text'
              htmlSpan.style.pointerEvents = 'auto'
              htmlSpan.style.cursor = 'text'
            })
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[PdfTextLayer] Applied ultimate CJK width fix to ${spans.length} spans (Page ${pageNumber}), measured=${measuredCount}, fallback=${fallbackCount}, fontsReady=${fontsReady}`)
            }
          }
          
          // 🎯 修復：確保所有 span（包括非中文）都有文字選取功能和正確的 CSS 屬性
          // 這確保了即使沒有中文文字，文字選取也能正常工作
          spans.forEach((span) => {
            const htmlSpan = span as HTMLElement
            // 確保所有 span 都有文字選取功能
            htmlSpan.style.userSelect = 'text'
            htmlSpan.style.webkitUserSelect = 'text'
            // @ts-ignore - 瀏覽器前綴屬性
            htmlSpan.style.mozUserSelect = 'text'
            // @ts-ignore - 瀏覽器前綴屬性
            htmlSpan.style.msUserSelect = 'text'
            htmlSpan.style.pointerEvents = 'auto'
            htmlSpan.style.cursor = 'text'
            
            // 🎯 頂尖修復：確保每個 span 都有 transform-origin: 0% 0%
            // 這是確保每個字元縮放正確對齊的關鍵
            htmlSpan.style.transformOrigin = '0% 0%'
            
            // 確保沒有不必要的 padding 或 margin
            htmlSpan.style.padding = '0'
            htmlSpan.style.margin = '0'
            
            // 🎯 終極修復：確保 width 屬性不被其他 CSS 規則干擾
            htmlSpan.style.boxSizing = 'border-box'
            htmlSpan.style.minWidth = '0'
            htmlSpan.style.maxWidth = 'none'
            
            // 🎯 終極修復：確保 width 屬性不被其他 CSS 規則干擾
            htmlSpan.style.boxSizing = 'border-box'
            htmlSpan.style.minWidth = '0'
            htmlSpan.style.maxWidth = 'none'
          })
          
          // P4 最終檢查：驗證 transform 矩陣（僅在開發模式）
          if (process.env.NODE_ENV === 'development' && spans.length > 0) {
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
  
  // 🎯 頂尖修復：使用 layoutViewport 的尺寸（與 Canvas CSS 尺寸一致）
  // 不再需要 +1 像素安全邊界，因為我們使用精確的 layoutViewport 尺寸
  const safeWidth = viewport ? Math.floor(viewport.width) : 0
  const safeHeight = viewport ? Math.floor(viewport.height) : 0
  
  return (
    <div
      ref={textLayerRef}
      className="textLayer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: viewport ? `${safeWidth}px` : '100%', // 使用 layoutViewport 的精確尺寸
        height: viewport ? `${safeHeight}px` : '100%', // 使用 layoutViewport 的精確尺寸
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
