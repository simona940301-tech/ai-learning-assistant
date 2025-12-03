'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Sparkles, X } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type SubjectTag = '英文' | '數學' | '國文' | '社會' | '自然' | '其他'

interface SubjectSelectionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    detectedSubject?: string
    confidence?: number
    onConfirm: (subject: SubjectTag) => void
    isLoading?: boolean
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

export function SubjectSelectionDialog({
    open,
    onOpenChange,
    detectedSubject,
    confidence,
    onConfirm,
    isLoading = false,
}: SubjectSelectionDialogProps) {
    const [selectedSubject, setSelectedSubject] = useState<SubjectTag>(() =>
        normalizeSubject(detectedSubject)
    )

    const confidenceInfo = getConfidenceLabel(confidence)

    const handleConfirm = () => {
        onConfirm(selectedSubject)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <DialogTitle className="text-xl font-semibold">選擇科目書包</DialogTitle>
                    </div>
                    <DialogDescription className="text-sm text-muted-foreground">
                        確認要將這份筆記存入哪個科目的書包？
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 pb-6 space-y-6">
                    {/* AI Detection Info */}
                    {detectedSubject && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                        >
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                    AI 偵測：{detectedSubject}
                                </span>
                            </div>
                            <span className={cn('text-xs font-medium', confidenceInfo.color)}>
                                {confidenceInfo.label}
                            </span>
                        </motion.div>
                    )}

                    {/* Subject Selection Grid */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">
                            選擇科目
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <AnimatePresence mode="wait">
                                {SUBJECTS.map((subject, index) => {
                                    const isSelected = selectedSubject === subject.tag

                                    return (
                                        <motion.button
                                            key={subject.tag}
                                            type="button"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => setSelectedSubject(subject.tag)}
                                            className={cn(
                                                'relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200',
                                                'hover:scale-[1.02] active:scale-[0.98]',
                                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                                                isSelected
                                                    ? subject.color + ' border-current shadow-md'
                                                    : 'bg-card border-border hover:border-primary/30'
                                            )}
                                        >
                                            <span className="text-2xl">{subject.emoji}</span>
                                            <span className={cn(
                                                'text-sm font-medium',
                                                isSelected ? 'text-current' : 'text-foreground'
                                            )}>
                                                {subject.tag}
                                            </span>

                                            {/* Selection Indicator */}
                                            <AnimatePresence>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0, opacity: 0 }}
                                                        className="absolute top-2 right-2"
                                                    >
                                                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-current">
                                                            <Check className="h-3 w-3 text-white" />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.button>
                                    )
                                })}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Helper Text */}
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                        💡 筆記會根據科目分類存放，方便日後複習和查找
                    </p>
                </div>

                <DialogFooter className="px-6 py-4 bg-muted/30 border-t border-border">
                    <div className="flex w-full gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            取消
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="flex-1 gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                    >
                                        <Sparkles className="h-4 w-4" />
                                    </motion.div>
                                    <span>存入中...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4" />
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
