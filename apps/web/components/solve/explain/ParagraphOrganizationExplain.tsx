'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { track } from '@plms/shared/analytics'
import type { ParagraphOrganizationVM } from '@/lib/mapper/explain-presenter'

interface ParagraphOrganizationExplainProps {
  view: ParagraphOrganizationVM
  onHighlightSync?: (payload: { targetIndex: number; label?: string }) => void
}

function truncateReason(reason: string, maxLength = 30): string {
  if (reason.length <= maxLength) return reason
  return `${reason.slice(0, maxLength).trim()}…`
}

export function ParagraphOrganizationExplain({
  view,
  onHighlightSync,
}: ParagraphOrganizationExplainProps) {
  const passageRef = useRef<HTMLDivElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [highlightedBlank, setHighlightedBlank] = useState<number | null>(null)

  const handleEvidenceClick = (
    blankIndex: number,
    anchorId?: string,
    paragraphIndex?: number
  ) => {
    const container = passageRef.current
    if (!container) return

    // Find anchor element
    const anchor = anchorId 
      ? container.querySelector<HTMLElement>(`#${anchorId}`)
      : container.querySelector<HTMLElement>(`[data-blank="${blankIndex}"]`)

    if (anchor) {
      // Smooth scroll to anchor
      anchor.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // Highlight with flash effect
      const flashClasses = [
        'bg-primary/20',
        'ring-2',
        'ring-primary/60',
        'rounded',
        'px-1',
        'transition-all',
        'duration-300',
      ]
      flashClasses.forEach((cls) => anchor.classList.add(cls))
      
      setHighlightedBlank(blankIndex)
      
      // Remove highlight after animation
      window.setTimeout(() => {
        flashClasses.forEach((cls) => anchor.classList.remove(cls))
        setHighlightedBlank(null)
      }, 1500)
    } else if (typeof paragraphIndex === 'number') {
      // Fallback: scroll to paragraph
      const target = container.querySelector<HTMLElement>(`[data-paragraph="${paragraphIndex}"]`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const highlightClasses = ['bg-primary/10', 'ring-1', 'ring-primary/20', 'rounded', 'px-1']
        highlightClasses.forEach((cls) => target.classList.add(cls))
        window.setTimeout(() => {
          highlightClasses.forEach((cls) => target.classList.remove(cls))
        }, 900)
      }
    }

    onHighlightSync?.({
      targetIndex: blankIndex,
      label: anchorId || `blank-${blankIndex}`,
    })

    track('evidence.view', {
      blankIndex,
      anchorId: anchorId || `blank-${blankIndex}`,
      paragraphIndex: paragraphIndex ?? -1,
    })
  }

  // Parse article with blanks marked
  const article = view.article?.en || ''
  const meta = view.meta as any
  const normalizedPassage = meta?.normalizedPassage || article

  // Split into paragraphs
  const paragraphs = article.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)

  return (
    <div className="space-y-3">
      {/* 題幹卡 — 完整文章獨立置頂 */}
      {view.article && (
        <Card>
          <CardContent className="pt-6">
            <div 
              ref={passageRef} 
              className="space-y-2 max-h-[400px] overflow-y-auto"
            >
              {/* Render normalized passage with anchor markers */}
              {normalizedPassage ? (
                <div 
                  className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: normalizedPassage.replace(/<mark[^>]*>/g, '<mark class="blank-marker bg-primary/10 rounded px-1"').replace(/<\/mark>/g, '</mark>')
                  }}
                />
              ) : (
                paragraphs.map((paragraph, pIndex) => (
                  <p 
                    key={pIndex} 
                    className="text-sm leading-relaxed text-foreground"
                    data-paragraph={pIndex}
                  >
                    {paragraph.replace(/\(\d+\)/g, '____')}
                  </p>
                ))
              )}
              {view.article.zh && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {view.article.zh}
                </p>
              )}
            </div>
            {paragraphs.length > 3 && (
              <button
                onClick={() => {
                  setExpanded((prev) => !prev)
                track('explain.view', {
                  action: expanded ? 'collapse' : 'expand',
                  type: 'passage',
                })
                }}
                className="mt-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {expanded ? '收起' : '展開全文'}
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 選項列表 — 每個選項含中文翻譯，正解高亮 */}
      {view.options && view.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 pt-6">
            {view.options.map((option) => {
              const isCorrect = option.correct
              const blank = view.blanks.find((b) => b.selectedAnswer.label === option.label)

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
                  {blank?.selectedAnswer.zh && (
                    <span className="ml-2 text-muted-foreground">（{blank.selectedAnswer.zh}）</span>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 逐題詳解（依空格順序） */}
      {view.blanks.map((blank, blankIndex) => {
        const metaQuestion = (meta?.questions as any[])?.find((q: any) => q.blankIndex === blank.blankIndex || q.id === `blank-${blank.blankIndex}`)
        const anchorId = metaQuestion?.anchorId || `blank-${blank.blankIndex}`
        const paragraphIndex = metaQuestion?.paragraphIndex ?? blank.explanation.evidence?.paragraphIndex

        return (
          <Card key={blankIndex}>
            <CardContent className="space-y-3 pt-6">
              {/* 第 1 行：✅ 已選答案 */}
              <div className="flex items-center gap-2 text-sm">
                <span>✅</span>
                <span className="text-muted-foreground">已選答案</span>
              </div>

              {/* 第 2-3 行：詳解 */}
              <div className="space-y-2 text-sm leading-relaxed">
                {/* 篇章銜接句 */}
                <p className="text-foreground">{blank.explanation.connection}</p>

                {/* 理由＋依據（一句話） */}
                <p className="text-muted-foreground">
                  {truncateReason(blank.explanation.reason, 80)}
                </p>

                {/* Evidence 片段（可點按） */}
                {blank.explanation.evidence && (
                  <button
                    onClick={() =>
                      handleEvidenceClick(
                        blank.blankIndex,
                        anchorId,
                        paragraphIndex
                      )
                    }
                    className="group text-left w-full"
                    aria-label={`查看證據：${blank.explanation.evidence.text.substring(0, 30)}...`}
                  >
                    <div className="text-zinc-400 italic text-xs leading-relaxed font-light transition-colors group-hover:text-zinc-300">
                      &ldquo;{blank.explanation.evidence.text}&rdquo;
                    </div>
                  </button>
                )}

                {/* 語用標籤（可選） */}
                {blank.explanation.discourseTag && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                      {blank.explanation.discourseTag}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

