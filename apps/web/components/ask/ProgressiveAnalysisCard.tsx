'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, BookmarkPlus, Check, Sparkles, FileText } from 'lucide-react'
import { experimental_useObject as useObject } from '@ai-sdk/react'
import { FileAnalysis, CoreConcept, ExamQuestion } from '@/lib/types'
import { detectSubject } from '@/lib/utils/detect-subject'
import { RAGMarkdownRenderer } from './RAGMarkdownRenderer'
import { cn } from '@/lib/utils'
import { GSATAnalysisSchema } from '@/lib/schemas/gsat-analysis-schema'
import { SubjectSelectionDialog, type SubjectTag } from './SubjectSelectionDialog'

interface ProgressiveAnalysisCardProps {
    documentId?: string
    relatedDocIds?: string[]
    subject?: string
    selectedDocIds?: string[]
    initialText?: string
    fileName?: string
    onAnalysisUpdate?: (analysis: FileAnalysis) => void
    onAnalysisComplete?: (result: any) => void
    hideSaveButton?: boolean
}

const SUBJECT_KEYWORDS: Array<{ tag: SubjectTag; keywords: string[] }> = [
    { tag: '英文', keywords: ['英文', 'english', 'eng', 'toeic', 'toefl'] },
    { tag: '數學', keywords: ['數學', 'math', 'calculus', 'algebra', 'geometry'] },
    { tag: '國文', keywords: ['國文', 'chinese', 'mandarin', '語文'] },
    { tag: '社會', keywords: ['社會', 'history', 'geography', 'civics', 'politics'] },
    { tag: '自然', keywords: ['自然', 'science', 'physics', 'chemistry', 'biology', 'earth'] },
]

// Remove inline options (A./B./C./D.) from content to avoid duplicate rendering with options array
function cleanQuestionContent(raw?: string): string {
    if (!raw) return ''
    let text = raw
    // Remove lines that start with option labels
    text = text
        .split(/\r?\n/)
        .filter(line => !/^\s*[A-D][\.\、\)]\s+/i.test(line.trim()))
        .join('\n')

    // Also remove trailing inline segments that start with option labels (same line)
    text = text.replace(/\s*[A-D][\.\、\)]\s+.*$/gm, '')

    return text.trim()
}

// Strip leading option label like "A. ", "B、", "C)" from option text
function normalizeOptionText(raw?: string): string {
    if (!raw) return ''
    return raw.replace(/^\s*[A-D][\.\、\)]\s+/i, '').trim()
}

// Normalize options: remove empty ones, optionally cap at 5 for multi-select
function normalizeOptions(options: string[] = [], isMulti: boolean): string[] {
    // Filter out empty options
    const validOptions = options.filter(opt => opt && opt.trim())

    if (!isMulti) return validOptions

    // For multi-select, cap at 5 but don't pad
    return validOptions.slice(0, 5)
}

export default function ProgressiveAnalysisCard({
    documentId,
    relatedDocIds = [],
    subject,
    selectedDocIds = [],
    initialText,
    fileName,
    onAnalysisUpdate,
    onAnalysisComplete,
    hideSaveButton = false
}: ProgressiveAnalysisCardProps) {
    const hasStartedRef = useRef(false)
    const completionFiredRef = useRef(false)
    const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [documentNames, setDocumentNames] = useState<Record<string, string>>({})
    const [showSubjectDialog, setShowSubjectDialog] = useState(false)
    const predictionsReady = (analysis?.examPredictions?.length ?? 0) > 0

    // 🚀 NEW: Progressive Rendering State (10x UX Boost)
    const [quickSummaryReady, setQuickSummaryReady] = useState(false)
    const [conceptsReady, setConceptsReady] = useState(false)
    const [examPredictionsReady, setExamPredictionsReady] = useState(false)
    const [progressiveTimestamps, setProgressiveTimestamps] = useState({
        summaryAt: 0,
        conceptsAt: 0,
        predictionsAt: 0
    })

    const { object, error: streamError, isLoading, submit } = useObject({
        api: '/api/rag/analyze-object',
        schema: GSATAnalysisSchema,
    })

    const resolveSubjectTag = (): SubjectTag => {
        const normalized = (analysis?.detectedSubject || subject || '').toLowerCase()
        const matched = SUBJECT_KEYWORDS.find(({ keywords }) =>
            keywords.some(keyword => normalized.includes(keyword))
        )

        if (matched) return matched.tag

        const fallbackText = [analysis?.quickSummary, analysis?.structuredNotes, fileName]
            .filter(Boolean)
            .join(' ')

        return detectSubject(fallbackText || '綜合題')
    }

    // Fetch document names for source attribution
    useEffect(() => {
        const allDocIds = selectedDocIds.length > 0
            ? selectedDocIds
            : [documentId, ...relatedDocIds].filter(Boolean) as string[]

        if (allDocIds.length === 0) return

        const fetchDocumentNames = async () => {
            try {
                const response = await fetch(`/api/rag/upload?ids=${allDocIds.join(',')}`)
                const data = await response.json()

                if (data.success && data.documents) {
                    const nameMap: Record<string, string> = {}
                    data.documents.forEach((doc: any) => {
                        nameMap[doc.id] = doc.filename
                    })
                    setDocumentNames(nameMap)
                    console.log('[ProgressiveAnalysisCard] 📄 Document names loaded:', nameMap)
                }
            } catch (err) {
                console.error('[ProgressiveAnalysisCard] Failed to fetch document names:', err)
            }
        }

        fetchDocumentNames()
    }, [selectedDocIds, documentId, relatedDocIds])

    // 🚀 Ultra-Fast Analysis - bypasses Vercel AI SDK for instant cache response
    useEffect(() => {
        if (hasStartedRef.current) return

        const allDocIds = selectedDocIds.length > 0
            ? selectedDocIds
            : [documentId, ...relatedDocIds].filter(Boolean) as string[]

        if (!initialText && allDocIds.length === 0) {
            setError('沒有可分析的文件')
            return
        }

        hasStartedRef.current = true
        setError(null)
        setAnalysis(null)
        setQuickSummaryReady(false)
        setConceptsReady(false)
        setExamPredictionsReady(false)

        console.log('[ProgressiveAnalysisCard] 🚀 Starting ultra-fast analysis...')

        // Use ultra-fast direct fetch instead of slow useObject hook
        if (allDocIds.length > 0) {
            import('@/lib/streaming/ultra-fast-stream').then(({ UltraFastStream }) => {
                UltraFastStream.analyzeWithCache(
                    allDocIds[0],
                    allDocIds.slice(1),
                    subject,
                    (chunk) => {
                        const now = performance.now()

                        if (chunk.type === 'summary') {
                            setQuickSummaryReady(true)
                            setProgressiveTimestamps(prev => ({ ...prev, summaryAt: now }))
                            setAnalysis(prev => ({
                                ...prev,
                                id: documentId || 'analysis',
                                status: 'analysis_ready',
                                processingTimeMs: 0,
                                quickSummary: chunk.data,
                                structuredNotes: chunk.data
                            }) as FileAnalysis)
                        } else if (chunk.type === 'concepts') {
                            setConceptsReady(true)
                            setProgressiveTimestamps(prev => ({ ...prev, conceptsAt: now }))
                            setAnalysis(prev => ({ ...prev!, coreConcepts: chunk.data as unknown as CoreConcept[] }))
                        } else if (chunk.type === 'predictions') {
                            setExamPredictionsReady(true)
                            setProgressiveTimestamps(prev => ({ ...prev, predictionsAt: now }))
                            setAnalysis(prev => ({
                                ...prev!,
                                examPredictions: chunk.data as unknown as ExamQuestion[],
                                status: 'prediction_ready'
                            }))
                        } else if (chunk.type === 'complete') {
                            const finalAnalysis: FileAnalysis = {
                                id: chunk.data.analysisID || documentId || 'analysis',
                                status: 'prediction_ready',
                                processingTimeMs: 0,
                                quickSummary: chunk.data.summary,
                                detectedSubject: chunk.data.subject,
                                detectedTopics: chunk.data.topics?.filter((t): t is string => Boolean(t)),
                                coreConcepts: chunk.data.keyConcepts?.filter(Boolean) as unknown as CoreConcept[],
                                structuredNotes: chunk.data.summary,
                                examPredictions: chunk.data.examPrediction?.filter(Boolean) as unknown as ExamQuestion[]
                            }
                            setAnalysis(finalAnalysis)
                            completionFiredRef.current = true
                            onAnalysisComplete?.(finalAnalysis)
                        }
                    },
                    () => console.log('[Progressive] 🏁 Complete'),
                    (error) => {
                        console.error('[Progressive] ❌ Error:', error)
                        setError(error.message || '分析失敗，請稍後再試')
                    }
                )
            })
        } else if (initialText) {
            submit({ text: initialText, subject })
        }
    }, [documentId, relatedDocIds, selectedDocIds, subject, initialText, submit, onAnalysisComplete])

    // Bridge streamed object into FileAnalysis shape + Progressive Rendering Triggers
    useEffect(() => {
        if (!object) return

        const now = performance.now()

        // 🚀 Layer 1: Quick Summary (Target: 1-3s)
        if (object.summary && object.summary.length > 50 && !quickSummaryReady) {
            setQuickSummaryReady(true)
            setProgressiveTimestamps(prev => ({ ...prev, summaryAt: now }))
            console.log('[Progressive] 🎯 Layer 1: Quick Summary ready at', (now / 1000).toFixed(1), 's')

            // Track UX metric
            if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'progressive_summary_ready', {
                    time_ms: now,
                    char_length: object.summary.length
                })
            }
        }

        // 🚀 Layer 2: Key Concepts (Target: 5-10s)
        if (object.keyConcepts && object.keyConcepts.length > 0 && !conceptsReady) {
            setConceptsReady(true)
            setProgressiveTimestamps(prev => ({ ...prev, conceptsAt: now }))
            console.log('[Progressive] 🎯 Layer 2: Key Concepts ready at', (now / 1000).toFixed(1), 's')

            if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'progressive_concepts_ready', {
                    time_ms: now,
                    concept_count: object.keyConcepts.length
                })
            }
        }

        // 🚀 Layer 3: Exam Predictions (Target: 15-30s)
        if (object.examPrediction && object.examPrediction.length > 0 && !examPredictionsReady) {
            setExamPredictionsReady(true)
            setProgressiveTimestamps(prev => ({ ...prev, predictionsAt: now }))
            console.log('[Progressive] 🎯 Layer 3: Exam Predictions ready at', (now / 1000).toFixed(1), 's')

            if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'progressive_predictions_ready', {
                    time_ms: now,
                    prediction_count: object.examPrediction.length
                })
            }
        }

        // ✅ 修復：使用類型斷言處理 streaming 數據的不完整類型
        const transformed: FileAnalysis = {
            id: object.analysisID || documentId || 'analysis',
            status: object.examPrediction && object.examPrediction.length > 0 ? 'prediction_ready' : 'analysis_ready',
            processingTimeMs: 0,
            quickSummary: object.summary,
            detectedSubject: object.subject,
            detectedTopics: object.topics?.filter((t): t is string => Boolean(t)),
            // ✅ 使用 as unknown as 進行安全類型轉換，因為 streaming 數據類型是 PartialObject
            coreConcepts: object.keyConcepts?.filter(Boolean) as unknown as CoreConcept[] | undefined,
            structuredNotes: object.summary,
            examPredictions: object.examPrediction?.filter(Boolean) as unknown as ExamQuestion[] | undefined,
        }

        setAnalysis(transformed)
        setError(null)
        onAnalysisUpdate?.(transformed)

        // ✅ 修復內容截斷：只在流式傳輸完全結束後才調用 onAnalysisComplete
        // isLoading === false 表示流已完成，此時 object.summary 包含完整內容
        if (!completionFiredRef.current && !isLoading && (transformed.examPredictions?.length || transformed.structuredNotes)) {
            console.log('[ProgressiveAnalysisCard] 🎯 Stream完成，觸發 onAnalysisComplete')
            console.log('[ProgressiveAnalysisCard] 📄 完整內容長度:', transformed.structuredNotes?.length)
            completionFiredRef.current = true
            onAnalysisComplete?.(transformed)

            // 🚀 Log progressive rendering performance
            const totalTime = performance.now()
            console.log('[Progressive] 🏁 Complete rendering timeline:', {
                summary: `${(progressiveTimestamps.summaryAt / 1000).toFixed(1)}s`,
                concepts: `${(progressiveTimestamps.conceptsAt / 1000).toFixed(1)}s`,
                predictions: `${(progressiveTimestamps.predictionsAt / 1000).toFixed(1)}s`,
                total: `${(totalTime / 1000).toFixed(1)}s`
            })
        }
    }, [object, documentId, isLoading, onAnalysisComplete, onAnalysisUpdate, quickSummaryReady, conceptsReady, examPredictionsReady, progressiveTimestamps])

    // Surface stream errors
    useEffect(() => {
        if (!streamError) return
        console.error('[ProgressiveAnalysisCard] Stream error:', streamError)
        setError(streamError.message || '分析失敗，請稍後再試')
    }, [streamError])

    // 🚀 Auto-scroll to analysis content when ready
    useEffect(() => {
        if (examPredictionsReady) {
            // Wait a bit for rendering to complete
            setTimeout(() => {
                const predictionsElement = document.querySelector('[data-section="exam-predictions"]')
                if (predictionsElement) {
                    predictionsElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                        inline: 'nearest'
                    })
                    console.log('[ProgressiveAnalysisCard] 📜 Auto-scrolled to exam predictions')
                }
            }, 300)
        }
    }, [examPredictionsReady])

    // Handle save to backpack - show subject selection dialog
    const handleSaveToNotebook = async () => {
        if (!analysis) return
        setShowSubjectDialog(true)
    }

    // Handle confirmed save with selected subject
    const handleConfirmedSave = async (subject: SubjectTag) => {
        if (!analysis) return

        setIsSaving(true)
        setSaveSuccess(false)

        try {
            const note_md = analysis.structuredNotes || analysis.quickSummary || ''

            const response = await fetch('/api/backpack/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 'auto',
                    question: fileName || '文件分析',
                    canonical_skill: subject,
                    note_md,
                    subject // Pass selected subject for better categorization
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || '保存失敗')
            }

            console.log('[ProgressiveAnalysisCard] Saved to backpack:', data)
            setSaveSuccess(true)
            setShowSubjectDialog(false)
            setTimeout(() => setSaveSuccess(false), 3000)

        } catch (error) {
            console.error('[ProgressiveAnalysisCard] Save error:', error)
            alert('保存失敗，請稍後再試')
        } finally {
            setIsSaving(false)
        }
    }

    // Error state
    if (error || analysis?.status === 'failed') {
        return (
            <div className="p-6 rounded-2xl border border-red-500/20 bg-red-50/50 backdrop-blur-sm">
                <p className="text-red-600 flex items-center gap-2">
                    ❌ {error || analysis?.errorMessage || '分析失敗'}
                </p>
            </div>
        )
    }

    // Initial Loading
    if (!analysis && (isLoading || documentId || initialText)) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground animate-pulse">正在準備分析環境...</p>
            </div>
        )
    }

    const isComplete = analysis?.status === 'prediction_ready' || analysis?.status === 'analysis_ready'
    const hasContent = !!analysis?.structuredNotes || !!analysis?.quickSummary || (analysis?.examPredictions?.length ?? 0) > 0

    // Display selected documents info
    const allDocIds = selectedDocIds.length > 0
        ? selectedDocIds
        : [documentId, ...relatedDocIds].filter(Boolean) as string[]

    const displayDocuments = allDocIds.map(id => documentNames[id] || id).filter(Boolean)

    // Derived flags
    const isAnalyzing = isLoading && !analysis
    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Status Header - Merged source chips with save button */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 px-1">
                    {/* Left: Source chips */}
                    {displayDocuments.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                來源:
                            </span>
                            {displayDocuments.map((docName, idx) => (
                                <div
                                    key={idx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F1E7] border border-[#E8DCC9] text-xs font-medium text-[#6C4A2D]"
                                >
                                    <span>{docName}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Right: Save button - only show if not hidden */}
                    {hasContent && !hideSaveButton && (
                        <button
                            onClick={handleSaveToNotebook}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all duration-300 disabled:opacity-50 shrink-0"
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : saveSuccess ? (
                                <Check className="w-4 h-4 text-green-600" />
                            ) : (
                                <BookmarkPlus className="w-4 h-4" />
                            )}
                            {saveSuccess ? '已儲存' : '存到筆記'}
                        </button>
                    )}
                </div>

                {/* Progress Bar - Only show during analysis */}
                {!isComplete && (
                    <div className="px-1">
                        <div className="h-1.5 bg-[#F1E8DB] rounded-full overflow-hidden shadow-inner">
                            <div
                                className={cn(
                                    "h-full bg-gradient-to-r from-[#8C6B4A] to-[#6C4A2D] transition-all duration-500 shadow-sm",
                                    analysis?.quickSummary && "w-1/2",
                                    analysis?.structuredNotes && "w-3/4",
                                    !analysis && "w-1/4 animate-pulse"
                                )}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* 🚀 Content Area - Progressive Rendering (3-Layer Display) */}
            <div className="space-y-6">
                {/* Layer 1: Quick Summary (1-3s) */}
                {quickSummaryReady && analysis?.quickSummary ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-sm border border-border/50"
                    >
                        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">核心摘要</span>
                            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                {(progressiveTimestamps.summaryAt / 1000).toFixed(1)}s
                            </span>
                        </div>
                        <RAGMarkdownRenderer
                            content={analysis.quickSummary}
                            subject={analysis.detectedSubject || subject}
                        />
                        {!conceptsReady && (
                            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>正在提取關鍵概念...</span>
                            </div>
                        )}
                    </motion.div>
                ) : isLoading ? (
                    <div className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-sm border border-border/50 space-y-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-4 w-4 bg-muted/50 animate-pulse rounded" />
                            <div className="h-4 w-24 bg-muted/50 animate-pulse rounded" />
                        </div>
                        <div className="space-y-3">
                            <div className="h-6 bg-muted/50 animate-pulse rounded w-3/4" />
                            <div className="h-4 bg-muted/40 animate-pulse rounded w-full" />
                            <div className="h-4 bg-muted/40 animate-pulse rounded w-full" />
                            <div className="h-4 bg-muted/40 animate-pulse rounded w-2/3" />
                        </div>
                    </div>
                ) : null}

                {/* Layer 2: Key Concepts (5-10s) */}
                {conceptsReady && analysis?.coreConcepts && analysis.coreConcepts.length > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="space-y-3"
                    >
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-[#6C4A2D]">關鍵概念</h3>
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                {(progressiveTimestamps.conceptsAt / 1000).toFixed(1)}s
                            </span>
                        </div>
                        <div className="grid gap-3">
                            {analysis.coreConcepts.slice(0, 5).map((concept, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-xl bg-[#F8F1E7] p-4 border border-[#E8DCC9]"
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h4 className="font-semibold text-[#6C4A2D]">{concept.concept}</h4>
                                        {concept.importance && (
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                                concept.importance === '高' && "bg-red-100 text-red-700",
                                                concept.importance === '中' && "bg-yellow-100 text-yellow-700",
                                                concept.importance === '低' && "bg-green-100 text-green-700"
                                            )}>
                                                {concept.importance}
                                            </span>
                                        )}
                                    </div>
                                    <RAGMarkdownRenderer
                                        content={concept.explanation}
                                        className="text-sm text-[#6C4A2F] leading-relaxed prose-p:my-1 prose-strong:text-[#6C4A2D]"
                                    />
                                </div>
                            ))}
                        </div>
                        {!examPredictionsReady && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>正在生成考題預測...</span>
                            </div>
                        )}
                    </motion.div>
                ) : quickSummaryReady && !conceptsReady ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-32 bg-muted/50 animate-pulse rounded" />
                        </div>
                        <div className="grid gap-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="rounded-xl bg-muted/20 p-4 space-y-2">
                                    <div className="h-4 bg-muted/40 animate-pulse rounded w-1/3" />
                                    <div className="h-3 bg-muted/30 animate-pulse rounded w-full" />
                                    <div className="h-3 bg-muted/30 animate-pulse rounded w-4/5" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Layer 3: Exam Predictions Status Banner */}
            {conceptsReady && (
                <div className="rounded-2xl border border-[#E8DCC9] bg-[#FCF6EE] px-4 py-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#6C4A2D]">
                        <Sparkles className="w-4 h-4" />
                        <span>{examPredictionsReady ? '考題預測完成' : '考題預測生成中'}</span>
                        {examPredictionsReady && (
                            <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                {(progressiveTimestamps.predictionsAt / 1000).toFixed(1)}s
                            </span>
                        )}
                    </div>
                    <span className="text-xs text-[#8C6B4A]">
                        {examPredictionsReady ? '可以開始練習 AI 命題' : 'AI 正在推演命題趨勢'}
                    </span>
                </div>
            )}

            {/* Layer 3: Exam Predictions (15-30s) */}
            {examPredictionsReady && (analysis?.examPredictions?.length ?? 0) > 0 && (
                <motion.div
                    data-section="exam-predictions"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="space-y-4"
                >
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-lg font-semibold text-[#6C4A2D]">考題預測</h3>
                    </div>
                    <div className="space-y-3">
                        {/* ✅ 修復：安全訪問 examPredictions，使用 optional chaining */}
                        {analysis?.examPredictions?.map((item, idx) => (
                            <div
                                key={idx}
                                className="rounded-[10px] bg-[#F8F1E7] px-5 py-5 space-y-4"
                            >
                                {/* ✅ 修復：使用 'in' 運算符檢查屬性是否存在 */}
                                {'type' in item && (item as any).type === 'question_set' || (item as any).questions ? (
                                    <>
                                        <div className="text-sm font-semibold text-[#6C4A2D]">
                                            題組 {idx + 1}
                                        </div>
                                        {/* ✅ 修復：確保 context 是字符串 */}
                                        {'context' in item && typeof (item as any).context === 'string' && (
                                            <p className="text-[16px] leading-[1.6] tracking-[0.2px] text-[#6C4A2F]">
                                                {(item as any).context}
                                            </p>
                                        )}
                                        {'questions' in item && Array.isArray(item.questions) && (
                                            <div className="space-y-4">
                                                {item.questions.map((q: any, qIdx: number) => {
                                                    const questionText = cleanQuestionContent(q.question)
                                                    return (
                                                        <div key={qIdx} className="space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[14px] font-semibold text-[#6C4A2D]">{qIdx + 1}.</span>
                                                                <span className="text-[15px] leading-[1.6] tracking-[0.2px] text-[#6C4A2D]">
                                                                    {questionText}
                                                                </span>
                                                                {q.difficulty && (
                                                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E8DCC9] text-[#8C6B4A] border border-[#E8DCC8]">
                                                                        {q.difficulty}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {Array.isArray(q.options) && q.options.length > 0 && (
                                                                <div className="space-y-2.5 pt-1">
                                                                    {normalizeOptions(q.options, q.questionType === '多選').map((opt: string, oIdx: number) => {
                                                                        const label = String.fromCharCode(65 + oIdx)
                                                                        const optionText = normalizeOptionText(opt)
                                                                        return (
                                                                            <div
                                                                                key={oIdx}
                                                                                className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[#F1E8DB]"
                                                                            >
                                                                                <span className="font-bold text-[#8C6B4A]">{label}</span>
                                                                                <span className="text-[15px] leading-[1.5] tracking-[0.2px] text-[#6C4A2D]">
                                                                                    {optionText}
                                                                                </span>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                            {q.answer && (
                                                                <p className="text-sm text-[#6C4A2D]">
                                                                    答案：{q.answer}
                                                                </p>
                                                            )}
                                                            {q.analysis && (
                                                                <p className="text-[14px] leading-[1.5] tracking-[0.2px] text-[#9E7F63]">
                                                                    解析：{q.analysis}
                                                                </p>
                                                            )}
                                                            <div className="h-px bg-[rgba(0,0,0,0.06)]" />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    (() => {
                                        const questionText = cleanQuestionContent((item as any).question)
                                        return (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-[#6C4A2D]">題目 {idx + 1}</span>
                                                    {'difficulty' in item && (item as any).difficulty && (
                                                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E8DCC9] text-[#8C6B4A] border border-[#E8DCC8]">
                                                            {(item as any).difficulty}
                                                        </span>
                                                    )}
                                                </div>
                                                {questionText && (
                                                    <p className="text-[15px] leading-[1.6] tracking-[0.2px] text-[#6C4A2F]">
                                                        {questionText}
                                                    </p>
                                                )}
                                                {'options' in item && Array.isArray((item as any).options) && (
                                                    <div className="space-y-2.5 pt-1">
                                                        {normalizeOptions((item as any).options, (item as any).questionType === '多選').map((opt: string, oIdx: number) => {
                                                            const label = String.fromCharCode(65 + oIdx)
                                                            const optionText = normalizeOptionText(opt)
                                                            return (
                                                                <div
                                                                    key={oIdx}
                                                                    className="flex items-center gap-3 rounded-lg px-3 py-2 bg-[#F1E8DB]"
                                                                >
                                                                    <span className="font-bold text-[#8C6B4A]">{label}</span>
                                                                    <span className="text-[15px] leading-[1.5] tracking-[0.2px] text-[#6C4A2D]">
                                                                        {optionText}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )}
                                                {'answer' in item && (
                                                    <p className="text-sm text-[#6C4A2D]">
                                                        答案：{(item as any).answer}
                                                    </p>
                                                )}
                                                {'analysis' in item && (
                                                    <p className="text-[14px] leading-[1.5] tracking-[0.2px] text-[#9E7F63]">
                                                        解析：{(item as any).analysis}
                                                    </p>
                                                )}
                                            </>
                                        )
                                    })()
                                )}
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Subject Selection Dialog */}
            <SubjectSelectionDialog
                open={showSubjectDialog}
                onOpenChange={setShowSubjectDialog}
                detectedSubject={analysis?.detectedSubject || subject}
                confidence={0.8}
                onConfirm={handleConfirmedSave}
                isLoading={isSaving}
            />
        </div>
    )
}
