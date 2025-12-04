'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, BookmarkPlus, Loader2, Edit2, MessageSquare } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { RAGMessage } from '@/lib/hooks/useRAGChat'

export type SubjectTag = '英文' | '數學' | '國文' | '社會' | '自然' | '其他'

interface SummarySaveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    summaryContent: string
    conversationHistory?: RAGMessage[]
    detectedSubject?: string
    confidence?: number
    onConfirm: (data: SaveData) => Promise<void>
    isLoading?: boolean
}

export interface SaveData {
    subject: SubjectTag
    title: string
    content: string
    includeConversation: boolean
    conversationHistory?: RAGMessage[]
}

const SUBJECTS: Array<{ tag: SubjectTag; emoji: string; color: string }> = [
    { tag: '英文', emoji: '🔤', color: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400' },
    { tag: '數學', emoji: '🔢', color: 'bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-400' },
    { tag: '國文', emoji: '📖', color: 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400' },
    { tag: '社會', emoji: '🌍', color: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' },
    { tag: '自然', emoji: '🔬', color: 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400' },
    { tag: '其他', emoji: '📚', color: 'bg-gray-500/10 border-gray-500/30 text-gray-700 dark:text-gray-400' },
]

function normalizeSubject(subject?: string): SubjectTag {
    if (!subject) return '其他'

    const normalized = subject.toLowerCase()

    if (normalized.includes('英') || normalized.includes('english')) return '英文'
    if (normalized.includes('數') || normalized.includes('math')) return '數學'
    if (normalized.includes('國') || normalized.includes('chinese')) return '國文'
    if (normalized.includes('社會') || normalized.includes('history') || normalized.includes('geography')) return '社會'
    if (normalized.includes('自然') || normalized.includes('science') || normalized.includes('physics') || normalized.includes('chemistry')) return '自然'

    return '其他'
}

function getConfidenceLabel(confidence?: number): { label: string; color: string } {
    if (!confidence) return { label: '未知', color: 'text-gray-500' }

    if (confidence >= 0.8) return { label: '高信心', color: 'text-green-600 dark:text-green-400' }
    if (confidence >= 0.5) return { label: '中等信心', color: 'text-yellow-600 dark:text-yellow-400' }
    return { label: '低信心', color: 'text-orange-600 dark:text-orange-400' }
}

function generateDefaultTitle(summaryContent: string): string {
    // Extract first heading or first 50 characters
    const lines = summaryContent.split('\n').filter(line => line.trim())

    // Try to find a heading
    const heading = lines.find(line => line.startsWith('#'))
    if (heading) {
        return heading.replace(/^#+\s*/, '').trim().substring(0, 50)
    }

    // Use first line or first 50 chars
    const firstLine = lines[0] || summaryContent
    return firstLine.trim().substring(0, 50) + (firstLine.length > 50 ? '...' : '')
}

export function SummarySaveDialog({
    open,
    onOpenChange,
    summaryContent,
    conversationHistory = [],
    detectedSubject,
    confidence,
    onConfirm,
    isLoading = false,
}: SummarySaveDialogProps) {
    const [selectedSubject, setSelectedSubject] = useState<SubjectTag>(() =>
        normalizeSubject(detectedSubject)
    )
    const [title, setTitle] = useState('')
    const [includeConversation, setIncludeConversation] = useState(false)
    const [isEditingTitle, setIsEditingTitle] = useState(false)

    // Generate default title when dialog opens or content changes
    useEffect(() => {
        console.log('[SummarySaveDialog] 🔍 Dialog opened:', open)
        console.log('[SummarySaveDialog] 📄 summaryContent length:', summaryContent?.length)
        console.log('[SummarySaveDialog] 📄 summaryContent preview:', summaryContent?.substring(0, 300))
        console.log('[SummarySaveDialog] 📄 Full summaryContent:', summaryContent)

        if (open && summaryContent) {
            const defaultTitle = generateDefaultTitle(summaryContent)
            console.log('[SummarySaveDialog] 📌 Generated title:', defaultTitle)
            setTitle(defaultTitle)
        }
    }, [open, summaryContent])

    // Reset subject when detected subject changes
    useEffect(() => {
        if (detectedSubject) {
            setSelectedSubject(normalizeSubject(detectedSubject))
        }
    }, [detectedSubject])

    const confidenceInfo = getConfidenceLabel(confidence)
    const hasConversation = conversationHistory.length > 0

    const handleConfirm = async () => {
        if (!title.trim()) {
            return
        }

        await onConfirm({
            subject: selectedSubject,
            title: title.trim(),
            content: summaryContent,
            includeConversation,
            conversationHistory: includeConversation ? conversationHistory : undefined,
        })

        // Reset form
        setTitle('')
        setIncludeConversation(false)
        setIsEditingTitle(false)
    }

    const handleClose = () => {
        onOpenChange(false)
        setIsEditingTitle(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <BookmarkPlus className="h-4 w-4 text-primary" />
                        </div>
                        <DialogTitle className="text-lg font-semibold">存到書包</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="px-5 pb-5 space-y-4">
                    {/* AI Detection Info - Compact */}
                    {detectedSubject && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                                AI 偵測：{detectedSubject}
                            </span>
                        </motion.div>
                    )}

                    {/* Title Input - Compact */}
                    <div className="space-y-1.5">
                        <Label htmlFor="note-title" className="text-xs font-medium text-muted-foreground">
                            標題
                        </Label>
                        <div className="relative">
                            <Input
                                id="note-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onFocus={() => setIsEditingTitle(true)}
                                onBlur={() => setIsEditingTitle(false)}
                                placeholder="輸入筆記標題..."
                                className="w-full pr-9 h-9 text-sm"
                                maxLength={100}
                            />
                            <Edit2 className={cn(
                                "absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-colors",
                                isEditingTitle ? "text-primary" : "text-muted-foreground"
                            )} />
                        </div>
                    </div>

                    {/* Subject Selection Grid - Compact & Minimal */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                            科目
                        </Label>
                        <div className="grid grid-cols-3 gap-2">
                            {SUBJECTS.map((subject) => {
                                    const isSelected = selectedSubject === subject.tag

                                    return (
                                        <button
                                            key={subject.tag}
                                            type="button"
                                            onClick={() => setSelectedSubject(subject.tag)}
                                            className={cn(
                                                'relative flex items-center gap-2 p-2.5 rounded-lg border transition-all',
                                                'hover:scale-[1.02] active:scale-[0.98]',
                                                isSelected
                                                    ? subject.color + ' border-current'
                                                    : 'bg-card border-border hover:border-primary/30'
                                            )}
                                        >
                                            <span className="text-lg">{subject.emoji}</span>
                                            <span className={cn(
                                                'text-xs font-medium',
                                                isSelected ? 'text-current' : 'text-foreground'
                                            )}>
                                                {subject.tag}
                                            </span>

                                            {/* Selection Indicator */}
                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1">
                                                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-current">
                                                        <Check className="h-2.5 w-2.5 text-white" />
                                                    </div>
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                        </div>
                    </div>

                    {/* Conversation History Option - Compact */}
                    {hasConversation && (
                        <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                            <Checkbox
                                id="include-conversation"
                                checked={includeConversation}
                                onCheckedChange={(checked: boolean | 'indeterminate') => setIncludeConversation(Boolean(checked))}
                            />
                            <Label
                                htmlFor="include-conversation"
                                className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
                            >
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>含問答記錄 ({conversationHistory.length})</span>
                            </Label>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-5 py-3 bg-muted/20 border-t border-border">
                    <div className="flex w-full gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="flex-1 h-9 text-sm"
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isLoading || !title.trim()}
                            className="flex-1 h-9 text-sm gap-1.5"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    <span>存入中</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>確認存入</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
