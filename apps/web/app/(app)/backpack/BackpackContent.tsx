'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BookOpen, Globe, FlaskConical, Calculator, Languages, FileText, Image as ImageIcon, File, MoreVertical, Upload, Book, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAsk } from '@/lib/ask-context'
import { BackpackFile, TaskType } from '@/lib/types'
import { supabaseBrowserClient } from '@/lib/supabase'

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

type ViewMode = 'backpack' | 'error-book'

export function BackpackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { importFromBackpack } = useAsk()
  const [viewMode, setViewMode] = useState<ViewMode>('backpack')
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [items, setItems] = useState<BackpackFile[]>([])
  const [errorBookItems, setErrorBookItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const getAuthHeaders = useCallback(async () => {
    try {
      const { data, error } = await supabaseBrowserClient.auth.getSession()
      if (error) {
        console.warn('[Backpack] Supabase session error:', error.message)
        return {}
      }
      const token = data?.session?.access_token
      if (token) {
        return { Authorization: `Bearer ${token}` }
      }
    } catch (err) {
      console.warn('[Backpack] Unable to retrieve Supabase session:', err)
    }
    return {}
  }, [])

  // Load items from API
  const loadBackpackItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await getAuthHeaders()
      const response = await fetch('/api/backpack', {
        headers,
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        // Don't show error for 401, just use fallback
        if (response.status === 401) {
          console.log('[Backpack] Not authenticated, using fallback data')
        } else {
          setError(data.message || '載入失敗')
        }
        throw new Error(data.message || '載入失敗')
      }
      const data = await response.json()
      setItems(data.items || [])
      setError(null) // Clear any previous errors
    } catch (err) {
      console.error('Failed to load backpack items:', err)
      // Fallback to localStorage or seed
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
  }, [getAuthHeaders])

  // Load error book items
  const loadErrorBookItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await getAuthHeaders()
      const response = await fetch('/api/error-book', {
        headers,
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '載入失敗')
      }
      const data = await response.json()
      setErrorBookItems(data.items || [])
    } catch (err) {
      console.error('Failed to load error book items:', err)
      setError(err instanceof Error ? err.message : '載入失敗')
      setErrorBookItems([])
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders])

  // Initial load
  useEffect(() => {
    if (viewMode === 'backpack') {
      loadBackpackItems()
    } else {
      loadErrorBookItems()
    }
  }, [viewMode, loadBackpackItems, loadErrorBookItems])

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

  const handleImportToAsk = (fileId: string, taskType: TaskType) => {
    const file = items.find(f => f.id === fileId)
    if (!file) return

    importFromBackpack([file], taskType)
    router.push('/ask')
  }

  const handleFileClick = (file: BackpackFile) => {
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

      const headers = await getAuthHeaders()
      const response = await fetch('/api/backpack/upload', {
        method: 'POST',
        body: formData,
        headers,
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
  }, [selectedSubject, loadBackpackItems, getAuthHeaders])

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
  }, [handleFileSelect])

  return (
    <div className="mx-auto max-w-lg pb-4">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {viewMode === 'backpack' ? '背包' : '錯題本'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'backpack' 
              ? `已保存 ${items.length} 個項目`
              : `已保存 ${errorBookItems.length} 道錯題`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'error-book' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('error-book')}
            className="flex items-center gap-2"
          >
            <Book className="h-4 w-4" />
            錯題本
          </Button>
          {viewMode === 'backpack' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              選取檔案
            </Button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
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
                } else {
                  loadErrorBookItems()
                }
              }}
            >
              重試
            </Button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      {viewMode === 'backpack' && showUpload && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mb-4"
          >
            <Card
              className={`border-2 border-dashed transition-colors ${
                isDragOver 
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

      {/* Subject Filter */}
      <div className="px-4 py-3 border-b">
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setSelectedSubject(null)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              selectedSubject === null
                ? 'bg-blue-500 text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            全部
          </button>
          {subjects.map((subject) => {
            const Icon = subject.icon
            const isActive = selectedSubject === subject.id

            return (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {subject.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Items List - Horizontal Scroll */}
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
            <div className="overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex gap-4 px-4" style={{ width: 'max-content' }}>
                {filteredItems.map((item, idx) => {
                  const subjectInfo = subjects.find(s => s.id === item.subject)
                  const Icon = subjectInfo?.icon || FileText
                  const isHighlighted = highlightId === item.id

                  return (
                    <motion.div
                      key={item.id}
                      id={`file-${item.id}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`flex-shrink-0 w-40 ${isHighlighted ? 'ring-2 ring-primary rounded-lg' : ''}`}
                    >
                      <Card 
                        className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer aspect-square"
                        onClick={() => handleFileClick(item)}
                      >
                        <div className="p-4 h-full flex flex-col items-center justify-between">
                          {/* Icon or Image */}
                          <div className="flex-1 flex items-center justify-center w-full mb-2">
                            {item.type === 'image' && item.file_url ? (
                              <img 
                                src={item.file_url} 
                                alt={item.title}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            ) : (
                              <div className={`w-20 h-20 rounded-lg flex items-center justify-center ${subjectInfo?.color || 'bg-muted'}`}>
                                {item.type === 'pdf' && <File className="h-10 w-10" />}
                                {item.type === 'image' && <ImageIcon className="h-10 w-10" />}
                                {item.type === 'text' && <Icon className="h-10 w-10" />}
                              </div>
                            )}
                          </div>

                          {/* Title */}
                          <h3 className="font-medium text-sm text-center mb-1 line-clamp-2 min-h-[2.5rem]">
                            {item.title}
                          </h3>

                          {/* Date */}
                          <p className="text-xs text-muted-foreground text-center mb-2">
                            {getRelativeTime(item.updated_at)}
                          </p>

                          {/* Actions Menu */}
                          <div className="flex justify-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
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
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )
        ) : (
          <>
            {filteredErrorBookItems.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Book className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-2">還沒有錯題</p>
                <p className="text-sm text-muted-foreground">
                  在解題頁面將錯題存入錯題本後，會顯示在這裡
                </p>
              </div>
            ) : (
              <div className="px-4 space-y-4">
                {filteredErrorBookItems.map((item: any, idx: number) => {
                  const question = item.pack_questions
                  const pack = item.packs
                  const subjectInfo = subjects.find(s => s.id === pack?.subject)
                  const Icon = subjectInfo?.icon || FileText

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={`p-2 rounded-lg ${subjectInfo?.color || 'bg-muted'}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold line-clamp-2 mb-1">
                                {question?.stem || '題目'}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{subjectInfo?.name || pack?.subject || '未知'}</span>
                                {pack?.skill && (
                                  <>
                                    <span>•</span>
                                    <span>{pack.skill}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {question?.explanation && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {question.explanation}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const params = new URLSearchParams()
                                if (question?.stem) {
                                  params.set('question', question.stem)
                                }
                                if (question?.id) {
                                  params.set('questionId', question.id)
                                }
                                const url = params.toString() ? `/ask?${params.toString()}` : '/ask'
                                router.push(url)
                              }}
                              className="flex-1"
                            >
                              重新練習
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
    </div>
  )
}
