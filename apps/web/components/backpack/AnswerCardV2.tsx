'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { track } from '@/lib/telemetry'
import type { Citation } from '@/hooks/useScopedAskV2'
import ReactMarkdown from 'react-markdown'

interface AnswerCardV2Props {
  streamingText: string
  citations: Citation[]
  isLoading?: boolean
  onHoverCitation?: (citation: Citation) => void
  onSaveToNotes?: () => void
  onRegenerate?: () => void
}

export function AnswerCardV2({
  streamingText,
  citations,
  isLoading = false,
  onHoverCitation,
  onSaveToNotes,
  onRegenerate,
}: AnswerCardV2Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleSaveToNotes = () => {
    track('backpack.note.save', { citationsCount: citations.length })
    onSaveToNotes?.()
  }

  const handleRegenerate = () => {
    track('backpack.answer.regenerate')
    onRegenerate?.()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mb-4"
    >
      <Card className="p-4 border-border/50 shadow-sm">
        {/* Answer Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {streamingText ? (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
                code: ({ children }) => (
                  <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">
                    {children}
                  </code>
                ),
              }}
            >
              {streamingText}
            </ReactMarkdown>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">正在生成回答...</span>
            </div>
          )}
        </div>

        {/* Citations */}
        {citations.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="text-[11px] uppercase opacity-60 tracking-wide mb-2">來源</div>
            <div className="flex flex-wrap gap-1.5">
              {citations.map((citation, i) => (
                <button
                  key={i}
                  onMouseEnter={() => onHoverCitation?.(citation)}
                  className="rounded-lg border border-border/50 px-2.5 py-1 text-[11px] bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  title={`頁面 ${citation.page_index + 1}，位置 ${citation.start}-${citation.end}`}
                >
                  <span className="opacity-70">頁 {citation.page_index + 1}</span>
                  {citation.score && (
                    <span className="ml-1.5 opacity-50">
                      ({Math.round(citation.score * 100)}%)
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveToNotes}
            className="text-xs h-8"
            disabled={!streamingText}
          >
            <Bookmark className="h-3.5 w-3.5 mr-1.5" />
            儲存到筆記
          </Button>
          {onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="text-xs h-8"
              disabled={isLoading}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              重新生成
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

