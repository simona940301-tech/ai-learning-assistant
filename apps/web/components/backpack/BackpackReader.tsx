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

import { BlockAnchoringService, Block } from '@/lib/pdf/block-anchoring'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { BlurPopover } from '@/components/ui/BlurPopover'

// Removed AskPanel and ExplainPanel dynamic imports

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
      // 🎯 頂尖修復方案：使用 CDN Worker，確保版本一致性（4.0.379）
      const pdfjsModule = await import('pdfjs-dist')
      const pdfjs = pdfjsModule.default ?? pdfjsModule

      // 關鍵修復：顯式指定 Worker 路徑，使用 CDN 確保版本一致
      // 這繞過了 Webpack 的動態導入問題，保證主線程與 Worker 版本嚴格一致
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`
      }

      pdfjsLib = pdfjs
      console.log('[BackpackReader] PDF.js loaded successfully with CDN worker')
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
  const [scale, setScale] = useState(1.0) // 🎯 修復：降低初始縮放，避免 PDF 打開時過大
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // PDF 尺寸相關狀態
  const [originalPageDimensions, setOriginalPageDimensions] = useState<Map<number, { width: number; height: number }>>(new Map())

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

  // ✨ GoodNotes 升級：新的 Block Anchoring 系統
  // ⚠️ 重要：這些 hooks 必須在組件頂部，在任何條件返回之前
  const [blocks, setBlocks] = useState<Map<number, Block[]>>(new Map())
  const [activeBlock, setActiveBlock] = useState<Block | null>(null)
  const [showBottomSheet, setShowBottomSheet] = useState(false)
  const [popoverAnchor, setPopoverAnchor] = useState<{ x: number, y: number, width: number, height: number } | null>(null)
  const [popoverContent, setPopoverContent] = useState<string | null>(null)

  // Compute blocks using Web Worker
  // ⚠️ 重要：這個 useEffect 必須在組件頂部，在任何條件返回之前
  // 使用 ref 追蹤已計算的頁面，避免將 blocks 添加到依賴項（防止無限循環）
  const computedPagesRef = useRef<Set<number>>(new Set())
  
  useEffect(() => {
    if (!pdfDoc) return

    // Initialize worker
    const worker = new Worker(new URL('@/lib/pdf/block-anchoring.worker.ts', import.meta.url))

    worker.onmessage = (e) => {
      const { type, payload } = e.data
      if (type === 'BLOCKS_COMPUTED') {
        setBlocks(prev => {
          const newMap = new Map(prev)
          newMap.set(payload.pageIndex, payload.blocks)
          computedPagesRef.current.add(payload.pageIndex)
          return newMap
        })
      }
    }

    // Send pages to worker as they become available
    for (const [pageNum, textContent] of textContentMap.entries()) {
      // Only compute if not already computed
      if (!computedPagesRef.current.has(pageNum)) {
        const viewport = viewportMap.get(pageNum)
        if (textContent && viewport) {
          worker.postMessage({
            type: 'COMPUTE_BLOCKS',
            payload: {
              items: textContent.items,
              pageIndex: pageNum,
              viewport: { width: viewport.width, height: viewport.height } // Send serializable viewport data
            }
          })
        }
      }
    }

    return () => {
      worker.terminate()
    }
  }, [textContentMap, viewportMap, pdfDoc]) // 不包含 blocks，使用 ref 追蹤已計算的頁面

  // Handle Ask AI with Block Anchoring
  // ⚠️ 重要：這個 useCallback 必須在組件頂部，在任何條件返回之前
  const handleAskAI = useCallback(async (text: string, pageNumber: number) => {
    // 1. Find the logical block
    const pageBlocks = blocks.get(pageNumber)
    const block = pageBlocks ? BlockAnchoringService.findSelectedBlock(text, pageBlocks) : null

    // 2. Set active block (for highlighting)
    setActiveBlock(block)

    // 3. Open Bottom Sheet
    setShowBottomSheet(true)

    // 4. Trigger AI
    // We pass the block ID if available for persistence
    ask(text, {
      page_index: pageNumber - 1,
      start: -1, // Deprecated
      end: -1,   // Deprecated
      quote: block ? block.text : text, // Use full block text for better context
    })
  }, [blocks, ask])

  // Load annotations for all pages
  useEffect(() => {
    if (!fileId || totalPages === 0) return

    async function loadAnnotations() {
      // 🎯 頂尖修復：本地模式跳過 API 請求（GoodNotes 本地優先架構）
      const isLocalMode = fileId.startsWith('preview-')
      if (isLocalMode) {
        console.log('[BackpackReader] Local mode: Skipping server annotations fetch.')
        setAnnotations(new Map())
        setHistory([new Map()])
        setHistoryIndex(-1)
        return
      }

      try {
        setLoadingAnnotations(true)
        const response = await fetch(`/api/backpack/annotations?file_id=${fileId}`)

        // 🎯 優雅處理 404：API 端點可能尚未實現
        if (response.status === 404) {
          setAnnotations(new Map()) // 修復：使用正確的 setter
          setHistory([new Map()])
          setHistoryIndex(-1)
          return
        }

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
        // 失敗時初始化為空
        setAnnotations(new Map())
        setHistory([new Map()])
        setHistoryIndex(-1)
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

        // 🎯 頂尖優化：判斷是本地 URL（blob:）還是 API URL
        const isLocalUrl = fileUrl.startsWith('blob:') || fileUrl.startsWith('http://localhost') || fileUrl.startsWith('file://')
        let finalUrl: string

        if (isLocalUrl) {
          // 本地預覽：直接使用本地 URL（零延遲）
          console.log('[BackpackReader] Using local preview URL:', fileUrl)
          finalUrl = fileUrl
        } else {
          // 服務器檔案：通過 API 獲取 signed URL
          console.log('[BackpackReader] Fetching signed URL from:', fileUrl)
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

          finalUrl = signedUrl
        }

        console.log('[BackpackReader] Loading PDF document...')
        const loadingTask = pdfjs.getDocument({
          url: finalUrl,
          // 🎯 頂尖修復：使用 unpkg CDN 確保中文支援（古籍文字）
          cMapUrl: `https://unpkg.com/pdfjs-dist@4.0.379/cmaps/`,
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

    // 🎯 頂尖修復：本地模式跳過 OCR API 請求（GoodNotes 本地優先架構）
    const isLocalMode = fileId.startsWith('preview-')
    if (isLocalMode) {
      console.log('[BackpackReader] Local mode: Skipping server OCR fetch. Using PDF.js built-in text extraction.')
      // 本地模式使用 PDF.js 內建的文字解析，不需要後端 OCR
      return
    }

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

  // 🎯 Mobile First：使用原始尺寸呈現，不自動計算縮放
  // 用戶可以透過手機手勢或電腦滾輪自行縮放
  // 移除自動計算初始縮放的邏輯，始終使用 scale = 1.0（原始尺寸）

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

          // 🎯 頂尖修復：分離 layoutViewport 與 outputViewport
          // 這是解決 Canvas 解析度 vs. DOM 座標系不匹配問題的核心
          const dpr = window.devicePixelRatio || 1

          // layoutViewport: 用於 CSS 尺寸設定和所有 DOM 層（Text Layer、OCR Layer、Annotation Layer）
          const layoutViewport = page.getViewport({
            scale,
            rotation: 0
          })

          // outputViewport: 用於 Canvas 內部高解析度渲染（Retina 支援）
          const outputViewport = page.getViewport({
            scale: scale * dpr,
            rotation: 0
          })

          // 保存 layoutViewport 供所有 DOM 層使用（Text Layer、OCR Layer、Annotation Layer）
          setViewportMap((prev) => {
            const newMap = new Map(prev)
            newMap.set(pageNum, layoutViewport)
            return newMap
          })

          // Canvas 實際像素大小（高解析度，用於 Retina 螢幕）
          canvasToUse.width = Math.floor(outputViewport.width)
          canvasToUse.height = Math.floor(outputViewport.height)

          // Canvas 顯示的 CSS 大小（必須與 layoutViewport 一致，確保與 DOM 層對齊）
          canvasToUse.style.width = `${Math.floor(layoutViewport.width)}px`
          canvasToUse.style.height = `${Math.floor(layoutViewport.height)}px`

          const context = canvasToUse.getContext('2d')
          if (!context) continue

          // 清除 canvas 內容
          context.clearRect(0, 0, canvasToUse.width, canvasToUse.height)

          // 🎯 頂尖修復：重置 Canvas context 的 transform 矩陣
          // 確保 context 處於乾淨狀態，PDF.js 會根據 viewport 自動處理所有縮放
          context.setTransform(1, 0, 0, 1, 0, 0)

          // 最後一次檢查批次
          if (currentBatch !== renderBatchRef.current) {
            break
          }

          // 🎯 頂尖修復：使用 outputViewport 渲染（Retina 高解析度）
          // PDF.js 會根據 outputViewport 的大小自動將內容渲染到正確的像素尺寸
          // 我們不需要手動應用 transform，PDF.js 會自動處理所有縮放計算
          const renderTask = page.render({
            canvasContext: context,
            viewport: outputViewport, // 使用高解析度 viewport (scale * dpr)
            // 注意：不傳入 transform，讓 PDF.js 根據 viewport 自動處理
            // PDF.js 會自動將 PDF 內容縮放到 outputViewport 的大小
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

  // Handle saving to notes (persistence)
  const handleSaveNote = async () => {
    if (!activeBlock || !askResult?.answer) return

    // Create annotation with block ID
    // This part would need to call the createHighlight API with extra data
    // For now, we just close the sheet
    setShowBottomSheet(false)
    setActiveBlock(null)
    clearAsk()
  }

  return (
    <div className="relative h-full flex flex-col overflow-hidden" style={{ userSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text' }}>
      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-zinc-950 dark:bg-zinc-950"
        style={{
          scrollBehavior: 'smooth',
          userSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
        }}
      >
        <div className="flex flex-col items-center py-6 gap-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const layoutViewport = viewportMap.get(pageNum)
            const originalDim = originalPageDimensions.get(pageNum)

            const pageWidth = layoutViewport
              ? Math.floor(layoutViewport.width)
              : (originalDim ? Math.floor(originalDim.width * scale) : 800)
            const pageHeight = layoutViewport
              ? Math.floor(layoutViewport.height)
              : (originalDim ? Math.floor(originalDim.height * scale) : 1000)
            const textContent = textContentMap.get(pageNum)
            const hasNativeTextLayer = !!(textContent?.items?.length)
            const ocrBboxes = ocrBboxesMap.get(pageNum) || []
            const pageHighlights = highlights.filter((h) => h.page_number === pageNum)

            return (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el)
                }}
                data-page-number={pageNum}
                className="bg-white rounded-2xl shadow-xl relative pdf-page-container"
                style={{
                  width: `${pageWidth}px`,
                  height: `${pageHeight}px`,
                  maxWidth: '100%',
                  maxHeight: '100vh',
                  position: 'relative',
                  overflow: 'visible',
                  userSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                  WebkitUserSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                  MozUserSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                  msUserSelect: (annotationTool === 'pen' || annotationTool === 'marker') ? 'none' : 'text',
                }}
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el)
                  }}
                  className="block rounded-2xl absolute"
                  style={{
                    left: 0,
                    top: 0,
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />

                {/* Text Layer */}
                {originalDim && viewportMap.get(pageNum) && (
                  <>
                    {hasNativeTextLayer && (
                      <PdfTextLayer
                        pageNumber={pageNum}
                        textContent={textContent}
                        viewport={viewportMap.get(pageNum)}
                        scale={scale}
                      />
                    )}

                    {!hasNativeTextLayer && ocrBboxes.length > 0 && (
                      <OcrTextLayer
                        pageNumber={pageNum}
                        bboxes={ocrBboxes}
                        viewport={{ width: viewportMap.get(pageNum)!.width, height: viewportMap.get(pageNum)!.height }}
                      />
                    )}
                  </>
                )}

                {/* Annotation Layer */}
                {originalDim && (annotationTool || (annotations.get(pageNum)?.length ?? 0) > 0) && viewportMap.get(pageNum) && (
                  <AnnotationLayer
                    pageNumber={pageNum}
                    fileId={fileId}
                    tool={annotationTool}
                    color={annotationColor}
                    strokeWidth={strokeWidth}
                    annotations={annotations.get(pageNum) || []}
                    scale={scale}
                    viewport={{ width: viewportMap.get(pageNum)!.width, height: viewportMap.get(pageNum)!.height }}
                    onAnnotationCreate={handleAnnotationCreate}
                    onAnnotationUpdate={handleAnnotationUpdate}
                    onAnnotationDelete={handleAnnotationDelete}
                    onToolChange={(newTool) => {
                      setAnnotationTool(newTool === annotationTool ? null : newTool)
                    }}
                  />
                )}

                {/* Highlight Overlay */}
                {pageHighlights.length > 0 && originalDim && viewportMap.get(pageNum) && (
                  <TextHighlightOverlay
                    annotations={pageHighlights.map((h) => ({
                      id: h.id,
                      file_id: h.file_id,
                      page_number: h.page_number,
                      annotation_type: 'text-highlight' as const,
                      data: {
                        text: h.text,
                        rects: h.rects.map((r) => ({
                          x: r.x,
                          y: r.y,
                          w: r.width,
                          h: r.height,
                        })),
                        color: h.color,
                      },
                      created_at: h.created_at,
                      updated_at: h.created_at,
                    }))}
                    viewport={{ width: viewportMap.get(pageNum)!.width, height: viewportMap.get(pageNum)!.height }}
                    scale={scale}
                    onDelete={async (id) => {
                      await deleteHighlight(id)
                    }}
                    // Add onClick handler for Popover
                    onClick={(id, rect) => {
                      // Find the highlight content to show in popover
                      const highlight = pageHighlights.find(h => h.id === id)
                      if (highlight) {
                        setPopoverAnchor(rect)
                        setPopoverContent(highlight.text.substring(0, 100) + '...') // Summary
                      }
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Native Selection System */}
      <PdfViewerV2
        containerRef={containerRef}
        viewportMap={viewportMap}
        scale={scale}
        onHighlight={handleHighlight}
        onAskAI={handleAskAI}
      />

      {/* Annotation Toolbar */}
      <AnnotationToolbar
        tool={annotationTool}
        color={annotationColor}
        strokeWidth={strokeWidth}
        onToolChange={(newTool) => {
          setAnnotationTool(newTool === annotationTool ? null : newTool)
        }}
        onColorChange={setAnnotationColor}
        onStrokeWidthChange={setStrokeWidth}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* New Bottom Sheet for Ask AI */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => {
          setShowBottomSheet(false)
          clearAsk()
          setActiveBlock(null)
        }}
        className="border-t border-zinc-200 dark:border-zinc-800"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">AI 分析</h2>
            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                📝 轉為筆記
              </button>
            </div>
          </div>

          {/* Answer Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {askError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="text-red-500 mb-2">⚠️ 分析失敗</div>
                <p className="text-sm text-muted-foreground mb-4">{askError}</p>
                <button
                  onClick={() => {
                    if (activeBlock) {
                      handleAskAI(activeBlock.text, activeBlock.pageIndex)
                    }
                  }}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  重試
                </button>
              </div>
            ) : askLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin">⏳</div>
                正在分析區塊內容...
              </div>
            ) : askResult ? (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap leading-relaxed">
                  {askResult.answer}
                </div>

                {/* Citations */}
                {askResult.citations && askResult.citations.length > 0 && (
                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">引用來源</h4>
                    <div className="flex flex-wrap gap-2">
                      {askResult.citations.map((citation, i) => (
                        <span key={i} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400">
                          第 {citation.page_index + 1} 頁
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </BottomSheet>

      {/* History Popover */}
      <BlurPopover
        isOpen={!!popoverAnchor}
        onClose={() => setPopoverAnchor(null)}
        anchorRect={popoverAnchor}
      >
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">AI 摘要</div>
          <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-3">
            {popoverContent}
          </p>
          <div className="flex gap-2 mt-2">
            <button
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
              onClick={() => {
                // Open full note logic here
              }}
            >
              查看完整筆記 →
            </button>
            <button
              className="text-xs text-zinc-500 hover:text-zinc-600 font-medium"
              onClick={() => {
                if (activeBlock) {
                  setShowBottomSheet(true)
                  setPopoverAnchor(null)
                }
              }}
            >
              在對話中開啟 ↗
            </button>
          </div>
        </div>
      </BlurPopover>
    </div>
  )
}
