'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Sparkles, Loader2, AlertCircle, MessageSquare, Check, Menu, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { FileUploader } from '@/components/ask/file-uploader'
import { Button } from '@/components/ui/button'
import { TutorialBubble } from '@/components/ui/tutorial-bubble'
import { useAsk } from '@/lib/ask-context'
import { cn } from '@/lib/utils'
import ProgressiveAnalysisCard from '@/components/ask/ProgressiveAnalysisCard'
import { motion, AnimatePresence } from 'framer-motion'
import RAGChatInterface from '@/components/ask/RAGChatInterface'
import { useSummaryWorkbench, DocumentGroup } from '@/hooks/useSummaryWorkbench'
import { useState, useEffect, useRef } from 'react'
import { SourceManagementSheet } from '@/components/ask/SourceManagementSheet'
import { SummarySaveDialog, type SaveData } from '@/components/ask/SummarySaveDialog'
import { RAGMessage } from '@/lib/hooks/useRAGChat'
import type { FileAnalysis } from '@/lib/types'

/**
 * Elite RAG Upload Response
 */
interface EliteUploadResponse {
    success: boolean
    document: {
        id: string
        filename: string
        status: string
        numPages?: number
    }
    // 🚀 PHASE 3: IndexedDB cache fields
    extractedText?: string | null
    extractionMethod?: string
    fileHash?: string
}

interface ClassificationJobState {
    jobId: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    etaMs?: number
    error?: string | null
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


import { formatFullContent } from '@/lib/utils/analysis-formatter'

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
/**
 * 🚀 Elite Upload with Real-time Progress Tracking
 * Uses XMLHttpRequest to monitor actual upload progress
 */
function uploadWithProgress(
    url: string,
    formData: FormData,
    accessToken: string,
    onProgress: (progress: number) => void
): Promise<Response> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Monitor upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100
                onProgress(percentComplete)
            }
        })

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                // Construct Response object for compatibility
                const response = new Response(xhr.responseText, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    headers: new Headers({
                        'Content-Type': 'application/json',
                    }),
                })
                resolve(response)
            } else {
                // 🎯 Mobile-friendly error messages
                const errorMsg = xhr.status === 401
                    ? '登入已過期，請重新登入'
                    : xhr.status === 413
                        ? '檔案過大，請選擇小於 10MB 的檔案'
                        : xhr.status === 415
                            ? '不支援的檔案格式，請上傳 PDF、TXT 或圖片'
                            : xhr.status === 405
                                ? '上傳失敗，請重新整理頁面後再試'
                                : xhr.status >= 500
                                    ? '伺服器暫時無法使用，請稍後再試'
                                    : `上傳失敗 (${xhr.status})，請重試`
                reject(new Error(errorMsg))
            }
        })

        // Handle errors
        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'))
        })

        // Send request
        xhr.open('POST', url)
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
        xhr.send(formData)
    })
}

interface SummaryWorkbenchProps {
    onMenuOpen?: (openFn: () => void) => void // Callback to expose menu open function
}

export function SummaryWorkbench({ onMenuOpen }: SummaryWorkbenchProps = {}) {
    const { attachedFiles, clearAll } = useAsk()

    // State Machine Hook
    const { state, startUpload, setUploadProgress, uploadComplete, startClassify, classifyComplete, setError, reset } = useSummaryWorkbench()

    // Local state for file selection and re-analysis
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
    const [pendingAnalysisIds, setPendingAnalysisIds] = useState<string[]>([])
    const [showConfirmToast, setShowConfirmToast] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false)

    // State for save dialog
    const [showSaveDialog, setShowSaveDialog] = useState(false)
    const [analysisContent, setAnalysisContent] = useState<string>('')
    const [detectedSubject, setDetectedSubject] = useState<string>('')
    const [conversationHistory, setConversationHistory] = useState<RAGMessage[]>([])
    const [currentAnalysisData, setCurrentAnalysisData] = useState<FileAnalysis | undefined>(undefined)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    // 🚀 NEW: Per-file upload progress tracking
    const [fileProgress, setFileProgress] = useState<Record<string, number>>({})
    const [classificationJob, setClassificationJob] = useState<ClassificationJobState | null>(null)
    const classificationPollRef = useRef<NodeJS.Timeout | null>(null)
    const accessTokenRef = useRef<string | null>(null)

    // Expose menu open function to parent
    useEffect(() => {
        if (onMenuOpen) {
            // 修正: React useState若直接傳入函數會被視為 functional update
            // 所以要儲存函數本身，必須 wrap 成 () => function
            onMenuOpen(() => () => setIsSourceSheetOpen(true))
        }
    }, [onMenuOpen])
    const [examPredictionReady, setExamPredictionReady] = useState(false)

    // 🚀 STEP 1: Instant UI Feedback (前端詐欺)
    const [showInstantFeedback, setShowInstantFeedback] = useState(false)
    const [fakeProgress, setFakeProgress] = useState(0)

    const stopClassificationPolling = () => {
        if (classificationPollRef.current) {
            clearInterval(classificationPollRef.current)
            classificationPollRef.current = null
        }
    }

    useEffect(() => {
        return () => stopClassificationPolling()
    }, [])

    // Update selectedFileIds when uploads change
    useEffect(() => {
        if (state.uploadedDocIds.length > 0) {
            setSelectedFileIds(state.uploadedDocIds)
            setPendingAnalysisIds(state.uploadedDocIds) // Initial analysis IDs
        }
    }, [state.uploadedDocIds])

    // Local UI state (ephemeral)
    const [showExpertQA, setShowExpertQA] = useState(false)

    const handleClassificationSuccess = (groups: DocumentGroup[], originalIds: string[]) => {
        console.log('[SummaryWorkbench] 🎯 Classification success, transitioning to ANALYSIS')
        classifyComplete(groups)
        setPendingAnalysisIds(originalIds)
        setUploadProgress(100)
        stopClassificationPolling()
        setClassificationJob(prev => prev ? { ...prev, status: 'completed' } : prev)

        // 🚀 FIX: Don't clearAll() - this causes UI to reset and get stuck
        // Instead, keep files for display but mark upload as complete
        console.log('[SummaryWorkbench] ✅ Ready for analysis, files:', originalIds)
    }

    const handleClassificationFailure = (message: string, originalIds: string[]) => {
        stopClassificationPolling()
        setClassificationJob(prev => prev ? { ...prev, status: 'failed', error: message } : prev)
        setError(message, 'CLASSIFICATION')
        classifyComplete([{
            subject: '其他',
            documentIds: originalIds,
            confidence: 0.5,
            reasoning: '分類失敗，已合併為單一群組'
        }])
        setPendingAnalysisIds(originalIds)
    }

    const startClassificationPolling = (jobId: string, token: string, originalIds: string[]) => {
        stopClassificationPolling()

        const poll = async () => {
            try {
                const response = await fetch(`/api/rag/router-classify?jobId=${jobId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (!response.ok) {
                    const errorPayload = await response.json().catch(() => ({}))
                    throw new Error(errorPayload.message || `分類狀態更新失敗 (${response.status})`)
                }

                const data = await response.json()

                setClassificationJob({
                    jobId,
                    status: data.status,
                    etaMs: data.etaMs,
                    error: data.error ?? null
                })

                if (data.status === 'completed' && Array.isArray(data.groups)) {
                    console.log('[SummaryWorkbench] ✅ Classification job resolved:', jobId)
                    handleClassificationSuccess(data.groups, originalIds)
                } else if (data.status === 'failed') {
                    handleClassificationFailure(data.error || '分類失敗，請重新嘗試', originalIds)
                }
            } catch (pollError) {
                console.error('[SummaryWorkbench] ❌ Classification poll error:', pollError)
                handleClassificationFailure('分類狀態更新失敗', originalIds)
            }
        }

        poll()
        classificationPollRef.current = setInterval(poll, 1500)
    }

    /**
     * 🚀 STEP 1: Instant UI Feedback - Show skeleton immediately
     */
    const showInstantAnalysisUI = () => {
        setShowInstantFeedback(true)
        setFakeProgress(0)

        // Fake progress animation for psychology
        const progressInterval = setInterval(() => {
            setFakeProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval)
                    return 90 // Stop at 90%, real progress takes over
                }
                return prev + Math.random() * 15
            })
        }, 300)
    }

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
            setError('請先上傳文件或圖片', 'UPLOAD')
            return
        }

        // 🚀 STEP 1: Show instant UI feedback FIRST (0ms perceived delay)
        showInstantAnalysisUI()

        // Reset all state
        reset()
        startUpload()
        stopClassificationPolling()
        setClassificationJob(null)
        setExamPredictionReady(false)

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
            accessTokenRef.current = accessToken || null

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

            // 🚀 ELITE PARALLEL UPLOAD: Upload ALL files simultaneously with real-time progress
            console.log(`[SummaryWorkbench] 🚀 Starting parallel upload of ${totalFiles} files...`)

            // Reset file progress
            setFileProgress({})

            const uploadPromises = attachedFiles.map(async (attachedFile, i) => {
                if (!attachedFile.url) return null

                const fileId = `file-${i}`
                console.log(`[SummaryWorkbench] 📄 [${i + 1}/${totalFiles}] Uploading:`, attachedFile.name)

                // 🚀 PHASE 3: Check IndexedDB cache before upload
                let cachedText: string | null = null
                let fileHash: string | undefined

                try {
                    // Fetch blob to compute hash
                    const blobResponse = await fetch(attachedFile.url)
                    const blob = await blobResponse.blob()
                    const file = new File([blob], attachedFile.name, { type: blob.type })

                    // Compute hash
                    const { IndexedDBCache } = await import('@/lib/storage/indexed-db-cache')
                    fileHash = await IndexedDBCache.computeFileHash(file)

                    // Check cache
                    cachedText = await IndexedDBCache.getCachedText(fileHash)

                    if (cachedText) {
                        console.log(`[SummaryWorkbench] 🔥 Cache HIT for ${attachedFile.name}! Skipping extraction.`)
                    } else {
                        console.log(`[SummaryWorkbench] ⚠️ Cache MISS for ${attachedFile.name}, will extract on server.`)
                    }
                } catch (cacheError) {
                    console.warn('[SummaryWorkbench] Cache check failed (non-critical):', cacheError)
                    // Continue without cache
                }

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

                // Upload to Elite RAG with real-time progress tracking
                const formData = new FormData()
                formData.append('file', blob, attachedFile.name)

                // 🚀 PHASE 3: Add cache data if available
                if (cachedText) {
                    formData.append('cached_text', cachedText)
                    formData.append('skip_extraction', 'true')
                    formData.append('file_hash', fileHash || '')
                    console.log(`[SummaryWorkbench] 📦 Sending cached text (${cachedText.length} chars) for ${attachedFile.name}`)
                }

                console.log('[SummaryWorkbench] 📡 Sending request with auth header:', {
                    authHeaderSet: !!accessToken,
                    tokenPrefix: accessToken?.substring(0, 20) + '...',
                })

                // 🚀 Use XMLHttpRequest for real-time progress tracking
                const uploadResponse = await uploadWithProgress(
                    '/api/rag/upload',
                    formData,
                    accessToken,
                    (progress) => {
                        // Update individual file progress
                        setFileProgress(prev => {
                            const updated = { ...prev, [fileId]: progress }

                            // Calculate overall progress
                            const totalProgress = Object.values(updated).reduce((sum, p) => sum + p, 0) / totalFiles
                            setUploadProgress(Math.floor(totalProgress))

                            return updated
                        })

                        console.log(`[SummaryWorkbench] 📊 [${i + 1}/${totalFiles}] ${attachedFile.name}: ${progress.toFixed(1)}%`)
                    }
                )

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

                // 🚀 PHASE 3: Cache Write Back (寫入快取)
                // 邏輯：如果我們本地原本沒有 cachedText，且 Server 回傳了 extractedText，就存起來
                if (!cachedText && uploadData.extractedText && uploadData.fileHash) {
                    // 使用非阻塞方式寫入，不影響 UI 流程
                    (async () => {
                        try {
                            console.log('[Cache] 💾 New text received, saving to IndexedDB...')
                            const { IndexedDBCache } = await import('@/lib/storage/indexed-db-cache')

                            await IndexedDBCache.cacheText(
                                uploadData.fileHash!,
                                uploadData.extractedText!,
                                {
                                    fileName: attachedFile.name,
                                    fileSize: blob.size,
                                    fileType: blob.type,
                                    method: (uploadData.extractionMethod as 'pdf-parse' | 'gemini-ocr' | 'direct') || 'pdf-parse',
                                }
                            )
                            console.log('[Cache] ✅ Cache updated for:', attachedFile.name)
                        } catch (err) {
                            // 快取寫入失敗不應阻斷主流程，僅警告
                            console.warn('[Cache] ⚠️ Failed to save to cache:', err)
                        }
                    })()
                }

                console.log(`[SummaryWorkbench] ✅ [${i + 1}/${totalFiles}] Uploaded:`, file.name, '→', uploadData.document.id)
                return uploadData.document.id
            })

            // ⚡ Wait for ALL uploads to complete in parallel (no limit on concurrency)
            const uploadResults = await Promise.all(uploadPromises)
            const validIds = uploadResults.filter((id): id is string => id !== null)

            currentUploadedIds = validIds
            console.log(`[SummaryWorkbench] 🎉 All ${validIds.length} files uploaded in parallel!`)

            // 🚀 ELITE FIX: Force 100% progress immediately to prevent "stuck at 90%"
            setUploadProgress(100)
            uploadComplete(currentUploadedIds)

            console.log('[SummaryWorkbench] 🎉 All files uploaded, ready for next step:', currentUploadedIds)

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

                const classifyData = await classifyResponse.json().catch(() => ({}))

                if (!classifyResponse.ok) {
                    throw new ClassificationError(classifyData.message || '文件分類失敗')
                }

                console.log('[SummaryWorkbench] 🧠 Classification job queued:', classifyData.jobId)
                setClassificationJob({
                    jobId: classifyData.jobId,
                    status: classifyData.status,
                    etaMs: classifyData.etaMs
                })
                startClassificationPolling(
                    classifyData.jobId,
                    accessToken,
                    currentUploadedIds
                )
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

                setPendingAnalysisIds(currentUploadedIds)
                setUploadProgress(100)

                // 🚀 FIX: Don't clearAll() immediately - causes UI stuck
                // Let the analysis component handle display
                console.log('[SummaryWorkbench] ✅ Ready for analysis')
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
        stopClassificationPolling()
        setClassificationJob(null)
        clearAll()
        setShowChat(false)
        setAnalysisContent('')
        setDetectedSubject('')
        setConversationHistory([])
        setSaveSuccess(false)
        setExamPredictionReady(false)
    }

    /**
     * Handle save to backpack
     */
    const handleSaveToBackpack = async (saveData: SaveData) => {
        console.log('[handleSaveToBackpack] 🚀 Starting save process')
        console.log('[handleSaveToBackpack] 📦 SaveData received:', {
            title: saveData.title,
            subject: saveData.subject,
            contentLength: saveData.content.length,
            contentPreview: saveData.content.substring(0, 300),
            includeConversation: saveData.includeConversation,
            includeKeyConcepts: saveData.includeKeyConcepts,
            includeExamPredictions: saveData.includeExamPredictions,
            conversationCount: saveData.conversationHistory?.length || 0
        })

        setIsSaving(true)
        try {
            // Format content based on user's selections
            let finalContent = ''

            if (currentAnalysisData) {
                finalContent = formatFullContent(currentAnalysisData, {
                    includeKeyConcepts: saveData.includeKeyConcepts,
                    includeExamPredictions: saveData.includeExamPredictions
                })
            } else {
                finalContent = saveData.content
            }

            // Append conversation history if selected
            if (saveData.includeConversation && saveData.conversationHistory && saveData.conversationHistory.length > 0) {
                finalContent += '\n\n---\n\n## 💬 問答記錄\n\n'
                saveData.conversationHistory.forEach((msg, i) => {
                    if (msg.role === 'user') {
                        finalContent += `**Q${Math.floor(i / 2) + 1}**: ${msg.content}\n\n`
                    } else {
                        finalContent += `**A${Math.floor(i / 2) + 1}**: ${msg.content}\n\n`
                    }
                })
            }

            console.log('[handleSaveToBackpack] 📄 Final formatted content length:', finalContent.length)
            console.log('[handleSaveToBackpack] 📄 Final formatted content preview:', finalContent.substring(0, 300))

            const payload = {
                user_id: 'auto',
                title: saveData.title,
                subject: saveData.subject,
                content: finalContent,
                include_conversation: saveData.includeConversation,
                conversation_history: saveData.conversationHistory,
            }
            console.log('[handleSaveToBackpack] 📡 API Payload:', payload)

            const response = await fetch('/api/backpack/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || data.error || '保存失敗')
            }

            console.log('[SummaryWorkbench] ✅ Saved to backpack:', data)
            setSaveSuccess(true)
            setShowSaveDialog(false)

            // Show success toast
            toast.success('已成功存入書包！')
            setTimeout(() => setSaveSuccess(false), 3000)
        } catch (error) {
            console.error('[SummaryWorkbench] ❌ Save error:', error)
            // Error will be displayed in the UI state
            const errorMessage = error instanceof Error ? error.message : '保存失敗，請稍後再試'

            // Show error toast
            toast.error(errorMessage)

            console.error('[SummaryWorkbench] Error message for user:', errorMessage)
        } finally {
            setIsSaving(false)
        }
    }

    // Derived state for UI
    const isUploading = state.status === 'UPLOADING'
    const isClassifying = state.status === 'CLASSIFYING'
    const isAnalysisReady = state.status === 'ANALYSIS'
    const hasError = state.status === 'ERROR'
    const showDetailedUploadProgress = isUploading && Object.keys(fileProgress).length > 0 && state.uploadProgress < 95
    const classificationEtaSeconds = classificationJob?.etaMs
        ? Math.max(2, Math.ceil(classificationJob.etaMs / 1000))
        : 2
    const showClassificationCard = (classificationJob && ['pending', 'processing'].includes(classificationJob.status)) || isClassifying

    return (
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-8">
            <div className="space-y-6">
                {/* Header Section - Title only */}
                <div className="text-center space-y-1 py-2">
                    <h1 className="text-2xl font-semibold text-foreground">
                        上傳講義
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        AI 自動生成重點與考題
                    </p>
                </div>

                {/* Source Management Sheet */}
                <SourceManagementSheet
                    isOpen={isSourceSheetOpen}
                    onClose={() => setIsSourceSheetOpen(false)}
                    currentUploadIds={state.uploadedDocIds}
                    selectedIds={selectedFileIds}
                    onSelectionChange={(selectedIds) => {
                        console.log('[SummaryWorkbench] File selection changed:', selectedIds)
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

                {/* Toast Logic (kept for re-analysis prompts) */}
                <AnimatePresence>
                    {showConfirmToast && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between gap-3 p-4 bg-[#F8F1E7] border border-[#E8DCC9] rounded-xl mb-4"
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 text-[#6C4A2D]" />
                                <div>
                                    <p className="text-sm font-medium text-[#6C4A2D]">
                                        已選擇 {selectedFileIds.length} 個文件
                                    </p>
                                    <p className="text-xs text-[#8C6B4A] mt-0.5">
                                        {selectedFileIds.length !== pendingAnalysisIds.length
                                            ? `點擊「重新統整」以分析 ${selectedFileIds.length} 個文件`
                                            : '當前正在分析這些文件'}
                                    </p>
                                </div>
                            </div>
                            {selectedFileIds.length !== pendingAnalysisIds.length && (
                                <Button
                                    onClick={() => {
                                        console.log('[SummaryWorkbench] Starting re-analysis with:', selectedFileIds)

                                        // 1. Update active analysis IDs
                                        setPendingAnalysisIds(selectedFileIds)

                                        // 2. Update state machine to recognize these as "active" uploads
                                        // This ensures the chat interface and other components (that rely on uploadedDocIds) work correctly
                                        uploadComplete(selectedFileIds)

                                        // 3. Force state to ANALYSIS to render results
                                        classifyComplete([{
                                            subject: 'Summary',
                                            documentIds: selectedFileIds,
                                            confidence: 1.0,
                                            reasoning: 'Manual selection from history'
                                        }])

                                        setShowConfirmToast(false)
                                    }}
                                    size="sm"
                                    className="shrink-0 bg-[#6C4A2D] text-white hover:bg-[#5C3F25]"
                                >
                                    重新統整
                                </Button>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🚀 STEP 1: Instant Skeleton UI (Fake it till you make it) */}
                {showInstantFeedback && !isAnalysisReady && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Fake header with filename */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">
                                    分析中: {attachedFiles[0]?.name || '文件'}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {fakeProgress.toFixed(0)}%
                            </div>
                        </div>

                        {/* Fake progress bar */}
                        <div className="h-1.5 bg-[#F1E8DB] rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[#8C6B4A] to-[#6C4A2D]"
                                initial={{ width: '0%' }}
                                animate={{ width: `${fakeProgress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        {/* Skeleton content - length based on file count */}
                        <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-sm border border-border/50 space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-4 w-4 bg-muted/50 animate-pulse rounded" />
                                <div className="h-4 w-24 bg-muted/50 animate-pulse rounded" />
                            </div>
                            <div className="space-y-3">
                                {Array.from({ length: Math.min(attachedFiles.length * 3, 8) }).map((_, i) => (
                                    <div key={i} className="h-4 bg-muted/40 animate-pulse rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                                ))}
                            </div>
                            <div className="mt-6 text-sm text-muted-foreground animate-pulse">
                                正在提取關鍵概念...
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ⚡ NEW LAYOUT: Upload area always visible, analysis results appear below */}
                <div className="space-y-8">
                    {/* 1. UPLOAD AREA - Always visible */}
                    <div className="space-y-6">
                        {/* File Uploader */}
                        <FileUploader />
                        <TutorialBubble
                            featureKey="summary_upload_hint"
                            message={`第一步：\n請先上傳你的講義或筆記檔案`}
                            position="center"
                            trigger={attachedFiles.length === 0}
                            className="bg-zinc-800/90"
                        />

                        {/* Action Button */}
                        <div className="flex flex-col items-center gap-4">
                            <Button
                                onClick={handleStartAnalysis}
                                disabled={isUploading || isClassifying || attachedFiles.length === 0}
                                className={cn(
                                    "h-14 px-10 rounded-full text-lg font-medium shadow-lg transition-all duration-300 bg-[#6C4A2D] text-white hover:bg-[#5C3F25]",
                                    (isUploading || isClassifying) ? "w-64" : "w-48 hover:scale-105"
                                )}
                            >
                                {isUploading ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>
                                            {state.uploadProgress >= 100 ? '正在處理文件...' : `上傳中 ${state.uploadProgress}%`}
                                        </span>
                                    </div>
                                ) : isClassifying ? (
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>分類中...</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-5 w-5" />
                                        <span>{isAnalysisReady ? '重新分析' : '開始分析'}</span>
                                    </div>
                                )}
                            </Button>

                            {/* 🚀 Elite Upload Progress Display - Per-file tracking */}
                            {showDetailedUploadProgress && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="w-full max-w-md space-y-3"
                                >
                                    {attachedFiles.map((file, i) => {
                                        const fileId = `file-${i}`
                                        const progress = fileProgress[fileId] || 0

                                        return (
                                            <div key={fileId} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground truncate max-w-[220px]" title={file.name}>
                                                        {file.name}
                                                    </span>
                                                    <span className="text-primary font-semibold tabular-nums">
                                                        {progress.toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="h-1.5 bg-secondary/20 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.2, ease: 'easeOut' }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {/* Overall Progress Summary */}
                                    <div className="pt-2 border-t border-border/50">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium text-foreground">總體進度</span>
                                            <span className="text-primary font-bold tabular-nums">
                                                {state.uploadProgress}%
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* ⚡ NEW: Classification Loading State */}
                            {showClassificationCard && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-3 p-4 bg-[#F8F1E7] border border-[#E8DCC9] rounded-xl max-w-md shadow-sm"
                                >
                                    <Loader2 className="h-5 w-5 animate-spin text-[#6C4A2D]" />
                                    <div>
                                        <p className="text-sm font-medium text-[#6C4A2D]">
                                            正在智能分組 {state.uploadedDocIds.length} 個文件...
                                        </p>
                                        <p className="text-xs text-[#8C6B4A] mt-1">
                                            {classificationJob?.status === 'pending'
                                                ? '等待背景分析器啟動'
                                                : `AI 推論中 · 約 ${classificationEtaSeconds} 秒`}
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
                            {attachedFiles.length === 0 && !hasError && !isAnalysisReady && (
                                <p className="text-sm text-muted-foreground/60">
                                    支援 PDF、TXT、JPG、PNG、WEBP、HEIC 等格式，總大小不超過 50MB
                                </p>
                            )}
                        </div>
                    </div>

                    {/* 2. ANALYSIS RESULTS - Appears below when ready */}
                    <AnimatePresence>
                        {isAnalysisReady && (
                            <motion.div
                                key="analysis-results"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                                className="space-y-8"
                            >
                                {/* Section Title */}
                                <div className="text-center space-y-2 pt-8 border-t border-border">
                                    <h2 className="text-xl font-semibold text-foreground">
                                        AI Analysis
                                    </h2>
                                </div>

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
                                            onAnalysisUpdate={(analysis) => {
                                                if ((analysis.examPredictions?.length ?? 0) > 0) {
                                                    setExamPredictionReady(true)
                                                }
                                            }}
                                            onAnalysisComplete={(analysis) => {
                                                console.log('[SummaryWorkbench] ✅ Analysis complete:', analysis)
                                                console.log('[DEBUG] 📊 structuredNotes length:', analysis.structuredNotes?.length)
                                                console.log('[DEBUG] 📊 structuredNotes preview:', analysis.structuredNotes?.substring(0, 200))
                                                console.log('[DEBUG] 📊 quickSummary length:', analysis.quickSummary?.length)
                                                console.log('[DEBUG] 📊 quickSummary preview:', analysis.quickSummary?.substring(0, 200))

                                                // Store full analysis data for save dialog
                                                setCurrentAnalysisData(analysis)

                                                // Capture analysis content for saving (with all options enabled by default)
                                                const capturedContent = formatFullContent(analysis, {
                                                    includeKeyConcepts: true,
                                                    includeExamPredictions: true
                                                })
                                                console.log('[DEBUG] 💾 Final captured content length:', capturedContent.length)
                                                console.log('[DEBUG] 💾 Final captured content preview:', capturedContent.substring(0, 300))
                                                console.log('[DEBUG] 💾 Full captured content:', capturedContent)

                                                setAnalysisContent(capturedContent)
                                                setDetectedSubject(analysis.detectedSubject || state.documentGroups[0]?.subject || '')
                                                setExamPredictionReady((analysis.examPredictions?.length ?? 0) > 0)
                                                if (analysis.showExpertQA) {
                                                    setShowExpertQA(true)
                                                }
                                            }}
                                            hideSaveButton={false} // Show individual save button as requested
                                        />
                                    </div>
                                </div>

                                {/* Chat Interface - Re-enabled! */}
                                {state.uploadedDocIds.length > 0 && (
                                    <div className="mt-8">
                                        <div className="flex justify-center mb-6">
                                            <Button
                                                variant="outline"
                                                onClick={() => setShowChat(!showChat)}
                                                className="rounded-full gap-2 shadow-sm hover:shadow-md transition-all"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                                {showChat ? '隱藏 AI 助手' : '向 AI 提問'}
                                            </Button>
                                        </div>

                                        <AnimatePresence>
                                            {showChat && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="bg-card rounded-3xl border border-border shadow-sm p-1">
                                                        <RAGChatInterface
                                                            refreshKey={state.uploadedDocIds[0]}
                                                            contextFileIds={selectedFileIds}
                                                            onChatReady={() => console.log('[SummaryWorkbench] Chat ready')}
                                                            onMessagesUpdate={(messages) => {
                                                                // Capture conversation history for saving
                                                                setConversationHistory(messages)
                                                            }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {/* Save to Backpack CTA - Sticky at bottom */}
                                {analysisContent && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="sticky bottom-8 flex justify-center pt-12 pb-4 z-50"
                                    >
                                        <div className="relative">
                                            {/* Backdrop blur effect */}
                                            <div className="absolute inset-0 bg-background/80 backdrop-blur-lg rounded-full -z-10" />

                                            <Button
                                                onClick={() => {
                                                    console.log('[Bottom CTA] 🔘 Save button clicked')
                                                    console.log('[Bottom CTA] 📊 Current analysisContent length:', analysisContent.length)
                                                    console.log('[Bottom CTA] 📊 Current analysisContent preview:', analysisContent.substring(0, 300))
                                                    console.log('[Bottom CTA] 📊 Full analysisContent:', analysisContent)
                                                    setShowSaveDialog(true)
                                                }}
                                                size="lg"
                                                className={cn(
                                                    "h-14 px-8 rounded-full text-base font-semibold shadow-xl",
                                                    "bg-gradient-to-r from-primary to-primary/90",
                                                    "hover:scale-105 active:scale-95 transition-all duration-300",
                                                    saveSuccess && "bg-green-600 hover:bg-green-600"
                                                )}
                                            >
                                                {saveSuccess ? (
                                                    <>
                                                        <Check className="w-5 h-5 mr-2" />
                                                        <span>已儲存到書包</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-5 h-5 mr-2" />
                                                        <span>存到書包</span>
                                                    </>
                                                )}
                                            </Button>
                                            <TutorialBubble
                                                featureKey="summary_save_hint"
                                                message={`分析完成！\n點擊這裡將重點筆記存入書包`}
                                                position="relative"
                                                className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-max"
                                                trigger={!!analysisContent}
                                            />
                                        </div>
                                    </motion.div>
                                )}

                                {/* Clear Results Button */}
                                <div className="flex justify-center pt-6">
                                    <Button
                                        onClick={handleReset}
                                        variant="outline"
                                        className="rounded-full px-6 border-border bg-card hover:bg-secondary/20 text-muted-foreground hover:text-foreground"
                                    >
                                        清除結果
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Save Dialog */}
            <SummarySaveDialog
                open={showSaveDialog}
                onOpenChange={setShowSaveDialog}
                summaryContent={analysisContent}
                conversationHistory={conversationHistory}
                detectedSubject={detectedSubject}
                confidence={0.8}
                onConfirm={handleSaveToBackpack}
                isLoading={isSaving}
                analysisData={currentAnalysisData}
            />
        </div>
    )
}

