'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { handleApiError } from '@/lib/error-handler'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BookOpen, Globe, FlaskConical, Calculator, Languages, FileText, Image as ImageIcon, File, MoreVertical, Upload, Book, X, Brain, CheckCircle2, Star, ChevronRight, Store, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAsk } from '@/lib/ask-context'
import { BackpackFile, TaskType } from '@/lib/types'
import { Progress } from '@/components/ui/progress'
import { calculateProgressPercent } from '@/lib/types/question-sets'
import { NoteViewerModal } from '@/components/backpack/NoteViewerModal'

const subjects = [
  { id: 'chinese', name: '國文', icon: BookOpen, color: 'bg-red-500/10 text-red-500' },
  { id: 'english', name: '英文', icon: Languages, color: 'bg-blue-500/10 text-blue-500' },
  { id: 'math', name: '數學', icon: Calculator, color: 'bg-orange-500/10 text-orange-500' },
  { id: 'science', name: '自然', icon: FlaskConical, color: 'bg-purple-500/10 text-purple-500' },
  { id: 'social', name: '社會', icon: Globe, color: 'bg-green-500/10 text-green-500' },
]

const seedFiles: BackpackFile[] = [
  {
    id: '1',
    user_id: 'user1',
    type: 'text',
    title: '微積分筆記',
    subject: 'math',
    content: '導數的定義與性質...',
    file_url: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return '今天'
  if (diffInDays === 1) return '昨天'
  if (diffInDays < 7) return `${diffInDays} 天前`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} 週前`
  return `${Math.floor(diffInDays / 30)} 月前`
}

type ViewMode = 'backpack' | 'error-book' | 'question-sets'

export function BackpackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { importFromBackpack } = useAsk()
  const [viewMode, setViewMode] = useState<ViewMode>('backpack')
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [items, setItems] = useState<BackpackFile[]>([])
  const [errorBookItems, setErrorBookItems] = useState<any[]>([])
  const [questionSetItems, setQuestionSetItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [mockHint, setMockHint] = useState<string | null>(null)
  const [showErrorBookModal, setShowErrorBookModal] = useState(false)
  const [selectedErrorIds, setSelectedErrorIds] = useState<Set<string>>(new Set())
  const [isCreatingPractice, setIsCreatingPractice] = useState(false)
  const [creatingRoomId, setCreatingRoomId] = useState<string | null>(null)

  // Note Viewer State
  const [viewingNote, setViewingNote] = useState<BackpackFile | null>(null)

  const isDev = process.env.NODE_ENV === 'development'

  // Load items from API
  const loadBackpackItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setMockHint(null)
      const response = await fetch('/api/backpack', {
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const fallbackMessage =
          response.status === 401
            ? isDev
              ? 'Mock 模式尚未初始化，請執行 pnpm --filter web seed:mock-user 後再試。'
              : '請先登入以使用背包功能。'
            : '載入失敗'
        const message = data.message || fallbackMessage
        setError(message)
        throw new Error(message)
      }
      setItems(data.items || [])
      setMockHint(typeof data.mockHint === 'string' ? data.mockHint : null)
      setError(null)
    } catch (err) {
      console.error('Failed to load backpack items:', err)
      setMockHint(null)
      try {
        const raw = localStorage.getItem('backpack_items')
        if (raw) {
          const list: BackpackFile[] = JSON.parse(raw)
          list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          setItems(list)
        } else {
          setItems(seedFiles)
        }
      } catch {
        setItems(seedFiles)
      }
    } finally {
      setLoading(false)
    }
  }, [isDev])

  // Load error book items
  const loadErrorBookItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setMockHint(null)
      const response = await fetch('/api/error-book', {
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message = data.message || '載入失敗'
        setError(message)
        throw new Error(message)
      }
      setErrorBookItems(data.items || [])
    } catch (err) {
      console.error('Failed to load error book items:', err)
      setError(err instanceof Error ? err.message : '載入失敗')
      setErrorBookItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load question set items
  const loadQuestionSetItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      setMockHint(null)

      const params = new URLSearchParams()
      if (selectedSubject && selectedSubject !== 'all') {
        params.append('subject', selectedSubject)
      }

      const response = await fetch(`/api/user/question-sets?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load question sets')
      }

      setQuestionSetItems(data.sets || [])
    } catch (err) {
      console.error('Failed to load question sets:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question sets')
      setQuestionSetItems([])
    } finally {
      setLoading(false)
    }
  }, [selectedSubject])

  // Initial load
  useEffect(() => {
    if (viewMode === 'backpack') {
      loadBackpackItems()
    } else if (viewMode === 'error-book') {
      loadErrorBookItems()
    } else {
      loadQuestionSetItems()
    }
  }, [viewMode, loadBackpackItems, loadErrorBookItems, loadQuestionSetItems])

  // Ensure items are initialized even if API fails immediately
  useEffect(() => {
    if (items.length === 0 && !loading && viewMode === 'backpack') {
      // If no items and not loading, try to load from localStorage or use seed
      try {
        const raw = localStorage.getItem('backpack_items')
        if (raw) {
          const list: BackpackFile[] = JSON.parse(raw)
          if (list.length > 0) {
            list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
            setItems(list)
          }
        } else if (seedFiles.length > 0) {
          setItems(seedFiles)
        }
      } catch {
        if (seedFiles.length > 0) {
          setItems(seedFiles)
        }
      }
    }
  }, [items.length, loading, viewMode])

  // Handle highlight from URL params
  useEffect(() => {
    const highlight = searchParams?.get('highlight')
    if (highlight) {
      setHighlightId(highlight)
      setTimeout(() => {
        const element = document.getElementById(`file-${highlight}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setTimeout(() => setHighlightId(null), 2000)
    }
  }, [searchParams, items])

  // Filter items by subject
  const filteredItems = items.filter(item => {
    if (selectedSubject && item.subject !== selectedSubject) return false
    return true
  })

  // Filter error book items by subject
  const filteredErrorBookItems = errorBookItems.filter((item: any) => {
    if (selectedSubject && item.packs?.subject !== selectedSubject) return false
    return true
  })

  // Filter question set items
  const filteredQuestionSetItems = questionSetItems.filter((item: any) => {
    if (selectedSubject && item.subject !== selectedSubject) return false
    return true
  })

  const handleImportToAsk = (fileId: string, taskType: TaskType) => {
    const file = items.find(f => f.id === fileId)
    if (!file) return

    importFromBackpack([file], taskType)
    router.push('/ask')
  }

  const handleFileClick = (file: BackpackFile) => {
    // For notebook entries, show content in modal
    if (file.is_notebook_entry && file.content) {
      setViewingNote(file)
      return
    }

    // Navigate to file detail or open file
    if (file.type === 'text') {
      // Show text content
      console.log('Open text file:', file)
    } else if (file.type === 'pdf' && file.file_url) {
      // Open PDF in new tab
      window.open(file.file_url, '_blank')
    } else if (file.type === 'image' && file.file_url) {
      // Open image in new tab
      window.open(file.file_url, '_blank')
    }
  }

  // File upload handlers
  const handleFileSelect = useCallback(async (files: FileList) => {
    const file = files[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('subject', selectedSubject || 'math')
      formData.append('title', file.name)

      const response = await fetch('/api/backpack/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '上傳失敗')
      }

      // Reload items
      await loadBackpackItems()
      setShowUpload(false)
    } catch (err) {
      console.error('Upload failed:', err)
      setError(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setIsUploading(false)
    }
  }, [selectedSubject, loadBackpackItems])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files)
    }
  }, [handleFileSelect]);

  return (
    <div className="mx-auto max-w-lg pb-24">
      {/* Sticky Header - First Layer: Data Type Tabs */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            {viewMode === 'backpack' ? '背包' : viewMode === 'error-book' ? '錯題本' : '題本'}
          </h1>
          <div className="flex items-center gap-2">
            {/* First Layer: Large Data Type Tabs */}
            <div className="flex bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('backpack')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'backpack'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                筆記
              </button>
              <button
                onClick={() => setViewMode('error-book')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'error-book'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                錯題
              </button>
              <button
                onClick={() => setViewMode('question-sets')}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'question-sets'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                題本
              </button>
            </div>
            {viewMode === 'error-book' && filteredErrorBookItems.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  const allIds = new Set(filteredErrorBookItems.map((item: any) => item.question_id))
                  setSelectedErrorIds(allIds)
                  setShowErrorBookModal(true)
                }}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
              >
                <Brain className="h-4 w-4 mr-1" />
                練習錯題
              </Button>
            )}
            {viewMode === 'question-sets' && (
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push('/store-shop')}
                className="bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
              >
                <Store className="h-4 w-4" />
                題本商店
              </Button>
            )}
          </div>
        </div>

        {/* Second Layer: Subject Filter Chips - Smaller, thin border */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${selectedSubject === null
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-amber-200'
                }`}
            >
              全部
            </button>
            {subjects.map((subject) => {
              const isActive = selectedSubject === subject.id
              const subjectColors: Record<string, string> = {
                chinese: 'bg-red-50 border-red-200 text-red-900',
                english: 'bg-blue-50 border-blue-200 text-blue-900',
                math: 'bg-orange-50 border-orange-200 text-orange-900',
                science: 'bg-purple-50 border-purple-200 text-purple-900',
                social: 'bg-green-50 border-green-200 text-green-900',
              }
              const inactiveColors = 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-amber-200'

              return (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject.id)}
                  className={`flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${isActive
                    ? subjectColors[subject.id] || 'bg-amber-50 border-amber-300 text-amber-900'
                    : inactiveColors
                    }`}
                >
                  {subject.name}
                </button>
              )
            })}
          </div>
          {/* Upload Button - Small, compact */}
          {viewMode === 'backpack' && (
            <div className="mt-2 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
                className="h-7 px-3 text-xs border-amber-200 text-amber-900 hover:bg-amber-50"
              >
                <Plus className="h-3 w-3 mr-1" />
                上傳檔案
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-4 rounded-lg bg-destructive/10 border border-destructive/20 mx-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-destructive mb-1">載入失敗</p>
              <p className="text-xs text-destructive/80">{error}</p>
              <p className="text-xs text-muted-foreground mt-2">
                請檢查瀏覽器控制台以獲取詳細錯誤訊息
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setError(null)
                if (viewMode === 'backpack') {
                  loadBackpackItems()
                } else if (viewMode === 'error-book') {
                  loadErrorBookItems()
                } else {
                  loadQuestionSetItems()
                }
              }}
            >
              重試
            </Button>
          </div>
        </div>
      )}
      {!error && mockHint && (
        <div className="px-4 py-4 rounded-lg border border-primary/20 bg-primary/5 mx-4 mb-4 text-sm text-primary">
          <p className="font-medium">開發提示</p>
          <p className="mt-1 text-xs text-primary/80">{mockHint}</p>
        </div>
      )}

      {/* Upload Area */}
      {viewMode === 'backpack' && showUpload && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-4 mb-4"
          >
            <Card
              className={`border-2 border-dashed transition-colors ${isDragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-2">上傳教材</p>
                <p className="text-xs text-muted-foreground mb-4">
                  拖放檔案或點擊選擇
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  支援所有檔案格式 (最大 50MB)
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('backpack-file-input')?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? '上傳中...' : '選擇檔案'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUpload(false)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <input
                  id="backpack-file-input"
                  type="file"
                  accept=".pdf,.txt,.jpg,.jpeg,.png,.gif,.doc,.docx"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Items List - Vertical List */}
      <div className="pt-4">
        {loading ? (
          <div className="text-center py-12 px-4">
            <p className="text-muted-foreground">載入中...</p>
          </div>
        ) : viewMode === 'backpack' ? (
          filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-muted-foreground">尚無項目</p>
              <p className="text-sm text-muted-foreground mt-2">保存的項目將顯示在這裡</p>
            </div>
          ) : (
            <div className="px-4 space-y-2">
              {filteredItems.map((item, idx) => {
                const subjectInfo = subjects.find(s => s.id === item.subject)
                const Icon = subjectInfo?.icon || FileText
                const isHighlighted = highlightId === item.id

                return (
                  <motion.div
                    key={item.id}
                    id={`file-${item.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`${isHighlighted ? 'ring-2 ring-amber-400 rounded-lg' : ''}`}
                  >
                    <div
                      className="group relative rounded-lg border border-border bg-card transition-all hover:bg-amber-50/50 hover:shadow-sm cursor-pointer"
                      onClick={() => handleFileClick(item)}
                    >
                      {/* Three-layer structure */}
                      <div className="p-3">
                        {/* Layer 1: Main Title Row */}
                        <div className="flex items-start gap-2 mb-2">
                          {/* Icon - lighter color, smaller gap */}
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${subjectInfo?.color || 'bg-amber-50'} opacity-60`}>
                            {item.type === 'pdf' && <File className="h-5 w-5 text-muted-foreground" />}
                            {item.type === 'image' && <ImageIcon className="h-5 w-5 text-muted-foreground" />}
                            {item.type === 'text' && <Icon className="h-5 w-5 text-muted-foreground" />}
                          </div>
                          
                          {/* Title - Large, bold, single line */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <h3 className="font-semibold text-base text-foreground truncate leading-tight">
                              {item.title}
                            </h3>
                          </div>
                        </div>

                        {/* Layer 2: Sub Info - Subject & Time */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 pl-12">
                          <span>{subjectInfo?.name || '其他'}</span>
                          <span>•</span>
                          <span>{getRelativeTime(item.updated_at)}</span>
                          {item.is_notebook_entry && (
                            <>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                                {item.source_type === 'qa' ? '解題' : item.source_type === 'summary' ? '摘要' : '筆記'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Layer 3: Action Row */}
                        <div className="flex items-center justify-between pl-12">
                          <div className="flex items-center gap-2">
                            {item.type === 'text' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleImportToAsk(item.id, 'solve')
                                }}
                                className="h-7 px-3 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                              >
                                解題
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleImportToAsk(item.id, 'summary')}>
                                  重點整理
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleImportToAsk(item.id, 'solve')}>
                                  解題
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        ) : viewMode === 'question-sets' ? (
          filteredQuestionSetItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Book className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">還沒有下載題本</p>
              <Button
                variant="outline"
                onClick={() => router.push('/store-shop')}
                className="mt-2 border-amber-300 text-amber-900 hover:bg-amber-50"
              >
                前往題本商店
              </Button>
            </div>
          ) : (
            <div className="px-4 space-y-2">
              {filteredQuestionSetItems.map((item: any, idx: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-sm transition-shadow border-border bg-card">
                    <div className="p-3">
                      {/* Layer 1: Main Title Row */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-foreground truncate leading-tight">
                            {item.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-amber-50 px-2 py-1 rounded ml-2 shrink-0">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {item.rating}
                        </div>
                      </div>

                      {/* Layer 2: Sub Info */}
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                            {subjects.find(s => s.id === item.subject)?.name || item.subject}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                            難度 {item.difficulty_level}
                          </span>
                          {item.practice_count > 0 && (
                            <span>已練習 {item.practice_count} 次</span>
                          )}
                        </div>
                        {/* 進度視覺化 */}
                        {item.progress_data && item.practice_count > 0 && (
                          <div className="mt-2 space-y-1">
                            <Progress
                              value={calculateProgressPercent(item.progress_data)}
                              className="h-1.5"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                已練習: {item.progress_data.completed}/{item.progress_data.total}
                              </span>
                              <span>
                                正確率: {Math.round(item.progress_data.correct_rate * 100)}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Layer 3: Action Row */}
                      <div className="flex items-center justify-end">
                        <Button
                          size="sm"
                          disabled={creatingRoomId === item.id}
                          onClick={async (e) => {
                            e.stopPropagation()
                            setCreatingRoomId(item.id)
                            try {
                              const res = await fetch('/api/play/practice/create', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sourceType: 'QUESTION_SET',
                                  setId: item.id
                                })
                              })
                              const data = await res.json()

                              if (!res.ok) {
                                throw new Error(data.error || 'Failed to create practice room')
                              }

                              if (data.success && data.room?.room_code) {
                                router.push(`/play/practice/${data.room.room_code}`)
                              } else {
                                throw new Error('Invalid response from server')
                              }
                            } catch (error) {
                              console.error('Failed to create practice room:', error)
                              handleApiError(error, 'Create Practice Room from Question Set', {
                                title: '建立失敗',
                                description: '無法建立練習室，請稍後再試'
                              })
                              setCreatingRoomId(null)
                            }
                          }}
                          className="h-7 px-3 text-xs bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
                        >
                          {creatingRoomId === item.id ? (
                            <>
                              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
                              建立中...
                            </>
                          ) : (
                            '開始練習'
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <>
            {filteredErrorBookItems.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Book className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-2">還沒有錯題</p>
                <p className="text-sm text-muted-foreground">
                  在解題頁面將錯題存入錯題本後，會顯示在這裡
                </p>
              </div>
            ) : (
              <div className="px-4 space-y-2">
                {filteredErrorBookItems.map((item: any, idx: number) => {
                  const question = item.pack_questions
                  const pack = item.packs
                  const subjectInfo = subjects.find(s => s.id === pack?.subject)

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="overflow-hidden hover:shadow-sm transition-shadow border-border bg-card">
                        <div className="p-3">
                          {/* Layer 1: Main Title Row */}
                          <div className="mb-2">
                            <h3 className="font-semibold text-base text-foreground line-clamp-2 leading-tight">
                              {question?.stem || '題目'}
                            </h3>
                          </div>

                          {/* Layer 2: Sub Info */}
                          <div className="mb-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                                {subjectInfo?.name || pack?.subject || '未知'}
                              </span>
                              {pack?.skill && (
                                <>
                                  <span>•</span>
                                  <span>{pack.skill}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Layer 3: Action Row */}
                          <div className="flex items-center justify-end">
                            <Button
                              size="sm"
                              onClick={() => {
                                const allIds = new Set([item.question_id])
                                setSelectedErrorIds(allIds)
                                setShowErrorBookModal(true)
                              }}
                              className="h-7 px-3 text-xs bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700"
                            >
                              練習
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Note Viewer Modal */}
      <NoteViewerModal
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        file={viewingNote}
      />
    </div>
  )
}
