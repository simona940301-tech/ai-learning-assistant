'use client'

import { useEffect, useState } from 'react'
import { OFFICE_DOCUMENT_MIME_TYPES, PLAIN_TEXT_LIKE_MIME_TYPES } from '@/constants/document-mime'
import { track } from '@/lib/telemetry'

interface OfficeDocumentViewerProps {
  fileId: string
  fileUrl: string
  fileName: string
  mime: string
}

export function OfficeDocumentViewer({ fileId, fileUrl, fileName, mime }: OfficeDocumentViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchSignedUrl() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(fileUrl)
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(payload.error || `Failed to load file (${response.status})`)
        }

        const { url } = await response.json()
        if (!url) {
          throw new Error('Signed URL missing in response')
        }

        if (!cancelled) {
          setSignedUrl(url)
          track('backpack.reader.docx.loaded', { fileId })
        }
      } catch (err) {
        console.error('[OfficeDocumentViewer] Failed to load file:', err)
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '無法載入文件')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchSignedUrl()
    return () => {
      cancelled = true
    }
  }, [fileUrl, fileId])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2 animate-pulse">📄</div>
          <div className="text-sm text-muted-foreground">載入文件中...</div>
        </div>
      </div>
    )
  }

  if (error || !signedUrl) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div>
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-base font-semibold">無法開啟 {fileName}</p>
          <p className="text-sm text-muted-foreground">{error || '未知錯誤'}</p>
        </div>
        <a
          className="text-primary underline"
          href={signedUrl ?? '#'}
          target="_blank"
          rel="noreferrer"
        >
          直接下載檔案
        </a>
      </div>
    )
  }

  const useOfficeViewer = OFFICE_DOCUMENT_MIME_TYPES.has(mime)
  const officeSrc = useOfficeViewer
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}&wdAr=1.3333333333333333`
    : signedUrl

  return (
    <div className="h-full w-full bg-background">
      {useOfficeViewer ? (
        <iframe
          key={officeSrc}
          src={officeSrc}
          title={fileName}
          className="h-full w-full border-0"
          allowFullScreen
        />
      ) : PLAIN_TEXT_LIKE_MIME_TYPES.has(mime) ? (
        <iframe
          key={signedUrl}
          src={signedUrl}
          title={fileName}
          className="h-full w-full border-0 bg-background"
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            無法直接預覽此檔案格式，請下載後使用對應軟體開啟。
          </p>
          <a
            className="text-primary underline"
            href={signedUrl}
            target="_blank"
            rel="noreferrer"
          >
            下載 {fileName}
          </a>
        </div>
      )}
    </div>
  )
}
