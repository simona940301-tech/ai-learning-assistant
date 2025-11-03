import { FormEvent, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image, Loader2, Paperclip, Plus, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const processImageToText = async (file: File): Promise<string> => {
  await new Promise((resolve) => setTimeout(resolve, 900))
  if (file.type.startsWith('image/')) {
    return `【圖片擷取】${file.name}\nThe book, ___ I bought yesterday, is fascinating.\n(A) who\n(B) which\n(C) whom\n(D) whose`
  }
  return `【文件摘要】${file.name}\n請確認擷取的文字內容是否完整。`
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const placeholder = useMemo(() => {
    return mode === 'single'
      ? '貼上題目或說說你正在卡的句子...'
      : '批次貼上多題內容，或直接上傳檔案進行解析。'
  }, [mode])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!value.trim() || isBusy) return
    await onSubmit(value.trim())
  }

  const handleFilePick = async (file: File | null) => {
    if (!file) return
    setMenuOpen(false)
    setUploading(true)
    onOcrComplete(null)
    try {
      const text = await processImageToText(file)
      onChange(value ? `${value}\n${text}` : text)
      onOcrComplete({ type: 'success', message: '已從圖片擷取文字 ✓' })
    } catch (error) {
      console.error(error)
      onOcrComplete({ type: 'error', message: '影像解析不清楚，換張更清楚的照片試試看。' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-4 pt-6 sm:pb-6">
      <motion.form
        onSubmit={handleSubmit}
        className="pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-3xl border border-white/10 bg-[#12181C]/95 px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.6)] backdrop-blur"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#6EC1E4] transition hover:bg-white/10',
              menuOpen && 'shadow-[0_0_16px_rgba(110,193,228,0.3)]'
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 top-12 w-40 rounded-2xl border border-white/10 bg-[#141A20] p-2 text-sm text-[#F1F5F9] shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs text-[#E6EDF4] transition hover:bg-white/5"
                >
                  <Paperclip className="h-4 w-4 text-[#6EC1E4]" />
                  上傳檔案
                </button>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs text-[#E6EDF4] transition hover:bg-white/5"
                >
                  <Image className="h-4 w-4 text-[#6EC1E4]" />
                  上傳照片
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.md,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(event) => handleFilePick(event.target.files?.[0] ?? null)}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => handleFilePick(event.target.files?.[0] ?? null)}
        />

        <div className="flex flex-1 flex-col gap-1">
          <textarea
            defaultValue={value}
            placeholder={placeholder}
            onKeyDown={async (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                const target = event.target as HTMLTextAreaElement
                await onSubmit(target.value.trim())
                target.value = ''
              }
            }}
            onInput={(event) => {
              const target = event.target as HTMLTextAreaElement
              onChange(target.value)
            }}
            className="w-full min-h-[40px] p-3 border-0 rounded-2xl bg-transparent text-sm leading-6 text-[#F1F5F9] placeholder:text-[#A9B7C8]/60 focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#6EC1E4]/50">
            <span>{uploading ? '正在擷取影像文字…' : 'enter 送出 / shift+enter 換行'}</span>
            <span className={cn('text-[10px] normal-case tracking-[0.08em]', ocrStatus?.type === 'error' ? 'text-[#A9B7C8]/70' : 'text-[#6EC1E4]/70')}>
              {ocrStatus?.message}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isBusy || uploading}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full bg-[#1E2A34] text-[#6EC1E4] shadow-[0_0_14px_rgba(110,193,228,0.4)] transition hover:bg-[#23313C]',
            (isBusy || uploading) && 'opacity-70'
          )}
        >
          {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </motion.form>
    </div>
  )
}

export default InputDock
