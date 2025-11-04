'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { track } from '@plms/shared/analytics'
import type { ContextualCompletionVM } from '@/lib/mapper/explain-presenter'

interface ContextualCompletionExplainProps {
  view: ContextualCompletionVM
  onHighlightSync?: (payload: { targetIndex: number; label?: string }) => void
}

function truncateReason(reason: string, maxLength = 60): string {
  if (reason.length <= maxLength) return reason
  return `${reason.slice(0, maxLength).trim()}…`
}

export function ContextualCompletionExplain({
  view,
  onHighlightSync,
}: ContextualCompletionExplainProps) {
  const passageRef = useRef<HTMLDivElement | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [translationExpanded, setTranslationExpanded] = useState(false)

  const currentQuestion = view.questions[currentQuestionIndex]
  const currentSpan = currentQuestion?.sentenceSpan

  useEffect(() => {
    if (currentSpan && passageRef.current) {
      const target = passageRef.current.querySelector<HTMLElement>(
        `[data-span-start="${currentSpan.start}"][data-span-end="${currentSpan.end}"]`
      )
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const highlightClasses = ['bg-primary/10', 'ring-2', 'ring-primary/50', 'rounded', 'px-1']
        highlightClasses.forEach((cls) => target.classList.add(cls))
        window.setTimeout(() => {
          highlightClasses.forEach((cls) => target.classList.remove(cls))
        }, 900)
      }
    }
    onHighlightSync?.({
      targetIndex: currentQuestionIndex + 1,
      label: `blank-${currentQuestionIndex + 1}`,
    })
  }, [currentQuestionIndex, currentSpan, onHighlightSync])

  const paragraphs = useMemo(() => {
    if (!view.article?.en) return []
    return view.article.en.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  }, [view.article?.en])

  const handleEvidenceClick = (
    paragraphIndex: number,
    sentenceIndex?: number
  ) => {
    if (paragraphIndex < 0) return
    const container = passageRef.current
    if (!container) return

    if (typeof sentenceIndex === 'number') {
      const sentenceNode = container.querySelector<HTMLElement>(
        `[data-paragraph="${paragraphIndex}"][data-sentence="${sentenceIndex}"]`
      )
      if (sentenceNode) {
        sentenceNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const flashClasses = ['bg-primary/10', 'ring-2', 'ring-primary/50', 'rounded', 'px-1']
        flashClasses.forEach((cls) => sentenceNode.classList.add(cls))
        window.setTimeout(() => {
          flashClasses.forEach((cls) => sentenceNode.classList.remove(cls))
        }, 900)
      }
    }

    track('evidence.view', {
      paragraphIndex,
      sentenceIndex: sentenceIndex ?? -1,
    })
  }

  return (
    <div className="space-y-3">
      {/* 題幹卡 — 完整文章 */}
      {view.article && (
        <Card>
          <CardContent className="pt-6">
            <div ref={passageRef} className="space-y-2">
              {paragraphs.map((paragraph, pIndex) => {
                // 高亮當前題目對應的句子
                const hasHighlight = currentSpan && 
                  paragraph.slice(currentSpan.start, currentSpan.end).length > 0

                return (
                  <p key={pIndex} className="text-sm leading-relaxed text-foreground">
                    {hasHighlight && currentSpan ? (
                      <>
                        {paragraph.slice(0, currentSpan.start)}
                        <span
                          data-span-start={currentSpan.start}
                          data-span-end={currentSpan.end}
                          className="rounded bg-primary/10 px-0.5 transition-colors duration-300"
                        >
                          {paragraph.slice(currentSpan.start, currentSpan.end)}
                        </span>
                        {paragraph.slice(currentSpan.end)}
                      </>
                    ) : (
                      paragraph
                    )}
                  </p>
                )
              })}
              {view.article.zh && (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {view.article.zh}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 詞表卡 — 該題的選項表（每個選項含 POS＋中文），正解高亮 */}
      {view.options && view.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 pt-6">
            {view.options.map((option) => {
              const isCorrect = option.correct
              const parts: string[] = []
              if (option.label) parts.push(`${option.label}.`)
              if (option.text) parts.push(option.text)
              if (option.pos) parts.push(`(${option.pos})`)
              if (option.zh) parts.push(option.zh)

              return (
                <div
                  key={`${option.label}-${option.text}`}
                  className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    isCorrect
                      ? 'bg-green-50 font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-200'
                      : 'text-foreground'
                  }`}
                >
                  {parts.join(' ')}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* 詳解卡（單題） */}
      {currentQuestion && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            {/* 解題段（單段合併：理由＋依據） */}
            <div className="text-sm leading-relaxed">
              <p className="text-foreground">{truncateReason(currentQuestion.explanation.reason, 120)}</p>

              {/* Evidence 片段（可點按） */}
              {currentQuestion.explanation.evidence && (
                <button
                  onClick={() =>
                    handleEvidenceClick(
                      currentQuestion.explanation.evidence!.paragraphIndex,
                      currentQuestion.explanation.evidence!.sentenceIndex
                    )
                  }
                  className="group text-left w-full mt-2"
                >
                  <div className="text-zinc-400 italic text-xs leading-relaxed font-light transition-colors group-hover:text-zinc-300">
                    &ldquo;{currentQuestion.explanation.evidence.text}&rdquo;
                  </div>
                </button>
              )}

              {/* 片語補充（可選） */}
              {currentQuestion.explanation.phrases && currentQuestion.explanation.phrases.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800/30">
                  <div className="text-xs text-muted-foreground mb-1.5">常見搭配：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentQuestion.explanation.phrases.map((phrase, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 全文譯文＋關鍵詞表（置底，可折疊） */}
      {view.translation && (
        <Card>
          <CardContent className="pt-6">
            <button
              onClick={() => {
                setTranslationExpanded((prev) => !prev)
                track('section.toggle', { action: translationExpanded ? 'collapse' : 'expand', type: 'translation' })
              }}
              className="w-full text-left text-sm font-medium text-foreground mb-2"
            >
              {translationExpanded ? '▼' : '▶'} 全文譯文與關鍵詞
            </button>

            {translationExpanded && (
              <div className="space-y-3 mt-3">
                {/* 標準譯文 */}
                <div className="text-sm leading-relaxed text-muted-foreground">
                  {view.translation.full}
                </div>

                {/* 關鍵詞彙表 */}
                {view.translation.keywords && view.translation.keywords.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800/30">
                    <div className="text-xs text-muted-foreground mb-1.5">關鍵詞彙：</div>
                    <div className="flex flex-wrap gap-1.5">
                      {view.translation.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="rounded border border-border bg-background px-2 py-0.5 text-xs"
                        >
                          <span className="font-semibold text-foreground">{keyword.term}</span>
                          <span className="text-muted-foreground ml-1">{keyword.zh}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

