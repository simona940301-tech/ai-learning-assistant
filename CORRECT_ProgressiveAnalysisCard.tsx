'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, BookmarkPlus, Check, Sparkles, FileText } from 'lucide-react'
import { FileAnalysis } from '@/lib/types'
import { detectSubject, type SubjectTag } from '@/lib/utils/detect-subject'
import { RAGMarkdownRenderer } from './RAGMarkdownRenderer'
import { cn } from '@/lib/utils'

interface ProgressiveAnalysisCardProps {
    documentId?: string
    relatedDocIds?: string[]
    subject?: string
    selectedDocIds?: string[]
    initialText?: string
    fileName?: string
    onAnalysisUpdate?: (analysis: FileAnalysis) => void
    onAnalysisComplete?: (result: any) => void
}

const SUBJECT_KEYWORDS: Array<{ tag: SubjectTag; keywords: string[] }> = [
    { tag: '英文', keywords: ['英文', 'english', 'eng', 'toeic', 'toefl'] },
    { tag: '數學', keywords: ['數學', 'math', 'calculus', 'algebra', 'geometry'] },
    { tag: '國文', keywords: ['國文', 'chinese', 'mandarin', '語文'] },
    { tag: '社會', keywords: ['社會', 'history', 'geography', 'civics', 'politics'] },
    { tag: '自然', keywords: ['自然', 'science', 'physics', 'chemistry', 'biology', 'earth'] },
]

export default function ProgressiveAnalysisCard({
    documentId,
    relatedDocIds = [],
    subject,
    selectedDocIds = [],
    initialText,
    fileName,
    onAnalysisUpdate,
    onAnalysisComplete
}: ProgressiveAnalysisCardProps) {
    const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [documentNames, setDocumentNames] = useState<Record<string, string>>({})
    const [isAnalyzing, setIsAnalyzing] = useState(false)

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

    // Handle analysis submission
    const submit = useCallback(async (params: {
        documentId?: string
        relatedDocIds?: string[]
        subject?: string
        text?: string
    }) => {
        const { documentId: docId, relatedDocIds: relDocs = [], subject: subj, text } = params

        if (!docId && !text) {
            console.warn('[ProgressiveAnalysisCard] No documentId or text provided')
            return
        }

        setIsAnalyzing(true)
        setError(null)
        setAnalysis(null)

        console.log('[ProgressiveAnalysisCard] 🚀 Starting analysis with:', {
            documentId: docId,
            relatedDocIds: relDocs,
            selectedDocIds,
            subject: subj,
            hasText: !!text
        })

        try {
            const { supabaseBrowser } = await import('@/lib/supabase')
            const { data: sessionData } = await supabaseBrowser.auth.getSession()
            const accessToken = sessionData?.session?.access_token

            if (!accessToken) {
                throw new Error('請先登入')
            }

            // Determine all document IDs to analyze
            const allDocIds = selectedDocIds.length > 0
                ? selectedDocIds
                : [docId, ...relDocs].filter(Boolean) as string[]

            const requestBody = {
                documentId: allDocIds[0], // Primary document
                relatedDocIds: allDocIds.slice(1), // Additional documents
                subject: subj,
                text: text || undefined
            }

            console.log('[ProgressiveAnalysisCard] 📤 Request body:', requestBody)

            const response = await fetch('/api/rag/analyze-object', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(requestBody)
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || '分析失敗')
            }

            // Handle streaming response
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (!reader) {
                throw new Error('No response body')
            }

            let buffer = ''
            let finalAnalysis: FileAnalysis | null = null

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue

                    const data = line.slice(6)
                    if (data === '[DONE]') continue

                    try {
                        const parsed = JSON.parse(data)
                        
                        // Transform snake_case to camelCase
                        const transformed: FileAnalysis = {
                            id: parsed.id || documentId,
                            status: parsed.status || 'completed',
                            processingTimeMs: parsed.processing_time_ms,
                            quickSummary: parsed.quick_summary,
                            detectedSubject: parsed.detected_subject,
                            detectedTopics: parsed.detected_topics,
                            coreConcepts: parsed.core_concepts,
                            keyInsights: parsed.key_insights,
                            suggestedQuestions: parsed.suggested_questions,
                            structuredNotes: parsed.structured_notes,
                            examPredictions: parsed.exam_predictions,
                            weakPoints: parsed.weak_points,
                            studyRoadmap: parsed.study_roadmap,
                            errorMessage: parsed.error_message
                        }

                        // Update analysis progressively
                        setAnalysis(prev => ({
                            ...prev,
                            ...transformed,
                            quickSummary: transformed.quickSummary || prev?.quickSummary,
                            structuredNotes: transformed.structuredNotes || prev?.structuredNotes,
                            examPredictions: transformed.examPredictions || prev?.examPredictions,
                        }))

                        finalAnalysis = transformed
                        onAnalysisUpdate?.(transformed)
                    } catch (e) {
                        console.error('[ProgressiveAnalysisCard] Parse error:', e, data)
                    }
                }
            }

            console.log('[ProgressiveAnalysisCard] ✅ Analysis completed')
            
            if (finalAnalysis) {
                onAnalysisComplete?.(finalAnalysis)
            }

        } catch (err) {
            console.error('[ProgressiveAnalysisCard] Analysis error:', err)
            setError(err instanceof Error ? err.message : '分析失敗，請稍後再試')
        } finally {
            setIsAnalyzing(false)
        }
    }, [selectedDocIds, onAnalysisUpdate, onAnalysisComplete])

    // Trigger analysis when documentId or initialText changes
    // CRITICAL: Do NOT include 'submit' in dependencies to avoid infinite loop
    useEffect(() => {
        if (documentId || initialText) {
            submit({
                documentId,
                relatedDocIds,
                subject,
                text: initialText
            })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documentId, initialText]) // NOT including submit!

    // Handle save to backpack
    const handleSaveToNotebook = async () => {
        if (!analysis) return

        setIsSaving(true)
        setSaveSuccess(false)

        try {
            const subjectTag = resolveSubjectTag()
            const note_md = analysis.structuredNotes || analysis.quickSummary || ''

            const response = await fetch('/api/backpack/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 'auto',
                    question: fileName || '文件分析',
                    canonical_skill: subjectTag,
                    note_md
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.message || '保存失敗')
            }

            console.log('[ProgressiveAnalysisCard] Saved to backpack:', data)
            setSaveSuccess(true)
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
    if (!analysis && (isAnalyzing || documentId || initialText)) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground animate-pulse">正在準備分析環境...</p>
            </div>
        )
    }

    const isComplete = analysis?.status === 'prediction_ready' || analysis?.status === 'analysis_ready'
    const hasContent = !!analysis?.structuredNotes || !!analysis?.quickSummary

    // Display selected documents info
    const allDocIds = selectedDocIds.length > 0
        ? selectedDocIds
        : [documentId, ...relatedDocIds].filter(Boolean) as string[]

    const displayDocuments = allDocIds.map(id => documentNames[id] || id).filter(Boolean)

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8">
            {/* Status Header - Minimalist */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-2 h-2 rounded-full transition-colors duration-500",
                        isComplete ? "bg-green-500" : "bg-blue-500 animate-pulse"
                    )} />
                    <span className="text-sm font-medium text-muted-foreground">
                        {isComplete ? '分析完成' : '正在分析...'}
                    </span>

                    {/* Show document count if multiple */}
                    {displayDocuments.length > 1 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-xs font-medium text-blue-600">
                                {displayDocuments.length} 個文件
                            </span>
                        </div>
                    )}
                </div>

                {hasContent && (
                    <button
                        onClick={handleSaveToNotebook}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 hover:bg-secondary text-sm font-medium transition-all duration-300 disabled:opacity-50"
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

            {/* Document List - Show when multiple documents */}
            {displayDocuments.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap gap-2 px-1"
                >
                    {displayDocuments.map((docName, idx) => (
                        <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm"
                        >
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">{docName}</span>
                        </div>
                    ))}
                </motion.div>
            )}

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
                            markdown={analysis.structuredNotes}
                            subject={analysis.detectedSubject || subject}
                            documentNames={documentNames}
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
                            markdown={analysis.quickSummary}
                            subject={analysis.detectedSubject || subject}
                            documentNames={documentNames}
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
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin relative z-10" />
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
        </div>
    )
}
