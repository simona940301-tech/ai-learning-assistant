'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExplainViewModel } from '@/lib/types'
import type { ConservativeResult } from '@/lib/ai/conservative-types'
import { track } from '@plms/shared/analytics'
import Typewriter from './Typewriter'
import ConservativePresenter from './explain/ConservativePresenter'
import { toCanonicalKind, toLegacyCanonicalKind, type CanonicalKind, getKindLabel } from '@/lib/explain/kind-alias'
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
import { VocabularyExplain } from './explain/VocabularyExplain'
import { GrammarExplain } from './explain/GrammarExplain'
import { ClozeExplain } from './explain/ClozeExplain'
import ReadingExplain from './explain/ReadingExplain'
import { ParagraphOrganizationExplain } from './explain/ParagraphOrganizationExplain'
import { TranslationExplain } from './explain/TranslationExplain'
import { ContextualCompletionExplain } from './explain/ContextualCompletionExplain'
import { UnifiedExplain } from './explain/UnifiedExplain'
import { SharedPassageExplain } from './explain/SharedPassageExplain'
import { toQuestionSetVM } from '@/lib/mapper/explain-presenter'
import type { QuestionItem, SharedPassagePayload, IndependentListPayload } from '@/lib/explain/types'
import { detectMultipleQuestions } from '@/lib/explain/multi-question-detector'
import QuestionSetExplain from './explain/QuestionSetExplain'
import type { QuestionSetVM, E0Question } from '@/lib/mapper/vm/question-set'
import { supabaseBrowserClient } from '@/lib/supabase'
import { useFeatureFlag } from '@/lib/feature-flags'
import {
  analyseQuestionSet,
  detectQuestionSetKind,
  type QuestionSetAnalysis,
  type QuestionSetKind,
} from '@/lib/explain/question-set-detector'
import { X } from 'lucide-react'

interface ExplainCardV2Props {
  inputText: string
  questionId?: string // Optional: If from question bank, enables error_book tracking
  conservative?: boolean // Enable conservative mode
  onLoadingChange?: (isLoading: boolean) => void
}


/**
 * Loading state with 4-phase rotating messages
 */
function LoadingState({ currentStep }: { currentStep: number }) {
  const loadingSteps = [
    '正在分析題型…',
    '正在檢測語意結構…',
    '正在抽取關鍵訊息…',
    '正在生成詳解…',
  ]

  const message = loadingSteps[currentStep] || loadingSteps[0]

  return (
    <motion.div
      key={currentStep}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-6 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span>{message}</span>
      </div>
    </motion.div>
  )
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: '高信心',
  medium: '中信心',
  low: '低信心',
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
  medium: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  low: 'border-red-400/40 bg-red-500/15 text-red-200',
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const update = () => setIsMobile(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [breakpoint])

  return isMobile
}

interface ChipDescriptor {
  id: string
  label: string
  detail?: string
  helper?: string
}

interface ChipPanelProps {
  chip: ChipDescriptor | null
  onClose: () => void
  isMobile: boolean
}

function ChipPanel({ chip, onClose, isMobile }: ChipPanelProps) {
  if (!chip) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: isMobile ? '100%' : 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: isMobile ? '100%' : 320, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={`relative flex h-full w-full max-w-sm flex-col bg-zinc-950 p-6 text-sm text-zinc-200 shadow-xl shadow-blue-900/30 ${
          isMobile ? '' : 'border-l border-zinc-800'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full border border-zinc-700/60 p-1 text-zinc-400 transition hover:text-zinc-100"
          aria-label="關閉說明"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mt-6 space-y-3">
          <p className="text-xs uppercase tracking-wide text-blue-300/80">Micro Focus</p>
          <h3 className="text-lg font-semibold text-blue-100">{chip.label}</h3>
          {chip.helper && (
            <p className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-200/90">
              {chip.helper}
            </p>
          )}
          {chip.detail && (
            <p className="leading-relaxed text-zinc-300">
              {chip.detail}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

interface ClarityStripeProps {
  enabled: boolean
  data: ClarityStripeData | null
  onChipClick: (chip: ChipDescriptor) => void
}

interface ClarityStripeData {
  answerLabel?: string
  answerText?: string
  reason?: string
  canonicalKind?: CanonicalKind
  legacyKind?: string | undefined
  chips: ChipDescriptor[]
  confidence?: string
  kindLabel?: string | null
}

function ClarityStripe({ enabled, data, onChipClick }: ClarityStripeProps) {
  if (!enabled || !data) return null

  const { answerLabel, answerText, reason, chips, confidence, kindLabel } = data
  const reasonShort = reason ? Array.from(reason).slice(0, 20).join('') : undefined

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-blue-500/20 bg-blue-500/10 px-4 py-3">
      <div className="flex flex-1 flex-col gap-1 text-xs text-blue-50/80 sm:flex-row sm:items-center sm:gap-3 sm:text-sm">
        {kindLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-200/70 sm:text-xs">
            {kindLabel}
          </span>
        )}
        {answerLabel && (
          <span className="flex items-center gap-2 text-emerald-200">
            <span className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold">
              {answerLabel}
            </span>
            <span className="font-semibold text-emerald-100">{answerText}</span>
          </span>
        )}
        {reasonShort && (
          <span className="truncate text-xs text-blue-100/80 sm:text-sm" title={reason}>
            {reasonShort}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {confidence && (
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
              CONFIDENCE_STYLE[confidence] ?? 'border-blue-400/40 bg-blue-500/15 text-blue-100'
            }`}
          >
            {CONFIDENCE_LABEL[confidence] ?? confidence}
          </span>
        )}
        {chips.map((chip) => (
          <button
            key={chip.id}
            onClick={() => onChipClick(chip)}
            className="rounded-full border border-blue-400/40 bg-blue-500/15 px-2.5 py-1 text-xs text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/25"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ActionFooterProps {
  visible: boolean
  isSaving: boolean
  saveStatus: 'idle' | 'success' | 'error'
  saveMessage: string
  onPrimaryClick: () => void
  hasQuestionId?: boolean // ✅ 用於判斷按鈕文案
}

function ActionFooter({ visible, isSaving, saveStatus, saveMessage, onPrimaryClick, hasQuestionId }: ActionFooterProps) {
  if (!visible) return null

  return (
    <div className="sticky bottom-0 z-20 border-t border-zinc-800/40 bg-zinc-950/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={isSaving}
          className="w-full rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {isSaving ? '儲存中…' : hasQuestionId ? '加入錯題本' : '加入筆記'}
        </button>
        {saveStatus !== 'idle' && (
          <span
            className={`text-xs ${
              saveStatus === 'success' ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Convert ExplainViewModel (legacy API format) to ExplainCard (canonical format)
 */
function convertExplainViewModelToCard(vm: ExplainViewModel, inputText: string): ExplainCardModel {
  // Use legacy canonical kind for compatibility with ExplainCardModel
  const legacyKind = toLegacyCanonicalKind(vm.kind)

  // Extract answer key from answer string (e.g., "(A) answer" -> "A")  // Safe access with default
  const answerString = vm.answer || ''
  const answerMatch = answerString.match(/^\(?([A-E])\)?\s*/i)
  const answerKey = answerMatch ? answerMatch[1].toUpperCase() : undefined
  const answerText = answerString.replace(/^\(?[A-E]\)?\s*/i, '').trim()

  // Build options from distractorNotes if available
  const options = vm.distractorNotes?.map((note) => {
    const optionMatch = note.option.match(/^\(?([A-E])\)?\s*/i)
    const key = optionMatch ? optionMatch[1].toUpperCase() : note.option
    const text = note.note.split('｜')[0] || note.note

    return {
      key,
      text: text.trim(),
      verdict: key === answerKey ? ('fit' as const) : ('unfit' as const),
      reason: note.note,
    }
  }) || []

  // Add correct answer if not in distractorNotes
  if (answerKey && !options.find((opt) => opt.key === answerKey)) {
    options.push({
      key: answerKey,
      text: answerText || `選項 ${answerKey}`,
      verdict: 'fit' as const,
      reason: vm.briefReason || '',
    })
  }

  // Fallback: Parse options from inputText if not enough options (need min 2 for validation)
  if (options.length < 2) {
    const optionMatches = inputText.matchAll(/\(([A-E])\)\s*([^\n(]+)/gi)
    for (const match of optionMatches) {
      const key = match[1].toUpperCase()
      const text = match[2].trim()
      // Check for duplicates before adding
      if (text && !options.find((opt) => opt.key === key)) {
        options.push({
          key,
          text,
          verdict: key === answerKey ? ('fit' as const) : ('unfit' as const),
          reason: '',
        })
      }
    }
  }

  // Map legacy kind to ExplainCardModel kind
  let cardKind: 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7' | 'FALLBACK' = 'FALLBACK'
  if (legacyKind === 'unknown' || legacyKind === 'E8') {
    cardKind = 'FALLBACK'
  } else if (['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'].includes(legacyKind)) {
    cardKind = legacyKind as 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7'
  }

  return {
    id: nanoid(),
    question: inputText,
    kind: cardKind,
    translation: vm.cnTranslation,
    cues: vm.grammarHighlights || [],
    options,
    steps: vm.fullExplanation
      ? [{ title: '解題步驟', detail: vm.fullExplanation }]
      : [{ title: '解析', detail: vm.briefReason }],
    correct: answerKey
      ? {
          key: answerKey,
          text: answerText,
          reason: vm.briefReason,
        }
      : undefined,
    vocab: [],
    meta: {
      evidenceBlocks: vm.evidenceBlocks,
      discourseRole: vm.discourseRole,
      mixAnswerExtra: vm.mixAnswerExtra,
    },
    nextActions: [],
  }
}

/**
 * Check rendering threshold for each kind
 */
function getMissingFields(view: ExplainVM | null): string[] {
  if (!view) return ['view is null']
  
  const missing: string[] = []
  
  switch (view.kind) {
    case 'E1': // Vocabulary
      if (!view.stem?.en) missing.push('question.text')
      if (!view.options || view.options.length < 2) missing.push('choices (min 2)')
      if (!view.answer) missing.push('answer')
      break
    case 'E2': // Grammar
      if (!view.stem?.en) missing.push('sentence')
      if (!view.options || view.options.length < 2) missing.push('choices (min 2)')
      if (!view.answer) missing.push('answer')
      break
    case 'E3': // Cloze
      if (!view.article?.en) missing.push('passage')
      if (!view.meta?.blankIndex) missing.push('blanks')
      break
    case 'E4': // Reading
      if (!view.passage?.paragraphs || view.passage.paragraphs.length < 1) missing.push('passage.text')
      if (!view.questions || view.questions.length < 1) missing.push('questions (min 1)')
      break
    case 'E5': // Translation
      if (!view.stem?.en) missing.push('source')
      break
    case 'E6': // Paragraph Organization
      if (!view.blanks || view.blanks.length < 1) missing.push('blanks')
      break
    case 'E7': // Contextual Completion
      if (!view.questions || view.questions.length < 1) missing.push('questions')
      break
    default:
      // Generic fallback
      if (!view.stem?.en && !view.answer) missing.push('stem or answer')
  }
  
  return missing
}

/**
 * Dev Fallback UI - 優雅處理未知題型 + 缺欄位提示
 */
function DevFallbackUI({ 
  data, 
  kind,
  missingFields = [],
}: { 
  data: any
  kind: CanonicalKind | undefined
  missingFields?: string[]
}) {
  const displayKind = kind || 'unknown'
  const legacyKind = kind ? toLegacyCanonicalKind(kind) : 'unknown'

  return (
    <Card className="border-yellow-500/50 bg-yellow-500/10">
      <CardHeader>
        <CardTitle className="text-yellow-600 dark:text-yellow-400 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>題型未知 ({getKindLabel(legacyKind)})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="text-zinc-600 dark:text-zinc-400">
            <div className="font-medium mb-1">
              Kind: <code className="px-1.5 py-0.5 bg-zinc-800/30 rounded">{displayKind}</code>
      </div>
            {missingFields.length > 0 && (
              <div className="mt-2">
                <div className="font-medium mb-1 text-red-400">缺欄位：</div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {missingFields.map((field, idx) => (
                    <li key={idx}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs mt-2">建議聯繫支援團隊處理此題型。</p>
          </div>
          {process.env.NODE_ENV !== 'production' && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
                View Raw Data (Dev Mode)
              </summary>
              <pre className="text-xs overflow-auto max-h-96 mt-2 p-2 bg-zinc-900/50 rounded border border-zinc-800/50">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Render content by kind - 使用專業組件系統
 */
function renderByKind(view: ExplainVM): React.ReactNode {
  const motionProps = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.3 },
  }

  switch (view.kind) {
    case 'E1':
      return (
        <motion.div key="vocabulary-card" {...motionProps}>
          <VocabularyExplain view={view as VocabularyVM} />
        </motion.div>
      )
    case 'E2':
      return (
        <motion.div key="grammar-card" {...motionProps}>
          <GrammarExplain view={view as GrammarVM} />
        </motion.div>
      )
    case 'E3':
      return (
        <motion.div key="cloze-card" {...motionProps}>
          <ClozeExplain view={view as ClozeVM} />
        </motion.div>
      )
    case 'E4':
      return (
        <motion.div key="reading-card" {...motionProps}>
          <ReadingExplain view={view as ReadingVM} />
        </motion.div>
      )
    case 'E5':
      return (
        <motion.div key="translation-card" {...motionProps}>
          <TranslationExplain view={view as TranslationVM} />
        </motion.div>
      )
    case 'E6':
      return (
        <motion.div key="paragraph-organization-card" {...motionProps}>
          <ParagraphOrganizationExplain view={view as ParagraphOrganizationVM} />
        </motion.div>
      )
    case 'E7':
      return (
        <motion.div key="contextual-completion-card" {...motionProps}>
          <ContextualCompletionExplain view={view as ContextualCompletionVM} />
        </motion.div>
      )
    case 'GENERIC':
    default:
      return (
        <motion.div key="generic-card" {...motionProps}>
          <GenericExplain view={view as GenericVM} />
        </motion.div>
      )
  }
}

/**
 * 統一格式渲染器
 */
function UnifiedExplainRenderer({ data }: { data: { type: string; data: any } }) {
  if (data.type === 'structured') {
    const structured = data.data
    return (
      <UnifiedExplain
        question={structured.question || ''}
        options={structured.options || []}
        answer={structured.answer || ''}
        reasoning={structured.reasoning || ''}
        counterpoints={structured.counterpoints}
        optionDetails={structured.optionDetails}
        tips={structured.tips}
      />
    )
  }

  if (data.type === 'questions') {
    const questions = data.data as IndependentListPayload
    if (questions.length === 0) return null

    return (
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={idx}>
            {idx > 0 && <div className="my-6 border-t border-zinc-800/50" />}
            <UnifiedExplain
              question={q.question || ''}
              options={q.options || []}
              answer={q.explanation.answer}
              reasoning={q.explanation.reasoning}
              counterpoints={q.explanation.counterpoints}
              optionDetails={q.explanation.optionDetails}
              tips={q.tips}
            />
          </div>
        ))}
      </div>
    )
  }

  if (data.type === 'sharedPassage') {
    const shared = data.data as SharedPassagePayload
    return <SharedPassageExplain data={shared} />
  }

  return null
}

/**
 * Markdown 渲染器（fallback）
 */
function MarkdownRenderer({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
        {markdown}
      </div>
    </div>
  )
}

/**
 * Generic Explain Component - 簡化版通用解析（向後兼容）
 */
function GenericExplain({ view }: { view: GenericVM }) {
  return (
    <div className="space-y-3">
      {view.answer && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">答案</div>
          <div className="text-lg text-green-400 font-semibold">
            <Typewriter text={`${view.answer.label}. ${view.answer.text}`} />
          </div>
        </div>
      )}
      {view.stem.en && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm text-zinc-200">{view.stem.en}</div>
          {view.stem.zh && (
            <div className="text-sm text-zinc-400 mt-2">{view.stem.zh}</div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Main ExplainCardV2 component - 極簡統一架構
 */
export default function ExplainCardV2({ inputText, questionId, conservative = false, onLoadingChange }: ExplainCardV2Props) {
  const [vm, setVm] = useState<ExplainViewModel | null>(null)
  const [questionSetVM, setQuestionSetVM] = useState<QuestionSetVM | null>(null)
  const [conservativeResult, setConservativeResult] = useState<ConservativeResult | null>(null)
  const [isLoading, setIsLoading] = useState(() => Boolean(inputText))
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [questionSetKind, setQuestionSetKind] = useState<QuestionSetKind>('unknown')
  const [questionSetAnalysis, setQuestionSetAnalysis] = useState<QuestionSetAnalysis | null>(null)
  const [activeChip, setActiveChip] = useState<ChipDescriptor | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [pauseHighlights, setPauseHighlights] = useState(false)

  const clarityStripeEnabled = useFeatureFlag('CLARITY_STRIPE_V1')
  const evidenceLensEnabled = useFeatureFlag('READING_EVIDENCE_LENS')
  const isMobile = useIsMobile()
  const abortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    onLoadingChange?.(isLoading)
  }, [isLoading, onLoadingChange])

  useEffect(() => {
    return () => {
      onLoadingChange?.(false)
    }
  }, [onLoadingChange])


  const buildChipDescriptors = useCallback((question: E0Question): ChipDescriptor[] => {
    const chips: ChipDescriptor[] = []
    const meta = question.meta ?? {}
    const contract = (meta.contract ?? {}) as Record<string, any>

    const transitionWord = meta.transition_word ?? contract.transition_word
    if (transitionWord) {
      chips.push({
        id: 'transition_word',
        label: transitionWord,
        helper: '轉折提示',
        detail: contract.transition_word_note || '掌握文章轉折語氣與線索。',
      })
    }

    const testedRule =
      meta.tested_rule ||
      contract.tested_rule ||
      contract.grammatical_focus ||
      contract.focus ||
      ''
    if (testedRule) {
      chips.push({
        id: 'tested_rule',
        label: String(testedRule),
        helper: '考點',
        detail: contract.rule_explanation || question.one_line_reason || '對應的文法或語意考點。',
      })
    }

    const keywords: string[] = Array.isArray(meta.keywords)
      ? meta.keywords
      : Array.isArray(contract.keywords)
      ? contract.keywords
      : []
    if (keywords.length > 0) {
      chips.push({
        id: 'keyword',
        label: keywords[0],
        helper: '關鍵詞',
        detail: keywords.slice(0, 3).join('、'),
      })
    }

    if (Array.isArray(contract.vocab) && contract.vocab.length > 0 && typeof contract.vocab[0] === 'string') {
      chips.push({
        id: 'vocab',
        label: contract.vocab[0],
        helper: '焦點字詞',
        detail: contract.vocab.slice(0, 3).join('、'),
      })
    }

    return chips
  }, [])

  // 先定義 explainView，再定義 buildWrongbookNote
  // Convert ExplainViewModel to ExplainCard, then to ExplainVM（保留作為 fallback）
  const explainView = useMemo<ExplainVM | null>(() => {
    if (!vm) return null

    // 如果已經有新格式，不需要轉換
    if ((vm as any).structured || (vm as any).questions || (vm as any).sharedPassage) {
      return null
    }

    // Normalize kind immediately
    const canonicalKind = toCanonicalKind(vm.kind)
    console.log(`[ExplainCardV2] Normalized: ${vm.kind} → ${canonicalKind}`)

    // Convert to ExplainCard format
    const card = convertExplainViewModelToCard(vm, inputText)
    
    // Present using presenter
    const view = presentExplainCard(card)
    
    if (!view) {
      console.warn('[ExplainCardV2] Failed to present card')
      return null
    }

    return view
  }, [vm, inputText])

  const buildWrongbookNote = useCallback((): string => {
    const lines: string[] = ['# 錯題筆記', '']

    // 優先使用新格式的 structuredData（直接從 vm 提取）
    const currentStructuredData = vm ? (() => {
      if ((vm as any).structured) {
        return { type: 'structured' as const, data: (vm as any).structured }
      }
      if ((vm as any).questions) {
        return { type: 'questions' as const, data: (vm as any).questions }
      }
      if ((vm as any).sharedPassage) {
        return { type: 'sharedPassage' as const, data: (vm as any).sharedPassage }
      }
      return null
    })() : null

    if (currentStructuredData) {
      if (currentStructuredData.type === 'sharedPassage') {
        const shared = currentStructuredData.data as SharedPassagePayload
        if (shared.sharedPassage) {
          lines.push('## Passage', shared.sharedPassage.trim(), '')
        }
        shared.questions.forEach((q, idx) => {
          lines.push(`## Q${idx + 1}`, q.question || '', '')
          if (q.explanation.answer) {
            lines.push(`- 答案：${q.explanation.answer}`)
          }
          if (q.explanation.reasoning) {
            lines.push(`- 理由：${q.explanation.reasoning}`)
          }
          lines.push('')
        })
        return lines.join('\n')
      }
      
      if (currentStructuredData.type === 'questions') {
        const questions = currentStructuredData.data as IndependentListPayload
        questions.forEach((q, idx) => {
          lines.push(`## Q${idx + 1}`, q.question || '', '')
          if (q.explanation.answer) {
            lines.push(`- 答案：${q.explanation.answer}`)
          }
          if (q.explanation.reasoning) {
            lines.push(`- 理由：${q.explanation.reasoning}`)
          }
          lines.push('')
        })
        return lines.join('\n')
      }
      
      if (currentStructuredData.type === 'structured') {
        const structured = currentStructuredData.data
        lines.push(`- 題幹：${structured.question || inputText}`)
        if (structured.answer) {
          lines.push(`- 答案：${structured.answer}`)
        }
        if (structured.reasoning) {
          lines.push(`- 理由：${structured.reasoning}`)
        }
        lines.push('')
        return lines.join('\n')
      }
    }

    if (questionSetVM && questionSetVM.questions.length > 0) {
      if (questionSetAnalysis?.passage) {
        lines.push('## Passage', questionSetAnalysis.passage.trim(), '')
      }

      questionSetVM.questions.forEach((question, index) => {
        lines.push(`## Q${index + 1}`, question.stem, '')
        if (question.answer_label || question.answer) {
          lines.push(`- 答案：${question.answer_label ?? ''} ${question.answer ?? ''}`.trim())
        }
        if (question.one_line_reason) {
          lines.push(`- 一句理由：${question.one_line_reason}`)
        }
        if (question.distractor_rejects?.length) {
          lines.push('- 排除：')
          question.distractor_rejects.forEach((reject) => {
            lines.push(`  - ${reject.option}: ${reject.reason || '未提供理由'}`)
          })
        }
        const meta = question.meta ?? {}
        if (meta.transition_word) {
          lines.push(`- 轉折詞：${meta.transition_word}`)
        }
        if (meta.tested_rule) {
          lines.push(`- 考點：${meta.tested_rule}`)
        }
        lines.push('')
      })
      return lines.join('\n')
    }

    if (explainView) {
      lines.push(`- 題幹：${explainView.stem?.en ?? inputText}`)
      if (explainView.answer?.label || explainView.answer?.text) {
        lines.push(`- 答案：${explainView.answer.label ?? ''} ${explainView.answer.text ?? ''}`.trim())
      }
      if (explainView.meta && 'reasonLine' in explainView.meta && explainView.meta.reasonLine) {
        lines.push(`- 一句理由：${(explainView.meta as any).reasonLine}`)
      }
      if (Array.isArray(explainView.options) && explainView.options.length > 0) {
        lines.push('- 選項解析：')
        explainView.options.forEach((option) => {
          if (option.reason) {
            lines.push(`  - ${option.label}: ${option.reason}`)
          }
        })
      }
      lines.push('')
      return lines.join('\n')
    }

    lines.push(inputText.trim())
    return lines.join('\n')
  }, [questionSetVM, questionSetAnalysis, explainView, inputText, vm])

  // 直接使用 API 返回的結構化資料，不再轉換為 E1-E7 格式
  // 如果 API 返回了 structured 或 questions/sharedPassage，直接使用
  const structuredData = useMemo(() => {
    if (!vm) return null
    
    // 優先使用新的結構化格式
    if ((vm as any).structured) {
      return { type: 'structured', data: (vm as any).structured }
    }
    if ((vm as any).questions) {
      return { type: 'questions', data: (vm as any).questions }
    }
    if ((vm as any).sharedPassage) {
      return { type: 'sharedPassage', data: (vm as any).sharedPassage }
    }
    
    // 如果沒有新格式，返回 null（將使用 markdown 渲染）
    return null
  }, [vm])


  // Check rendering threshold and get missing fields（僅用於舊格式 fallback）
  const missingFields = useMemo(() => {
    if (!explainView) return []
    return getMissingFields(explainView)
  }, [explainView])
  const canRender = useMemo(() => missingFields.length === 0, [missingFields])
  const clarityStripeData = useMemo<ClarityStripeData | null>(() => {
    if (questionSetVM && questionSetVM.questions.length > 0) {
      const primary = questionSetVM.questions[0]
      const canonicalKind = toCanonicalKind(primary.kind)
      const legacyKind = canonicalKind ? toLegacyCanonicalKind(canonicalKind) : undefined
      const metaContract = (primary.meta?.contract ?? {}) as Record<string, any>
      const confidence =
        (primary.meta?.confidence_badge ?? metaContract.confidence_badge) as string | undefined

      return {
        answerLabel: primary.answer_label,
        answerText: primary.answer,
        reason: primary.one_line_reason,
        canonicalKind,
        legacyKind,
        chips: buildChipDescriptors(primary),
        confidence,
        kindLabel: canonicalKind ? getKindLabel(canonicalKind) : null,
      }
    }

    if (vm) {
      const canonicalKind = toCanonicalKind(vm.kind)
      const legacyKind = canonicalKind ? toLegacyCanonicalKind(canonicalKind) : undefined
      const answerMatch = vm.answer?.match(/^\(?([A-E])\)?\s*(.*)$/i)

      return {
        answerLabel: answerMatch ? answerMatch[1].toUpperCase() : undefined,
        answerText: answerMatch ? answerMatch[2]?.trim() : vm.answer,
        reason: vm.briefReason,
        canonicalKind,
        legacyKind,
        chips: [],
        confidence: undefined,
        kindLabel: canonicalKind ? getKindLabel(canonicalKind) : null,
      }
    }

    return null
  }, [questionSetVM, vm, buildChipDescriptors])

  // Fetch explanation with 4-phase loading + AbortController
  useEffect(() => {
    if (!inputText.trim()) return

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    const loadingSteps = [
      '正在分析題型…',
      '正在檢測語意結構…',
      '正在抽取關鍵訊息…',
      '正在生成詳解…',
    ]

    const fetchExplanation = async () => {
      // Create new AbortController
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setError(null)
      setLoadingStep(0)
      setQuestionSetKind('unknown')
      setQuestionSetAnalysis(null)
      setActiveChip(null)
      setSaveStatus('idle')
      setSaveMessage('')

      // Phase 1-3: Rotate through loading messages (1.2s each)
      for (let i = 0; i < loadingSteps.length - 1; i++) {
        if (controller.signal.aborted) return
        setLoadingStep(i)
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }

      // Phase 4: Final step before API call
      if (controller.signal.aborted) return
      setLoadingStep(loadingSteps.length - 1)

      try {
        // Track request
        track('explain.request' as any, {
          mode: conservative ? 'conservative' : 'unified',
          input_len: inputText.length,
        })

        const startTime = performance.now()

        console.log('[ExplainCardV2] Requesting explanation for:', inputText.substring(0, 50) + '...', conservative ? '(conservative mode)' : '')

        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: inputText },
            mode: 'deep', // Always use deep mode (equivalent to unified)
            conservative,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`)
        }

        const data = await res.json()
        const latency = performance.now() - startTime

        if (conservative && data.detected_type) {
          // Conservative mode response
          console.log('[ExplainCardV2] Conservative explanation received:', {
            type: data.detected_type,
            confidence: data.confidence,
            latency_ms: Math.round(latency),
          })

          track('explain.render' as any, {
            mode: 'conservative',
            kind: data.detected_type,
            latency_ms: Math.round(latency),
            vm_valid: true,
            missing_fields: [],
          })

          setConservativeResult(data as ConservativeResult)
        } else {
          // Normal TARS+KCE response
          // Check if response is E0_QUESTION_SET or needs multi-question detection
          const isE0Response = data.type === 'E0_QUESTION_SET'
          const needsMultiDetection = !isE0Response && detectMultipleQuestions(inputText)
          
          if (isE0Response || needsMultiDetection) {
            // Convert to QuestionSetVM
            const qset = toQuestionSetVM(data)
            setQuestionSetVM(qset)
            setVm(null) // Clear single-question VM

            const analysis = analyseQuestionSet(inputText)
            setQuestionSetAnalysis(analysis)
            setQuestionSetKind(analysis.questionKind)
            
            // Track E0 render
            track('explain.render' as any, {
              type: 'E0',
              total: qset.questions.length,
              kinds: qset.questions.map((q) => q.kind),
            latency_ms: Math.round(latency),
          })

            // Track each question
            qset.questions.forEach((q) => {
              track('explain.question.render' as any, {
                qid: q.qid,
                kind: q.kind,
                has_reason: !!q.one_line_reason,
                choices: q.choices.length,
              })
            })
          } else {
            // Single question - use existing flow
            const normalizedKind = toCanonicalKind(data.kind)
            console.log('[ExplainCardV2] Explanation received:', {
              originalKind: data.kind,
              normalizedKind,
            latency_ms: Math.round(latency),
          })

          setVm(data as ExplainViewModel)
            setQuestionSetVM(null) // Clear question set
            setQuestionSetAnalysis(null)
            setQuestionSetKind('unknown')

            // Track after view is computed (in next render)
            setTimeout(() => {
              track('explain.render' as any, {
                mode: 'unified',
                kind: normalizedKind,
                originalKind: data.kind,
                latency_ms: Math.round(latency),
                vm_valid: canRender,
                missing_fields: missingFields,
              })
            }, 0)
          }
        }

        setIsLoading(false)
        console.log('[ExplainCardV2] Rendering completed')
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[ExplainCardV2] Request aborted')
          return
        }
        
        console.error('[ExplainCardV2] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setIsLoading(false)
      } finally {
        abortRef.current = null
      }
    }

    fetchExplanation()

    // Cleanup: abort on unmount or input change
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }
    }
  }, [inputText, conservative])

  const handlePrimaryAction = useCallback(async () => {
    if (isSaving) return

    try {
      setIsSaving(true)
      setSaveStatus('idle')
      setSaveMessage('')

      const canonicalSkill =
        clarityStripeData?.legacyKind ??
        (questionSetKind !== 'unknown' ? `english_${questionSetKind}` : vm?.kind ?? 'english')
      const questionTitle = questionSetVM
        ? `題組解析（${questionSetVM.questions.length} 題）`
        : explainView?.stem?.en ?? inputText.slice(0, 60)

      const {
        data: sessionData,
        error: sessionError,
      } = await supabaseBrowserClient.auth.getSession()

      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('請先登入以收藏錯題')
      }

      const accessToken = sessionData.session.access_token
      const userId = sessionData.session.user?.id

      if (!userId) {
        throw new Error('請先登入以收藏錯題')
      }

      // ✅ 雙軌邏輯：有 questionId → error_book (可追蹤重複)，無 questionId → backpack_notes (純筆記)
      if (questionId) {
        // Route 1: 存到 error_book（可追蹤題目、間隔重複）
        const res = await fetch('/api/error-book', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ questionId }),
        })

        if (!res.ok) {
          throw new Error('儲存錯題失敗，請稍後再試')
        }

        setSaveStatus('success')
        setSaveMessage('已加入錯題本（可追蹤復習）')
      } else {
        // Route 2: 存到 backpack_notes（純筆記，標記為錯題資料夾）
        const note_md = buildWrongbookNote()

        const res = await fetch('/api/backpack/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            user_id: userId,
            question: questionTitle,
            canonical_skill: canonicalSkill ?? 'english',
            note_md,
            folder: 'error_book', // ✅ 標記為錯題本資料夾
          }),
        })

        if (!res.ok) {
          throw new Error('儲存筆記失敗，請稍後再試')
        }

        setSaveStatus('success')
        setSaveMessage('已加入錯題筆記')
      }

      track('explain.action' as any, {
        action: 'save-error',
        mode: questionSetVM ? 'question-set' : 'single',
        status: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '儲存錯題失敗'
      setSaveStatus('error')
      setSaveMessage(message)
      track('explain.action' as any, {
        action: 'save-error',
        mode: questionSetVM ? 'question-set' : 'single',
        status: 'error',
        message,
      })
    } finally {
      setIsSaving(false)
    }
  }, [
    isSaving,
    buildWrongbookNote,
    clarityStripeData,
    questionSetKind,
    questionSetVM,
    explainView,
    inputText,
    vm,
  ])

  const handleChipClick = useCallback(
    (chip: ChipDescriptor) => {
      track('explain.focus-chip' as any, {
        chip: chip.id,
        mode: questionSetVM ? 'question-set' : 'single',
      })
      setActiveChip(chip)
    },
    [questionSetVM],
  )

  // Update tracking when view changes
  useEffect(() => {
    if (explainView && !isLoading && !conservativeResult) {
      const normalizedKind = toCanonicalKind(vm?.kind || 'unknown')
      track('explain.render' as any, {
        mode: 'unified',
        kind: normalizedKind,
        originalKind: vm?.kind,
        vm_valid: canRender,
        missing_fields: missingFields,
      })
    }
  }, [explainView, canRender, missingFields, vm, isLoading, conservativeResult])

  return (
    <div className="relative flex min-h-[40vh] max-h-[70vh] flex-col overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-950/10 backdrop-blur">
      <ClarityStripe
        enabled={clarityStripeEnabled}
        data={clarityStripeData}
        onChipClick={handleChipClick}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {isLoading && <LoadingState key={loadingStep} currentStep={loadingStep} />}
          </AnimatePresence>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {conservativeResult && !isLoading && (
            <ConservativePresenter result={conservativeResult} />
          )}

          {questionSetVM && !isLoading && !conservativeResult && (
            <QuestionSetExplain
              vm={questionSetVM}
              detectedKind={questionSetKind}
              analysis={questionSetAnalysis}
              evidenceLensEnabled={evidenceLensEnabled}
              pauseHighlights={pauseHighlights}
              onPauseHighlights={setPauseHighlights}
            />
          )}

          {/* 優先使用新的統一格式渲染 */}
          {!questionSetVM && structuredData && !isLoading && !conservativeResult && (
            <UnifiedExplainRenderer data={structuredData} />
          )}

          {/* 如果有 markdown，使用 markdown 渲染 */}
          {!questionSetVM && !structuredData && vm?.fullExplanation && !isLoading && !conservativeResult && (
            <MarkdownRenderer markdown={vm.fullExplanation} />
          )}

          {/* Fallback: 使用舊格式（向後兼容） */}
          {!questionSetVM && !structuredData && !vm?.fullExplanation && explainView && canRender && !isLoading && !conservativeResult && (
            <AnimatePresence mode="wait">
              {renderByKind(explainView)}
            </AnimatePresence>
          )}

          {!questionSetVM && vm && !structuredData && !vm?.fullExplanation && (!explainView || !canRender) && !isLoading && !conservativeResult && (
            <DevFallbackUI data={vm} kind={toCanonicalKind(vm.kind)} missingFields={missingFields} />
          )}
        </div>
      </div>

      <ActionFooter
        visible={!isLoading && !conservativeResult && (questionSetVM || explainView || vm)}
        isSaving={isSaving}
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        onPrimaryClick={handlePrimaryAction}
        hasQuestionId={Boolean(questionId)}
      />

      <AnimatePresence>
        {activeChip && (
          <ChipPanel chip={activeChip} onClose={() => setActiveChip(null)} isMobile={isMobile} />
        )}
      </AnimatePresence>
    </div>
  )
}

export { ClarityStripe, ActionFooter }
