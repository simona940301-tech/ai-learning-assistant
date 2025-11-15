'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
// ✨ GoodNotes 升級：使用新的原生選取系統
import { PdfViewerV2 } from '@/components/pdf/PdfViewerV2'
import { useHighlights } from '@/hooks/useHighlights'
import { useScopedAskV2 } from '@/hooks/useScopedAskV2'
import { TextHighlightOverlay } from './TextHighlightOverlay'
// ❌ 移除舊的自訂拖曳選取系統
// import { usePdfTextSelection } from '@/hooks/usePdfTextSelection'
// import { SelectionPreviewOverlay } from './SelectionPreviewOverlay'
// import { DragBoxPreview } from './DragBoxPreview'
// import { SelectionTooltip } from './SelectionTooltip'
// import { SelectionCaptureLayer } from './SelectionCaptureLayer'
import { PdfTextLayer } from './PdfTextLayer'
import { OcrTextLayer } from './OcrTextLayer'
import { AnnotationLayer } from './AnnotationLayer'
import { AnnotationToolbar } from './AnnotationToolbar'
import { track } from '@/lib/telemetry'
import type { Annotation } from '@/lib/types/annotation'

// Dynamic import AskPanel to avoid SSR issues
const AskPanel = dynamic(() => import('./AskPanel').then(mod => ({ default: mod.AskPanel })), {
  ssr: false,
})

const ExplainPanel = dynamic(() => import('./ExplainPanel').then(mod => ({ default: mod.ExplainPanel })), {
  ssr: false,
})

// Dynamic import for pdf.js to avoid SSR issues
let pdfjsLib: any = null
let pdfjsLoading: Promise<any> | null = null

async function loadPdfJs() {
  if (typeof window === 'undefined') return null
  if (pdfjsLib) return pdfjsLib
  
  if (pdfjsLoading) {
    return pdfjsLoading
  }
  
  pdfjsLoading = (async () => {
    try {
      const pdfjsModule = await import('pdfjs-dist')
      const pdfjs = pdfjsModule.default ?? pdfjsModule
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      pdfjsLib = pdfjs
      return pdfjsLib
    } catch (err) {
      console.error('[BackpackReader] Failed to load pdf.js:', err)
      pdfjsLoading = null
      return null
    }
  })()
  
  return pdfjsLoading
}

interface BackpackReaderProps {
  fileId: string
  fileUrl: string
  fileName: string
  onClose?: () => void
}

export function BackpackReader({ fileId, fileUrl, fileName, onClose }: BackpackReaderProps) {
  // ⚠️ 重要：所有 hooks 必須在組件頂部，在任何條件返回之前
  // 這是 React Hooks 的規則，違反會導致 "Rendered more hooks than during the previous render" 錯誤
  
  // 基本狀態
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // PDF 尺寸相關狀態
  const [originalPageDimensions, setOriginalPageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map())
  const [initialScaleSet, setInitialScaleSet] = useState(false)
  
  // 文字選取和高亮狀態
  const [showAskPanel, setShowAskPanel] = useState(false)
  const [showExplainPanel, setShowExplainPanel] = useState(false)
  const [selectedTextForAsk, setSelectedTextForAsk] = useState<string>('')
  const [explainResult, setExplainResult] = useState<any>(null)
  const [textContentMap, setTextContentMap] = useState<Map<number, any>>(new Map()) // 儲存每頁的 textContent
  const [viewportMap, setViewportMap] = useState<Map<number, any>>(new Map()) // 儲存每頁的完整 viewport 物件
  const [ocrBboxesMap, setOcrBboxesMap] = useState<Map<number, any[]>>(new Map()) // 儲存每頁的 OCR bboxes
  const [ocrLoadingMap, setOcrLoadingMap] = useState<Map<number, boolean>>(new Map()) // 追蹤 OCR 處理狀態
  
  // 註解工具狀態 - 預設為 null（選取模式），只有在選擇繪圖工具時才改變
  const [annotationTool, setAnnotationTool] = useState<'pen' | 'marker' | 'sticky' | 'eraser' | null>(null)
  const [annotationColor, setAnnotationColor] = useState<string>('#000000')
  const [strokeWidth, setStrokeWidth] = useState<number>(2)
  const [annotations, setAnnotations] = useState<Map<number, Annotation[]>>(new Map()) // 每頁的註解
  const [loadingAnnotations, setLoadingAnnotations] = useState(false)
  // Toolbar is always visible, no need for showToolbar state
  
  // Undo/Redo 歷史記錄
  const [history, setHistory] = useState<Map<number, Annotation[]>[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  
  // Refs
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const renderTasksRef = useRef<Map<number, any>>(new Map()) // 追蹤渲染任務，用於取消
  const containerRef = useRef<HTMLDivElement>(null)
  const renderBatchRef = useRef(0) // 追蹤渲染批次，用於取消舊的渲染
  const renderLockRef = useRef<Promise<void>>(Promise.resolve()) // Async lock for render queue
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map()) // 追蹤每頁的容器元素
  
  // ✨ GoodNotes 升級：移除舊的選取系統，改用原生選取（在 PdfViewerV2 中處理）
  // ❌ 移除: usePdfTextSelection, dragBox, setDragBox, clearSelection

  const { highlights, createHighlight, deleteHighlight } = useHighlights(fileId)
  const { ask, loading: askLoading, result: askResult, error: askError, clear: clearAsk } = useScopedAskV2(fileId)

  // Load annotations for all pages
  useEffect(() => {
    if (!fileId || totalPages === 0) return
    
    async function loadAnnotations() {
      try {
        setLoadingAnnotations(true)
        const response = await fetch(`/api/backpack/annotations?file_id=${fileId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load annotations')
        }
        
        const { annotations: allAnnotations } = await response.json()
        
        // Group annotations by page
        const annotationsByPage = new Map<number, Annotation[]>()
        allAnnotations.forEach((ann: Annotation) => {
          const pageNum = ann.page_number
          if (!annotationsByPage.has(pageNum)) {
            annotationsByPage.set(pageNum, [])
          }
          annotationsByPage.get(pageNum)!.push(ann)
        })
        
        setAnnotations(annotationsByPage)
        
        // 初始化歷史記錄（包含初始狀態）
        setHistory([new Map(annotationsByPage)])
        setHistoryIndex(0)
      } catch (err) {
        console.error('[BackpackReader] Failed to load annotations:', err)
      } finally {
        setLoadingAnnotations(false)
      }
    }
    
    loadAnnotations()
  }, [fileId, totalPages])

  // Handle annotation creation with history
  const handleAnnotationCreate = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => {
      const newMap = new Map(prev)
      const pageNum = annotation.page_number
      if (!newMap.has(pageNum)) {
        newMap.set(pageNum, [])
      }
      
      // 檢查是否已存在相同 ID 的註釋，避免重複
      const pageAnnotations = newMap.get(pageNum)!
      const existingIndex = pageAnnotations.findIndex((ann) => ann.id === annotation.id)
      
      if (existingIndex >= 0) {
        // 如果已存在，更新它而不是添加
        pageAnnotations[existingIndex] = annotation
      } else {
        // 如果不存在，添加新註釋
        pageAnnotations.push(annotation)
      }
      
      newMap.set(pageNum, [...pageAnnotations])
      
      // 添加到歷史記錄
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(new Map(newMap))
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      
      return newMap
    })
  }, [history, historyIndex])

  // Handle annotation update
  const handleAnnotationUpdate = useCallback((annotation: Annotation) => {
    setAnnotations((prev) => {
      const newMap = new Map(prev)
      const pageNum = annotation.page_number
      const pageAnnotations = newMap.get(pageNum) || []
      const index = pageAnnotations.findIndex((ann) => ann.id === annotation.id)
      
      if (index >= 0) {
        pageAnnotations[index] = annotation
        newMap.set(pageNum, [...pageAnnotations])
      }
      
      // 添加到歷史記錄
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(new Map(newMap))
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)
      
      return newMap
    })
  }, [history, historyIndex])

  // Handle annotation delete
  const handleAnnotationDelete = useCallback((annotationId: string) => {
    setAnnotations((prev) => {
      const newMap = new Map(prev)
      
      // Find and remove the annotation
      for (const [pageNum, pageAnnotations] of newMap.entries()) {
        const index = pageAnnotations.findIndex((ann) => ann.id === annotationId)
        if (index >= 0) {
          const updated = pageAnnotations.filter((ann) => ann.id !== annotationId)
          if (updated.length === 0) {
            newMap.delete(pageNum)
          } else {
            newMap.set(pageNum, updated)
          }
          
          // 添加到歷史記錄
          const newHistory = history.slice(0, historyIndex + 1)
          newHistory.push(new Map(newMap))
          setHistory(newHistory)
          setHistoryIndex(newHistory.length - 1)
          
          break
        }
      }
      
      return newMap
    })
  }, [history, historyIndex])

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1
      setAnnotations(new Map(history[prevIndex]))
      setHistoryIndex(prevIndex)
      track('backpack.reader.undo')
    }
  }, [history, historyIndex])

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1
      setAnnotations(new Map(history[nextIndex]))
      setHistoryIndex(nextIndex)
      track('backpack.reader.redo')
    }
  }, [history, historyIndex])

  // Load PDF document
  useEffect(() => {
    async function loadPdf() {
      console.log('[BackpackReader] Starting PDF load', { fileId, fileUrl })
      const pdfjs = await loadPdfJs()
      if (!pdfjs) {
        console.error('[BackpackReader] PDF.js not available')
        setError('PDF.js not available')
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setError(null)
        
        console.log('[BackpackReader] Fetching signed URL from:', fileUrl)
        // Get signed URL from API
        const urlResponse = await fetch(fileUrl)
        if (!urlResponse.ok) {
          const errorData = await urlResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('[BackpackReader] Failed to get file URL:', errorData)
          throw new Error(`無法取得檔案 URL: ${errorData.error || urlResponse.statusText}`)
        }
        
        const { url: signedUrl } = await urlResponse.json()
        console.log('[BackpackReader] Got signed URL:', signedUrl ? 'Yes' : 'No')
        
        if (!signedUrl) {
          throw new Error('API 未返回檔案 URL')
        }
        
        console.log('[BackpackReader] Loading PDF document...')
        const loadingTask = pdfjs.getDocument({
          url: signedUrl,
          cMapUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/cmaps/`,
          cMapPacked: true,
        })
        
        const pdf = await loadingTask.promise
        console.log('[BackpackReader] PDF loaded successfully', { numPages: pdf.numPages })
        setPdfDoc(pdf)
        setTotalPages(pdf.numPages)
      } catch (err) {
        console.error('[BackpackReader] Error loading PDF:', err)
        setError(err instanceof Error ? err.message : '載入 PDF 失敗')
      } finally {
        setLoading(false)
      }
    }
    
    if (fileUrl && fileId) {
      loadPdf()
    } else {
      console.warn('[BackpackReader] Missing fileUrl or fileId', { fileUrl, fileId })
    }
  }, [fileUrl, fileId])

  // Load existing OCR results from database when PDF is loaded
  useEffect(() => {
    if (!fileId || totalPages === 0) return

    async function loadExistingOCR() {
      try {
        const response = await fetch(`/api/backpack/pages?file_id=${fileId}`)
        
        if (!response.ok) {
          // Silently fail - OCR might not be done yet
          console.warn('[BackpackReader] Failed to load OCR results:', response.status)
          return
        }

        const { pages } = await response.json()
        
        if (pages && Object.keys(pages).length > 0) {
          // Load OCR results into ocrBboxesMap
          const newOcrBboxesMap = new Map<number, any[]>()
          
          Object.entries(pages).forEach(([pageNoStr, pageData]: [string, any]) => {
            const pageNo = parseInt(pageNoStr, 10)
            if (pageData.bboxes && Array.isArray(pageData.bboxes) && pageData.bboxes.length > 0) {
              newOcrBboxesMap.set(pageNo, pageData.bboxes)
            }
          })
          
          if (newOcrBboxesMap.size > 0) {
            setOcrBboxesMap(newOcrBboxesMap)
            console.log(`[BackpackReader] Loaded OCR results for ${newOcrBboxesMap.size} pages`)
          }
        }
      } catch (err) {
        // Silently fail - OCR might not be done yet
        console.warn('[BackpackReader] Error loading OCR results:', err)
      }
    }

    loadExistingOCR()
  }, [fileId, totalPages])

  // 載入 PDF 時獲取原始尺寸
  useEffect(() => {
    if (!pdfDoc || totalPages === 0 || originalPageDimensions.size > 0) return
    
    async function getOriginalDimensions() {
      const dimensions = new Map<number, { width: number; height: number }>()
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum)
          const viewport = page.getViewport({ scale: 1, rotation: 0 })
          dimensions.set(pageNum, {
            width: viewport.width,
            height: viewport.height,
          })
        } catch (err) {
          // Silently skip failed pages
        }
      }
      
      setOriginalPageDimensions(dimensions)
    }
    
    getOriginalDimensions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, totalPages]) // 移除 originalPageDimensions.size 避免無限循環

  // 計算初始縮放以適應容器寬度（只在首次載入時執行一次）
  useEffect(() => {
    if (!pdfDoc || totalPages === 0 || originalPageDimensions.size === 0 || initialScaleSet) return
    
    const container = containerRef.current
    if (!container) return

    // 獲取第一頁的原始尺寸作為參考
    const firstPageDim = originalPageDimensions.get(1)
    if (!firstPageDim) return

    // 計算適合容器寬度的縮放（留出 padding）
    const containerWidth = container.clientWidth
    const padding = 48 // 左右各 24px
    const availableWidth = containerWidth - padding
    const optimalScale = availableWidth / firstPageDim.width
    
    // 只在初始載入時設置一次
    if (scale === 1.2 && optimalScale > 0) {
      setScale(Math.min(Math.max(optimalScale, 0.5), 2))
      setInitialScaleSet(true)
    }
  }, [pdfDoc, totalPages, originalPageDimensions, initialScaleSet, scale])

  // Render PDF pages with proper async locking to prevent race conditions
  useEffect(() => {
    if (!pdfDoc || totalPages === 0) return
    
    async function renderPages(currentBatch: number) {
      const pdfjs = await loadPdfJs()
      if (!pdfjs) return

      // Early exit if superseded by newer render
      if (currentBatch !== renderBatchRef.current) return
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // 檢查是否還是當前批次，如果不是則停止渲染
        if (currentBatch !== renderBatchRef.current) {
          break
        }
        
        try {
          const page = await pdfDoc.getPage(pageNum)
          const canvas = canvasRefs.current.get(pageNum)
          
          // 如果 canvas 不存在，等待一下
          if (!canvas) {
            await new Promise(resolve => setTimeout(resolve, 50))
            const retryCanvas = canvasRefs.current.get(pageNum)
            if (!retryCanvas) {
              continue
            }
          }
          
          const canvasToUse = canvas || canvasRefs.current.get(pageNum)
          if (!canvasToUse) continue
          
          // 再次檢查批次，確保沒有新的渲染開始
          if (currentBatch !== renderBatchRef.current) {
            break
          }
          
          // 確保這個 canvas 沒有正在進行的渲染任務
          const existingTask = renderTasksRef.current.get(pageNum)
          if (existingTask && existingTask.cancel) {
            try {
              existingTask.cancel()
            } catch (e) {
              // 忽略取消錯誤
            }
          }
          
          const viewport = page.getViewport({ 
            scale, 
            rotation: 0
          })
          
          // 保存完整的 viewport 物件供文字層使用
          setViewportMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(pageNum, viewport)
            return newMap
          })
          
          // 考慮 devicePixelRatio 以獲得清晰的渲染
          const dpr = window.devicePixelRatio || 1
          const outputScale = dpr
          
          // 重置 canvas 尺寸會清除之前的內容，確保乾淨的渲染
          canvasToUse.width = Math.floor(viewport.width * outputScale)
          canvasToUse.height = Math.floor(viewport.height * outputScale)
          canvasToUse.style.width = `${viewport.width}px`
          canvasToUse.style.height = `${viewport.height}px`
          
          const context = canvasToUse.getContext('2d')
          if (!context) continue
          
          // 清除 canvas 內容
          context.clearRect(0, 0, canvasToUse.width, canvasToUse.height)
          
          // 縮放 context 以匹配 devicePixelRatio
          context.scale(outputScale, outputScale)
          
          // 最後一次檢查批次
          if (currentBatch !== renderBatchRef.current) {
            break
          }
          
          // 開始渲染並追蹤任務
          const renderTask = page.render({
            canvasContext: context,
            viewport,
          })
          
          renderTasksRef.current.set(pageNum, renderTask)
          
          // 同時獲取文字內容用於文字選取（非阻塞，不影響渲染）
          if (currentBatch === renderBatchRef.current) {
            // 使用 Promise.resolve().then() 確保文字內容獲取不阻塞渲染
            Promise.resolve().then(async () => {
              // 再次檢查批次，確保沒有改變
              if (currentBatch !== renderBatchRef.current) return
              
            try {
              const textContent = await page.getTextContent()
                
                // 再次檢查批次
                if (currentBatch !== renderBatchRef.current) return
              
              // Check if page has text content
              const hasText = textContent.items && textContent.items.length > 0
              
              setTextContentMap((prev) => {
                const newMap = new Map(prev)
                newMap.set(pageNum, textContent)
                return newMap
              })
              
              // 記錄文字內容獲取成功
              if (hasText) {
                console.log(`[BackpackReader] Page ${pageNum}: Loaded ${textContent.items.length} text items`)
              } else {
                console.log(`[BackpackReader] Page ${pageNum}: No native text content, will use OCR`)
              }
              
              // 🎯 漸進增強策略：
              // 1. 如果沒有文字層 → 觸發 OCR（掃描版 PDF）
              // 2. 如果已有文字層 → 直接沿用原生文字（混合模式暫停，避免重複文字）
              
              // 只在沒有文字層時立即觸發 OCR（掃描版 PDF）
              if (!hasText) {
                const hasExistingOCR = ocrBboxesMap.get(pageNum) && ocrBboxesMap.get(pageNum)!.length > 0
                if (!ocrLoadingMap.get(pageNum) && !hasExistingOCR) {
                  setOcrLoadingMap((prev) => {
                    const newMap = new Map(prev)
                    newMap.set(pageNum, true)
                    return newMap
                  })
                  
                  // Trigger OCR in background (non-blocking)
                  triggerOCRForPage(pageNum, canvasToUse).catch((err) => {
                    // OCR failed silently, will retry on next page load
                    setOcrLoadingMap((prev) => {
                      const newMap = new Map(prev)
                      newMap.set(pageNum, false)
                      return newMap
                    })
                  })
                }
              }
              } catch (err: any) {
                // 如果是取消錯誤或批次改變，靜默忽略
                if (err.name === 'RenderingCancelledException' || 
                    err.message?.includes('cancelled') ||
                    currentBatch !== renderBatchRef.current) {
                  // 靜默忽略，不影響渲染
                  return
                }
                
                // 記錄其他錯誤
              console.error(`[BackpackReader] Failed to get text content for page ${pageNum}:`, err)
              // 標記為無文字內容，觸發 OCR
              setTextContentMap((prev) => {
                const newMap = new Map(prev)
                newMap.set(pageNum, { items: [] })
                return newMap
              })
              
              // 如果 OCR 尚未載入且不存在，觸發 OCR
              const hasExistingOCR = ocrBboxesMap.get(pageNum) && ocrBboxesMap.get(pageNum)!.length > 0
              if (!ocrLoadingMap.get(pageNum) && !hasExistingOCR) {
                setOcrLoadingMap((prev) => {
                  const newMap = new Map(prev)
                  newMap.set(pageNum, true)
                  return newMap
                })
                
                triggerOCRForPage(pageNum, canvasToUse).catch((err) => {
                  setOcrLoadingMap((prev) => {
                    const newMap = new Map(prev)
                    newMap.set(pageNum, false)
                    return newMap
                  })
                })
              }
            }
            }).catch(() => {
              // 完全忽略錯誤，不影響渲染
            })
          }
          
          // 等待渲染完成，但如果批次改變則取消
          try {
            await renderTask.promise
            // 渲染完成後檢查是否還是當前批次
            if (currentBatch === renderBatchRef.current) {
              renderTasksRef.current.delete(pageNum)
            }
          } catch (err: any) {
            // 如果是取消錯誤，忽略它
            if (err.name === 'RenderingCancelledException' || err.message?.includes('cancelled')) {
              renderTasksRef.current.delete(pageNum)
              continue
            }
            throw err
          }
        } catch (err: any) {
          // 如果是取消錯誤或批次改變，忽略它
          if (err.name === 'RenderingCancelledException' || err.message?.includes('cancelled') || currentBatch !== renderBatchRef.current) {
            continue
          }
          // 如果是 canvas 重複使用錯誤，也忽略（因為批次已經改變）
          if (err.message?.includes('Cannot use the same canvas')) {
            // Canvas conflict, skipping (batch changed)
            continue
          }
          // Failed to render page, will retry on next render
        }
      }
      
      // Rendering complete for this batch
    }
    
    // Start rendering immediately
    const currentBatch = ++renderBatchRef.current
    renderPages(currentBatch)
    
    // Cleanup function: cancel current batch when component unmounts
    return () => {
      renderBatchRef.current++
      renderTasksRef.current.forEach((task) => {
        if (task && task.cancel) {
          try {
            task.cancel()
          } catch (e) {
            // Ignore cancel errors
          }
        }
      })
      renderTasksRef.current.clear()
    }
  }, [pdfDoc, totalPages, scale, ocrLoadingMap, ocrBboxesMap])

  // Trigger OCR for a page when no text content is available
  const triggerOCRForPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    try {
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return
        
        const formData = new FormData()
        formData.append('file_id', fileId)
        formData.append('page_number', pageNum.toString())
        formData.append('image', blob, `page-${pageNum}.png`)
        
        const response = await fetch('/api/backpack/ocr', {
          method: 'POST',
          body: formData,
        })
        
        if (response.ok) {
          const { bboxes } = await response.json()
          setOcrBboxesMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(pageNum, bboxes || [])
            return newMap
          })
        }
        
        setOcrLoadingMap((prev) => {
          const newMap = new Map(prev)
          newMap.set(pageNum, false)
          return newMap
        })
      }, 'image/png')
    } catch (err) {
      // OCR trigger failed, will retry on next page load
      setOcrLoadingMap((prev) => {
        const newMap = new Map(prev)
        newMap.set(pageNum, false)
        return newMap
      })
    }
  }, [fileId])

  // Handle wheel zoom (Cmd/Ctrl + wheel) - 使用原生事件監聽器避免 passive 問題
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    function handleWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setScale((prev) => Math.min(Math.max(prev + delta, 0.5), 3))
      }
    }

    // 使用 { passive: false } 以允許 preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })
    
    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // Removed: selectstart handling now done in usePdfTextSelection hook to avoid duplicate handlers

  // ✨ GoodNotes 升級：這些函數現在由 PdfViewerV2 內部處理
  // ❌ 移除: handleExplain, handleAsk (舊的選取依賴)

  // ✨ GoodNotes 升級：新的 handleHighlight 接收 normalized rects
  const handleHighlight = async (
    pageNumber: number,
    text: string,
    normalizedRects: Array<{ x: number; y: number; width: number; height: number }>,
    color: string
  ) => {
    await createHighlight(pageNumber, text, normalizedRects, color)
  }

  // ✅ 現在可以安全地進行條件返回，因為所有 hooks 都已經在頂部定義
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">📄</div>
          <div className="text-sm text-muted-foreground">載入 PDF 中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm text-destructive">{error}</div>
          <div className="text-xs text-muted-foreground mt-2">請檢查瀏覽器控制台以獲取詳細錯誤訊息</div>
        </div>
      </div>
    )
  }

  // 如果 PDF 已載入但頁數為 0，顯示錯誤
  if (pdfDoc && totalPages === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm text-destructive">PDF 沒有頁面</div>
        </div>
      </div>
    )
  }

  // 如果 PDF 文檔未載入且沒有錯誤，顯示載入中
  if (!pdfDoc && !error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">📄</div>
          <div className="text-sm text-muted-foreground">準備載入 PDF...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ userSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text' }}>
      {/* PDF Viewer - 只有內容區域可滾動 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-zinc-950 dark:bg-zinc-950"
        style={{ scrollBehavior: 'smooth', userSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text' }}
      >
        <div className="flex flex-col items-center py-6 gap-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            // 使用原始尺寸 × 當前縮放比例
            const originalDim = originalPageDimensions.get(pageNum)
            const pageWidth = originalDim ? originalDim.width * scale : 800 * scale
            const pageHeight = originalDim ? originalDim.height * scale : 1000 * scale
            const textContent = textContentMap.get(pageNum)
            const hasNativeTextLayer = !!(textContent?.items?.length)
            const ocrBboxes = ocrBboxesMap.get(pageNum) || []
            const pageHighlights = highlights.filter((h) => h.page_number === pageNum)

            // DEBUG: Log text content availability
            if (pageNum === 1) {
              console.log('[DEBUG] Page 1 textContent:', {
                hasTextContent: hasNativeTextLayer,
                itemsLength: textContent?.items?.length || 0,
                hasViewport: !!viewportMap.get(pageNum),
                originalDim: !!originalDim
              })
            }
            
            return (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el)
                }}
                data-page-number={pageNum}
                className="bg-white rounded-2xl shadow-xl relative"
                style={{
                  width: `${Math.round(pageWidth)}px`, // 像素對齊，避免次像素渲染錯誤
                  height: `${Math.round(pageHeight)}px`, // 像素對齊
                  maxWidth: '100%',
                  // 🔍 強制確保父容器有 position: relative，以便絕對定位的子元素正確定位
                  position: 'relative', // 關鍵：確保 SelectionCaptureLayer 相對於此容器定位
                  // 預設允許選取，只有在繪圖模式下才阻止
                  userSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                  WebkitUserSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                  MozUserSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                  msUserSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                  // 確保父容器不會裁剪文字層（移除不必要的 overflow）
                  overflow: 'visible', // 允許文字層溢出到容器外（如果需要）
                }}
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el)
                  }}
                  className="w-full h-full block rounded-2xl absolute inset-0"
                  style={{
                    width: `${Math.round(pageWidth)}px`, // 像素對齊
                    height: `${Math.round(pageHeight)}px`, // 像素對齊
                    pointerEvents: 'none', // Canvas 不應該阻擋文字選取
                    zIndex: 0, // 在最底層，確保文字層在上
                  }}
                />
                
                {/* Text Layer for selection - Native PDF text layer */}
                {/* 🎯 OCR 分層策略（暫時僅在無原生文字層時啟用，避免雙層文字造成選取錯亂） */}
                {originalDim && viewportMap.get(pageNum) && (
                  <>
                    {/* 原生 PDF 文字層：如果有文字內容，始終渲染 */}
                    {hasNativeTextLayer && (
                      <PdfTextLayer
                        pageNumber={pageNum}
                        textContent={textContent}
                        viewport={viewportMap.get(pageNum)}
                        scale={scale}
                      />
                    )}
                    
                    {/* OCR 文字層：僅在無原生文字層時提供掃描版 PDF 選取 */}
                    {!hasNativeTextLayer && ocrBboxes.length > 0 && (
                      <OcrTextLayer
                        pageNumber={pageNum}
                        bboxes={ocrBboxes}
                        viewport={{ width: viewportMap.get(pageNum)!.width, height: viewportMap.get(pageNum)!.height }}
                      />
                    )}
                    
                    {/* ✨ GoodNotes 升級：移除 SelectionCaptureLayer */}
                    {/* 原生選取由 PdfTextLayer 的 user-select: text 處理 */}
                    {/* SelectionActionBar 由 PdfViewerV2 管理 */}
                  </>
                )}
                
                {/* Annotation Layer - 顯示現有註解，工具啟用時可編輯 */}
                {originalDim && (annotationTool || (annotations.get(pageNum)?.length ?? 0) > 0) && (
                  <AnnotationLayer
                    pageNumber={pageNum}
                    fileId={fileId}
                    tool={annotationTool}
                    color={annotationColor}
                    strokeWidth={strokeWidth}
                    annotations={annotations.get(pageNum) || []}
                    scale={scale}
                    viewport={{ width: pageWidth, height: pageHeight }}
                    onAnnotationCreate={handleAnnotationCreate}
                    onAnnotationUpdate={handleAnnotationUpdate}
                    onAnnotationDelete={handleAnnotationDelete}
                    onToolChange={(newTool) => {
                      // 如果點擊已選中的工具，切換回選取模式（null）
                      setAnnotationTool(newTool === annotationTool ? null : newTool)
                    }}
                  />
                )}
                
                {/* Highlight Overlay - 極簡主義設計，hover 顯示刪除按鈕 */}
                {pageHighlights.length > 0 && originalDim && (
                  <TextHighlightOverlay
                    annotations={pageHighlights.map((h) => ({
                      id: h.id,
                      file_id: h.file_id,
                      page_number: h.page_number,
                      annotation_type: 'text-highlight' as const,
                      data: {
                        text: h.text,
                        // 轉換為 Annotation 類型期望的格式：{x, y, w, h}
                        rects: h.rects.map((r) => ({
                          x: r.x,
                          y: r.y,
                          w: r.width,
                          h: r.height,
                        })),
                        color: h.color,
                      },
                      created_at: h.created_at,
                      updated_at: h.created_at, // 使用 created_at 作為 updated_at
                    }))}
                    viewport={{ width: pageWidth, height: pageHeight }}
                    scale={scale}
                    onDelete={async (id) => {
                      await deleteHighlight(id)
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ✨ GoodNotes 升級：新的原生選取系統 */}
      <PdfViewerV2
        containerRef={containerRef}
        viewportMap={viewportMap}
        scale={scale}
        onHighlight={handleHighlight}
        onAskAI={(text, pageNumber) => {
          setSelectedTextForAsk(text)
          setShowAskPanel(true)
          ask(text)
        }}
      />

      {/* Annotation Toolbar - GoodNotes 風格，頂部居中，始終顯示 */}
      <AnnotationToolbar
        tool={annotationTool}
        color={annotationColor}
        strokeWidth={strokeWidth}
        onToolChange={(newTool) => {
          // 如果點擊已選中的工具，切換回選取模式（null）
          setAnnotationTool(newTool === annotationTool ? null : newTool)
        }}
        onColorChange={setAnnotationColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* Ask Panel */}
      {showAskPanel && (
        <AskPanel
          question={selectedTextForAsk}
          answer={askResult?.answer || ''}
          citations={askResult?.citations || []}
          loading={askLoading}
          onClose={() => {
            setShowAskPanel(false)
            clearAsk()
          }}
          onSubmit={(question) => {
            ask(question)
          }}
        />
      )}

      {/* Explain Panel */}
      {showExplainPanel && (
        <ExplainPanel
          selectedText={selectedTextForAsk}
          result={explainResult}
          loading={!explainResult}
          onClose={() => {
            setShowExplainPanel(false)
            setExplainResult(null)
          }}
        />
      )}
    </div>
  )
}
