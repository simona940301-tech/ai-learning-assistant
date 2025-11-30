'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, Globe, FlaskConical, Calculator, Languages, Star, Download, Check, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from '@/components/ui/Toast'
import type { QuestionSetWithDownloadStatus } from '@/lib/types/question-sets'
import { formatPrice } from '@/lib/types/question-sets'
import { Input } from '@/components/ui/input'

const subjects = [
    { id: 'all', name: '全部', icon: null },
    { id: 'chinese', name: '國文', icon: BookOpen },
    { id: 'english', name: '英文', icon: Languages },
    { id: 'social', name: '社會', icon: Globe },
    { id: 'science', name: '自然', icon: FlaskConical },
    { id: 'math', name: '數學', icon: Calculator },
]

interface StoreModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onDownloadComplete?: () => void
}

export function StoreModal({ open, onOpenChange, onDownloadComplete }: StoreModalProps) {
    const [selectedSubject, setSelectedSubject] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [sets, setSets] = useState<QuestionSetWithDownloadStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [downloadingId, setDownloadingId] = useState<string | null>(null)

    useEffect(() => {
        if (open) {
            fetchSets()
        }
    }, [open, selectedSubject])

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (open) fetchSets()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const fetchSets = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (selectedSubject !== 'all') {
                params.append('subject', selectedSubject)
            }
            if (searchQuery) {
                params.append('search', searchQuery)
            }

            const res = await fetch(`/api/store/question-sets?${params.toString()}`)
            const data = await res.json()

            if (data.sets) {
                setSets(data.sets)
            }
        } catch (error) {
            console.error('Failed to fetch sets:', error)
            toast.error('載入失敗：無法載入題本列表，請稍後再試')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = async (setId: string, title: string) => {
        try {
            setDownloadingId(setId)
            const res = await fetch('/api/store/question-sets/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ setId }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || 'Download failed')
            }

            toast.success(data.is_duplicate ? `已存在：「${title}」已在您的背包中` : `下載成功：「${title}」已加入您的背包`)

            // Update local state
            setSets(prev => prev.map(s =>
                s.id === setId ? { ...s, is_downloaded: true, downloads: s.downloads + 1 } : s
            ))

            // Notify parent to refresh backpack
            if (!data.is_duplicate && onDownloadComplete) {
                onDownloadComplete()
            }

        } catch (error) {
            toast.error(error instanceof Error ? `下載失敗：${error.message}` : '下載失敗：請稍後再試')
        } finally {
            setDownloadingId(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl">
                <DialogHeader className="px-6 py-4 border-b border-border">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        題本商店
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Filters & Search */}
                    <div className="px-6 py-4 space-y-4 bg-muted/30">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="搜尋題本..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background border-border/50"
                            />
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {subjects.map((subject) => {
                                const Icon = subject.icon
                                const isActive = selectedSubject === subject.id

                                return (
                                    <button
                                        key={subject.id}
                                        onClick={() => setSelectedSubject(subject.id)}
                                        className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors border ${isActive
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                                            }`}
                                    >
                                        {Icon && <Icon className="h-4 w-4" />}
                                        {subject.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
                                <p>載入題本中...</p>
                            </div>
                        ) : sets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                                <BookOpen className="h-12 w-12 opacity-20 mb-4" />
                                <p>找不到相關題本</p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {sets.map((item, idx) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <Card className="overflow-hidden h-full flex flex-col hover:border-primary/50 transition-colors">
                                            <div className="p-4 flex-1">
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                    <h3 className="font-semibold line-clamp-2 text-base">{item.title}</h3>
                                                    <div className="flex items-center gap-1 text-[10px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                                                        <Star className="h-3 w-3 fill-current" />
                                                        {item.rating}
                                                    </div>
                                                </div>

                                                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                                    {item.description}
                                                </p>

                                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                                                    <span className="bg-muted px-2 py-0.5 rounded text-foreground/80">
                                                        {subjects.find(s => s.id === item.subject)?.name || item.subject}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{item.downloads} 次下載</span>
                                                </div>
                                            </div>

                                            <div className="p-4 pt-0 mt-auto flex items-center justify-between border-t border-border/50 bg-muted/20">
                                                <div className="text-sm font-bold text-primary">
                                                    {formatPrice(item.price)}
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant={item.is_downloaded ? "outline" : "default"}
                                                    disabled={downloadingId === item.id || item.is_downloaded}
                                                    onClick={() => handleDownload(item.id, item.title)}
                                                    className={item.is_downloaded ? "border-green-500/50 text-green-600 hover:text-green-700 hover:bg-green-50" : ""}
                                                >
                                                    {downloadingId === item.id ? (
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    ) : item.is_downloaded ? (
                                                        <>
                                                            <Check className="mr-1 h-3 w-3" />
                                                            已下載
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="mr-1 h-3 w-3" />
                                                            下載
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
