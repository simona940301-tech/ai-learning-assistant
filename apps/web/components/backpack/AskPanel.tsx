'use client'

import { useState } from 'react'
import { X, Send, Copy, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import type { ScopedAskCitation } from '@/hooks/useScopedAskV2'
import { track } from '@/lib/telemetry'

interface AskPanelProps {
  question: string
  answer: string
  citations: ScopedAskCitation[]
  loading: boolean
  onClose: () => void
  onSubmit: (question: string) => void
}

export function AskPanel({
  question: initialQuestion,
  answer,
  citations,
  loading,
  onClose,
  onSubmit,
}: AskPanelProps) {
  const [question, setQuestion] = useState(initialQuestion)
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    if (!answer) return
    
    await navigator.clipboard.writeText(answer)
    setCopied(true)
    track('backpack.reader.ask.copy')
    
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleSubmit = () => {
    if (!question.trim() || loading) return
    onSubmit(question)
  }
  
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold">問 AI</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="關閉"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Question Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">問題</label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="請輸入你的問題..."
            className="min-h-[100px] resize-none"
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit()
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            disabled={!question.trim() || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                回答中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                送出
              </>
            )}
          </Button>
        </div>
        
        {/* Answer */}
        <AnimatePresence>
          {answer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground">回答</h3>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>已複製</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>複製</span>
                    </>
                  )}
                </button>
              </div>
              
              <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
                </div>
              </Card>
              
              {/* Citations */}
              {citations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">參考來源</h4>
                  <div className="space-y-2">
                    {citations.map((citation, idx) => (
                      <Card
                        key={idx}
                        className="p-3 bg-zinc-100 dark:bg-zinc-800/50 text-xs"
                      >
                        <div className="text-muted-foreground">
                          頁面 {citation.page_index + 1}
                        </div>
                        {citation.text && (
                          <div className="mt-1 text-foreground line-clamp-2">
                            {citation.text}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
