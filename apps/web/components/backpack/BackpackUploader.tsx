'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, FileText, Image as ImageIcon, File, X } from 'lucide-react'
import { track } from '@/lib/telemetry'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface BackpackUploaderProps {
  onUploadComplete?: (fileId: string) => void
}

export function BackpackUploader({ onUploadComplete }: BackpackUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = useCallback(async (files: FileList) => {
    const file = files[0]
    if (!file) return

    // 只檢查文件大小，不限制文件類型
    if (file.size > MAX_FILE_SIZE) {
      setError(`檔案太大（最大 50MB）。請選擇較小的檔案。`)
      return
    }

    setError(null)
    setUploading(true)
    track('backpack.file.upload.start', { fileName: file.name, size: file.size, mimeType: file.type })

    try {
      // Compute checksum (client-side hash for dedup)
      const checksum = await computeChecksum(file)

      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('checksum', checksum)

      const response = await fetch('/api/backpack/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: '上傳失敗' }))
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : data.error || '上傳失敗'
        throw new Error(errorMessage)
      }

      const { fileId } = await response.json()
      track('backpack.file.upload.success', { fileId, fileName: file.name })
      
      onUploadComplete?.(fileId)
      setUploading(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : '上傳失敗'
      setError(message)
      setUploading(false)
      track('backpack.file.upload.fail', { error: message })
    }
  }, [onUploadComplete])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }, [handleFileSelect])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files)
    }
  }, [handleFileSelect])

  return (
    <Card
      className={`border-2 border-dashed transition-colors ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      } ${uploading ? 'opacity-50' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold">上傳教材</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          拖放檔案或點擊選擇
          <br />
          支援所有檔案格式（最大 50MB）
        </p>
        <Button
          onClick={() => document.getElementById('file-input')?.click()}
          disabled={uploading}
          variant="outline"
        >
          {uploading ? '上傳中...' : '選擇檔案'}
        </Button>
        <input
          id="file-input"
          type="file"
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
        />
        {error && (
          <div className="mt-4 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Compute SHA-256 checksum for file deduplication
 * Uses crypto.subtle.digest for cryptographically secure hash
 * Samples first/last 1MB for performance on large files
 */
async function computeChecksum(file: File): Promise<string> {
  const chunkSize = 1024 * 1024 // 1MB
  const firstChunk = await file.slice(0, chunkSize).arrayBuffer()
  const lastChunk = await file.slice(Math.max(0, file.size - chunkSize)).arrayBuffer()

  // Combine chunks for hashing
  const combined = new Uint8Array(firstChunk.byteLength + lastChunk.byteLength)
  combined.set(new Uint8Array(firstChunk), 0)
  combined.set(new Uint8Array(lastChunk), firstChunk.byteLength)

  // Use SHA-256 for cryptographically secure hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', combined)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  // Return format: size-sha256hash (pure ASCII, safe for paths)
  return `${file.size}-${hashHex}`
}
