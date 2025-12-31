'use client'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X, BookOpen, Lightbulb, CheckCircle2, RotateCcw, Award } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface ErrorBookDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: any
    onMaster?: (id: string) => void
}

export function ErrorBookDetailModal({
    isOpen,
    onClose,
    item,
    onMaster
}: ErrorBookDetailModalProps) {
    const [showExplanation, setShowExplanation] = useState(false)

    if (!item) return null

    const question = item.pack_questions
    const pack = item.pack_questions?.packs
    const tags = item.knowledge_tags || []

    // Parse choices if they are string (JSON) or array
    let choices: string[] = []
    try {
        choices = typeof question.choices === 'string'
            ? JSON.parse(question.choices)
            : question.choices || []
    } catch (e) {
        choices = []
    }

    const handleMaster = () => {
        onMaster?.(item.id)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden bg-[#FAF9F6] border-none shadow-2xl rounded-2xl">
                <DialogTitle className="sr-only">錯題詳解</DialogTitle>
                <DialogDescription className="sr-only">檢視錯題詳細內容與解析</DialogDescription>

                {/* Header Background & Gradient */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#FFF5F5] to-transparent pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/80 hover:bg-white text-muted-foreground hover:text-foreground transition-colors shadow-sm backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex flex-col h-[85vh] md:h-auto md:max-h-[85vh]">
                    {/* Content Scroll Area */}
                    <ScrollArea className="flex-1 px-6 py-8 md:px-10">
                        <div className="max-w-2xl mx-auto space-y-8 pb-20">

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <Badge variant="outline" className="bg-white/50 border-red-100 text-red-600 hover:bg-red-50">
                                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                                    {pack?.subject === 'english' ? '英文' : pack?.subject === 'math' ? '數學' : pack?.subject || '一般'}
                                </Badge>
                                {/* Knowledge Tags */}
                                {tags.map((tag: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100">
                                        {tag}
                                    </Badge>
                                ))}

                                <span className="text-xs text-muted-foreground ml-auto">
                                    建立於 {new Date(item.created_at).toLocaleDateString()}
                                </span>
                            </div>

                            {/* Question Stem */}
                            <div className="prose prose-lg max-w-none">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 leading-relaxed font-display">
                                    {question.stem}
                                </h3>
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {choices.map((choice, index) => {
                                    const letter = String.fromCharCode(65 + index) // A, B, C...
                                    const isCorrect = letter === question.answer

                                    return (
                                        <motion.div
                                            key={index}
                                            initial={false}
                                            className={cn(
                                                "relative p-4 rounded-xl border-2 text-left transition-all duration-200",
                                                isCorrect
                                                    ? "bg-[#F0FDF4] border-[#22C55E] shadow-sm"
                                                    : "bg-white border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className={cn(
                                                    "flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold",
                                                    isCorrect ? "bg-[#22C55E] text-white" : "bg-slate-100 text-slate-500"
                                                )}>
                                                    {letter}
                                                </span>
                                                <span className={cn(
                                                    "text-base leading-snug",
                                                    isCorrect ? "text-slate-800 font-medium" : "text-slate-600"
                                                )}>
                                                    {choice}
                                                </span>
                                                {isCorrect && (
                                                    <div className="absolute top-3 right-3 text-[#22C55E]">
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>

                            {/* Explanation Section */}
                            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                                <div
                                    className="w-full px-6 py-4 bg-amber-50/50 border-b border-amber-100/50 flex items-center gap-2 cursor-pointer hover:bg-amber-50 transition-colors"
                                    onClick={() => setShowExplanation(!showExplanation)}
                                >
                                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
                                        <Lightbulb className="w-4 h-4" />
                                    </div>
                                    <span className="font-semibold text-slate-700">解析與知識點</span>
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {showExplanation ? '點擊收合' : '點擊展開'}
                                    </span>
                                </div>

                                <AnimatePresence initial={false}>
                                    {(showExplanation || true) && ( // Always showing for now per user request "display options AND explanation"
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="px-6 py-5 bg-white"
                                        >
                                            {question.explanation ? (
                                                <div className="prose prose-sm max-w-none text-slate-600 prose-headings:text-slate-800 prose-strong:text-amber-700/90 prose-p:leading-relaxed">
                                                    <ReactMarkdown>
                                                        {question.explanation}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                                    <div className="w-16 h-16 mb-3 rounded-full bg-slate-50 flex items-center justify-center">
                                                        <span className="text-2xl">🤔</span>
                                                    </div>
                                                    <p className="text-slate-500 font-medium">暫無詳細解析</p>
                                                    <p className="text-xs text-slate-400 mt-1">AI 正在努力生成中...</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                        </div>
                    </ScrollArea>

                    {/* Bottom Actions Bar */}
                    <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between gap-3 md:px-10">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 text-base font-medium border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl"
                        >
                            稍後再看
                        </Button>
                        <Button
                            onClick={handleMaster}
                            className="flex-1 h-12 text-base font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200/50 rounded-xl"
                        >
                            <Award className="w-5 h-5 mr-2" />
                            標記為已懂
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
