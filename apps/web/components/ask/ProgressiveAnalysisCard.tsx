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

    // Kick off analysis via AI SDK hook (Vercel streamObject protocol)
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

        if (allDocIds.length > 0) {
            submit({
                documentId: allDocIds[0],
                relatedDocIds: allDocIds.slice(1),
                subject,
            })
        } else if (initialText) {
            submit({
                text: initialText,
                subject,
            })
        }
    }, [documentId, relatedDocIds, selectedDocIds, subject, initialText, submit])

    // Bridge streamed object into FileAnalysis shape
    useEffect(() => {
        if (!object) return

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
        }
    }, [object, documentId, isLoading, onAnalysisComplete, onAnalysisUpdate])

    // Surface stream errors
    useEffect(() => {
        if (!streamError) return
        console.error('[ProgressiveAnalysisCard] Stream error:', streamError)
        setError(streamError.message || '分析失敗，請稍後再試')
    }, [streamError])

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

            {/* Content Area - Minimalist & Unified */}
            <AnimatePresence mode="wait">
                {analysis?.structuredNotes ? (
                    <motion.div
                        key="full-analysis"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5 }}
                        className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-sm border border-border/50"
                    >
                        <RAGMarkdownRenderer
                            content={analysis.structuredNotes}
                            subject={analysis.detectedSubject || subject}
                        />
                    </motion.div>
                ) : analysis?.quickSummary ? (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-sm border border-border/50"
                    >
                        <div className="flex items-center gap-2 mb-6 text-muted-foreground">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-sm font-medium">快速預覽</span>
                        </div>
                        <RAGMarkdownRenderer
                            content={analysis.quickSummary}
                            subject={analysis.detectedSubject || subject}
                        />
                        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-pulse">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>正在生成完整重點統整與考題...</span>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-24 space-y-6 text-center"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-[#6C4A2D]/20 blur-xl animate-pulse" />
                            <Loader2 className="relative z-10 h-12 w-12 text-[#6C4A2D] animate-spin" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-medium text-foreground">正在深入分析文件</h3>
                            <p className="text-sm text-muted-foreground">
                                {displayDocuments.length > 1
                                    ? `AI 正在整合 ${displayDocuments.length} 個文件的內容...`
                                    : 'AI 正在閱讀並整理重點，請稍候...'}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="rounded-2xl border border-[#E8DCC9] bg-[#FCF6EE] px-4 py-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#6C4A2D]">
                    <Sparkles className="w-4 h-4" />
                    <span>{predictionsReady ? '考題預測完成' : '考題預測生成中'}</span>
                </div>
                <span className="text-xs text-[#8C6B4A]">
                    {predictionsReady ? '可以開始練習 AI 命題' : 'AI 正在推演命題趨勢'}
                </span>
            </div>

            {/* Exam Predictions */}
            {(analysis?.examPredictions?.length ?? 0) > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
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
