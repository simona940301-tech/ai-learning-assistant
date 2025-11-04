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

      {/* 選項列表 — 每個選項含中文翻譯，正解高亮（不列「答案：」） */}
      {view.options && view.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1 pt-6">
            {view.options.map((option) => {
              const isCorrect = option.correct
              const blank = view.blanks.find((b) => b.selectedAnswer.label === option.label)

              return (
                <div
                  key={`${option.label}-${option.text}`}
                  className={`rounded-lg px-3 py-2.5 text-sm leading-relaxed transition-colors ${
                    isCorrect
                      ? 'bg-green-50/80 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30 font-medium text-green-700 dark:text-green-300'
                      : 'text-foreground/80 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-medium">{option.label}.</span>
                    <span className="flex-1">{option.text}</span>
                  </div>
                  {blank?.selectedAnswer.zh && (
                    <div className="mt-1 ml-5 text-xs text-muted-foreground">
                      {blank.selectedAnswer.zh}
                    </div>
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
              {/* 第 1 行：該題所有選項中文翻譯「摘要」 */}
              {view.options && view.options.length > 0 && (
                <div className="text-xs text-muted-foreground mb-2">
                  <span className="font-medium">選項摘要：</span>
                  {view.options.map((opt, idx) => {
                    const optBlank = view.blanks.find((b) => b.selectedAnswer.label === opt.label)
                    return optBlank?.selectedAnswer.zh ? (
                      <span key={idx} className="ml-1.5">
                        {opt.label}：{optBlank.selectedAnswer.zh}
                        {idx < view.options.length - 1 ? '；' : ''}
                      </span>
                    ) : null
                  })}
                </div>
              )}

              {/* 第 2-3 行：理由＋依據（合併一句） */}
              <div className="space-y-2 text-sm leading-relaxed">
                <p className="text-foreground">
                  {blank.explanation.connection || blank.explanation.reason}
                </p>

                {/* Evidence 片段（可點按回捲題幹高亮） */}
                {blank.explanation.evidence && (
                  <button
                    onClick={() =>
                      handleEvidenceClick(
                        blank.blankIndex,
                        anchorId,
                        paragraphIndex
                      )
                    }
                    className="group text-left w-full mt-2"
                    aria-label={`查看證據：${blank.explanation.evidence.text.substring(0, 30)}...`}
                  >
                    <div className="text-xs text-muted-foreground italic leading-relaxed transition-colors group-hover:text-foreground/70">
                      &ldquo;{blank.explanation.evidence.text}&rdquo;
                    </div>
                  </button>
                )}

                {/* 語用標籤（可選：轉折／發展／總結） */}
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

