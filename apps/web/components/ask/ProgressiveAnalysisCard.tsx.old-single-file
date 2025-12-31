'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, BookmarkPlus, Check, Sparkles } from 'lucide-react'
import { FileAnalysis } from '@/lib/types'
import { detectSubject, type SubjectTag } from '@/lib/utils/detect-subject'
import { RAGMarkdownRenderer } from './RAGMarkdownRenderer'
import { cn } from '@/lib/utils'

interface ProgressiveAnalysisCardProps {
    analysisId: string
    fileName: string
    onAnalysisUpdate?: (analysis: FileAnalysis) => void
}

const SUBJECT_KEYWORDS: Array<{ tag: SubjectTag; keywords: string[] }> = [
    { tag: '英文', keywords: ['英文', 'english', 'eng', 'toeic', 'toefl'] },
    { tag: '數學', keywords: ['數學', 'math', 'calculus', 'algebra', 'geometry'] },
    { tag: '國文', keywords: ['國文', 'chinese', 'mandarin', '語文'] },
    { tag: '社會', keywords: ['社會', 'history', 'geography', 'civics', 'politics'] },
    { tag: '自然', keywords: ['自然', 'science', 'physics', 'chemistry', 'biology', 'earth'] },
]

export default function ProgressiveAnalysisCard({
    analysisId,
    fileName,
    onAnalysisUpdate
}: ProgressiveAnalysisCardProps) {
    const [analysis, setAnalysis] = useState<FileAnalysis | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    const resolveSubjectTag = (): SubjectTag => {
        const normalized = (analysis?.detectedSubject || '').toLowerCase()
        const matched = SUBJECT_KEYWORDS.find(({ keywords }) =>
            keywords.some(keyword => normalized.includes(keyword))
        )

        if (matched) return matched.tag

        const fallbackText = [analysis?.quickSummary, analysis?.structuredNotes, fileName]
            .filter(Boolean)
            .join(' ')

        return detectSubject(fallbackText || '綜合題')
    }

    // Handle save to backpack
    const handleSaveToNotebook = async () => {
        if (!analysis) return

        setIsSaving(true)
        setSaveSuccess(false)

        try {
            const subjectTag = resolveSubjectTag()
            // Use structuredNotes directly as it now contains the full unified markdown
            const note_md = analysis.structuredNotes || analysis.quickSummary || ''

            // Use backpack API - auth context will resolve user_id
            const response = await fetch('/api/backpack/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: 'auto', // Will be resolved from auth context in API
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

    // Real-time updates via Server-Sent Events (SSE)
    useEffect(() => {
        const sseUrl = `/api/rag/upload-elite/stream?analysisId=${analysisId}`;
        console.log('[ProgressiveAnalysisCard] 📡 Connecting to SSE:', sseUrl);
        const eventSource = new EventSource(sseUrl);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const transformed = {
                    id: data.id,
                    status: data.status,
                    processingTimeMs: data.processing_time_ms,
                    quickSummary: data.quick_summary,
                    detectedSubject: data.detected_subject,
                    detectedTopics: data.detected_topics,
                    coreConcepts: data.core_concepts,
                    keyInsights: data.key_insights,
                    suggestedQuestions: data.suggested_questions,
                    structuredNotes: data.structured_notes,
                    examPredictions: data.exam_predictions,
                    weakPoints: data.weak_points,
                    studyRoadmap: data.study_roadmap,
                    errorMessage: data.error_message
                };

                setAnalysis(prev => ({
                    ...prev,
                    ...transformed,
                    quickSummary: transformed.quickSummary || prev?.quickSummary,
                    structuredNotes: transformed.structuredNotes || prev?.structuredNotes,
                    examPredictions: transformed.examPredictions || prev?.examPredictions,
                }));

                onAnalysisUpdate?.(transformed);
            } catch (e) {
                console.error('[ProgressiveAnalysisCard] SSE parse error:', e);
            }
        };

        eventSource.onerror = (err) => {
            console.error('[ProgressiveAnalysisCard] SSE error, falling back to polling', err);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [analysisId, onAnalysisUpdate]);

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
    if (!analysis) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground animate-pulse">正在準備分析環境...</p>
            </div>
        )
    }

    const isComplete = analysis.status === 'prediction_ready' || analysis.status === 'analysis_ready'
    const hasContent = !!analysis.structuredNotes || !!analysis.quickSummary

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

            {/* Content Area - Minimalist & Unified */}
            <AnimatePresence mode="wait">
                {analysis.structuredNotes ? (
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
                            subject={analysis.detectedSubject}
                        />
                    </motion.div>
                ) : analysis.quickSummary ? (
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
                            subject={analysis.detectedSubject}
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
                            <p className="text-sm text-muted-foreground">AI 正在閱讀並整理重點，請稍候...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
