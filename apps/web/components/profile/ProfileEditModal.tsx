'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Loader2, Image as ImageIcon, Sparkles, Grid3x3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AvatarSelector } from '@/components/avatar/AvatarSelector'
import { getAvatarPreset, type AvatarPreset } from '@/lib/avatar/presets'
import { supabaseBrowserClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface ProfileEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAvatar?: string
  userName: string
  onAvatarUpdate?: (avatarUrl: string) => void
}

export function ProfileEditModal({
  open,
  onOpenChange,
  currentAvatar,
  userName,
  onAvatarUpdate,
}: ProfileEditModalProps) {
  const { user } = useAuth()
  const [mode, setMode] = useState<'preset' | 'upload'>('preset')
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentAvatar || null)
  const [selectedPreset, setSelectedPreset] = useState<AvatarPreset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const readerRef = useRef<FileReader | null>(null)

  // Sync preview with currentAvatar when modal opens or currentAvatar changes
  useEffect(() => {
    if (open) {
      setPreview(currentAvatar || null)
      setError(null)
    }
  }, [open, currentAvatar])

  // Cleanup FileReader on unmount
  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.abort()
        readerRef.current = null
      }
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('請選擇圖片檔案')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('圖片大小不能超過 10MB')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setError(null)

    // Cleanup previous reader if exists
    if (readerRef.current) {
      try {
        readerRef.current.abort()
      } catch (err) {
        // Ignore abort errors
      }
      readerRef.current = null
    }

    // Create new FileReader with proper error handling
    const reader = new FileReader()
    readerRef.current = reader

    reader.onloadend = () => {
      if (reader.result && typeof reader.result === 'string') {
        setPreview(reader.result)
      } else {
        setError('無法讀取圖片，請重新選擇')
      }
      readerRef.current = null
    }

    reader.onerror = () => {
      setError('讀取圖片時發生錯誤，請重新選擇')
      readerRef.current = null
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    reader.onabort = () => {
      // User cancelled or component unmounted
      readerRef.current = null
    }

    try {
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('[ProfileEditModal] FileReader error:', err)
      setError('無法讀取圖片，請確認檔案格式正確')
      readerRef.current = null
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [])

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) {
      setError('請先選擇照片')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('photo', file)

      const response = await fetch('/api/profile/upload-avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || '上傳失敗')
      }

      // Update preview with new avatar URL
      if (data.avatarUrl) {
        setPreview(data.avatarUrl)
        onAvatarUpdate?.(data.avatarUrl)
      }

      // Close modal after successful upload
      setTimeout(() => {
        onOpenChange(false)
        setUploading(false)
      }, 1500)
    } catch (err) {
      console.error('[ProfileEditModal] Upload error:', err)
      setError(err instanceof Error ? err.message : '上傳失敗，請稍後再試')
      setUploading(false)
    }
  }

  const handleCancel = useCallback(() => {
    // Cleanup FileReader if active
    if (readerRef.current) {
      try {
        readerRef.current.abort()
      } catch (err) {
        // Ignore abort errors
      }
      readerRef.current = null
    }

    // Reset preview to original
    setPreview(currentAvatar || null)
    setError(null)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    onOpenChange(false)
  }, [currentAvatar, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>編輯頭像</DialogTitle>
          <DialogDescription>
            上傳你的照片，我們會幫你轉換成像素藝術頭像
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Preview */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage 
                  src={preview || undefined} 
                  alt={userName}
                />
                <AvatarFallback className="text-4xl">{userName[0]}</AvatarFallback>
              </Avatar>
              {uploading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </motion.div>
              )}
            </div>

            {uploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span>正在生成像素藝術頭像...</span>
              </motion.div>
            )}
          </div>

          {/* File Input */}
          <div className="space-y-2">
            <label className="block">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                選擇照片
              </Button>
            </label>
            <p className="text-xs text-muted-foreground text-center">
              支援 JPG、PNG 格式，最大 10MB
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Box */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1 space-y-1 text-sm">
                <p className="font-medium text-foreground">像素藝術頭像</p>
                <p className="text-muted-foreground">
                  上傳照片後，我們會使用 AI 將你的照片轉換成經典 JRPG 風格的像素藝術頭像，這將成為你在對戰中顯示的頭像。
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={uploading}
            >
              取消
            </Button>
            <Button
              className="flex-1"
              onClick={handleUpload}
              disabled={uploading || !preview || preview === currentAvatar}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  處理中...
                </>
              ) : (
                '確認上傳'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

