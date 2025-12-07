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
import { Plus, Book, Store, Edit2, Trash2, X, Sparkles, CheckSquare } from 'lucide-react'
import { useAsk } from '@/lib/ask-context'
import type { BackpackFile } from '@/lib/types'
import { NoteViewerModal } from '@/components/backpack/NoteViewerModal'
// 🎯 Phase 2: 使用簡化版 PDF Reader（無選取/註解功能）
import { BackpackReaderSimple as BackpackReader } from '@/components/backpack/BackpackReaderSimple'
import { StoreModal } from '@/components/store/StoreModal'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
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
  const [isUploading, setIsUploading] = useState(false)
  const [viewingFile, setViewingFile] = useState<BackpackFile | null>(null) // 🎯 新增：追蹤正在查看的檔案（PDF/圖片）
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null) // 🎯 本地預覽 URL（用於上傳前預覽）

  // 🎯 Phase 3: 多選模式（用於匯入到重點統整）
  // 🎯 Phase 3: 多選模式（用於匯入到重點統整）
  // Merged into isEditMode and selectedNoteIds

  // 🚀 NEW: State for cursor-based pagination
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  // Load data based on content type with cursor-based pagination
  const loadData = useCallback(async (cursor?: string | null) => {
    try {
      setLoading(true)
      setError(null)

      if (contentType === 'note') {
        const params = new URLSearchParams()
        params.set('limit', '20')
        if (cursor) params.set('cursor', cursor)

        const response = await fetch(`/api/backpack?${params.toString()}`, {
          credentials: 'include'
        })
        const data = await response.json().catch(() => ({}))

        if (response.ok && data.items) {
          // 🚀 Append to existing items if loading more, otherwise replace
          setItems(prev => cursor ? [...prev, ...data.items] : data.items)
          setNextCursor(data.nextCursor || null)
          setHasMore(data.hasMore || false)
        }
      } else if (contentType === 'wrong') {
        const response = await fetch('/api/error-book', { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.items) {
          setErrorBookItems(data.items || [])
        }
      } else if (contentType === 'book') {
        const response = await fetch('/api/user/question-sets', { credentials: 'include' })
        const data = await response.json().catch(() => ({}))
        if (response.ok && data.data?.sets) {
          setQuestionSetItems(data.data.sets || [])
        } else if (response.ok && data.sets) {
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

  // 🚀 NEW: Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (!loading && hasMore && nextCursor) {
      loadData(nextCursor)
    }
  }, [loading, hasMore, nextCursor, loadData])

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
    if (!file) {
      toast.error('找不到檔案')
      return
    }

    // 🎯 Perfect UX: 統一使用 importFromBackpack 流程
    // 不再在 URL 參數中傳遞增強的 prompt，避免顯示系統指令
    // 檔案內容和系統指令會在 AnySubjectSolver 中自動處理
    console.log('[Backpack] Importing file to Ask:', { fileId, taskType, file })
    importFromBackpack([file], taskType)
    toast.success(`已匯入「${file.title}」到 Ask`)

    // 🎯 根據 taskType 跳轉到對應的 tab
    const targetTab = taskType === 'summary' ? 'summary' : 'solve'
    router.push(`/ask?tab=${targetTab}`)
  }

  // 🎯 Phase 3: 多選後跳轉到重點統整
  const handleBatchSummary = () => {
    if (selectedNoteIds.size === 0) {
      toast.error('請先選擇檔案')
      return
    }

    // 獲取選中的檔案
    const selectedFiles = items.filter((f) => selectedNoteIds.has(f.id))

    if (selectedFiles.length === 0) {
      toast.error('找不到選中的檔案')
      return
    }

    console.log('[Backpack] 🚀 Importing files to Summary Tab:', selectedFiles.length, 'files')

    // 匯入到 Ask Context
    importFromBackpack(selectedFiles, 'summary')

    // 清除選擇狀態
    setIsEditMode(false)
    setSelectedNoteIds(new Set())

    toast.success(`已匯入 ${selectedFiles.length} 個檔案，跳轉到重點統整...`)

    // 🎯 跳轉到 Ask 頁面的 Summary Tab
    router.push('/ask?tab=summary')
  }



  const handleFileClick = (file: BackpackFile) => {
    trackManualOrganize() // 🎯 記錄手動整理操作，達到 3 次後自動觸發引導
    if (file.is_notebook_entry && file.content) {
      // 筆記類型：使用 NoteViewerModal
      setViewingNote(file)
      return
    }

    // 🎯 處理上傳的檔案（PDF、圖片等）
    if (file.file_url) {
      // 檢查檔案類型
      if (file.type === 'pdf' || file.type === 'image') {
        setViewingFile(file)
      } else {
        // 其他類型（如 text），嘗試在新視窗開啟
        window.open(file.file_url, '_blank')
      }
    } else {
      toast.error('檔案 URL 不存在，無法開啟')
    }
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


      {/* First Layer: Type Tabs */}
      <TypeTabs activeType={contentType} onTypeChange={handleTypeChange} />

      {/* Back Button and Action Buttons */}
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

        {/* 🎯 Phase 3: 選擇模式和編輯模式按鈕 - 合併為單一編輯按鈕 */}
        {filteredItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            data-action="batch-organize"
            onClick={() => {
              recordOperation()
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



      {/* Batch Actions Bar (when in edit mode) */}
      {isEditMode && (
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            已選擇 {contentType === 'note' ? selectedNoteIds.size : selectedErrorBookIds.size} 項
          </span>
          <div className="flex items-center gap-2">
            {contentType === 'note' && (
              <Button
                variant="default"
                size="sm"
                onClick={handleBatchSummary}
                disabled={selectedNoteIds.size === 0}
                className="h-8 px-3 text-xs"
              >
                <Sparkles className="h-3 w-3 mr-1.5" />
                統整
              </Button>
            )}
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
            {/* 🎯 上傳按鈕 - 在檔案列表視圖中也顯示（僅筆記模式） */}
            {contentType === 'note' && (
              <div className="flex justify-center pb-2">
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

            {contentType === 'note' &&
              filteredItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  onClick={() => {
                    // 🎯 選擇模式下切換選中狀態
                    if (isEditMode) {
                      const next = new Set(selectedNoteIds)
                      if (next.has(item.id)) {
                        next.delete(item.id)
                      } else {
                        next.add(item.id)
                      }
                      setSelectedNoteIds(next)
                    } else {
                      handleFileClick(item)
                    }
                  }}
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
                  // 🎯 Phase 3: 傳遞選擇模式狀態
                  isSelectMode={isEditMode}
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

            {/* 🚀 Load More Button for cursor-based pagination */}
            {contentType === 'note' && hasMore && !loading && (
              <div className="flex justify-center pt-4 pb-2">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full max-w-xs"
                >
                  {loading ? '載入中...' : '載入更多'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note Viewer Modal */}
      <NoteViewerModal
        isOpen={!!viewingNote}
        onClose={() => {
          setViewingNote(null)
          // 清除 URL 中的 noteId 參數，防止重新打開
          if (targetNoteId) {
            router.replace(`/backpack?type=${contentType}${selectedSubject ? `&subject=${selectedSubject}` : ''}`)
          }
        }}
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

      {/* 🎯 檔案查看器 Modal（PDF 和圖片） */}
      {viewingFile && (
        <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
          <DialogContent className="max-w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden bg-background/95 backdrop-blur-xl border-none shadow-2xl">
            <DialogTitle className="sr-only">{viewingFile.title}</DialogTitle>
            <DialogDescription className="sr-only">
              {viewingFile.type === 'pdf' ? 'PDF 檔案檢視器' : viewingFile.type === 'image' ? '圖片檢視器' : '檔案檢視器'}
            </DialogDescription>
            {viewingFile.type === 'pdf' && viewingFile.file_url ? (
              <BackpackReader
                fileId={viewingFile.id}
                fileUrl={
                  viewingFile.id.startsWith('preview-')
                    ? viewingFile.file_url // 🎯 本地預覽：直接使用本地 URL
                    : `/api/backpack/file-url?file_id=${viewingFile.id}` // 服務器檔案：使用 API
                }
                fileName={viewingFile.title}
                onClose={() => {
                  // 🎯 清理本地 URL（如果是預覽）
                  if (localPreviewUrl) {
                    URL.revokeObjectURL(localPreviewUrl)
                    setLocalPreviewUrl(null)
                  }
                  setViewingFile(null)
                }}
              />
            ) : viewingFile.type === 'image' && viewingFile.file_url ? (
              <div className="relative w-full h-full flex items-center justify-center bg-black/50">
                <img
                  src={viewingFile.file_url}
                  alt={viewingFile.title}
                  className="max-w-full max-h-full object-contain"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingFile(null)}
                  className="absolute top-4 right-4 bg-background/80 hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

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
                  disabled={isUploading}
                >
                  {isUploading ? '上傳中...' : '選擇檔案'}
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
                  disabled={isUploading}
                >
                  雲端連結
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
                className="w-full"
                disabled={isUploading}
              >
                取消
              </Button>
            </div>
            <input
              id="backpack-file-input"
              type="file"
              accept=".pdf,.txt,.jpg,.jpeg,.png,.gif,.doc,.docx"
              className="hidden"
              disabled={isUploading}
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

                // 🎯 頂尖優化：創建本地預覽（零延遲，立即顯示）
                const localUrl = URL.createObjectURL(file)
                setLocalPreviewUrl(localUrl)

                // 判斷檔案類型
                let fileType: 'text' | 'pdf' | 'image' = 'text'
                if (file.type.startsWith('image/')) {
                  fileType = 'image'
                } else if (file.type === 'application/pdf') {
                  fileType = 'pdf'
                } else if (file.type.startsWith('text/')) {
                  fileType = 'text'
                }

                // 如果是 PDF 或圖片，立即顯示本地預覽
                if (fileType === 'pdf' || fileType === 'image') {
                  const previewFile: BackpackFile = {
                    id: `preview-${Date.now()}`,
                    user_id: '',
                    subject: (selectedSubject || 'math') as any,
                    type: fileType,
                    title: file.name,
                    content: null,
                    file_url: localUrl, // 使用本地 URL
                    file_size: file.size,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                  setViewingFile(previewFile)
                  setShowUpload(false) // 關閉上傳面板，顯示預覽
                }

                // 🎯 實現檔案上傳功能（背景上傳）
                setIsUploading(true)
                try {
                  const formData = new FormData()
                  formData.append('file', file)
                  formData.append('subject', selectedSubject || 'math')
                  formData.append('title', file.name)

                  const response = await fetch('/api/backpack/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                  })

                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}))
                    const errorMessage = data.message || data.error || '上傳失敗'
                    throw new Error(errorMessage)
                  }

                  const result = await response.json()

                  // 上傳成功，清理本地 URL 並切換到服務器 URL
                  if (localUrl) {
                    URL.revokeObjectURL(localUrl)
                    setLocalPreviewUrl(null)
                  }

                  // 重新載入數據
                  await loadData()

                  // 如果正在預覽，更新為服務器版本
                  if (viewingFile && viewingFile.id.startsWith('preview-')) {
                    const uploadedFile = result.item
                    if (uploadedFile) {
                      setViewingFile({
                        ...uploadedFile,
                        file_url: uploadedFile.file_url,
                      })
                    }
                  }

                  toast.success('檔案上傳成功！')

                  // 記錄操作（用於引導系統）
                  recordOperation()
                } catch (err) {
                  console.error('[Backpack] Upload failed:', err)
                  const errorMessage = err instanceof Error ? err.message : '上傳失敗'
                  toast.error(errorMessage)
                  setError(errorMessage)

                  // 上傳失敗時，清理本地預覽
                  if (localUrl) {
                    URL.revokeObjectURL(localUrl)
                    setLocalPreviewUrl(null)
                  }
                  if (viewingFile && viewingFile.id.startsWith('preview-')) {
                    setViewingFile(null)
                  }
                } finally {
                  setIsUploading(false)
                  // 重置 input，允許上傳相同檔案
                  e.target.value = ''
                }
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
