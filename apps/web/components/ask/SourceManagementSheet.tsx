'use client'

import { useState, useEffect } from 'react'
import { SidePanel } from '@/components/ui/side-panel'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, FileText, Sparkles, Clock, Trash2, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface RAGDocument {
    id: string
    filename: string
    uploaded_at: string
    cache_name?: string
    cache_expires_at?: string
}

interface SourceManagementSheetProps {
    isOpen: boolean
    onClose: () => void
    currentUploadIds: string[]
    selectedIds: string[]
    onSelectionChange: (ids: string[]) => void
}

export function SourceManagementSheet({
    isOpen,
    onClose,
    currentUploadIds,
    selectedIds,
    onSelectionChange
}: SourceManagementSheetProps) {
    const [allDocuments, setAllDocuments] = useState<RAGDocument[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch all history
    useEffect(() => {
        if (!isOpen) return

        const fetchDocuments = async () => {
            setIsLoading(true)
            try {
                // Remove hours param to fetch everything
                const response = await fetch('/api/rag/upload')
                const data = await response.json()
                if (data.success) {
                    setAllDocuments(data.documents || [])
                }
            } catch (error) {
                console.error('[SourceManagementSheet] Failed to fetch documents:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchDocuments()
    }, [isOpen, currentUploadIds])

    const toggleSelection = (id: string) => {
        const newSelection = selectedIds.includes(id)
            ? selectedIds.filter(sid => sid !== id)
            : [...selectedIds, id]
        onSelectionChange(newSelection)
    }

    const isCacheValid = (doc: RAGDocument) => {
        if (!doc.cache_name || !doc.cache_expires_at) return false
        return new Date(doc.cache_expires_at) > new Date()
    }

    // Grouping Logic
    const now = new Date()
    const groups = {
        current: [] as RAGDocument[],
        today: [] as RAGDocument[],
        yesterday: [] as RAGDocument[],
        last7Days: [] as RAGDocument[],
        older: [] as RAGDocument[]
    }

    allDocuments.forEach(doc => {
        if (currentUploadIds.includes(doc.id)) {
            groups.current.push(doc)
            return
        }

        const date = new Date(doc.uploaded_at)
        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

        if (date.toDateString() === now.toDateString()) {
            groups.today.push(doc)
        } else if (diffHours < 48 && date.getDate() !== now.getDate()) {
            groups.yesterday.push(doc)
        } else if (diffHours < 168) {
            groups.last7Days.push(doc)
        } else {
            groups.older.push(doc)
        }
    })

    const renderGroup = (title: string, docs: RAGDocument[], icon: React.ReactNode) => {
        if (docs.length === 0) return null
        return (
            <div className="space-y-3 pt-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    {icon}
                    {title}
                </h3>
                <div className="space-y-1">
                    {docs.map(doc => (
                        <DocumentItem
                            key={doc.id}
                            doc={doc}
                            selected={selectedIds.includes(doc.id)}
                            onToggle={() => toggleSelection(doc.id)}
                            isCurrent={title === '本次上傳'}
                        />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <SidePanel
            isOpen={isOpen}
            onClose={onClose}
            title="資料來源"
            side="left"
            className="w-80"
        >
            <div className="space-y-4">
                {/* Summary Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>已選擇 {selectedIds.length} 個來源</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent"
                        onClick={() => onSelectionChange([])}
                    >
                        全部清除
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <>
                        {renderGroup('本次上傳', groups.current, <Sparkles className="w-3 h-3" />)}
                        {renderGroup('今天', groups.today, <Clock className="w-3 h-3" />)}
                        {renderGroup('昨天', groups.yesterday, <CalendarDays className="w-3 h-3" />)}
                        {renderGroup('本週', groups.last7Days, <CalendarDays className="w-3 h-3" />)}
                        {renderGroup('更早之前', groups.older, <FileText className="w-3 h-3" />)}

                        {allDocuments.length === 0 && (
                            <div className="text-center py-10 px-4">
                                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center mx-auto mb-3">
                                    <FileText className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-foreground font-medium">尚無資料來源</p>
                                <p className="text-xs text-muted-foreground mt-1">上傳的文件將會永久保存於此</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer Actions */}
            <div className="mt-8 pt-4 border-t border-border">
                {selectedIds.length > 0 ? (
                    <p className="text-xs text-muted-foreground mb-3 text-center">
                        從選定的 {selectedIds.length} 個來源生成重點
                    </p>
                ) : (
                    <p className="text-xs text-muted-foreground mb-3 text-center">
                        請選擇至少一個來源
                    </p>
                )}
            </div>
        </SidePanel>
    )
}

interface DocumentItemProps {
    doc: RAGDocument
    selected: boolean
    onToggle: () => void
    isCurrent: boolean
}

function DocumentItem({ doc, selected, onToggle, isCurrent }: DocumentItemProps) {
    return (
        <div
            className={cn(
                "group flex items-start gap-2 p-2 rounded-xl transition-all cursor-pointer border",
                selected
                    ? "bg-primary/10 backdrop-blur-sm border-primary/30"
                    : "bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 hover:border-border"
            )}
            onClick={onToggle}
        >
            <Checkbox
                checked={selected}
                onCheckedChange={onToggle}
                className={cn(
                    "mt-0.5 h-3 w-3",
                    selected ? "border-primary data-[state=checked]:bg-primary" : "border-muted-foreground/30"
                )}
            />
            <div className="flex-1 min-w-0">
                <p className={cn(
                    "text-sm font-medium leading-none truncate mb-1.5",
                    selected ? "text-primary" : "text-foreground"
                )}>
                    {doc.filename}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                        {isCurrent ? (
                            <span className="text-primary/80">剛剛</span>
                        ) : (
                            <span>{new Date(doc.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                    </span>
                    {doc.cache_name && (
                        <span className="flex items-center gap-0.5 text-amber-600/80 bg-amber-500/10 px-1 py-0.5 rounded-[3px]">
                            <Sparkles className="w-2 h-2" />
                            已快取
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}
