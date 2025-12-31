import type { AttachedFile } from '@/lib/types'

const MAX_INLINE_CHARS = 8000

function sanitizeContent(text: string): string {
  return text.replace(/\0/g, '').trim().slice(0, MAX_INLINE_CHARS)
}

function describeImage(file: AttachedFile, dataUrl: string): string {
  const sizeKb = file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'unknown size'
  const preview = dataUrl.slice(0, MAX_INLINE_CHARS)
  return [`【Image Attachment】${file.name}`, `Size: ${sizeKb}`, preview].join('\n')
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read attachment blob'))
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.readAsDataURL(blob)
  })
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to load attachment from ${url}`)
  }
  return response.blob()
}

export async function inlineAttachmentContent(files: AttachedFile[]): Promise<AttachedFile[]> {
  return Promise.all(
    files.map(async (file) => {
      if (!file.url || file.content || !file.url.startsWith('blob:')) {
        return file
      }

      try {
        const blob = await fetchBlob(file.url)
        if (file.type === 'image') {
          const dataUrl = await blobToDataUrl(blob)
          return { ...file, content: describeImage(file, dataUrl) }
        }

        const text = await blob.text()
        return { ...file, content: sanitizeContent(text) }
      } catch (error) {
        console.warn('[inlineAttachmentContent] Fallback to metadata only', file.name, error)
        return file
      }
    })
  )
}
