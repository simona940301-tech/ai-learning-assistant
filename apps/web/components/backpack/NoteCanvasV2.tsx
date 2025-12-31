'use client'

import { useRef, useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import Image from 'next/image'

interface NoteCanvasV2Props {
  file: { id: string; kind: 'pdf' | 'image' | 'text' | 'document' } | null
}

export function NoteCanvasV2({ file }: NoteCanvasV2Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load file URL
  useEffect(() => {
    if (!file) {
      setFileUrl(null)
      return
    }

    async function loadFileUrl() {
      try {
        setLoading(true)
        setError(null)

        if (!file?.id) return
        const response = await fetch(`/api/backpack/file/${file.id}`)
        if (!response.ok) {
          throw new Error('Failed to get file URL')
        }

        const { url } = await response.json()
        setFileUrl(url)
      } catch (err) {
        console.error('[NoteCanvasV2] Failed to load file:', err)
        setError(err instanceof Error ? err.message : 'Failed to load file')
      } finally {
        setLoading(false)
      }
    }

    loadFileUrl()
  }, [file])

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-4xl mb-2">📚</div>
          <div className="text-sm">選擇一個檔案開始閱讀</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">📄</div>
          <div className="text-sm text-muted-foreground">載入檔案中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <div className="text-sm text-destructive">{error}</div>
        </div>
      </div>
    )
  }

  if (file.kind === 'image' && fileUrl) {
    return (
      <div ref={containerRef} className="h-full overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          <Image src={fileUrl} alt="Uploaded image" className="max-w-full h-auto rounded-lg shadow-lg" width={800} height={600} />
        </div>
      </div>
    )
  }

  // For other file types, show placeholder
  return (
    <div ref={containerRef} className="h-full overflow-auto p-4">
      <div className="max-w-4xl mx-auto">
        <div className="border rounded-lg p-4 bg-muted/30 min-h-[600px]">
          <div className="text-sm opacity-60 mb-4">檔案檢視器（基礎版）</div>
          <div className="text-sm">
            檔案 ID: {file.id}
            <br />
            類型: {file.kind}
          </div>
        </div>
      </div>
    </div>
  )
}
