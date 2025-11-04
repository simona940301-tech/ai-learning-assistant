'use client'

import {
  ClipboardEvent,
  DragEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Image, Loader2, Paperclip, Plus, Send, WifiOff } from 'lucide-react'
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

const DEFAULT_UPLOAD_STATE: UploadState = { status: 'idle', progress: 0 }

const processImageToText = async (
  file: File,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<string> => {
  const steps = [20, 45, 70, 100]
  for (const step of steps) {
    if (signal?.aborted) {
      throw new DOMException('Upload cancelled', 'AbortError')
    }
    await new Promise((resolve) => setTimeout(resolve, 220))
    onProgress?.(step)
  }
  if (signal?.aborted) {
    throw new DOMException('Upload cancelled', 'AbortError')
  }
  return `【圖片擷取】${file.name}\nThe book, ___ I bought yesterday, is fascinating.\n(A) who\n(B) which\n(C) whom\n(D) whose`
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
}

const InputDock = ({ mode, value, isBusy, ocrStatus, onChange, onSubmit, onOcrComplete }: InputDockProps) => {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>(DEFAULT_UPLOAD_STATE)
  const [isDragActive, setIsDragActive] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const [spacerHeight, setSpacerHeight] = useState<number>(() => {
    if (typeof document === 'undefined') return 112
    const computed = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--ask-input-dock-height'),
      10
    )
    return Number.isFinite(computed) && computed > 0 ? computed : 112
  })
  const [isOnline, setIsOnline] = useState(() => getNetworkState() === 'online')
  const [pendingSend, setPendingSend] = useState(false)
  const compositionRef = useRef(false)
  const lastSubmitRef = useRef(0)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const dockRef = useRef<HTMLFormElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  const placeholder = useMemo(() => {
    return mode === 'single' ? t('ask.input.placeholderSingle') : t('ask.input.placeholderBatch')
  }, [mode, t])

  useEffect(() => {
    if (typeof window === 'undefined') return
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

  useEffect(() => {
    const node = dockRef.current
    if (!node || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const height = Math.ceil(entry.contentRect.height + 24)
      document.documentElement.style.setProperty('--ask-input-dock-height', `${height}px`)
      setSpacerHeight(height)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const resetUploadState = useCallback(() => {
    setUploadState(DEFAULT_UPLOAD_STATE)
    uploadAbortRef.current = null
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
      onOcrComplete(null)

      const controller = new AbortController()
      uploadAbortRef.current = controller

      setUploadState({
        status: 'uploading',
        progress: 10,
        message: t('ask.input.status.uploading'),
        source,
        fileName: file.name,
      })

      try {
        const normalized = await normalizeImageFile(file, controller.signal)
        const text = await processImageToText(
          normalized,
          (progress) => {
            setUploadState((prev) => ({
              ...prev,
              status: 'uploading',
              progress: Math.max(prev.progress, progress),
            }))
          },
          controller.signal
        )

        handleNormalizedText(text)
        emitUploadEvent('success', {
          file_name: normalized.name,
          file_size: normalized.size,
          source,
        })
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          setUploadState({
            status: 'idle',
            progress: 0,
            message: t('ask.input.status.uploadCanceled'),
          })
          onOcrComplete({ type: 'error', message: t('ask.input.status.uploadCanceled') })
          emitUploadEvent('cancel', { file_name: file.name })
        } else {
          console.error('[InputDock] OCR upload failed', error)
          const message = (error as Error)?.message === 'IMAGE_PROCESS_FAILED'
            ? t('ask.input.error.heicFallback')
            : t('ask.input.error.unknown')
          setUploadState({ status: 'error', progress: 0, message })
          onOcrComplete({ type: 'error', message })
          emitUploadEvent('fail', {
            error_code: (error as Error)?.message || 'unknown',
            file_name: file.name,
            file_size: file.size,
            source,
          })
        }
      } finally {
        if (uploadAbortRef.current === controller) {
          uploadAbortRef.current = null
        }
      }
    },
    [handleNormalizedText, onOcrComplete, t]
  )

  const handleSubmit = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault()
      if (pendingSend || isBusy || uploadState.status === 'uploading') return

      const trimmed = value.trim()
      if (!trimmed) return

      const now = Date.now()
      if (now - lastSubmitRef.current < SEND_THROTTLE_MS) return
      lastSubmitRef.current = now

      if (!isOnline) {
        onOcrComplete({ type: 'error', message: t('ask.input.status.offline') })
        return
      }

      setPendingSend(true)

      try {
        await onSubmit(trimmed)
        onChange('')
        track('ask.input.send', {
          status: 'success',
          length: trimmed.length,
          network_state: getNetworkState(),
        })
      } catch (error) {
        console.error('[InputDock] submit.error', error)
        track('ask.input.send', {
          status: 'error',
          error: (error as Error)?.message ?? 'unknown',
          length: trimmed.length,
          network_state: getNetworkState(),
        })
      } finally {
        setPendingSend(false)
      }
    },
    [isBusy, isOnline, onChange, onOcrComplete, onSubmit, pendingSend, t, uploadState.status, value]
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

  const handleMenuFilePick = (file: File | null, source: UploadSource) => {
    setMenuOpen(false)
    if (file) {
      handleImageFile(file, source)
    }
  }

  const cancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort()
    }
    onOcrComplete({ type: 'error', message: t('ask.input.status.uploadCanceled') })
    setUploadState({ status: 'idle', progress: 0, message: t('ask.input.status.uploadCanceled') })
  }

  const statusText = useMemo(() => {
    if (uploadState.status === 'uploading') {
      return `${t('ask.input.status.uploading')}… ${Math.min(uploadState.progress, 99)}%`
    }
    if (!isOnline) {
      return t('ask.input.status.offline')
    }
    if (uploadState.status === 'success') {
      return uploadState.message
    }
    if (uploadState.status === 'error') {
      return uploadState.message
    }
    if (ocrStatus) {
      return ocrStatus.message
    }
    return t('ask.input.status.hint')
  }, [isOnline, ocrStatus, t, uploadState])

  return (
    <>
      <div className="input-dock-spacer" aria-hidden style={{ height: spacerHeight + keyboardOffset }} />
      <div className="input-dock-shell" style={{ bottom: keyboardOffset }}>
        <motion.form
          ref={dockRef}
          role="toolbar"
          aria-label={t('ask.input.toolbarLabel')}
          onSubmit={handleSubmit}
          className={cn('input-dock-surface', {
            'is-focused': isFocused,
            'input-dock-dragging': isDragActive,
          })}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-[#6EC1E4] transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                menuOpen && 'shadow-[0_0_16px_rgba(110,193,228,0.3)]'
              )}
              aria-expanded={menuOpen}
              aria-label={t('ask.input.action.openMenu')}
            >
              <Plus className="h-4 w-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 top-12 w-44 rounded-2xl border border-white/10 bg-[#141A20] p-2 text-sm text-[#F1F5F9] shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
                >
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs text-[#E6EDF4] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Paperclip className="h-4 w-4 text-[#6EC1E4]" />
                    {t('ask.input.action.uploadFile')}
                  </button>
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs text-[#E6EDF4] transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Image className="h-4 w-4 text-[#6EC1E4]" />
                    {t('ask.input.action.uploadPhoto')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={Array.from(ACCEPTED_EXT).map((ext) => `.${ext}`).join(',')}
            className="hidden"
            multiple={false}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                handleMenuFilePick(file, 'file')
              }
              // Reset input to allow re-uploading same file
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
                handleMenuFilePick(file, 'camera')
              }
              // Reset input to allow re-uploading same file
              event.target.value = ''
            }}
            aria-label={t('ask.input.action.uploadPhoto', { default: '拍照上傳' })}
          />

          <div className="flex flex-1 flex-col gap-2">
            <textarea
              ref={textAreaRef}
              value={value}
              placeholder={placeholder}
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
              className="w-full min-h-[44px] resize-none rounded-2xl border-0 bg-transparent p-3 text-sm leading-6 text-[#F1F5F9] placeholder:text-[#A9B7C8]/60 focus:outline-none"
              aria-label={placeholder}
              aria-multiline="true"
            />
            <div className="flex flex-wrap items-center justify-between text-[11px] uppercase tracking-[0.18em] text-[#6EC1E4]/60">
              <span className="flex items-center gap-2">
                {!isOnline && <WifiOff className="h-3.5 w-3.5" />}
                {statusText}
              </span>
              {uploadState.status === 'uploading' && (
                <div className="flex min-w-[120px] items-center gap-2 text-xs normal-case tracking-normal text-[#E6EDF4]">
                  <span className="inline-flex h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                    <span
                      className="h-full rounded-full bg-[#6EC1E4] transition-all"
                      style={{ width: `${Math.min(uploadState.progress, 100)}%` }}
                    />
                  </span>
                  <button
                    type="button"
                    onClick={cancelUpload}
                    className="text-[11px] uppercase tracking-[0.2em] text-[#A9B7C8]/70 hover:text-[#F1F5F9]"
                  >
                    {t('ask.input.status.cancel')}
                  </button>
                </div>
              )}
              {uploadState.status === 'error' && (
                <button
                  type="button"
                  className="text-[11px] uppercase tracking-[0.2em] text-[#A9B7C8]/70 hover:text-[#F1F5F9]"
                  onClick={() => {
                    resetUploadState()
                    onOcrComplete(null)
                    setMenuOpen(true)
                  }}
                >
                  {t('ask.input.status.retry')}
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy || pendingSend || uploadState.status === 'uploading'}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-full bg-[#1E2A34] text-[#6EC1E4] shadow-[0_0_14px_rgba(110,193,228,0.35)] transition hover:bg-[#23313C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              (isBusy || pendingSend || uploadState.status === 'uploading') && 'opacity-60'
            )}
            aria-label={t('ask.input.sendLabel')}
            aria-busy={pendingSend || isBusy}
          >
            {isBusy || pendingSend ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </motion.form>
      </div>
    </>
  )
}

export default InputDock
