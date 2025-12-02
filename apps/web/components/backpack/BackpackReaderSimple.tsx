'use client'

/**
 * BackpackReaderSimple
 * 
 * 精簡版 PDF 閱讀器
 * 
 * 功能：
 * - ✅ PDF 載入和渲染
 * - ✅ 翻頁（scrolling）
 * - ✅ 縮放（Cmd/Ctrl + 滾輪）
 * - ✅ 高解析度 Retina 支援
 * 
 * 移除：
 * - ❌ 文字選取
 * - ❌ 手寫註解
 * - ❌ OCR 文字層
 * - ❌ Ask AI 功能
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ZoomIn, ZoomOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

            // ✅ FIX: Use legacy worker build for compatibility
            if (pdfjs.GlobalWorkerOptions) {
                pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.0.379/legacy/build/pdf.worker.min.mjs`
            }

            pdfjsLib = pdfjs
            console.log('[BackpackReaderSimple] PDF.js loaded successfully')
            return pdfjsLib
        } catch (err) {
            console.error('[BackpackReaderSimple] Failed to load pdf.js:', err)
            pdfjsLoading = null
            return null
        }
    })()

    return pdfjsLoading
}

interface BackpackReaderSimpleProps {
    fileId: string
    fileUrl: string
    fileName: string
    onClose?: () => void
}

export function BackpackReaderSimple({ fileId, fileUrl, fileName, onClose }: BackpackReaderSimpleProps) {
    const [pdfDoc, setPdfDoc] = useState<any>(null)
    const [totalPages, setTotalPages] = useState(0)
    const [scale, setScale] = useState(1.0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
    const renderTasksRef = useRef<Map<number, any>>(new Map())
    const renderBatchRef = useRef(0)

    // Load PDF document
    useEffect(() => {
        async function loadPdf() {
            console.log('[BackpackReaderSimple] Starting PDF load', { fileId, fileUrl })
            const pdfjs = await loadPdfJs()
            if (!pdfjs) {
                setError('PDF.js 載入失敗')
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)

                // 判斷 URL 類型並獲取可存取的 URL
                let finalUrl: string

                if (fileUrl.startsWith('blob:') || fileUrl.startsWith('http://localhost')) {
                    // 本地 blob URL，直接使用
                    finalUrl = fileUrl
                } else if (fileUrl.startsWith('storage://')) {
                    // ✅ NEW: Storage path format - need to generate signed URL
                    const storagePath = fileUrl.replace('storage://backpack_files/', '')
                    console.log('[BackpackReaderSimple] Generating signed URL for:', storagePath)

                    // Call API to get signed URL
                    const response = await fetch(`/api/backpack/file-url?path=${encodeURIComponent(storagePath)}`)
                    if (!response.ok) {
                        throw new Error(`無法取得檔案 URL (HTTP ${response.status})`)
                    }

                    const { url: signedUrl } = await response.json()
                    if (!signedUrl) {
                        throw new Error('API 未返回檔案 URL')
                    }

                    finalUrl = signedUrl
                } else if (fileUrl.includes('/storage/v1/object/sign/') || fileUrl.includes('token=')) {
                    // ✅ Already a signed URL, use directly
                    console.log('[BackpackReaderSimple] Using existing signed URL')
                    finalUrl = fileUrl
                } else {
                    // ✅ Legacy public URL format - test if accessible
                    console.log('[BackpackReaderSimple] Testing legacy public URL:', fileUrl)

                    const testResponse = await fetch(fileUrl, { method: 'HEAD' })
                    if (!testResponse.ok) {
                        console.error('[BackpackReaderSimple] Public URL not accessible, trying to get signed URL')

                        // Extract path from public URL and get signed URL
                        const pathMatch = fileUrl.match(/\/backpack_files\/(.+)$/)
                        if (pathMatch) {
                            const storagePath = pathMatch[1]
                            const response = await fetch(`/api/backpack/file-url?path=${encodeURIComponent(storagePath)}`)
                            if (response.ok) {
                                const { url: signedUrl } = await response.json()
                                finalUrl = signedUrl
                            } else {
                                throw new Error(`檔案無法存取 (HTTP ${testResponse.status})`)
                            }
                        } else {
                            throw new Error(`檔案無法存取 (HTTP ${testResponse.status})`)
                        }
                    } else {
                        finalUrl = fileUrl
                    }
                }

                const loadingTask = pdfjs.getDocument({
                    url: finalUrl,
                    cMapUrl: `https://unpkg.com/pdfjs-dist@4.0.379/cmaps/`,
                    cMapPacked: true,
                })

                const pdf = await loadingTask.promise
                console.log('[BackpackReaderSimple] PDF loaded:', pdf.numPages, 'pages')
                setPdfDoc(pdf)
                setTotalPages(pdf.numPages)
            } catch (err) {
                console.error('[BackpackReaderSimple] Error loading PDF:', err)
                setError(err instanceof Error ? err.message : '載入 PDF 失敗')
            } finally {
                setLoading(false)
            }
        }

        if (fileUrl && fileId) {
            loadPdf()
        }
    }, [fileUrl, fileId])

    // Render PDF pages
    useEffect(() => {
        if (!pdfDoc || totalPages === 0) return

        async function renderPages(currentBatch: number) {
            const pdfjs = await loadPdfJs()
            if (!pdfjs) return
            if (currentBatch !== renderBatchRef.current) return

            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                if (currentBatch !== renderBatchRef.current) break

                try {
                    const page = await pdfDoc.getPage(pageNum)
                    const canvas = canvasRefs.current.get(pageNum)
                    if (!canvas) continue

                    // Cancel existing render task
                    const existingTask = renderTasksRef.current.get(pageNum)
                    if (existingTask?.cancel) {
                        try { existingTask.cancel() } catch (e) { }
                    }

                    const dpr = window.devicePixelRatio || 1
                    const viewport = page.getViewport({ scale })
                    const outputViewport = page.getViewport({ scale: scale * dpr })

                    canvas.width = Math.floor(outputViewport.width)
                    canvas.height = Math.floor(outputViewport.height)
                    canvas.style.width = `${Math.floor(viewport.width)}px`
                    canvas.style.height = `${Math.floor(viewport.height)}px`

                    const context = canvas.getContext('2d')
                    if (!context) continue

                    context.clearRect(0, 0, canvas.width, canvas.height)
                    context.setTransform(1, 0, 0, 1, 0, 0)

                    const renderTask = page.render({
                        canvasContext: context,
                        viewport: outputViewport,
                    })

                    renderTasksRef.current.set(pageNum, renderTask)

                    await renderTask.promise
                    renderTasksRef.current.delete(pageNum)
                } catch (err: any) {
                    if (err.name === 'RenderingCancelledException') continue
                    console.error(`[BackpackReaderSimple] Failed to render page ${pageNum}:`, err)
                }
            }
        }

        const currentBatch = ++renderBatchRef.current
        renderPages(currentBatch)

        return () => {
            renderBatchRef.current++
            renderTasksRef.current.forEach((task) => {
                if (task?.cancel) try { task.cancel() } catch (e) { }
            })
            renderTasksRef.current.clear()
        }
    }, [pdfDoc, totalPages, scale])

    // Handle wheel zoom
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

        container.addEventListener('wheel', handleWheel, { passive: false })
        return () => container.removeEventListener('wheel', handleWheel)
    }, [])

    // Track current page on scroll
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        function handleScroll() {
            const pages = container!.querySelectorAll('[data-page-number]')
            let closestPage = 1
            let closestDistance = Infinity

            pages.forEach((page) => {
                const rect = page.getBoundingClientRect()
                const distance = Math.abs(rect.top - container!.getBoundingClientRect().top)
                if (distance < closestDistance) {
                    closestDistance = distance
                    closestPage = parseInt(page.getAttribute('data-page-number') || '1')
                }
            })

            setCurrentPage(closestPage)
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [])

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        setScale((prev) => Math.min(prev + 0.25, 3))
    }, [])

    const handleZoomOut = useCallback(() => {
        setScale((prev) => Math.max(prev - 0.25, 0.5))
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-zinc-950">
                <div className="text-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">載入 PDF 中...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-zinc-950">
                <div className="text-center text-white">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full flex flex-col overflow-hidden bg-zinc-950">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-300 truncate max-w-[200px]">
                        {fileName}
                    </span>
                    <span className="text-xs text-zinc-500">
                        {currentPage} / {totalPages}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleZoomOut}
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-zinc-400 w-12 text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleZoomIn}
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8 text-zinc-400 hover:text-white ml-2"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* PDF Pages */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div className="flex flex-col items-center py-6 gap-6">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <div
                            key={pageNum}
                            data-page-number={pageNum}
                            className="bg-white rounded-lg shadow-xl"
                            style={{ maxWidth: '100%' }}
                        >
                            <canvas
                                ref={(el) => {
                                    if (el) canvasRefs.current.set(pageNum, el)
                                }}
                                className="block rounded-lg"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// 導出為預設和命名導出，方便替換
export { BackpackReaderSimple as BackpackReader }
export default BackpackReaderSimple

