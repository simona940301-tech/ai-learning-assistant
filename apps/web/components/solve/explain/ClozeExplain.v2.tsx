/**
 * ClozeExplain v2: Minimalist cloze/fill-in-blank UI (E2/E3)
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
import type { ClozeVM } from '@/lib/mapper/explain-presenter'
import { adaptClozeVM } from './cloze-adapter'
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
const ENABLE_PASSAGE_DOCK_CLOZE =
  process.env.NEXT_PUBLIC_ENABLE_PASSAGE_DOCK_CLOZE !== 'false'

interface ClozeExplainProps {
  view: ClozeVM
  onHighlightSync?: (payload: { targetIndex: number; label?: string }) => void
}

/**
 * Blank card with progressive disclosure
 */
function BlankCard({
  question,
  blankIndex,
  totalBlanks,
  onExpand,
  onViewEvidence,
}: {
  question: ReturnType<typeof adaptClozeVM>['questions'][0]
  blankIndex: number
  totalBlanks: number
  onExpand: (qid: string, expanded: boolean) => void
  onViewEvidence: (qid: string, spans: typeof question.evidence) => void
}) {
  // Load expanded state from localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(`clozeCard:${question.id}`)
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
      localStorage.setItem(`clozeCard:${question.id}`, String(nextExpanded))
    } catch (error) {
      console.warn('[BlankCard] Failed to save expanded state:', error)
    }

    // Track event
    trackQuestionExpand({
      kind: 'E3',
      qid: question.id,
      expanded: nextExpanded,
    })

    onExpand(question.id, nextExpanded)
  }, [isExpanded, question.id, onExpand])

  const handleViewEvidence = useCallback(() => {
    if (!question.evidence || question.evidence.length === 0) {
      console.warn('[BlankCard] No evidence available for', question.id)
      return
    }

    onViewEvidence(question.id, question.evidence)
  }, [question.id, question.evidence, onViewEvidence])

  const hasEvidence = question.evidence && question.evidence.length > 0
  const correctOption = question.options?.find((opt) => opt.verdict === 'fit')

  return (
    <Card className="transition-all duration-200 hover:border-primary/30">
      <CardContent className="pt-6 space-y-4">
        {/* Blank number and context */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-xs font-medium">
                {question.blank?.number || blankIndex + 1}
              </span>
              <span className="text-xs text-muted-foreground">
                / {totalBlanks}
              </span>
            </div>

            {/* Context snippet */}
            {question.prompt && question.prompt !== `( ${question.blank?.number} )` && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {question.prompt}
              </p>
            )}
          </div>

          {/* Evidence button */}
          {hasEvidence && ENABLE_PASSAGE_DOCK_CLOZE && (
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
              🔍 查看證據
            </Button>
          )}
        </div>

        {/* Options (always visible) */}
        {question.options && question.options.length > 0 && (
          <div className="space-y-1.5">
            {question.options.map((option) => {
              const isCorrect = option.verdict === 'fit'
              const hasReason = option.reason && option.reason.length > 0

              return (
                <div
                  key={option.key}
                  className={`
                    rounded-lg px-3 py-2 text-sm leading-relaxed
                    transition-colors
                    ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'bg-background'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span
                        className={`
                          font-medium
                          ${isCorrect ? 'text-emerald-700 dark:text-emerald-200' : 'text-foreground'}
                        `}
                      >
                        {option.key}.{' '}
                      </span>
                      <span
                        className={isCorrect ? 'text-emerald-700 dark:text-emerald-200' : 'text-foreground'}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeInline(option.text),
                        }}
                      />
                    </div>

                    {/* Inline reason for wrong options (collapsed state) */}
                    {!isExpanded && !isCorrect && hasReason && (
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {option.reason.length > 40
                          ? option.reason.substring(0, 37) + '...'
                          : option.reason}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Discourse tag badge */}
        {question.discourseRole && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              {question.discourseRole}
            </span>
          </div>
        )}

        {/* Collapsed: One-line reason */}
        {!isExpanded && question.reasonOneLine && (
          <div className="space-y-2 pt-2 border-t">
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
            {/* Full explanation */}
            {question.fullExplanation && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div
                  dangerouslySetInnerHTML={{
                    __html: sanitizePassage(question.fullExplanation),
                  }}
                />
              </div>
            )}

            {/* Distractor analysis (wrong options only) */}
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
                        className="text-sm text-muted-foreground leading-relaxed pl-3 border-l-2 border-muted"
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
 * ClozeExplain v2 - Minimalist Cloze/Fill-in-Blank UI
 */
export default function ClozeExplain({ view, onHighlightSync }: ClozeExplainProps) {
  const startTime = useRef(markExplainStart(view.kind))

  // Adapt ClozeVM to unified LongFormExplainVM
  const unified = useMemo(() => adaptClozeVM(view), [view])

  // Evidence sync hook
  const { highlights, jumpToEvidence } = useEvidenceSync({
    kind: view.kind,
    highlightDuration: 3000, // 3 seconds auto-fade
    scrollBehavior: 'smooth',
    scrollOffset: ENABLE_PASSAGE_DOCK_CLOZE ? 120 : 80,
  })

  // Track explain view on mount
  useEffect(() => {
    trackExplainView({
      kind: view.kind,
      questionCount: unified.questions.length,
      source: 'api',
      startTime: startTime.current,
    })

    measureExplainRender(view.kind, startTime.current)
  }, [view.kind, unified.questions.length])

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
            kind={unified.kind} • blank={view.meta.blankIndex + 1}/{view.meta.totalBlanks} • dock=
            {ENABLE_PASSAGE_DOCK_CLOZE ? 'on' : 'off'}
          </div>
        )}

        {/* Passage Dock (sticky top) */}
        {ENABLE_PASSAGE_DOCK_CLOZE && unified.passage.paragraphs.length > 0 && (
          <PassageDock
            passage={unified.passage}
            highlights={highlights}
            kind={view.kind}
            storageKey="clozeDock"
            maxHeight="40vh"
            showParagraphNumbers
          />
        )}

        {/* Translation (if available) */}
        {unified.translation && (
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {unified.translation}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Blank cards */}
        <div className="space-y-4">
          {unified.questions.map((question, index) => (
            <BlankCard
              key={question.id}
              question={question}
              blankIndex={index}
              totalBlanks={view.meta.totalBlanks}
              onExpand={handleQuestionExpand}
              onViewEvidence={handleViewEvidence}
            />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  )
}
