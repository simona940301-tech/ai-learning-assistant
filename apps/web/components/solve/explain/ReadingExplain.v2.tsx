/**
 * ReadingExplain v2: Minimalist long-form reading comprehension UI
 *
 * Design Principles:
 * - Progressive Disclosure: Collapsed by default, expand for details
 * - Fixed Passage Dock: Sticky top viewer with evidence highlighting
 * - Evidence-First: Click → scroll → highlight → auto-fade
 * - Minimalism: Clean typography, no redundant labels
 * - Accessibility: ARIA labels, keyboard nav, focus management
 *
 * Integration:
 * - PassageDock: Fixed passage viewer
 * - useEvidenceSync: Evidence highlighting coordination
 * - DOMPurify: XSS protection for all HTML
 * - Telemetry: Event tracking for analytics
 */

'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ReadingVM } from '@/lib/mapper/explain-presenter'
import { adaptReadingVM, getParagraphId } from './reading-adapter'
import { PassageDock } from '@/components/reading/PassageDock'
import { useEvidenceSync } from '@/components/reading/useEvidenceSync'
import { sanitizeInline, sanitizePassage } from '@/lib/sanitize'
import {
  trackExplainView,
  trackQuestionView,
  trackQuestionExpand,
  markExplainStart,
  measureExplainRender,
} from '@/lib/telemetry'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Feature flag for gradual rollout
const ENABLE_PASSAGE_DOCK =
  process.env.NEXT_PUBLIC_ENABLE_PASSAGE_DOCK !== 'false'

interface ReadingExplainProps {
  view: ReadingVM
  onHighlightSync?: (payload: { targetIndex: number; label?: string }) => void
  evidenceLensEnabled?: boolean
  pauseHighlightAnimations?: boolean
  activeQuestionIndex?: number
  onQuestionNavigate?: (index: number) => void
}

/**
 * Question card with progressive disclosure
 */
function QuestionCard({
  question,
  index,
  isActive,
  onExpand,
  onViewEvidence,
  onNavigate,
}: {
  question: ReturnType<typeof adaptReadingVM>['questions'][0]
  index: number
  isActive: boolean
  onExpand: (qid: string, expanded: boolean) => void
  onViewEvidence: (qid: string, spans: typeof question.evidence) => void
  onNavigate: () => void
}) {
  // Load expanded state from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(`readingCard:${question.id}`)
      return saved === 'true'
    } catch {
      return false
    }
  })

  const toggleExpanded = useCallback(() => {
    const nextExpanded = !isExpanded
    setIsExpanded(nextExpanded)

    // Save to localStorage
    try {
      localStorage.setItem(`readingCard:${question.id}`, String(nextExpanded))
    } catch (error) {
      console.warn('[QuestionCard] Failed to save expanded state:', error)
    }

    // Track event
    trackQuestionExpand({
      kind: 'E4',
      qid: question.id,
      expanded: nextExpanded,
    })

    onExpand(question.id, nextExpanded)
  }, [isExpanded, question.id, onExpand])

  const handleViewEvidence = useCallback(() => {
    if (!question.evidence || question.evidence.length === 0) {
      console.warn('[QuestionCard] No evidence available for', question.id)
      return
    }

    onViewEvidence(question.id, question.evidence)
  }, [question.id, question.evidence, onViewEvidence])

  const hasEvidence = question.evidence && question.evidence.length > 0

  return (
    <Card
      className={`
        transition-all duration-200
        ${isActive ? 'ring-2 ring-primary/50' : ''}
        hover:border-primary/30
      `}
      onClick={onNavigate}
    >
      <CardContent className="pt-6 space-y-4">
        {/* Question stem */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-base font-medium leading-relaxed">
              {question.id}. {question.prompt}
            </h3>
          </div>

          {/* Evidence button */}
          {hasEvidence && ENABLE_PASSAGE_DOCK && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                handleViewEvidence()
              }}
              className="text-xs shrink-0"
              aria-label={`查看原文第 ${question.evidence[0]?.paraId.replace('p', '')} 段`}
            >
              <svg
                className="h-3.5 w-3.5 mr-1.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              查看證據
            </Button>
          )}
        </div>

        {/* Options (always visible) */}
        {question.options && question.options.length > 0 && (
          <div className="space-y-2">
            {question.options.map((option) => {
              const isCorrect = option.verdict === 'fit'

              return (
                <div
                  key={option.key}
                  className={`
                    rounded-md px-3 py-2 text-sm leading-relaxed
                    transition-colors
                    ${
                      isCorrect
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-50'
                        : 'bg-muted/50 border border-transparent text-muted-foreground'
                    }
                  `}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`
                      font-medium shrink-0
                      ${isCorrect ? 'text-emerald-400' : 'text-muted-foreground'}
                    `}
                    >
                      {option.key}.
                    </span>
                    <span
                      className="flex-1"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeInline(option.text),
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Collapsed: One-line reason */}
        {!isExpanded && question.reasonOneLine && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {question.reasonOneLine}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded()
              }}
              className="text-xs"
            >
              展開詳解
            </Button>
          </div>
        )}

        {/* Expanded: Full explanation */}
        {isExpanded && (
          <div className="space-y-4 pt-2 border-t">
            {question.fullExplanation && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizePassage(question.fullExplanation),
                  }}
                />
              </div>
            )}

            {/* Distractors / Wrong option explanations */}
            {question.options && question.options.some((opt) => opt.reason && opt.verdict === 'unfit') && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  誤選分析
                </h4>
                <div className="space-y-2">
                  {question.options
                    .filter((opt) => opt.reason && opt.verdict === 'unfit')
                    .map((opt) => (
                      <div
                        key={opt.key}
                        className="text-sm text-muted-foreground leading-relaxed"
                      >
                        <span className="font-medium">{opt.key}. </span>
                        {opt.reason}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                toggleExpanded()
              }}
              className="text-xs"
            >
              收合
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * ReadingExplain v2 - Minimalist Reading Comprehension UI
 */
export default function ReadingExplain({
  view,
  onHighlightSync,
  evidenceLensEnabled = true,
  pauseHighlightAnimations = false,
  activeQuestionIndex,
  onQuestionNavigate,
}: ReadingExplainProps) {
  const startTime = useRef(markExplainStart('E4'))

  // Adapt ReadingVM to unified LongFormExplainVM
  const unified = useMemo(() => adaptReadingVM(view), [view])

  // Evidence sync hook
  const { highlights, jumpToEvidence } = useEvidenceSync({
    kind: 'E4',
    highlightDuration: 3000, // 3 seconds auto-fade
    scrollBehavior: 'smooth',
    scrollOffset: ENABLE_PASSAGE_DOCK ? 120 : 80, // Account for dock height
  })

  // Track explain view on mount
  useEffect(() => {
    trackExplainView({
      kind: 'E4',
      questionCount: unified.questions.length,
      source: 'api',
      startTime: startTime.current,
    })

    measureExplainRender('E4', startTime.current)
  }, [unified.questions.length])

  // Handle evidence click
  const handleViewEvidence = useCallback(
    (qid: string, spans: typeof unified.questions[0]['evidence']) => {
      if (!spans || spans.length === 0) return

      jumpToEvidence(spans, qid)

      // Legacy highlight sync (for compatibility)
      if (onHighlightSync && spans[0]) {
        const paraIndex = parseInt(spans[0].paraId.replace('p', ''), 10) - 1
        onHighlightSync({
          targetIndex: paraIndex + 1,
          label: `evidence-${qid}-0`,
        })
      }
    },
    [jumpToEvidence, onHighlightSync]
  )

  // Handle question expand
  const handleQuestionExpand = useCallback(
    (qid: string, expanded: boolean) => {
      // Additional logic can be added here
    },
    []
  )

  // Handle question navigate
  const handleQuestionNavigate = useCallback(
    (index: number) => {
      trackQuestionView({
        kind: 'E4',
        qid: unified.questions[index]?.id || `q${index + 1}`,
        index,
      })

      onQuestionNavigate?.(index)
    },
    [unified.questions, onQuestionNavigate]
  )

  // Dev banner
  const hideDevBanner =
    process.env.NEXT_PUBLIC_HIDE_DEV_BANNER === '1' ||
    process.env.NEXT_PUBLIC_HIDE_DEV_BANNER === 'true'

  return (
    <ErrorBoundary>
      <div className="space-y-4 pb-8">
        {/* Dev log */}
        {process.env.NODE_ENV !== 'production' && !hideDevBanner && (
          <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground font-mono">
            kind={unified.kind} • questions={unified.questions.length} • dock=
            {ENABLE_PASSAGE_DOCK ? 'on' : 'off'}
          </div>
        )}

        {/* Passage Dock (sticky top) */}
        {ENABLE_PASSAGE_DOCK && (
          <PassageDock
            passage={unified.passage}
            highlights={highlights}
            kind="E4"
            storageKey="readingDock"
            maxHeight="40vh"
            showParagraphNumbers
          />
        )}

        {/* Questions */}
        <div className="space-y-4">
          {unified.questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              isActive={activeQuestionIndex === index}
              onExpand={handleQuestionExpand}
              onViewEvidence={handleViewEvidence}
              onNavigate={() => handleQuestionNavigate(index)}
            />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
