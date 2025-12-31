'use client'

import {
  ClipboardEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Image, Loader2, Paperclip, Plus, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { track } from '@plms/shared/analytics'

const MAX_IMAGE_COUNT = 1 // 限制只能上传1张图片
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])
const ACCEPTED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif'])
const SEND_THROTTLE_MS = 700

type UploadSource = 'file' | 'camera' | 'paste' | 'drag'

type UploadState = {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  message?: string
  errorCode?: string
  source?: UploadSource
  fileName?: string
}

type ImagePreview = {
  file: File
  url: string
  ocrText?: string
  isProcessing: boolean
}

const DEFAULT_UPLOAD_STATE: UploadState = { status: 'idle', progress: 0 }

const processImageToText = async (
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> => {
  // Convert image to base64 data URL
  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  try {
    // Step 1: Convert to base64 (20%)
    onProgress?.(20)
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError')
    }

    const base64Image = await toBase64(file)

    // Step 2: Call OCR API (45%)
    onProgress?.(45)
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError')
    }

    const response = await fetch('/api/ai/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image,
      }),
      signal,
    })

    // Step 3: Process response (70%)
    onProgress?.(70)
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'OCR failed' }))
      throw new Error(error.message || `OCR failed with status ${response.status}`)
    }

    const data = await response.json()

    // Step 4: Complete (100%)
    onProgress?.(100)

    if (!data.text) {
      throw new Error('OCR returned empty text')
    }

    return data.text
  } catch (error) {
    if ((error as DOMException).name === 'AbortError') {
      throw error
    }
    console.error('[InputDock] OCR processing failed:', error)
    throw new Error(
      error instanceof Error ? error.message : 'IMAGE_PROCESS_FAILED'
    )
  }
}

const getFileExtension = (name: string) => name.split('.').pop()?.toLowerCase() ?? ''
const getNetworkState = () => (typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online')

async function normalizeImageFile(file: File, signal?: AbortSignal): Promise<File> {
  const mime = file.type.toLowerCase()
  const ext = getFileExtension(file.name)
  const needsConversion = mime === 'image/heic' || mime === 'image/heif'
  const shouldFixOrientation = needsConversion || mime === 'image/jpeg'

  if (!(needsConversion || shouldFixOrientation) || typeof createImageBitmap !== 'function') {
    return file
  }

  const blob = needsConversion ? file : file.slice(0, file.size, mime)

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch (error) {
    console.warn('[InputDock] createImageBitmap failed, fallback to original file', error)
    return file
  }

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError')
  }

  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return file
  }
  ctx.drawImage(bitmap, 0, 0)

  const outputType = needsConversion ? 'image/jpeg' : mime
  const outputExt = needsConversion ? 'jpg' : ext || 'jpg'

  const convertedBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('IMAGE_PROCESS_FAILED'))
        } else {
          resolve(result)
        }
      },
      outputType,
      0.92
    )
  })

  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError')
  }

  const normalizedName = file.name.replace(/\.[^.]+$/, `.${outputExt}`)
  return new File([convertedBlob], normalizedName, { type: outputType })
}

interface InputDockProps {
  mode: 'single' | 'batch'
  value: string
  isBusy: boolean
  ocrStatus: { type: 'success' | 'error'; message: string } | null
  onChange: (value: string) => void
  onSubmit: (value: string) => Promise<void>
  onOcrComplete: (status: { type: 'success' | 'error'; message: string } | null) => void
  placeholder?: string
}

const InputDockComponent = ({ mode, value, isBusy, ocrStatus, onChange, onSubmit, onOcrComplete, placeholder }: InputDockProps) => {
  const { t } = useTranslation()
  const [uploadState, setUploadState] = useState<UploadState>(DEFAULT_UPLOAD_STATE)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const [spacerHeight, setSpacerHeight] = useState<number>(() => {
    if (typeof document === 'undefined') return 56
    const computed = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--ask-input-dock-height'),
      10
    )
    return Number.isFinite(computed) && computed > 0 ? computed : 56
  })
  // 初始值設為 true 以避免 hydration 錯誤（服務端和客戶端一致）
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSend, setPendingSend] = useState(false)
  const compositionRef = useRef(false)
  const lastSubmitRef = useRef(0)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const dockRef = useRef<HTMLFormElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const dockPlaceholder = useMemo(() => {
    if (placeholder) return placeholder
    return mode === 'single' ? t('ask.input.placeholderSingle') : t('ask.input.placeholderBatch')
  }, [mode, placeholder, t])

  useEffect(() => {
    // 只在客戶端執行，設置實際的網路狀態
    if (typeof window === 'undefined') return
    // 初始化網路狀態
    setIsOnline(getNetworkState() === 'online')
    const updateOnline = () => setIsOnline(getNetworkState() === 'online')
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return

    const viewport = window.visualViewport
    const handleViewport = () => {
      const offset = Math.max(0, window.innerHeight - (viewport.height + viewport.offsetTop))
      setKeyboardOffset(offset)
    }

    handleViewport()
    viewport.addEventListener('resize', handleViewport)
    viewport.addEventListener('scroll', handleViewport)
    return () => {
      viewport.removeEventListener('resize', handleViewport)
      viewport.removeEventListener('scroll', handleViewport)
    }
  }, [])

  // 🎯 自動調整 textarea 高度 (ChatGPT 風格)
  useEffect(() => {
    const textarea = textAreaRef.current
    if (!textarea) return

    const adjustHeight = () => {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 72) // 最多 3 行 (72px)
      textarea.style.height = `${newHeight}px`
    }

    adjustHeight()
  }, [value])

  useEffect(() => {
    const node = dockRef.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const height = Math.ceil(entry.contentRect.height + 12)
      document.documentElement.style.setProperty('--ask-input-dock-height', `${height}px`)
      setSpacerHeight(height)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const validateImageFile = (file: File): { code: string; message: string } | null => {
    const mime = file.type.toLowerCase()
    const ext = getFileExtension(file.name)

    // MIME type validation
    if (!mime || (!ACCEPTED_MIME.has(mime) && !ACCEPTED_EXT.has(ext))) {
      return {
        code: 'file_type',
        message: t('ask.input.error.fileType', {
          default: '不支援的檔案格式。請上傳 JPG、PNG、WEBP、GIF 或 HEIC 格式的圖片。'
        })
      }
    }

    // Extension validation (double-check)
    if (!ACCEPTED_EXT.has(ext) && !ACCEPTED_MIME.has(mime)) {
      return {
        code: 'file_type',
        message: t('ask.input.error.fileType', {
          default: '不支援的檔案格式。請上傳 JPG、PNG、WEBP、GIF 或 HEIC 格式的圖片。'
        })
      }
    }

    // File size validation
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = Math.round(MAX_IMAGE_SIZE / (1024 * 1024))
      return {
        code: 'file_size',
        message: t('ask.input.error.fileSize', {
          default: `檔案大小超過上限（${sizeMB}MB）。請選擇較小的圖片。`
        })
      }
    }

    // Check if already uploading (limit to 1 image)
    if (uploadState.status === 'uploading') {
      return {
        code: 'upload_in_progress',
        message: t('ask.input.error.uploadInProgress', {
          default: '已有圖片正在上傳中，請等待完成後再試。'
        })
      }
    }

    return null
  }

  const emitUploadEvent = (event: 'start' | 'success' | 'fail' | 'cancel', meta: Record<string, any>) => {
    const eventNameMap = {
      start: 'ask.input.upload.start',
      success: 'ask.input.upload.success',
      fail: 'ask.input.upload.fail',
      cancel: 'ask.input.upload.cancel',
    } as const

    track(eventNameMap[event], {
      network_state: getNetworkState(),
      ...meta,
    })
  }

  const handleNormalizedText = useCallback(
    (text: string) => {
      onChange(value ? `${value}\n\n${text}` : text)
      onOcrComplete({ type: 'success', message: t('ask.input.status.uploadComplete') })
      setUploadState({
        status: 'success',
        progress: 100,
        message: t('ask.input.status.uploadComplete'),
      })
    },
    [onChange, onOcrComplete, t, value]
  )

  const handleImageFile = useCallback(
    async (file: File, source: UploadSource) => {
      const validation = validateImageFile(file)
      if (validation) {
        setUploadState({ status: 'error', progress: 0, message: validation.message, errorCode: validation.code })
        onOcrComplete({ type: 'error', message: validation.message })
        emitUploadEvent('fail', { error_code: validation.code, file_name: file.name, file_size: file.size, source })
        return
      }

      emitUploadEvent('start', { file_name: file.name, file_size: file.size, source })

      // Create image preview and convert to base64 for AI
      const previewUrl = URL.createObjectURL(file)

      // Convert to base64 for sending to AI
      const toBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      }

      try {
        const base64Image = await toBase64(file)

        setImagePreview({
          file,
          url: previewUrl,
          ocrText: base64Image, // Store base64 for later submission
          isProcessing: false,
        })

        setUploadState({ status: 'success', progress: 100, message: '圖片已準備好' })
        onOcrComplete({ type: 'success', message: '圖片已上傳，點擊送出進行解題' })
        emitUploadEvent('success', { file_name: file.name, file_size: file.size, source })
      } catch (error) {
        console.error('[InputDock] Image processing failed:', error)
        setImagePreview(null)
        const message = '圖片處理失敗'
        setUploadState({ status: 'error', progress: 0, message })
        onOcrComplete({ type: 'error', message })
        emitUploadEvent('fail', {
          error_code: 'image_process_failed',
          file_name: file.name,
          file_size: file.size,
          source,
        })
      }
    },
    [onOcrComplete]
  )

  const handleSubmit = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault()
      if (pendingSend || isBusy || uploadState.status === 'uploading') return

      // Check if we have an image with base64 data
      const hasImage = imagePreview && imagePreview.ocrText
      const trimmed = value.trim()

      if (!trimmed && !hasImage) return

      const now = Date.now()
      if (now - lastSubmitRef.current < SEND_THROTTLE_MS) return
      lastSubmitRef.current = now

      if (!isOnline) {
        onOcrComplete({ type: 'error', message: t('ask.input.status.offline') })
        return
      }

      setPendingSend(true)

      try {
        // If we have an image, send it directly to AI (no OCR step!)
        if (hasImage && imagePreview.ocrText) {
          await onSubmit(imagePreview.ocrText) // Send base64 image
          // Clean up image preview after submission
          URL.revokeObjectURL(imagePreview.url)
          setImagePreview(null)
        } else {
          await onSubmit(trimmed)
        }

        onChange('')
        track('ask.input.send', {
          status: 'success',
          length: hasImage ? 'image' : trimmed.length,
          hasImage,
          network_state: getNetworkState(),
        })
      } catch (error) {
        console.error('[InputDock] submit.error', error)
        track('ask.input.send', {
          status: 'error',
          error: (error as Error)?.message ?? 'unknown',
          length: hasImage ? 'image' : trimmed.length,
          hasImage,
          network_state: getNetworkState(),
        })
      } finally {
        setPendingSend(false)
      }
    },
    [isBusy, isOnline, onChange, onOcrComplete, onSubmit, pendingSend, t, uploadState.status, value, imagePreview]
  )

  const handleKeyDown = useCallback(
    async (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !compositionRef.current) {
        event.preventDefault()
        await handleSubmit()
      }
    },
    [handleSubmit]
  )

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = event.clipboardData?.items
      if (!items) return

      const imageFiles: File[] = []
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            imageFiles.push(file)
          }
        }
      }

      if (imageFiles.length > 0) {
        event.preventDefault()

        // Limit to 1 file
        if (imageFiles.length > 1) {
          onOcrComplete({
            type: 'error',
            message: t('ask.input.error.multipleFiles', {
              default: '一次只能貼上一張圖片。請選擇一張圖片後再試。'
            })
          })
          emitUploadEvent('fail', {
            error_code: 'multiple_files',
            file_count: imageFiles.length,
            source: 'paste'
          })
          return
        }

        const file = imageFiles[0]
        track('ask.input.paste.image', {
          file_name: file.name,
          file_size: file.size,
          network_state: getNetworkState(),
        })
        handleImageFile(file, 'paste')
      }
    },
    [handleImageFile, onOcrComplete, t]
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isDragActive) {
      setIsDragActive(true)
    }
  }, [isDragActive])

  const handleDragLeave = useCallback(() => {
    if (isDragActive) {
      setIsDragActive(false)
    }
  }, [isDragActive])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLFormElement>) => {
      event.preventDefault()
      setIsDragActive(false)
      const files = Array.from(event.dataTransfer?.files ?? [])

      // Limit to 1 file
      const file = files[0]
      if (files.length > 1) {
        onOcrComplete({
          type: 'error',
          message: t('ask.input.error.multipleFiles', {
            default: '一次只能上傳一張圖片。請選擇一張圖片後再試。'
          })
        })
        emitUploadEvent('fail', {
          error_code: 'multiple_files',
          file_count: files.length
        })
        return
      }

      if (file) {
        handleImageFile(file, 'drag')
      }
    },
    [handleImageFile, onOcrComplete, t]
  )

  const handleRemoveImage = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview.url)
      setImagePreview(null)
      onChange('')
    }
  }, [imagePreview, onChange])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview.url)
      }
    }
  }, [imagePreview])

  return (
    <div className="px-4 py-3">
      {/* 🎯 圖片預覽 - 小縮圖無邊框 */}
      <AnimatePresence>
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mb-2 inline-block"
          >
            <div className="relative inline-block">
              <img
                src={imagePreview.url}
                alt="Preview"
                className="h-12 w-12 rounded-lg object-cover shadow-sm"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md transition-transform hover:scale-110"
                aria-label="移除圖片"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form
        ref={dockRef}
        role="toolbar"
        aria-label={t('ask.input.toolbarLabel')}
        onSubmit={handleSubmit}
        className={cn(
          'flex items-end gap-2 rounded-2xl border border-secondary/20 bg-card/95 px-3 py-2 shadow-lg backdrop-blur transition-all',
          {
            'ring-2 ring-primary/40': isFocused,
            'ring-2 ring-primary/60': isDragActive,
          }
        )}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Direct file picker button (no menu) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            console.log('[InputDock] Plus button clicked, triggering file input')
            fileInputRef.current?.click()
          }}
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-primary transition-all hover:bg-secondary/80 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
          aria-label={t('ask.input.action.uploadFile')}
        >
          <Plus className="h-4 w-4" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
          className="hidden"
          multiple={false}
          onChange={(event) => {
            console.log('[InputDock] File input changed:', event.target.files?.[0]?.name)
            const file = event.target.files?.[0]
            if (file) {
              handleImageFile(file, 'file')
            }
            event.target.value = ''
          }}
          aria-label={t('ask.input.action.uploadFile', { default: '選擇檔案上傳' })}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          multiple={false}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              handleImageFile(file, 'camera')
            }
            event.target.value = ''
          }}
          aria-label={t('ask.input.action.uploadPhoto', { default: '拍照上傳' })}
        />

        {/* 🎯 ChatGPT 風格 Textarea: 1行起，最多3行，可滾動 */}
        <textarea
          ref={textAreaRef}
          value={value}
          placeholder={dockPlaceholder}
          onCompositionStart={() => {
            compositionRef.current = true
          }}
          onCompositionUpdate={() => {
            compositionRef.current = true
          }}
          onCompositionEnd={() => {
            compositionRef.current = false
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          rows={1}
          className="flex-1 resize-none overflow-y-auto border-0 bg-transparent py-1 text-base leading-6 text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ 
            minHeight: '24px',
            maxHeight: '72px' // 3 lines × 24px
          }}
          aria-label={dockPlaceholder}
          aria-multiline="true"
        />

        <button
          type="submit"
          disabled={isBusy || pendingSend || uploadState.status === 'uploading'}
          className={cn(
            'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            (isBusy || pendingSend || uploadState.status === 'uploading') && 'opacity-60'
          )}
          aria-label={t('ask.input.sendLabel')}
          aria-busy={pendingSend || isBusy}
        >
          {isBusy || pendingSend ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </motion.form>
    </div>
  )
}

// 🎯 使用 memo 包裝，避免不必要的重新渲染
const InputDock = memo(InputDockComponent, (prevProps, nextProps) => {
  // 只有這些 props 改變時才重新渲染
  return (
    prevProps.value === nextProps.value &&
    prevProps.isBusy === nextProps.isBusy &&
    prevProps.ocrStatus === nextProps.ocrStatus &&
    prevProps.placeholder === nextProps.placeholder &&
    prevProps.mode === nextProps.mode
  )
})

InputDock.displayName = 'InputDock'

export default InputDock
