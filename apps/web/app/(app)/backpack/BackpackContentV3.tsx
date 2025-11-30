'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { FolderCard } from '@/components/backpack/FolderCard'
import { ContentCard } from '@/components/backpack/ContentCard'
import { ErrorBookCard } from '@/components/backpack/ErrorBookCard'
import { QuestionSetCard } from '@/components/backpack/QuestionSetCard'
import { TypeTabs } from '@/components/backpack/TypeTabs'
import { Button } from '@/components/ui/button'
import { Plus, Book, Store, Edit2, Trash2, X } from 'lucide-react'
import { useAsk } from '@/lib/ask-context'
import type { BackpackFile } from '@/lib/types'
import { NoteViewerModal } from '@/components/backpack/NoteViewerModal'
import { StoreModal } from '@/components/store/StoreModal'
import { handleApiError } from '@/lib/error-handler'
import { EmptyState } from '@/components/ui/empty-state'
import { SkeletonList } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/Toast'
import { FileUp, AlertCircle, ShoppingBag } from 'lucide-react'
import { useGuidance, useInefficientRepetition, useErrorCorrection } from '@/lib/guidance/useGuidance'

const subjects = [
  { id: 'chinese', name: '國文' },
  { id: 'english', name: '英文' },
  { id: 'math', name: '數學' },
  { id: 'science', name: '自然' },
  { id: 'social', name: '社會' },
]

type ContentType = 'note' | 'wrong' | 'book'

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

export function BackpackContentV3() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { importFromBackpack } = useAsk()

  // 🎯 引導系統：自動檢測 T04 (Onboarding 完成後) 和 T01 (停留過久)
  const { recordOperation } = useGuidance({
    autoDetectT04: true,  // 🎯 啟用 T04 引導 (查看你的學測秘笈!)
    autoDetectT01: {
      enabled: true,
      delayMs: 10000,
    },
    page: 'backpack',
  })

  // 🎯 引導系統：T02 低效重複 - 批次整理引導
  const { trackAction: trackManualOrganize } = useInefficientRepetition('manual-organize', 3)

  // 🎯 引導系統：T03 錯誤糾正 - 檔案大小引導
  const { trackError: trackFileSizeError } = useErrorCorrection('upload-file-size', 2)

  // Route-based state
  const contentType = (searchParams?.get('type') as ContentType) || 'note'
  const selectedSubject = searchParams?.get('subject') || null
  const targetNoteId = searchParams?.get('noteId') || null

  const [items, setItems] = useState<BackpackFile[]>([])
  const [errorBookItems, setErrorBookItems] = useState<any[]>([])
  const [questionSetItems, setQuestionSetItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [viewingNote, setViewingNote] = useState<BackpackFile | null>(null)
  const [creatingRoomId, setCreatingRoomId] = useState<string | null>(null)
  const [showErrorBookModal, setShowErrorBookModal] = useState(false)
  const [showStoreModal, setShowStoreModal] = useState(false)
  const [selectedErrorIds, setSelectedErrorIds] = useState<Set<string>>(new Set())
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set())
  const [selectedErrorBookIds, setSelectedErrorBookIds] = useState<Set<string>>(new Set())
  const [showCloudLinkInput, setShowCloudLinkInput] = useState(false)
  const [cloudLinkUrl, setCloudLinkUrl] = useState('')

  // Load data based on content type
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (contentType === 'note') {
        const response = await fetch('/api/backpack', { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.items) {
          setItems(data.items || [])
        }
      } else if (contentType === 'wrong') {
        const response = await fetch('/api/error-book', { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.items) {
          setErrorBookItems(data.items || [])
        }
      } else if (contentType === 'book') {
        const response = await fetch('/api/question-sets/user', { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.sets) {
          setQuestionSetItems(data.sets || [])
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setError('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [contentType])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Auto-open note detail when noteId is provided via query params
  useEffect(() => {
    if (contentType !== 'note' || !targetNoteId || items.length === 0) return

    const targetNote = items.find((item) => item.id === targetNoteId)
    if (!targetNote) return

    if (!selectedSubject || selectedSubject !== targetNote.subject) {
      router.replace(`/backpack?type=note&subject=${targetNote.subject}&noteId=${targetNote.id}`)
      return
    }

    if (!viewingNote || viewingNote.id !== targetNote.id) {
      setViewingNote(targetNote)
    }
  }, [contentType, targetNoteId, items, selectedSubject, router, viewingNote])

  // Calculate folder counts
  const getFolderCounts = () => {
    const counts: Record<string, { note: number; wrong: number; book: number }> = {}

    subjects.forEach((subject) => {
      counts[subject.id] = {
        note: items.filter((item) => item.subject === subject.id).length,
        wrong: errorBookItems.filter((item: any) => item.packs?.subject === subject.id).length,
        book: questionSetItems.filter((item: any) => item.subject === subject.id).length,
      }
    })

    return counts
  }

  const folderCounts = getFolderCounts()

  // Filter items by subject
  const getFilteredItems = (): any[] => {
    if (!selectedSubject) return []

    if (contentType === 'note') {
      return items.filter((item) => item.subject === selectedSubject)
    } else if (contentType === 'wrong') {
      return errorBookItems.filter((item: any) => item.packs?.subject === selectedSubject)
    } else {
      return questionSetItems.filter((item: any) => item.subject === selectedSubject)
    }
  }

  const filteredItems = getFilteredItems()

  // Navigation handlers
  const handleTypeChange = (type: ContentType) => {
    router.push(`/backpack?type=${type}`)
  }

  const handleFolderClick = (subjectId: string) => {
    router.push(`/backpack?type=${contentType}&subject=${subjectId}`)
  }

  const handleBackToFolders = () => {
    router.push(`/backpack?type=${contentType}`)
  }

  const handleImportToAsk = (fileId: string, taskType: 'summary' | 'solve') => {
    const file = items.find((f) => f.id === fileId)
    if (!file) return
    
    // 如果是解題模式，構建特殊 prompt 要求不同解釋
    if (taskType === 'solve' && file.content) {
      // 提取題目（從 markdown 中提取第一個標題後的內容）
      const questionMatch = file.content.match(/#\s*(.+?)\n\n(?:##[^\n]+\n\n)?(.+?)(?=\n\n##|\n\n---|$)/s)
      const questionText = questionMatch ? questionMatch[1] + '\n\n' + questionMatch[2] : file.title
      
      // 構建要求不同解釋的 prompt
      const enhancedPrompt = `${questionText}\n\n[請用不同的角度重新解釋這題，並指出學生可能誤解的點]`
      
      // 使用 URL 參數傳遞特殊標記
      router.push(`/ask?question=${encodeURIComponent(enhancedPrompt)}&mode=alternative`)
      return
    }
    
    importFromBackpack([file], taskType)
    toast.success(`已匯入「${file.name}」到 Ask`)
    router.push('/ask')
  }

  const handleFileClick = (file: BackpackFile) => {
    trackManualOrganize() // 🎯 記錄手動整理操作，達到 3 次後自動觸發引導
    if (file.is_notebook_entry && file.content) {
      setViewingNote(file)
      return
    }
    // Handle other file types
  }

  const handleErrorBookClick = (item: any) => {
    const allIds = new Set([item.question_id])
    setSelectedErrorIds(allIds)
    setShowErrorBookModal(true)
  }

  const handleCreatePractice = async (item: any) => {
    setCreatingRoomId(item.id)
    try {
      const res = await fetch('/api/play/practice/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType: 'QUESTION_SET',
          setId: item.id,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create practice room')
      }

      if (data.success && data.room?.room_code) {
        toast.success('練習室建立成功！')
        router.push(`/play/practice/${data.room.room_code}`)
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (error) {
      console.error('Failed to create practice room:', error)
      toast.error('無法建立練習室，請稍後再試')
      handleApiError(error, 'Create Practice Room from Question Set', {
        title: '建立失敗',
        description: '無法建立練習室，請稍後再試',
      })
      setCreatingRoomId(null)
    }
  }

  // Folder View (Second Layer)
  if (!selectedSubject) {
    return (
      <div className="mx-auto max-w-lg pb-24 min-h-screen bg-background">
        {/* Header with Title */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">
              {contentType === 'note' ? '背包' : contentType === 'wrong' ? '錯題本' : '題本'}
            </h1>
          </div>
        </div>

        {/* First Layer: Type Tabs */}
        <TypeTabs activeType={contentType} onTypeChange={handleTypeChange} />

        {/* Second Layer: Folder List */}
        <div className="px-4 py-4">
          <div className="space-y-3">
            {subjects.map((subject) => (
              <FolderCard
                key={subject.id}
                subject={subject}
                count={folderCounts[subject.id]?.[contentType] || 0}
                type={contentType}
                onClick={() => handleFolderClick(subject.id)}
              />
            ))}
          </div>

          {/* Upload Button - Only in note mode */}
          {contentType === 'note' && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowUpload(!showUpload)}
                className="h-8 px-3 text-xs"
              >
                <Plus className="h-3 w-3 mr-1.5" strokeWidth={1.75} />
                上傳檔案
              </Button>
            </div>
          )}

          {/* Store Button - Only in book mode */}
          {contentType === 'book' && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStoreModal(true)}
                className="h-8 px-3 text-xs"
              >
                <Store className="h-3 w-3 mr-1.5" strokeWidth={1.75} />
                題本商店
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Content List View (Third Layer)
  const subjectInfo = subjects.find((s) => s.id === selectedSubject)

  return (
    <div className="mx-auto max-w-lg pb-24 min-h-screen bg-background">
      {/* Header with Title */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">
            {contentType === 'note' ? '背包' : contentType === 'wrong' ? '錯題本' : '題本'}
          </h1>
        </div>
      </div>

      {/* First Layer: Type Tabs */}
      <TypeTabs activeType={contentType} onTypeChange={handleTypeChange} />

      {/* Back Button and Edit Mode Toggle */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToFolders}
            className="h-8 px-3 text-xs"
          >
            ← 返回
          </Button>
          <span className="ml-2 text-sm font-semibold text-foreground">
            {subjectInfo?.name}
          </span>
        </div>
        {filteredItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            data-action="batch-organize"
            onClick={() => {
              recordOperation() // 🎯 記錄操作
              setIsEditMode(!isEditMode)
              if (isEditMode) {
                setSelectedNoteIds(new Set())
                setSelectedErrorBookIds(new Set())
              }
            }}
            className="h-8 px-3 text-xs"
          >
            {isEditMode ? (
              <>
                <X className="h-3 w-3 mr-1.5" />
                取消
              </>
            ) : (
              <>
                <Edit2 className="h-3 w-3 mr-1.5" />
                編輯
              </>
            )}
          </Button>
        )}
      </div>

      {/* Batch Delete Bar (when in edit mode) */}
      {isEditMode && (
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            已選擇 {contentType === 'note' ? selectedNoteIds.size : selectedErrorBookIds.size} 項
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              const idsToDelete = contentType === 'note' ? Array.from(selectedNoteIds) : Array.from(selectedErrorBookIds)
              if (idsToDelete.length === 0) return

              try {
                if (contentType === 'note') {
                  // 刪除筆記
                  const res = await fetch('/api/backpack', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsToDelete }),
                  })
                  if (!res.ok) throw new Error('刪除失敗')
                } else if (contentType === 'wrong') {
                  // 刪除錯題
                  const res = await fetch('/api/error-book', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: idsToDelete }),
                  })
                  if (!res.ok) throw new Error('刪除失敗')
                }
                toast.success(`已刪除 ${idsToDelete.length} 項`)
                setIsEditMode(false)
                setSelectedNoteIds(new Set())
                setSelectedErrorBookIds(new Set())
                loadData()
              } catch (error) {
                console.error('Delete failed:', error)
                toast.error('刪除失敗，請稍後再試')
              }
            }}
            disabled={(contentType === 'note' ? selectedNoteIds.size : selectedErrorBookIds.size) === 0}
            className="h-8 px-3 text-xs"
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            刪除
          </Button>
        </div>
      )}

      {/* Content List */}
      <div className="px-4 py-4">
        {loading ? (
          <SkeletonList count={5} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={contentType === 'note' ? <FileUp className="h-16 w-16" /> : contentType === 'wrong' ? <AlertCircle className="h-16 w-16" /> : <ShoppingBag className="h-16 w-16" />}
            title={contentType === 'note' ? '還沒有筆記' : contentType === 'wrong' ? '太棒了！沒有錯題' : '還沒有題本'}
            description={
              contentType === 'note'
                ? '上傳你的第一份學習筆記，開始建立知識庫'
                : contentType === 'wrong'
                  ? '繼續保持！開始練習後，答錯的題目會自動加入錯題本'
                  : '從題本商店下載精選題本，開始你的學習之旅'
            }
            action={
              contentType === 'note'
                ? { label: '上傳筆記', onClick: () => setShowUpload(true) }
                : contentType === 'wrong'
                  ? { label: '開始練習', onClick: () => router.push('/play') }
                  : { label: '前往商店', onClick: () => setShowStoreModal(true) }
            }
          />
        ) : (
          <div className="space-y-4">
            {contentType === 'note' &&
              filteredItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onClick={() => handleFileClick(item)}
                  onImportToAsk={(type) => handleImportToAsk(item.id, type)}
                  getRelativeTime={getRelativeTime}
                  subjectName={subjectInfo?.name || ''}
                  isEditMode={isEditMode}
                  isSelected={selectedNoteIds.has(item.id)}
                  onToggleSelect={() => {
                    setSelectedNoteIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(item.id)) {
                        next.delete(item.id)
                      } else {
                        next.add(item.id)
                      }
                      return next
                    })
                  }}
                />
              ))}
            {contentType === 'wrong' &&
              filteredItems.map((item: any) => (
                <ErrorBookCard
                  key={item.id}
                  item={item}
                  onClick={() => handleErrorBookClick(item)}
                  subjectName={subjectInfo?.name || ''}
                  getRelativeTime={getRelativeTime}
                  isEditMode={isEditMode}
                  isSelected={selectedErrorBookIds.has(item.id)}
                  onToggleSelect={() => {
                    setSelectedErrorBookIds((prev) => {
                      const next = new Set(prev)
                      if (next.has(item.id)) {
                        next.delete(item.id)
                      } else {
                        next.add(item.id)
                      }
                      return next
                    })
                  }}
                />
              ))}
            {contentType === 'book' &&
              filteredItems.map((item: any) => (
                <QuestionSetCard
                  key={item.id}
                  item={item}
                  onClick={() => { }}
                  onCreatePractice={() => handleCreatePractice(item)}
                  isCreating={creatingRoomId === item.id}
                  subjectName={subjectInfo?.name || ''}
                />
              ))}
          </div>
        )}
      </div>

      {/* Note Viewer Modal */}
      <NoteViewerModal
        isOpen={!!viewingNote}
        onClose={() => setViewingNote(null)}
        file={viewingNote}
      />

      {/* Store Modal */}
      <StoreModal
        open={showStoreModal}
        onOpenChange={setShowStoreModal}
        onDownloadComplete={() => {
          // Refresh data when download completes
          loadData()
        }}
      />

      {/* Upload Area */}
      {showUpload && contentType === 'note' && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-background rounded-t-2xl p-4 border-t border-border">
            <div className="text-center mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">上傳教材</p>
              <p className="text-xs text-muted-foreground">拖放檔案或點擊選擇</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('backpack-file-input')?.click()}
                  className="flex-1"
                >
                  選擇檔案
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-upload-type="link"
                  onClick={() => {
                    setShowUpload(false)
                    setShowCloudLinkInput(true)
                  }}
                  className="flex-1"
                >
                  雲端連結
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
                className="w-full"
              >
                取消
              </Button>
            </div>
            <input
              id="backpack-file-input"
              type="file"
              accept=".pdf,.txt,.jpg,.jpeg,.png,.gif,.doc,.docx"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return

                // 🎯 檢查檔案大小 (5MB = 5 * 1024 * 1024 bytes)
                const MAX_FILE_SIZE = 5 * 1024 * 1024
                if (file.size > MAX_FILE_SIZE) {
                  trackFileSizeError({ fileSize: file.size }) // 🎯 觸發引導: "檔案太大？試試雲端連結更方便!"
                  const sizeMB = (file.size / 1024 / 1024).toFixed(1)
                  toast.error(`檔案過大 (${sizeMB}MB)，最大支援 5MB。建議使用雲端連結上傳大型檔案。`)
                  return
                }

                // TODO: Handle file upload
                toast.success('檔案上傳功能開發中...')
                setShowUpload(false)
              }}
            />
          </div>
        </div>
      )}

      {/* Cloud Link Input Modal */}
      {showCloudLinkInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-background rounded-2xl p-6 border border-border mx-4">
            <h3 className="text-lg font-semibold text-foreground mb-2">雲端連結上傳</h3>
            <p className="text-sm text-muted-foreground mb-4">
              支援 Google Drive、Dropbox 等雲端服務連結
            </p>
            <input
              type="url"
              placeholder="貼上雲端連結 (例如: https://drive.google.com/...)"
              value={cloudLinkUrl}
              onChange={(e) => setCloudLinkUrl(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCloudLinkInput(false)
                  setCloudLinkUrl('')
                }}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (!cloudLinkUrl.trim()) {
                    toast.error('請輸入有效的雲端連結')
                    return
                  }
                  // TODO: Handle cloud link upload
                  toast.success('雲端連結上傳功能開發中...')
                  setShowCloudLinkInput(false)
                  setCloudLinkUrl('')
                }}
                disabled={!cloudLinkUrl.trim()}
                className="flex-1"
              >
                確認上傳
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
