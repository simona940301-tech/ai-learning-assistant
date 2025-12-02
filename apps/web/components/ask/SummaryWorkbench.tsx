'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { FileUploader } from '@/components/ask/file-uploader'
import { Button } from '@/components/ui/button'
import { useAsk } from '@/lib/ask-context'
import { cn } from '@/lib/utils'
import ProgressiveAnalysisCard from '@/components/ask/ProgressiveAnalysisCard'
import { motion, AnimatePresence } from 'framer-motion'
// import RAGChatInterface from '@/components/ask/RAGChatInterface' // Temporarily disabled
import { useSummaryWorkbench, DocumentGroup } from '@/hooks/useSummaryWorkbench'
import { useState, useEffect } from 'react'
import { FileSelectionChips } from '@/components/ask/FileSelectionChips'

/**
 * Elite RAG Upload Response
 */
interface EliteUploadResponse {
    success: boolean
    document: {
        id: string
        filename: string
        status: string
    }
}

/**
 * Custom Error Classes for Better Error Handling
 */
class UploadError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'UploadError'
    }
}

class ClassificationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ClassificationError'
    }
}

/**
 * SummaryWorkbench Component
 *
 * ⚡ Phase 5: Router Pattern Integration
 * - Intelligent document classification
 * - Multi-group analysis rendering
 * - Race-condition-free async handling
 * - Premium UX with smooth animations
 *
 * ⚡ Apex Update: State Machine Architecture
 * - Uses useSummaryWorkbench for deterministic state management
 */
export function SummaryWorkbench() {
    const { attachedFiles, clearAll } = useAsk()

    // State Machine Hook
    const { state, startUpload, setUploadProgress, uploadComplete, startClassify, classifyComplete, setError, reset } = useSummaryWorkbench()

    // Local state for file selection and re-analysis
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
    const [pendingAnalysisIds, setPendingAnalysisIds] = useState<string[]>([])
    const [showConfirmToast, setShowConfirmToast] = useState(false)

    // Update selectedFileIds when uploads change
    useEffect(() => {
        if (state.uploadedDocIds.length > 0) {
            setSelectedFileIds(state.uploadedDocIds)
            setPendingAnalysisIds(state.uploadedDocIds) // Initial analysis IDs
        }
    }, [state.uploadedDocIds])

    // Local UI state (ephemeral)
    const [showExpertQA, setShowExpertQA] = useState(false)

    /**
     * ⚡ PHASE 5: Upload & Classification Handler
     *
     * Flow:
     * 1. Upload all files sequentially to /api/rag/upload
     * 2. Collect all document IDs
     * 3. If multiple files: classify via /api/rag/router-classify
     * 4. If single file: skip classification, set single group
     * 5. Set documentGroups state for declarative rendering
     *
     * Optimizations:
     * - Custom error classes for cleaner error handling
     * - Granular progress tracking per file
     * - Zero race conditions (sequential async)
     */
    const handleStartAnalysis = async () => {
        // Validation
        if (attachedFiles.length === 0) {
            setError('請先上傳 PDF 或 TXT 檔案', 'UPLOAD')
            return
        }

        // Reset all state
        reset()
        startUpload()

        // Keep track of IDs locally for the flow, also update state
        let currentUploadedIds: string[] = []

        try {
            // ========================================
            // Step 1: Upload All Files Sequentially
            // ========================================
            const totalFiles = attachedFiles.length

            console.log('[SummaryWorkbench] 📤 Uploading', totalFiles, 'files...')

            // Get auth token once (outside loop for efficiency)
            const { supabaseBrowser } = await import('@/lib/supabase')
            const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession()
            const accessToken = sessionData?.session?.access_token

            console.log('[SummaryWorkbench] 🔐 Auth check:', {
                hasSession: !!sessionData?.session,
                hasToken: !!accessToken,
                tokenLength: accessToken?.length || 0,
                sessionError: sessionError?.message || 'none',
            })

            if (!accessToken) {
                console.error('[SummaryWorkbench] ❌ No access token available')
                throw new UploadError('未登入，請先登入後再試')
            }

            // Upload each file individually with granular progress
            for (let i = 0; i < attachedFiles.length; i++) {
                const attachedFile = attachedFiles[i]
                if (!attachedFile.url) continue

                // ⚡ OPTIMIZATION: Granular progress (files completed + current file progress)
                // Progress range: 0-90% for uploads, 90-100% for classification
                const filesCompleted = i
                const baseProgress = (filesCompleted / totalFiles) * 90
                const currentFileProgress = 0.5 // Assume 50% through current file
                const totalProgress = baseProgress + (currentFileProgress / totalFiles) * 90
                setUploadProgress(Math.round(totalProgress))

                console.log(`[SummaryWorkbench] 📄 Uploading file ${i + 1}/${totalFiles}:`, attachedFile.name)

                // Fetch blob from object URL or storage path
                let fetchUrl = attachedFile.url

                // ✅ Handle different URL formats
                if (fetchUrl.startsWith('storage://')) {
                    // Storage path format - get signed URL
                    const storagePath = fetchUrl.replace('storage://backpack_files/', '')
                    console.log('[SummaryWorkbench] Getting signed URL for storage path:', storagePath)

                    const urlResponse = await fetch(`/api/backpack/file-url?path=${encodeURIComponent(storagePath)}`)
                    if (!urlResponse.ok) {
                        throw new UploadError(`無法取得檔案 URL (HTTP ${urlResponse.status})`)
                    }

                    const { url: signedUrl } = await urlResponse.json()
                    if (!signedUrl) {
                        throw new UploadError('API 未返回檔案 URL')
                    }

                    fetchUrl = signedUrl
                } else if (fetchUrl.includes('/storage/v1/object/public/backpack_files/')) {
                    // Legacy public URL format - may need signed URL
                    console.log('[SummaryWorkbench] Checking legacy public URL:', fetchUrl)

                    const testResponse = await fetch(fetchUrl, { method: 'HEAD' })
                    if (!testResponse.ok) {
                        console.warn('[SummaryWorkbench] ⚠️ Public URL not accessible, getting signed URL')

                        // Extract path and get signed URL
                        const pathMatch = fetchUrl.match(/\/backpack_files\/(.+)$/)
                        if (pathMatch) {
                            const storagePath = pathMatch[1]
                            const urlResponse = await fetch(`/api/backpack/file-url?path=${encodeURIComponent(storagePath)}`)
                            if (urlResponse.ok) {
                                const { url: signedUrl } = await urlResponse.json()
                                fetchUrl = signedUrl
                                console.log('[SummaryWorkbench] ✅ Got signed URL')
                            } else {
                                throw new UploadError(`無法載入檔案「${attachedFile.name}」(HTTP ${testResponse.status})。請確認檔案仍然存在。`)
                            }
                        } else {
                            throw new UploadError(`無法載入檔案「${attachedFile.name}」(HTTP ${testResponse.status})`)
                        }
                    }
                }
                // If it's blob:, localhost, or already a signed URL, use as-is

                const blobResponse = await fetch(fetchUrl)

                if (!blobResponse.ok) {
                    throw new UploadError(`無法載入檔案「${attachedFile.name}」(HTTP ${blobResponse.status})。請確認檔案仍然存在。`)
                }

                const blob = await blobResponse.blob()
                const file = new File([blob], attachedFile.name, { type: blob.type })

                // Validate file type
                const isValidType =
                    file.type === 'application/pdf' ||
                    file.type === 'text/plain' ||
                    file.type.startsWith('image/') ||
                    file.name.endsWith('.pdf') ||
                    file.name.endsWith('.txt') ||
                    file.name.match(/\.(jpg|jpeg|png|gif)$/i)

                if (!isValidType) {
                    throw new UploadError(`不支援的檔案類型: ${file.name}`)
                }

                // Upload to Elite RAG
                const formData = new FormData()
                formData.append('file', file)

                console.log('[SummaryWorkbench] 📡 Sending request with auth header:', {
                    authHeaderSet: !!accessToken,
                    tokenPrefix: accessToken?.substring(0, 20) + '...',
                })

                const uploadResponse = await fetch('/api/rag/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: formData,
                })

                console.log('[SummaryWorkbench] 📨 Response received:', {
                    status: uploadResponse.status,
                    statusText: uploadResponse.statusText,
                    ok: uploadResponse.ok,
                })

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json().catch(() => ({}))
                    console.error('[SummaryWorkbench] ❌ Upload failed:', errorData)
                    throw new UploadError(errorData.error || errorData.message || `上傳失敗: ${file.name}`)
                }

                const uploadData: EliteUploadResponse = await uploadResponse.json()

                if (!uploadData.success || !uploadData.document) {
                    throw new UploadError(`上傳回應格式錯誤: ${file.name}`)
                }

                currentUploadedIds.push(uploadData.document.id)

                console.log('[SummaryWorkbench] ✅ Uploaded:', file.name, '→', uploadData.document.id)
            }

            setUploadProgress(90)
            uploadComplete(currentUploadedIds)

            console.log('[SummaryWorkbench] 🎉 All files uploaded:', currentUploadedIds)

            // ========================================
            // Step 2: Classify Documents (if multiple)
            // ========================================
            if (currentUploadedIds.length > 1) {
                startClassify()
                setUploadProgress(95)
                console.log('[SummaryWorkbench] 🔍 Classifying', currentUploadedIds.length, 'documents...')

                const classifyResponse = await fetch('/api/rag/router-classify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({ documentIds: currentUploadedIds }),
                })

                if (!classifyResponse.ok) {
                    const errorData = await classifyResponse.json().catch(() => ({}))
                    throw new ClassificationError(errorData.message || '文件分類失敗')
                }

                const { groups } = await classifyResponse.json()

                console.log('[SummaryWorkbench] ✅ Classification complete:', groups.length, 'groups')
                groups.forEach((g: DocumentGroup, i: number) => {
                    console.log(`  Group ${i + 1}:`, g.subject, `(${g.documentIds.length} docs, confidence: ${(g.confidence * 100).toFixed(0)}%)`)
                })

                classifyComplete(groups)
                setUploadProgress(100)
                clearAll() // Clear attached files from context

            } else {
                // ========================================
                // Single Document: Set Single Group
                // ========================================
                console.log('[SummaryWorkbench] ℹ️ Single document, skipping classification')

                // Set documentGroups for consistent rendering
                classifyComplete([{
                    subject: '其他',
                    documentIds: currentUploadedIds,
                    confidence: 1.0,
                }])

                setUploadProgress(100)
                clearAll()
            }

        } catch (err) {
            console.error('[SummaryWorkbench] ❌ Error:', err)

            // ⚡ OPTIMIZATION: Use instanceof for cleaner error handling
            if (err instanceof UploadError) {
                setError(err.message, 'UPLOAD')
            } else if (err instanceof ClassificationError) {
                setError(err.message, 'CLASSIFICATION')
                // Fallback: treat all docs as single group
                if (currentUploadedIds.length > 0) {
                    classifyComplete([{
                        subject: '其他',
                        documentIds: currentUploadedIds,
                        confidence: 0.5,
                        reasoning: '分類失敗，已合併為單一群組'
                    }])
                }
            } else {
                // Unknown error
                const errorMessage = err instanceof Error ? err.message : '分析失敗，請稍後再試'
                setError(errorMessage, 'UNKNOWN')
            }
        }
    }

    /**
     * Reset analysis state
     */
    const handleReset = () => {
        reset()
        clearAll()
    }

    // Derived state for UI
    const isUploading = state.status === 'UPLOADING'
    const isClassifying = state.status === 'CLASSIFYING'
    const isAnalysisReady = state.status === 'ANALYSIS'
    const hasError = state.status === 'ERROR'

    return (
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-8">
            <div className="space-y-6">
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-semibold text-foreground">
                        上傳講義
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        AI 自動生成重點與考題
                    </p>
                </div>

                {/* ⚡ NEW: File Selection Chips (Current Upload + 24-Hour History) */}
                {isAnalysisReady && state.uploadedDocIds.length > 0 && (
                    <div className="space-y-3">
                        {/* Debug Info */}
                        <div className="text-xs text-muted-foreground px-1">
                            當前上傳: {state.uploadedDocIds.length} 個文件 |
                            正在分析: {pendingAnalysisIds.length} 個文件 |
                            已選擇: {selectedFileIds.length} 個文件
                        </div>

                        <FileSelectionChips
                            currentUploadIds={state.uploadedDocIds}
                            onSelectionChange={(selectedIds) => {
                                console.log('[SummaryWorkbench] File selection changed:', selectedIds)
                                console.log('[SummaryWorkbench] Current pendingAnalysisIds:', pendingAnalysisIds)
                                setSelectedFileIds(selectedIds)

                                // Show confirmation toast if selection differs from current analysis
                                const selectionChanged =
                                    selectedIds.length !== pendingAnalysisIds.length ||
                                    selectedIds.some(id => !pendingAnalysisIds.includes(id))

                                if (selectionChanged) {
                                    setShowConfirmToast(true)
                                    setTimeout(() => setShowConfirmToast(false), 5000)
                                }
                            }}
                        />

                        {/* Confirmation Toast */}
                        <AnimatePresence>
                            {showConfirmToast && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex items-center justify-between gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                                已選擇 {selectedFileIds.length} 個文件
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                                                {selectedFileIds.length !== pendingAnalysisIds.length
                                                    ? `點擊「重新統整」以分析 ${selectedFileIds.length} 個文件 (當前分析 ${pendingAnalysisIds.length} 個)`
                                                    : '當前正在分析這些文件'}
                                            </p>
                                        </div>
                                    </div>
                                    {selectedFileIds.length !== pendingAnalysisIds.length && (
                                        <Button
                                            onClick={() => {
                                                console.log('[SummaryWorkbench] Starting re-analysis with:', selectedFileIds)
                                                setPendingAnalysisIds(selectedFileIds)
                                                setShowConfirmToast(false)
                                            }}
                                            size="sm"
                                            className="shrink-0"
                                        >
                                            重新統整
                                        </Button>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Main Action Area */}
                {!isAnalysisReady ? (
                    <div className="space-y-8">
                        {/* File Uploader */}
                        <FileUploader />

                        {/* Action Button */}
                        <div className="flex flex-col items-center gap-4">
                            <Button
                                onClick={handleStartAnalysis}
                                disabled={isUploading || isClassifying || attachedFiles.length === 0}
                                className={cn(
                                    "h-14 px-10 rounded-full text-lg font-medium shadow-lg transition-all duration-300",
                                    (isUploading || isClassifying) ? "w-64" : "w-48 hover:scale-105"
                                )}
                            >
                                {isUploading ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>上傳中 {state.uploadProgress}%</span>
                                    </div>
                                ) : isClassifying ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>分類中...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5" />
                                        <span>開始分析</span>
                                    </div>
                                )}
                            </Button>

                            {/* Upload Progress Bar */}
                            {isUploading && state.uploadProgress > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-64 space-y-2"
                                >
                                    <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${state.uploadProgress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                    <p className="text-xs text-center text-muted-foreground">
                                        正在上傳檔案...
                                    </p>
                                </motion.div>
                            )}

                            {/* ⚡ NEW: Classification Loading State */}
                            {isClassifying && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md"
                                >
                                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                            正在智能分組 {state.uploadedDocIds.length} 個文件...
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                            使用 AI 分析文件主題，自動分類科目
                                        </p>
                                    </div>
                                </motion.div>
                            )}

                            {/* Error Display */}
                            <AnimatePresence>
                                {hasError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-3 rounded-xl border",
                                            state.errorType === 'CLASSIFICATION'
                                                ? "bg-yellow-500/10 border-yellow-500/20"
                                                : "bg-red-500/10 border-red-500/20"
                                        )}
                                    >
                                        <AlertCircle className={cn(
                                            "w-4 h-4 shrink-0",
                                            state.errorType === 'CLASSIFICATION' ? "text-yellow-600" : "text-red-600"
                                        )} />
                                        <div className="text-sm">
                                            {state.errorType === 'CLASSIFICATION' && (
                                                <p className="font-medium text-yellow-900 dark:text-yellow-100">分類失敗</p>
                                            )}
                                            <span className={cn(
                                                state.errorType === 'CLASSIFICATION' ? "text-yellow-700 dark:text-yellow-300" : "text-red-600"
                                            )}>
                                                {state.error}
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Helper Text */}
                            {attachedFiles.length === 0 && !hasError && (
                                <p className="text-sm text-muted-foreground/60">
                                    支援 PDF、TXT 和圖片檔案，總大小不超過 50MB
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    /* ⚡ CHUNK 2: Multi-Group Analysis Display */
                    <div className="space-y-12">
                        {/* ⚡ NEW: Use pendingAnalysisIds to determine what to analyze */}
                        <div className="relative">
                            {/* Analysis Card - Component manages its own state */}
                            <div className="relative bg-gradient-to-b from-background via-background/95 to-background/90 rounded-lg">
                                <ProgressiveAnalysisCard
                                    key={pendingAnalysisIds.join(',')} // Force re-mount when selection changes
                                    documentId={pendingAnalysisIds[0]}
                                    relatedDocIds={pendingAnalysisIds.slice(1)}
                                    subject={state.documentGroups[0]?.subject}
                                    selectedDocIds={pendingAnalysisIds} // ⚡ NEW: Pass all selected IDs
                                    onAnalysisComplete={(analysis) => {
                                        console.log('[SummaryWorkbench] Analysis complete:', analysis)
                                        if (analysis.showExpertQA) {
                                            setShowExpertQA(true)
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Chat Interface - Temporarily disabled */}
                        {/* TODO: Re-enable when Q&A feature is ready */}
                        {/* {state.uploadedDocIds.length > 0 && (
                            <div className="mt-12 pt-8 border-t border-border">
                                <RAGChatInterface
                                    refreshKey={state.uploadedDocIds[0]}
                                    contextFileIds={selectedFileIds}
                                    onChatReady={() => console.log('[SummaryWorkbench] Chat ready')}
                                />
                            </div>
                        )} */}

                        {/* Reset Button */}
                        <div className="flex justify-center pt-6">
                            <Button
                                onClick={handleReset}
                                variant="outline"
                                className="rounded-full px-6 border-border bg-card hover:bg-secondary/20 text-muted-foreground hover:text-foreground"
                            >
                                分析新文件
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
