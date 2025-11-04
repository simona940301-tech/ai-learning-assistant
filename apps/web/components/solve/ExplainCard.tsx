'use client'

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Share2 } from 'lucide-react'
import { track } from '@plms/shared/analytics'
import type { ExplainCard as ExplainCardModel } from '@/lib/contracts/explain'
import {
  presentExplainCard,
  type ExplainVM,
  type VocabularyVM,
  type GrammarVM,
  type ClozeVM,
  type ReadingVM,
  type TranslationVM,
  type ParagraphOrganizationVM,
  type ContextualCompletionVM,
  type GenericVM,
} from '@/lib/mapper/explain-presenter'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChoiceAnalysis } from './ChoiceAnalysis'
import { ExtendedVocab } from './ExtendedVocab'
import { VocabularyExplain } from './explain/VocabularyExplain'
import { GrammarExplain } from './explain/GrammarExplain'
import { ClozeExplain } from './explain/ClozeExplain'
import ReadingExplain from './explain/ReadingExplain'
import { TranslationExplain } from './explain/TranslationExplain'
import { ParagraphOrganizationExplain } from './explain/ParagraphOrganizationExplain'
import { ContextualCompletionExplain } from './explain/ContextualCompletionExplain'

interface ExplainCardProps {
  card: ExplainCardModel | null
  actionsDisabled?: boolean
}

export default function ExplainCard({ card, actionsDisabled = false }: ExplainCardProps) {
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const articleRef = useRef<HTMLDivElement | null>(null)

  // FE Boundary: Log raw card data when received
  useEffect(() => {
    const DEBUG = process.env.NEXT_PUBLIC_DEBUG === '1' || process.env.NEXT_PUBLIC_DEBUG === 'true'
    if (DEBUG && card) {
      const meta = card.meta as any
      const sampleQuestions = Array.isArray(meta?.questions) ? meta.questions : []
      console.log('[FE boundary] raw.explain keys:', Object.keys(card))
      console.log('[FE boundary] preview meta.questions:', sampleQuestions.map((q: any) => ({
        id: q.id,
        keys: Object.keys(q),
        reasoning: q.reasoning ? String(q.reasoning).substring(0, 60) : 'missing',
        counterpoints: q.counterpoints ? Object.keys(q.counterpoints) : 'missing',
        common_mistake: q.common_mistake ? String(q.common_mistake).substring(0, 60) : 'missing',
        evidence: q.evidence ? String(q.evidence).substring(0, 60) : 'missing',
      })))
    }
  }, [card])

  const view = useMemo<ExplainVM | null>(() => presentExplainCard(card), [card])

  // Extract debug metrics for dev banner
  const stem = card?.question || ''
  const options = card?.options || []
  const numberedBlankMatches = stem.match(/\(\d+\)/g) ?? []
  const uniqueNumberedBlanks = new Set(numberedBlankMatches.map((token) => token.replace(/\D/g, ''))).size
  const hasNumberedBlanks = uniqueNumberedBlanks >= 2 || numberedBlankMatches.length >= 2
  
  const optionTexts = options.map((o: any) => o.text?.toLowerCase().trim() || '')
  let choicesShape: 'words' | 'phrases' | 'sentences' | 'unknown' = 'unknown'
  const allSingleWords = optionTexts.every((t) => t.split(/\s+/).length === 1)
  const choicesAreFullSentences = optionTexts.some((text) => {
    const wordCount = text.split(/\s+/).length
    const hasPunctuation = /[.!?。！？]$/.test(text.trim())
    const startsWithCapital = /^[A-Z]/.test(text.trim())
    return (wordCount >= 8 || hasPunctuation) && startsWithCapital
  })
  const choicesAreWordsOrPhrases = optionTexts.every((text) => {
    const wordCount = text.split(/\s+/).length
    return wordCount <= 5
  })
  
  if (allSingleWords) {
    choicesShape = 'words'
  } else if (choicesAreWordsOrPhrases && !choicesAreFullSentences) {
    choicesShape = 'phrases'
  } else if (choicesAreFullSentences) {
    choicesShape = 'sentences'
  }
  
  const passageChars = stem.length
  const optionsCount = options.length

  useEffect(() => {
    setHasTrackedView(false)
  }, [view?.id])

  useEffect(() => {
    if (!view || hasTrackedView) return
    track('explain.view', {
      id: view.id,
      kind: view.kind,
      order: view.order,
    })
    setHasTrackedView(true)
  }, [view, hasTrackedView])

  if (!card || !view) {
    return null
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[ExplainCard kind]', view?.kind, view)
  }

  const renderedContent = renderByKind(view)

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3"
      ref={articleRef}
    >
      {/* Dev Banner (development only) */}
      {process.env.NODE_ENV !== 'production' && view && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-3 py-2 text-xs">
          <div className="font-semibold text-yellow-600 dark:text-yellow-400">[DEV] Router Debug</div>
          <div className="mt-1 space-y-0.5 text-yellow-700 dark:text-yellow-300">
            <div>kind: <span className="font-mono">{view.kind}</span></div>
            <div>optionsCount: <span className="font-mono">{optionsCount}</span></div>
            <div>hasNumberedBlanks: <span className="font-mono">{hasNumberedBlanks ? 'true' : 'false'}</span></div>
            <div>choicesShape: <span className="font-mono">{choicesShape}</span></div>
            <div>passageChars: <span className="font-mono">{passageChars}</span></div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">{renderedContent}</AnimatePresence>
      <section className="flex flex-wrap gap-2 pt-2">
        <ActionButton
          disabled={actionsDisabled}
          label="✏️ Edit this question"
          onClick={() => console.log('[ExplainCard] Edit this question')}
        />
        <ActionButton
          disabled={actionsDisabled}
          label="🎒 Add to Backpack"
          onClick={() => console.info('[ExplainCard] Added to Backpack ✓')}
        />
        <ActionButton
          disabled={actionsDisabled}
          label="📚 Try similar past questions"
          onClick={() => console.log('[ExplainCard] Try similar past questions')}
        />
      </section>
    </motion.article>
  )

  function renderByKind(currentView: ExplainVM) {
    switch (currentView.kind) {
      case 'E1':
        return (
          <motion.div
            key="vocabulary-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <VocabularyExplain view={currentView as VocabularyVM} />
          </motion.div>
        )
      case 'E2':
        return (
          <motion.div
            key="grammar-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <GrammarExplain view={currentView as GrammarVM} />
          </motion.div>
        )
      case 'E3':
        return (
          <motion.div
            key="cloze-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <ClozeExplain view={currentView as ClozeVM} onHighlightSync={handleHighlightSync} />
          </motion.div>
        )
      case 'E4':
        return (
          <motion.div
            key="reading-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <ReadingExplain view={currentView as ReadingVM} onHighlightSync={handleHighlightSync} />
          </motion.div>
        )
      case 'E5':
        return (
          <motion.div
            key="translation-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <TranslationExplain view={currentView as TranslationVM} />
          </motion.div>
        )
      case 'E6':
        return (
          <motion.div
            key="paragraph-organization-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <ParagraphOrganizationExplain view={currentView as ParagraphOrganizationVM} onHighlightSync={handleHighlightSync} />
          </motion.div>
        )
      case 'E7':
        return (
          <motion.div
            key="contextual-completion-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            <ContextualCompletionExplain view={currentView as ContextualCompletionVM} onHighlightSync={handleHighlightSync} />
          </motion.div>
        )
      case 'GENERIC':
      default:
        return (
          <motion.div
            key="generic-card"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            <GenericExplain view={currentView as GenericVM} />
          </motion.div>
        )
    }
  }

  function handleHighlightSync(payload: { targetIndex: number; label?: string }) {
    if (!view) return
    track('highlight.sync', {
      id: view.id,
      kind: view.kind,
      ...payload,
    })
  }
}

function GenericExplain({ view }: { view: GenericVM }) {
  function truncateReason(reason: string, maxLength = 30): string {
    if (reason.length <= maxLength) return reason
    return `${reason.slice(0, maxLength).trim()}…`
  }

  return (
    <div className="space-y-3">
      {/* 題幹 */}
      <Card>
        <CardContent className="space-y-2 pt-6">
          <p className="text-sm leading-relaxed text-foreground">{view.stem.en}</p>
          {view.stem.zh && <p className="text-sm leading-relaxed text-muted-foreground">{view.stem.zh}</p>}
        </CardContent>
      </Card>

      {/* 選項分析 */}
      {view.options && view.options.length > 0 && (
        <Card>
          <CardContent className="space-y-1.5 pt-6">
            {view.options.map((option) => {
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

      {/* 正確答案 */}
      {view.answer && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-200">
              {view.answer.label}. {view.answer.text}
            </div>
            {view.meta?.reasonLine && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {truncateReason(view.meta.reasonLine)}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 延伸字彙 */}
      {view.vocab && view.vocab.length > 0 && <ExtendedVocab items={view.vocab} />}
    </div>
  )
}

function ActionButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean
  label: string
  onClick: () => void
}) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={disabled ? 'Generating...' : undefined}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-background/80"
    >
      <span>{label}</span>
    </button>
  )
}
