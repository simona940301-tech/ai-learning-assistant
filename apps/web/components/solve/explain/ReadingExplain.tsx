'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { track } from '@plms/shared/analytics'
import type { ReadingVM } from '@/lib/mapper/explain-presenter'
import { ReadingPassage } from './ReadingPassage'
import { TypewriterText } from '@/components/ui/typewriter-text'

interface ReadingExplainProps {
  view: ReadingVM
  onHighlightSync?: (payload: { targetIndex: number; label?: string }) => void
}

const EMPTY_PARAGRAPHS: string[] = []
const letterForIndex = (index: number) => String.fromCharCode(65 + index)

export default function ReadingExplain({ view, onHighlightSync }: ReadingExplainProps) {
  const [expanded, setExpanded] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const passageRef = useRef<HTMLDivElement | null>(null)
  
  // Only start typing animation after component mounts and data is ready
  // This ensures typewriter effect only starts when final explanation is displayed
  useEffect(() => {
    if (view && view.questions && view.questions.length > 0) {
      // Small delay to ensure smooth transition from thinking to typing
      const timer = setTimeout(() => {
        setShouldAnimate(true)
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setShouldAnimate(false)
    }
  }, [view?.id, view?.questions?.length])

  const paragraphs = view.passage?.paragraphs ?? EMPTY_PARAGRAPHS

  useEffect(() => {
    track('reading.view', {
      questionCount: view.questions.length,
      passageChars: paragraphs.join('\n').length,
      groupId: view.meta?.groupId,
    })
  }, [view.id, view.questions.length, paragraphs, view.meta?.groupId])

  const highlightParagraph = (paragraphIndex: number, sentenceIndex?: number) => {
    if (paragraphIndex < 0) return
    const container = passageRef.current
    if (!container) return

    if (typeof sentenceIndex === 'number') {
      const sentenceNode = container.querySelector<HTMLElement>(
        `[data-paragraph="${paragraphIndex}"][data-sentence="${sentenceIndex}"]`
      )
      if (sentenceNode) {
        sentenceNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Fix: split classes before adding
        const flashClasses = ['bg-primary/10', 'ring-2', 'ring-primary/50', 'rounded', 'px-1']
        flashClasses.forEach(cls => sentenceNode.classList.add(cls))
        window.setTimeout(() => {
          flashClasses.forEach(cls => sentenceNode.classList.remove(cls))
        }, 900)
        onHighlightSync?.({
          targetIndex: sentenceIndex + 1,
          label: `sentence-${paragraphIndex + 1}-${sentenceIndex + 1}`,
        })
        return
      }
    }

    const target = container.querySelector<HTMLElement>(`[data-paragraph="${paragraphIndex}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const highlightClasses = ['bg-primary/10', 'ring-1', 'ring-primary/20', 'rounded', 'px-1']
    highlightClasses.forEach(cls => target.classList.add(cls))
    window.setTimeout(() => {
      highlightClasses.forEach(cls => target.classList.remove(cls))
    }, 900)
    onHighlightSync?.({ targetIndex: paragraphIndex + 1, label: `paragraph-${paragraphIndex + 1}` })
  }

  const handleQuestionFocus = (qid: string, paragraphIndex: number, sentenceIndex?: number) => {
    highlightParagraph(paragraphIndex, sentenceIndex)
    track('question.select', {
      qid,
      paragraphIndex,
      sentenceIndex: sentenceIndex ?? -1,
    })
  }

  const handleEvidenceClick = (
    qid: string,
    entry: { paragraphIndex: number; sentenceIndex?: number }
  ) => {
    highlightParagraph(entry.paragraphIndex, entry.sentenceIndex)
    track('evidence.view', {
      qid,
      paragraphIndex: entry.paragraphIndex,
      sentenceIndex: entry.sentenceIndex ?? -1,
    })
  }


  if (process.env.NODE_ENV !== 'production') {
    const evidenceOk = view.questions.every((q) => q.evidence.length > 0)
    console.log('[ReadingExplain] render group:', view.meta?.groupId, 'qs:', view.questions.length, 'evidence:', evidenceOk ? 'ok' : 'miss')
  }

  const hideDevBanner = process.env.NEXT_PUBLIC_HIDE_DEV_BANNER === '1' || process.env.NEXT_PUBLIC_HIDE_DEV_BANNER === 'true'

  return (
    <div className="space-y-3 leading-relaxed pb-8">
      {/* Dev Log */}
      {process.env.NODE_ENV !== 'production' && !hideDevBanner && (
        <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          kind={view.kind} • questions={view.questions.length}
          {view.parserWarning ? ` • warn=${view.parserWarning}` : ''}
        </div>
      )}

      {/* Minimalist passage with left border navigation */}
      <Card>
        <CardContent className="pt-6">
          <ReadingPassage
            ref={passageRef}
            paragraphs={paragraphs}
            expanded={expanded}
            onToggleExpand={() => {
              setExpanded((prev) => !prev)
              if (!expanded) {
                track('reading.view', { action: 'expand_passage' })
              }
            }}
          />
        </CardContent>
      </Card>

      {/* 下方直列所有題詳解 */}
      <div className="space-y-4">
        {view.questions.map((question, questionIndex) => {
          const answerIndex = question.answerIndex ?? -1
          const primaryEvidence = question.evidence?.[0]

          return (
            <div
              key={question.qid}
              className={`space-y-3 ${questionIndex > 0 ? 'border-t border-border/20 pt-3 mt-3' : ''}`}
            >
              {/* 題號 + 題幹 — 極簡設計 */}
              <div className="space-y-3">
                <div className="text-base font-medium leading-relaxed text-zinc-50">
                  {question.qid}. {question.stem}
                </div>

                {/* 選項（A-D）— 極簡列表，正確答案突出 */}
                {question.options.length > 0 && (
                  <div className="space-y-2">
                    {question.options.map((option, index) => {
                      const isAnswer = answerIndex === index
                      const inlineNote = question.inlineNotes?.[index]
                      const isHighTrap = inlineNote?.trapRank === 2 && !isAnswer

                      return (
                        <div
                          key={index}
                          className={`text-sm leading-relaxed px-3 py-2 rounded transition-colors ${
                            isAnswer
                              ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                              : 'text-zinc-300 bg-zinc-900/30 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`font-medium ${isAnswer ? 'text-green-400' : 'text-zinc-500'}`}>
                              {letterForIndex(index)}.
                            </span>
                            <span className="flex-1">{option}</span>
                          </div>
                          {/* High-trap note */}
                          {isHighTrap && inlineNote?.trapNote && (
                            <div className="mt-1.5 ml-6 text-xs text-zinc-500 italic">
                              容易誤選：{inlineNote.trapNote}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 解析區（Explanation Section）— 極簡設計，自然語氣的詳解 */}
              <div className="mt-6 space-y-3">
                {/* 標籤（Meta）— 頂部顯示，極簡樣式 */}
                {question.headerLine && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 tracking-wide">
                    {question.headerLine.split('｜').map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-zinc-800/50 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 解析（Reasoning）— 自然語氣的推論句 + Counterpoints */}
                {(question.reasoningText || question.counterpoints) && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                      解析
                    </div>
                    
                    {/* 推論句（Reasoning）— 打字機效果 */}
                    {question.reasoningText && (
                      <div className="text-zinc-100 text-sm leading-relaxed">
                        {shouldAnimate ? (
                          <TypewriterText
                            text={question.reasoningText}
                            speed={15}
                            delay={200}
                            className="whitespace-pre-wrap"
                            showCursor={true}
                          />
                        ) : (
                          <span className="whitespace-pre-wrap">{question.reasoningText}</span>
                        )}
                      </div>
                    )}

                    {/* Counterpoints（錯誤選項說明）— 簡潔格式：A：... B：... D：... */}
                    {question.counterpoints && Object.keys(question.counterpoints).length > 0 && (
                      <div className="text-zinc-300 text-sm leading-relaxed space-y-1.5 pl-2 border-l-2 border-zinc-800/50">
                        {Object.entries(question.counterpoints).map(([key, value]) => (
                          <div key={key} className="flex items-start gap-2">
                            <span className="text-zinc-500 font-medium text-xs">{key}：</span>
                            <span className="flex-1">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 證據句（內嵌引用，無標籤）— 如果 reasoning 中包含引用 */}
                    {question.evidenceOneLine && primaryEvidence && (
                      <div className="mt-3 pt-3 border-t border-zinc-800/30">
                        <div className="text-zinc-400 italic text-xs leading-relaxed font-light">
                          &ldquo;{question.evidenceOneLine}&rdquo;
                        </div>
                        {primaryEvidence.zh && (
                          <div className="mt-1 text-zinc-500 text-xs leading-relaxed">
                            {primaryEvidence.zh}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}
