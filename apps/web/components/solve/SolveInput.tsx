'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

interface SolveInputProps {
  onSubmit: (text: string, image?: File) => void
  isLoading: boolean
  onFocusChange?: (isFocused: boolean) => void
}

export default function SolveInput({ onSubmit, isLoading, onFocusChange }: SolveInputProps) {
  const [input, setInput] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && !image) return
    onSubmit(input, image || undefined)
    setInput('')
    setImage(null)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.size <= 10 * 1024 * 1024) {
      // 10MB limit
      setImage(file)
    } else if (file) {
      alert('圖片大小超過 10MB 限制')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:backdrop-blur-md p-4 safe-area-pb shadow-2xl"
    >
      {image && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <span>📷 {image.name}</span>
          <button
            type="button"
            onClick={() => setImage(null)}
            className="text-destructive hover:opacity-80"
          >
            ✕
          </button>
        </motion.div>
      )}

      <div className="flex items-end gap-2">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="p-3 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
        >
          📷
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="貼上題目或點擊左側上傳圖片..."
          disabled={isLoading}
          rows={1}
          className="flex-1 px-4 py-3 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-muted/40"
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />

        <button
          type="submit"
          disabled={isLoading || (!input.trim() && !image)}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '送出中...' : '送出'}
        </button>
      </div>

      <div className="mt-2 text-xs text-muted-foreground text-center">
        支援文字或圖片（≤10MB）· Enter 送出 · Shift+Enter 換行
      </div>
    </form>
  )
}
