'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { track } from '@/lib/telemetry'

interface AskDockProps {
  open: boolean
  preset?: string
  onSubmit: (prompt: string) => void
  onClose: () => void
  isLoading?: boolean
}

export function AskDock({ open, preset, onSubmit, onClose, isLoading }: AskDockProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Prefill input when preset changes
  useEffect(() => {
    if (preset && open) {
      setInput(preset)
      // Focus and select all text
      setTimeout(() => {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      }, 100)
    }
  }, [preset, open])

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    track('ask.scoped.open', { hasPreset: !!preset })
    onSubmit(trimmed)
    // Don't clear input - let user see what they asked
  }, [input, isLoading, preset, onSubmit])

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Cmd/Ctrl + K toggles (handled by parent)
      if (e.key === 'Escape') {
        onClose()
      }
      // Enter to submit (Shift+Enter for newline)
      if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isLoading, onClose, handleSubmit])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-background/40 backdrop-blur-sm z-40"
          />

          {/* Dock */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none"
          >
            <div className="max-w-4xl mx-auto pointer-events-auto">
              <div className="rounded-2xl border border-border bg-background shadow-2xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    <span>根據文件內容詢問 AI</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-7 w-7 p-0 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Input */}
                <div className="flex items-end gap-2">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="請幫我解釋這段話的意思..."
                      className="min-h-[60px] max-h-[200px] resize-none pr-12 text-sm"
                      disabled={isLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      {isLoading ? '回答中...' : 'Shift+Enter 換行'}
                    </div>
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!input.trim() || isLoading}
                    className="h-[60px] px-6 rounded-xl"
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {/* Shortcut hint */}
                <div className="mt-2 text-xs text-muted-foreground text-center">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px]">
                    Esc
                  </kbd>{' '}
                  收起
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

