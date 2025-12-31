'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FileText, CheckCircle2, Loader2, AlertCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAsk } from '@/lib/ask-context'

interface DataSource {
    id: string
    name: string
    status: 'processing' | 'ready' | 'error'
    type: string
    size: number
    uploadTime: string
}

export function RAGDataSourceList() {
    const { attachedFiles, removeFile } = useAsk()

    // Convert attachedFiles to DataSource format
    const sources: DataSource[] = attachedFiles.map(file => ({
        id: file.id,
        name: file.name,
        status: 'ready', // Default to ready for now as they are uploaded
        type: file.type,
        size: file.size || 0,
        uploadTime: new Date().toISOString() // We don't track upload time in context yet
    }))

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-muted-foreground">已分析資料</h3>
                <span className="text-xs text-muted-foreground/60">{sources.length} 份文件</span>
            </div>

            <div className="grid gap-3">
                <AnimatePresence mode="popLayout">
                    {sources.map((source) => (
                        <motion.div
                            key={source.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="group relative flex items-start gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-secondary/20"
                        >
                            {/* Status Icon */}
                            <div className={cn(
                                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                source.status === 'ready' && "border-green-500/30 bg-green-500/10 text-green-600",
                                source.status === 'processing' && "border-blue-500/30 bg-blue-500/10 text-blue-600",
                                source.status === 'error' && "border-red-500/30 bg-red-500/10 text-red-600"
                            )}>
                                {source.status === 'ready' && <CheckCircle2 className="h-4 w-4" />}
                                {source.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin" />}
                                {source.status === 'error' && <AlertCircle className="h-4 w-4" />}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {source.name}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 -mr-1 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => removeFile(source.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded-full border",
                                        source.status === 'ready' && "border-green-200 bg-green-50 text-green-700",
                                        source.status === 'processing' && "border-blue-200 bg-blue-50 text-blue-700",
                                        source.status === 'error' && "border-red-200 bg-red-50 text-red-700"
                                    )}>
                                        {source.status === 'ready' && '已完成'}
                                        {source.status === 'processing' && '分析中'}
                                        {source.status === 'error' && '失敗'}
                                    </span>
                                    <span className="text-xs text-muted-foreground/60">
                                        {(source.size / 1024).toFixed(1)} KB
                                    </span>
                                    <span className="text-xs text-muted-foreground/40">•</span>
                                    <span className="text-xs text-muted-foreground/60">
                                        {new Date(source.uploadTime).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar for Processing */}
                            {source.status === 'processing' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500/10 overflow-hidden rounded-b-xl">
                                    <motion.div
                                        className="h-full bg-blue-500"
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {sources.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-border rounded-xl bg-secondary/5">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-sm text-muted-foreground">尚未上傳任何資料</p>
                    </div>
                )}
            </div>
        </div>
    )
}
