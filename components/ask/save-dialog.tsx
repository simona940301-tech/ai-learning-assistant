'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Save, AlertCircle } from 'lucide-react'
import { AskResult, Subject } from '@/lib/types'

export interface SaveData {
  mode: 'save' | 'overwrite'
  subject: Subject
  title: string
  tags: string[]
  content: string
  derivedFrom?: string[]
  originalFileId?: string
}

interface SaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  result: AskResult
  mode: 'save' | 'overwrite'
  onSave: (data: SaveData) => Promise<void>
}

const subjects: { id: Subject; name: string }[] = [
  { id: 'chinese', name: '國文' },
  { id: 'english', name: '英文' },
  { id: 'social', name: '社會' },
  { id: 'science', name: '自然' },
  { id: 'math', name: '數學' },
]

export function SaveDialog({ open, onOpenChange, result, mode, onSave }: SaveDialogProps) {
  const [subject, setSubject] = useState<Subject>('chinese')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return

    // 編輯完成模式需要二次確認
    if (mode === 'overwrite' && !showConfirm) {
      setShowConfirm(true)
      return
    }

    if (mode === 'overwrite' && confirmText !== '編輯') {
      return
    }

    setIsLoading(true)
    try {
      await onSave({
        mode,
        subject,
        title: title.trim(),
        tags,
        content: result.content,
        derivedFrom: result.attachments.map((a) => a.id),
        originalFileId: result.attachments[0]?.id,
      })
      onOpenChange(false)
      // 重置表單
      setTitle('')
      setTags([])
      setTagInput('')
      setConfirmText('')
      setShowConfirm(false)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {mode === 'save' ? '另存至書包' : '編輯完成'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 編輯完成二次確認 */}
          {mode === 'overwrite' && showConfirm && (
            <Card className="p-4 border-yellow-500/50 bg-yellow-500/10">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-[16px] font-medium text-yellow-800 dark:text-yellow-200">
                      確認編輯完成
                    </p>
                    <p className="text-[13px] text-yellow-700 dark:text-yellow-300 mt-1" style={{ lineHeight: 1.6 }}>
                      此操作將更新「{result.attachments[0]?.name || '原檔案'}」<br />
                      舊版本會保留在版本史中
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-[13px] font-medium text-yellow-800 dark:text-yellow-200 mb-2 block">
                    請輸入「編輯」以確認
                  </label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="輸入：編輯"
                    className="border-yellow-500/50"
                  />
                </div>
              </div>
            </Card>
          )}
          {/* 科目選擇 */}
          <div>
            <label className="text-sm font-medium mb-2 block">科目</label>
            <div className="grid grid-cols-3 gap-2">
              {subjects.map((subj) => (
                <button
                  key={subj.id}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    subject === subj.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  onClick={() => setSubject(subj.id)}
                >
                  {subj.name}
                </button>
              ))}
            </div>
          </div>

          {/* 標題 */}
          <div>
            <label className="text-sm font-medium mb-2 block">標題</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="輸入檔案標題..."
              className="w-full"
            />
          </div>

          {/* 標籤 */}
          <div>
            <label className="text-sm font-medium mb-2 block">標籤</label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="新增標籤..."
                  className="flex-1"
                />
                <Button size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                  新增
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-primary/60 hover:text-primary"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 派生關聯顯示 */}
          {result.attachments.length > 0 && mode === 'save' && (
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-[13px] font-medium text-[#8A8A8A] mb-2">派生自：</div>
              <div className="space-y-1">
                {result.attachments.map((file) => (
                  <div key={file.id} className="text-[13px]" style={{ lineHeight: 1.6 }}>
                    • {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false)
                setShowConfirm(false)
                setConfirmText('')
              }}
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!title.trim() || isLoading || (mode === 'overwrite' && showConfirm && confirmText !== '編輯')}
            >
              {isLoading ? '處理中...' : mode === 'save' ? '另存' : showConfirm ? '確認編輯完成' : '編輯完成'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}