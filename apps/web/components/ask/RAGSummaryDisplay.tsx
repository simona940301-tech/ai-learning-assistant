'use client'

import { useState } from 'react'
import { Sparkles, Loader2, FileText, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotebookSaveButton } from '@/components/notebook/NotebookSaveButton'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface RAGSummaryResult {
    documentId: string
    filename: string
    summary: string
    keywords: string[]
    theme?: string // 新增主題
    numPages?: number
}

interface RAGSummaryDisplayProps {
    result: RAGSummaryResult
    onSaveSuccess?: () => void
}

export function RAGSummaryDisplay({ result, onSaveSuccess }: RAGSummaryDisplayProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editedSummary, setEditedSummary] = useState(result.summary)

    // 格式化摘要為 Markdown
    const formattedContent = `# ${result.filename}

${result.theme ? `> **${result.theme}**\n` : ''}

## 📝 摘要

${editedSummary}

## 🏷️ 關鍵詞

${result.keywords.map(k => `- ${k}`).join('\n')}

---

*由 AI 自動生成於 ${new Date().toLocaleDateString('zh-TW')}*
`

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 space-y-6"
        >
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">{result.filename}</h3>
                    </div>
                    {result.theme && (
                        <p className="text-sm font-medium text-white/80 mb-1">{result.theme}</p>
                    )}
                    {result.numPages && (
                        <p className="text-xs text-white/40">共 {result.numPages} 頁</p>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(!isEditing)}
                        className={cn(
                            "text-white/60 hover:text-white transition-colors",
                            isEditing && "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
                        )}
                    >
                        {isEditing ? '完成' : '微調'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-white/60 hover:text-white"
                    >
                        {isExpanded ? '收起' : '展開'}
                    </Button>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4"
                    >
                        {/* Summary */}
                        <div className={cn(
                            "rounded-2xl border transition-colors duration-200",
                            isEditing
                                ? "border-blue-500/40 bg-blue-500/5"
                                : "border-blue-500/20 bg-blue-500/10"
                        )}>
                            <div className="p-4">
                                <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    摘要
                                </h4>
                                {isEditing ? (
                                    <textarea
                                        value={editedSummary}
                                        onChange={(e) => setEditedSummary(e.target.value)}
                                        className="w-full h-48 bg-transparent text-sm text-white/90 leading-relaxed resize-y focus:outline-none placeholder:text-white/20"
                                        placeholder="在此編輯摘要..."
                                    />
                                ) : (
                                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                                        {editedSummary}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Keywords */}
                        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                            <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                                <Tag className="h-4 w-4" />
                                關鍵詞
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {result.keywords.map((keyword, idx) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs text-purple-200"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Save to Notebook Button */}
                        <div className="pt-4 border-t border-white/10">
                            <NotebookSaveButton
                                title={`${result.filename} - 摘要`}
                                content={formattedContent}
                                sourceType="summary"
                                documentId={result.documentId}
                                tags={['學測', '摘要', ...result.keywords.slice(0, 3)]}
                                onSaveSuccess={onSaveSuccess}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
