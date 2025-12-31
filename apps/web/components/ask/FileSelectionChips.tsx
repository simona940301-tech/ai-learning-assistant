'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RAGDocument {
    id: string
    filename: string
    uploaded_at: string
    cache_name?: string
    cache_expires_at?: string
}

interface FileSelectionChipsProps {
    currentUploadIds: string[]  // IDs from current upload session
    onSelectionChange: (selectedIds: string[]) => void
}

export function FileSelectionChips({ currentUploadIds, onSelectionChange }: FileSelectionChipsProps) {
    const [allDocuments, setAllDocuments] = useState<RAGDocument[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>(currentUploadIds)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch 24-hour history
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const response = await fetch('/api/rag/upload?hours=24')
                const data = await response.json()

                console.log('[FileSelectionChips] Fetched documents:', data)

                if (data.success) {
                    setAllDocuments(data.documents || [])
                    console.log('[FileSelectionChips] Total documents:', data.documents?.length || 0)
                    console.log('[FileSelectionChips] Current uploads:', currentUploadIds.length)
                    console.log('[FileSelectionChips] History documents:',
                        data.documents?.filter((d: any) => !currentUploadIds.includes(d.id)).length || 0
                    )
                }
            } catch (error) {
                console.error('[FileSelectionChips] Failed to fetch documents:', error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchDocuments()
    }, [currentUploadIds])

    // Auto-select current upload files
    useEffect(() => {
        setSelectedIds(currentUploadIds)
        onSelectionChange(currentUploadIds)
    }, [currentUploadIds])

    const toggleSelection = (id: string) => {
        const newSelection = selectedIds.includes(id)
            ? selectedIds.filter(sid => sid !== id)
            : [...selectedIds, id]

        setSelectedIds(newSelection)
        onSelectionChange(newSelection)
    }

    const isCurrentUpload = (id: string) => currentUploadIds.includes(id)
    const isCacheValid = (doc: RAGDocument) => {
        if (!doc.cache_name || !doc.cache_expires_at) return false
        return new Date(doc.cache_expires_at) > new Date()
    }

    if (isLoading) {
        return (
            <div className="flex gap-2 animate-pulse">
                <div className="h-8 w-24 bg-secondary/20 rounded-full" />
                <div className="h-8 w-32 bg-secondary/20 rounded-full" />
            </div>
        )
    }

    if (allDocuments.length === 0) {
        return null
    }

    return (
        <div className="space-y-3">
            {/* Unified Scrollable Container */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {/* Current Uploads */}
                {allDocuments
                    .filter(doc => isCurrentUpload(doc.id))
                    .map(doc => (
                        <FileChip
                            key={doc.id}
                            doc={doc}
                            selected={selectedIds.includes(doc.id)}
                            isCurrent={true}
                            hasCache={isCacheValid(doc)}
                            onToggle={() => toggleSelection(doc.id)}
                        />
                    ))}

                {/* Separator if both exist */}
                {currentUploadIds.length > 0 &&
                    allDocuments.filter(doc => !isCurrentUpload(doc.id)).length > 0 && (
                        <div className="w-px h-6 bg-border mx-1 self-center shrink-0" />
                    )}

                {/* History Uploads */}
                {allDocuments
                    .filter(doc => !isCurrentUpload(doc.id))
                    .map(doc => (
                        <FileChip
                            key={doc.id}
                            doc={doc}
                            selected={selectedIds.includes(doc.id)}
                            isCurrent={false}
                            hasCache={isCacheValid(doc)}
                            onToggle={() => toggleSelection(doc.id)}
                        />
                    ))}
            </div>

            {/* Selection Summary */}
            {selectedIds.length > 0 && (
                <p className="text-xs text-muted-foreground px-1">
                    已選擇 {selectedIds.length} 個文件用於問答
                </p>
            )}
        </div>
    )
}

interface FileChipProps {
    doc: RAGDocument
    selected: boolean
    isCurrent: boolean
    hasCache: boolean
    onToggle: () => void
}

function FileChip({ doc, selected, isCurrent, hasCache, onToggle }: FileChipProps) {
    return (
        <motion.button
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onToggle}
            className={cn(
                "group relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                "border-2",
                // Current upload: Higher saturation, vibrant
                isCurrent && selected && "bg-primary text-primary-foreground border-primary shadow-md",
                isCurrent && !selected && "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
                // History: Lower saturation, muted
                !isCurrent && selected && "bg-secondary text-secondary-foreground border-secondary-foreground/20 shadow-sm",
                !isCurrent && !selected && "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50",
                // Hover effects
                "hover:scale-105 active:scale-95"
            )}
        >
            <FileText className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[120px]">{doc.filename}</span>

            {/* Cache indicator */}
            {hasCache && (
                <Sparkles className="w-3 h-3 shrink-0 text-yellow-500" />
            )}

            {/* Remove button (only when selected) */}
            {selected && (
                <X className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </motion.button>
    )
}
