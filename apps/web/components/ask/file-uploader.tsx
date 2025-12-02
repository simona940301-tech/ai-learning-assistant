'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, FileText, Image as ImageIcon, File } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAsk } from '@/lib/ask-context'
import { AttachedFile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/Toast'

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/gif']
const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.gif']

export function FileUploader({ className }: { className?: string }) {
  const { attachedFiles, addFiles, removeFile } = useAsk()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `檔案「${file.name}」過大（${(file.size / 1024 / 1024).toFixed(1)} MB），請上傳小於 10 MB 的檔案`
    }

    // Check file type
    const isValidType = ALLOWED_TYPES.includes(file.type) ||
      ALLOWED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!isValidType) {
      return `不支援的檔案類型「${file.name}」，僅支援 PDF、文字檔、圖片`
    }

    return null
  }, [])

  const handleFileSelect = useCallback((files: FileList) => {
    const validFiles: AttachedFile[] = []
    const errors: string[] = []

    Array.from(files).forEach((file, index) => {
      const error = validateFile(file)

      if (error) {
        errors.push(error)
      } else {
        validFiles.push({
          id: `${Date.now()}-${index}`,
          name: file.name,
          type: getFileType(file.type),
          url: URL.createObjectURL(file),
          size: file.size,
        })
      }
    })

    // Show errors
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error, 5000))
    }

    // Add valid files
    if (validFiles.length > 0) {
      addFiles(validFiles)
      toast.success(`成功添加 ${validFiles.length} 個檔案`, 3000)
    }
  }, [addFiles, validateFile])

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
    <div className={cn("space-y-6", className)}>
      {/* 拖放區域 - Hero Mode */}
      <div
        className={cn(
          "relative group cursor-pointer rounded-[32px] transition-all duration-300 ease-out",
          "min-h-[140px] flex flex-col items-center justify-center text-center p-8",
          "border-[1.5px] border-dashed",
          isDragOver
            ? "border-[rgba(140,107,74,0.4)] bg-primary/5 scale-[1.02]"
            : "border-[rgba(140,107,74,0.28)] bg-[#FFFDF8] hover:border-[rgba(140,107,74,0.4)] hover:bg-[#FFFDF8]"
        )}
        style={{
          borderColor: isDragOver ? 'rgba(140, 107, 74, 0.4)' : 'rgba(140, 107, 74, 0.28)'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="space-y-4">
          <div className={cn(
            "mx-auto h-16 w-16 rounded-full flex items-center justify-center transition-colors",
            isDragOver ? "bg-primary/20" : "bg-secondary/20 group-hover:bg-primary/10"
          )}>
            <Upload 
              className={cn(
                "h-8 w-8 transition-colors",
                isDragOver ? "text-primary" : "text-[#8C6B4A] group-hover:text-primary"
              )}
              strokeWidth={1.5}
            />
          </div>

          <div className="space-y-1">
            <p className="text-lg font-medium text-foreground/80">
              拖曳檔案至此處，或點擊選擇
            </p>
            <p className="text-sm text-muted-foreground">
              支援 PDF、文字檔、圖片
            </p>
          </div>
        </div>

        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.txt,.jpg,.jpeg,.png,.gif"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {/* 已上傳檔案列表 */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid gap-3"
          >
            {attachedFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-secondary/10"
              >
                {/* File Icon with Color Coding */}
                <div className={cn(
                  "h-12 w-12 rounded-xl flex items-center justify-center border border-border",
                  file.type === 'pdf' && "bg-red-500/10 text-red-500",
                  file.type === 'text' && "bg-blue-500/10 text-blue-500",
                  file.type === 'image' && "bg-purple-500/10 text-purple-500"
                )}>
                  {file.type === 'pdf' && <File className="h-6 w-6" />}
                  {file.type === 'text' && <FileText className="h-6 w-6" />}
                  {file.type === 'image' && <ImageIcon className="h-6 w-6" />}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  <p className="text-base font-medium text-foreground truncate">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{(file.size ? file.size / 1024 : 0).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.id)
                  }}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getFileType(mimeType: string): 'text' | 'pdf' | 'image' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('text/')) return 'text'
  return 'text' // 預設為文字檔
}