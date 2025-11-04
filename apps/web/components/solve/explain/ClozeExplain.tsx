'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { track } from '@plms/shared/analytics'
import type { ClozeVM } from '@/lib/mapper/explain-presenter'
import { Card, CardContent } from '@/components/ui/card'
import { ExtendedVocab } from '../ExtendedVocab'

interface ClozeExplainProps {
  view: ClozeVM
  onHighlightSync?: (payload: { targetIndex: number; label?: string }) => void
}

function truncateReason(reason: string, maxLength = 30): string {
  if (reason.length <= maxLength) return reason
  return `${reason.slice(0, maxLength).trim()}…`
}

function clipSnippet(text: string, maxLength = 120): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}…`
}

export function ClozeExplain({ view, onHighlightSync }: ClozeExplainProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    onHighlightSync?.({ targetIndex: currentIndex + 1, label: `blank-${currentIndex + 1}` })
  }, [currentIndex, onHighlightSync])

  const handleNavigate = (nextIndex: number) => {
    if (nextIndex === currentIndex) return
    track('carousel.swipe', {
      id: view.id,
      from: currentIndex + 1,
      to: nextIndex + 1,
      total: 1,
    })
    setCurrentIndex(nextIndex)
  }

  const highlight = view.meta.sentenceSpan

  return (
    <div className="space-y-3">
      {/* 完整文章 */}
      {view.article && (
        <ArticleCard article={view.article.en} zh={view.article.zh} highlight={highlight} />
      )}

      {/* 空格卡 */}
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={`cloze-${currentIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ClozeBlankCard slide={view} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function ArticleCard({
  article,
  zh,
  highlight,
}: {
  article: string
  zh?: string
  highlight?: { start: number; end: number }
}) {
  const highlightRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    if (!highlightRef.current || !highlight) return
    highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlight?.start, highlight?.end])

  const paragraphs = useMemo(() => article.split('\n'), [article])

  let cursor = 0
  return (
    <Card>
      <CardContent className="space-y-2 pt-6">
        {paragraphs.map((paragraph, pIndex) => {
          const localStart = highlight && cursor <= highlight.start && highlight.start < cursor + paragraph.length
            ? highlight.start - cursor
            : -1
          const localEnd =
            highlight && cursor <= highlight.end && highlight.end <= cursor + paragraph.length
              ? highlight.end - cursor
              : -1

          cursor += paragraph.length + 1

          return (
            <p key={pIndex} className="text-sm leading-relaxed text-foreground">
              {localStart >= 0 && localEnd >= 0 ? (
                <>
                  {paragraph.slice(0, localStart)}
                  <span
                    ref={highlightRef}
                    className="rounded bg-primary/10 px-0.5 transition-colors duration-300"
                  >
                    {paragraph.slice(localStart, localEnd)}
                  </span>
                  {paragraph.slice(localEnd)}
                </>
              ) : (
                paragraph
              )}
            </p>
          )
        })}
        {zh && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{zh}</p>}
      </CardContent>
    </Card>
  )
}

function ClozeBlankCard({ slide }: { slide: ClozeVM }) {
  return (
    <div className="space-y-3">
      {/* 句子片段 */}
      {slide.meta.snippet && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm leading-relaxed text-foreground">{clipSnippet(slide.meta.snippet)}</p>
          </CardContent>
        </Card>
      )}

      {/* 選項 */}
      {slide.options && slide.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 pt-6">
            {slide.options.map((option) => {
              const reason = option.reason ? truncateReason(option.reason) : undefined
              const isCorrect = option.correct

              return (
                <div
                  key={`${option.label}-${option.text}`}
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    isCorrect
                      ? 'bg-green-50 font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-200'
                      : 'text-foreground'
                  }`}
                >
                  {option.label}. {option.text}
                  {reason && <span className="text-muted-foreground"> — {reason}</span>}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 答案 */}
      {slide.answer && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-200">
              {slide.answer.label}. {slide.answer.text}
            </div>
            {slide.meta.reasonLine && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {truncateReason(slide.meta.reasonLine)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 語用標籤 */}
      {slide.meta.discourseTag && (
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
            {slide.meta.discourseTag}
          </span>
        </div>
      )}

      {/* 延伸字彙 */}
      {slide.vocab && slide.vocab.length > 0 && <ExtendedVocab items={slide.vocab} />}
    </div>
  )
}