'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExplainViewModel } from '@/lib/types'
import type { ConservativeResult } from '@/lib/ai/conservative-types'
import { track } from '@plms/shared/analytics'
import ConservativePresenter from './explain/ConservativePresenter'
// Removed: kind classification imports (no longer needed)
import type { ExplainCard as ExplainCardModel } from '@/lib/contracts/explain'
import {
  safeText,
  safeMatch,
  safeReplace,
  safeSplit,
  safeTrim,
  safeToUpperCase,
  safeMatchAll,
} from '@/lib/safe-text'
// Helper function to find numbered blanks in text (supports both full-width and half-width)
function findNumberedBlanksInText(text: string): Array<{ number: number; index: number }> {
  // Support both: (1), （１）, ( 1 ), （ １ ）
  const pattern = /[（(]\s*([0-9０-９]{1,2})\s*[）)]/g
  const matches: Array<{ number: number; index: number }> = []
  let match: RegExpMatchArray | null
  pattern.lastIndex = 0
  
  // Full-width to half-width number mapping
  const fullWidthMap: Record<string, string> = {
    '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
    '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
  }
  
  while ((match = pattern.exec(text)) !== null) {
    let numStr = match[1]
    // Convert full-width numbers to half-width
    numStr = numStr.split('').map(char => fullWidthMap[char] || char).join('')
    const num = parseInt(numStr, 10)
    const index = match.index ?? 0
    if (!isNaN(num)) {
      matches.push({
        number: num,
        index,
      })
    }
  }
  return matches
}
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
// Removed: All format detection and question set imports (no longer needed)
import { useFeatureFlag } from '@/lib/feature-flags'
import { MarkdownExplain } from './MarkdownExplain'
import ExplainCardContent from './ExplainCardContent'
import ExplainSheet from './ExplainSheet'
import type { ExplainCardContentData, QuestionExplanation, SharedPassageExplanation } from '@/lib/ai/universal-explainer'

interface ExplainCardProps {
  inputText: string
  conservative?: boolean // Enable conservative mode
  onFollowUp?: (question: string) => void // Optional: callback for follow-up questions
  onLoadingChange?: (loading: boolean) => void // Callback to notify parent of loading state changes
}


/**
 * Loading state with typing animation (ChatGPT-like jumping text)
 * 極簡主義設計：流暢的打字機效果 + 跳動圓點
 */
function LoadingState({ currentStep }: { currentStep: number }) {
  const loadingSteps = [
    '正在分析題目…',
    '正在生成詳解…',
  ]

  const message = loadingSteps[currentStep] || loadingSteps[0]
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  useEffect(() => {
    setDisplayedText('')
    setIsTyping(true)
    
    let currentIndex = 0
    const typingInterval = setInterval(() => {
      if (currentIndex < message.length) {
        setDisplayedText(message.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        setIsTyping(false)
        clearInterval(typingInterval)
      }
    }, 40) // 更快的打字速度：每 40ms 一個字

    return () => clearInterval(typingInterval)
  }, [message])

  return (
    <motion.div
      key={currentStep}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 border border-zinc-800/50 p-6 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        {/* ChatGPT-style jumping dots */}
        <div className="flex gap-1.5">
          <motion.div
            className="h-2 w-2 rounded-full bg-blue-500"
            animate={{
              y: [0, -6, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: 0,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-blue-500"
            animate={{
              y: [0, -6, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: 0.2,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="h-2 w-2 rounded-full bg-blue-500"
            animate={{
              y: [0, -6, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: 0.4,
              ease: 'easeInOut',
            }}
          />
        </div>
        {/* Typing text with cursor */}
        <span className="text-sm font-medium text-zinc-200">
          {displayedText}
          {isTyping && (
            <motion.span
              className="inline-block w-0.5 h-4 bg-blue-400 ml-1 align-middle"
              animate={{ opacity: [1, 0, 1] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </span>
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

interface ClarityStripeProps {
  enabled: boolean
  data: ClarityStripeData | null
}

interface ClarityStripeData {
  answerLabel?: string
  answerText?: string
  reason?: string
  confidence?: string
}

function ClarityStripe({ enabled, data }: ClarityStripeProps) {
  if (!enabled || !data) return null

  const { answerLabel, answerText, reason, confidence } = data

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 bg-blue-500/10 px-3 py-2.5 sm:px-4 sm:py-3">
      <div className="flex flex-1 flex-col gap-1 text-xs text-blue-50/80 sm:flex-row sm:items-center sm:gap-3 sm:text-sm">
        {answerLabel && (
          <span className="flex items-center gap-2 text-emerald-200">
            <span className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold">
              {answerLabel}
            </span>
            <span className="font-semibold text-emerald-100 break-words">{answerText}</span>
          </span>
        )}
        {reason && (
          <span className="text-xs text-blue-100/80 sm:text-sm break-words">{reason}</span>
        )}
      </div>
      {confidence && (
        <span
          className={`hidden sm:inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
            CONFIDENCE_STYLE[confidence] ?? 'border-blue-400/40 bg-blue-500/15 text-blue-100'
          }`}
        >
          信心：{CONFIDENCE_LABEL[confidence] ?? confidence}
        </span>
      )}
    </div>
  )
}

interface ActionFooterProps {
  visible: boolean
  isSaving: boolean
  saveStatus: 'idle' | 'success' | 'error'
  saveMessage: string
  onPrimaryClick: () => void
}

function ActionFooter({ visible, isSaving, saveStatus, saveMessage, onPrimaryClick }: ActionFooterProps) {
  if (!visible) return null

  return (
    <div className="sticky bottom-0 z-20 border-t border-zinc-800/40 bg-zinc-950/80 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onPrimaryClick}
          disabled={isSaving}
          className="w-full rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all duration-200 hover:bg-sky-400 hover:shadow-xl hover:shadow-sky-500/30 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 sm:w-auto"
        >
          {isSaving ? '儲存中…' : '加入錯題本'}
        </button>
        {saveStatus !== 'idle' && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs ${
              saveStatus === 'success' ? 'text-emerald-300' : 'text-amber-300'
            }`}
          >
            {saveMessage}
          </motion.span>
        )}
      </div>
    </div>
  )
}

/**
 * Convert ExplainViewModel (legacy API format) to ExplainCard (canonical format)
 */
function convertExplainViewModelToCard(vm: ExplainViewModel, inputText: string): ExplainCardModel {
  // Simplified: no kind classification, use FALLBACK for all
  const legacyKind: 'FALLBACK' = 'FALLBACK'

  // Extract answer key from answer string (e.g., "(A) answer" -> "A") - Safe access with safe-text
  const answerString = safeText(vm.answer, '')
  const answerMatch = safeMatch(answerString, /^\(?([A-E])\)?\s*/i)
  const answerKey = answerMatch ? safeToUpperCase(answerMatch[1], '') : undefined
  const answerText = safeTrim(safeReplace(answerString, /^\(?[A-E]\)?\s*/i, ''), '')

  // Build options from distractorNotes if available
  const options = vm.distractorNotes?.map((note) => {
    const optionText = safeText(note?.option, '')
    const optionMatch = safeMatch(optionText, /^\(?([A-E])\)?\s*/i)
    const key = optionMatch ? safeToUpperCase(optionMatch[1], '') : safeText(optionText, '')
    const noteText = safeText(note?.note, '')
    const text = safeSplit(noteText, '｜')[0] || noteText

    return {
      key,
      text: safeTrim(text, ''),
      verdict: key === answerKey ? ('fit' as const) : ('unfit' as const),
      reason: noteText,
    }
  }) || []

  // Add correct answer if not in distractorNotes
  if (answerKey && !options.find((opt) => opt.key === answerKey)) {
    options.push({
      key: answerKey,
      text: answerText || `選項 ${answerKey}`,
      verdict: 'fit' as const,
      reason: safeText(vm.briefReason, ''),
    })
  }

  // Fallback: Parse options from inputText if not enough options (need min 2 for validation)
  if (options.length < 2) {
    const safeInputText = safeText(inputText, '')
    const optionMatches = safeMatchAll(safeInputText, /\(([A-E])\)\s*([^\n(]+)/gi)
    for (const match of optionMatches) {
      const key = safeToUpperCase(match[1], '')
      const text = safeTrim(match[2] || '', '')
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

  // Simplified: always use FALLBACK (no kind classification)
  const cardKind: 'FALLBACK' = 'FALLBACK'

  // Build meta object (simplified, no kind-specific handling)
  const meta: Record<string, any> = {
    evidenceBlocks: vm.evidenceBlocks?.map((b) => safeText(b, '')) || [],
    discourseRole: safeText(vm.discourseRole, ''),
    mixAnswerExtra: safeText(vm.mixAnswerExtra, ''),
  }

  // Removed: E7-specific handling (no kind classification needed)

  return {
    id: nanoid(),
    question: safeText(inputText, ''),
    kind: cardKind,
    translation: safeText(vm.cnTranslation, ''),
    cues: vm.grammarHighlights?.map((h) => safeText(h, '')) || [],
    options,
    steps: vm.fullExplanation
      ? [{ title: '解題步驟', detail: safeText(vm.fullExplanation, '') }]
      : [{ title: '解析', detail: safeText(vm.briefReason, '') }],
    correct: answerKey
      ? {
          key: answerKey,
          text: answerText,
          reason: safeText(vm.briefReason, ''),
        }
      : undefined,
    vocab: [],
    meta,
    nextActions: [],
  }
}

/**
 * Simplified validation: Always allow rendering if we have any content
 * Like ChatGPT - show whatever we have, don't block on missing fields
 */
function getMissingFields(view: ExplainVM | null): string[] {
  if (!view) return []
  
  // Simplified: Only check for absolute minimum (answer or reason or stem)
  // If we have any of these, we can render something useful
  const hasAnswer = view.answer?.text || view.answer?.label
  const hasReason = (view.meta as any)?.reasonLine || view.stem?.en
  const hasStem = view.stem?.en
  
  // If we have nothing at all, that's a problem
  if (!hasAnswer && !hasReason && !hasStem) {
    return ['No content available']
  }
  
  // Otherwise, always allow rendering (like ChatGPT)
  return []
}

/**
 * Dev Fallback UI - 優雅處理未知題型 + 缺欄位提示
 */
function DevFallbackUI({ 
  data, 
  missingFields = [],
}: { 
  data: any
  missingFields?: string[]
}) {
  return (
    <Card className="border-yellow-500/50 bg-yellow-500/10">
      <CardHeader>
        <CardTitle className="text-yellow-600 dark:text-yellow-400 text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>資料缺失</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="text-zinc-600 dark:text-zinc-400">
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
 * Simplified rendering: Always use GenericExplain for all questions
 * Like ChatGPT - one unified display format
 */
function renderByKind(view: ExplainVM): React.ReactNode {
  const motionProps = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.3 },
  }

  // Always use GenericExplain - no kind-based branching
  return (
    <motion.div key="generic-card" {...motionProps}>
      <GenericExplain view={view as GenericVM} />
    </motion.div>
  )
}

/**
 * Generic Explain Component - ChatGPT-like: Show answer and reason with rich formatting
 */
function GenericExplain({ view }: { view: GenericVM }) {
  const reasonLine = (view.meta as any)?.reasonLine || view.stem?.en || ''
  const answerText = view.answer?.label
    ? `${view.answer.label}. ${view.answer.text}`
    : view.answer?.text || ''

  // Format answer for better readability (handle multi-line answers)
  const formattedAnswer = answerText.split('\n').map((line, idx) => (
    <div key={idx} className="mb-1 last:mb-0">
      {line}
    </div>
  ))

  return (
    <div className="space-y-4">
      {/* Answer Section - Enhanced for multi-blank questions */}
      {view.answer && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
          <div className="text-xs font-medium text-emerald-400 mb-2">答案</div>
          <div className="text-base text-emerald-300 font-medium leading-relaxed whitespace-pre-wrap">
            {formattedAnswer}
          </div>
        </div>
      )}

      {/* Reason Section - Enhanced for longer explanations */}
      {reasonLine && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-xs font-medium text-zinc-400 mb-2">解析</div>
          <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{reasonLine}</div>
        </div>
      )}

      {/* Question Text (if available and different from reason) */}
      {view.stem?.en && view.stem.en !== reasonLine && view.stem.en.length < 500 && (
        <div className="rounded-lg bg-zinc-900/40 border border-zinc-800/30 p-4">
          <div className="text-xs font-medium text-zinc-400 mb-2">題目</div>
          <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{view.stem.en}</div>
        </div>
      )}

      {/* Options (if available) */}
      {view.options && view.options.length > 0 && (
        <div className="rounded-lg bg-zinc-900/40 border border-zinc-800/30 p-4">
          <div className="text-xs font-medium text-zinc-400 mb-3">選項</div>
          <div className="space-y-2">
            {view.options.map((opt, idx) => (
              <div
                key={idx}
                className={`text-sm p-2 rounded ${
                  opt.label === view.answer?.label
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-zinc-800/30 text-zinc-300'
                }`}
              >
                <span className="font-medium">{opt.label}.</span> {opt.text}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Main ExplainCard component - 極簡統一架構
 * 容器組件：負責 API 調用、狀態管理、渲染決策
 */
export default function ExplainCard({ inputText, conservative = false, onFollowUp, onLoadingChange }: ExplainCardProps) {
  const [vm, setVm] = useState<ExplainViewModel | null>(null)
  const [markdown, setMarkdown] = useState<string | null>(null) // New: Markdown response
  const [structured, setStructured] = useState<ExplainCardContentData | null>(null) // Old format (backward compatible)
  const [questions, setQuestions] = useState<QuestionExplanation[] | null>(null) // New format (independent questions)
  const [sharedPassage, setSharedPassage] = useState<SharedPassageExplanation | null>(null) // New format (shared passage, preferred)
  const [conservativeResult, setConservativeResult] = useState<ConservativeResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = useState('')

  const clarityStripeEnabled = useFeatureFlag('CLARITY_STRIPE_V1')
  const evidenceLensEnabled = useFeatureFlag('READING_EVIDENCE_LENS')
  const abortRef = useRef<AbortController | null>(null)

  // Convert ExplainViewModel to ExplainCard, then to ExplainVM
  const explainView = useMemo<ExplainVM | null>(() => {
    if (!vm) return null

    // Simplified: no kind normalization, just convert
    const card = convertExplainViewModelToCard(vm, inputText)
    
    // Present using presenter
    const view = presentExplainCard(card)
    
    if (!view) {
      console.warn('[ExplainCard] Failed to present card, creating minimal fallback')
      // Return a minimal fallback view with answer and reason
      const answerMatch = safeMatch(safeText(vm.answer, ''), /^\(?([A-E])\)?\s*/i)
      return {
        id: 'fallback',
        kind: 'GENERIC',
        stem: { en: inputText },
        answer: vm.answer ? { 
          label: answerMatch ? safeToUpperCase(answerMatch[1], '') : '',
          text: safeTrim(safeReplace(safeText(vm.answer, ''), /^\(?[A-E]\)?\s*/i, ''), '') || safeText(vm.answer, '')
        } : undefined,
        meta: vm.briefReason ? { reasonLine: safeText(vm.briefReason, '') } : undefined,
      } as ExplainVM
    }

    return view
  }, [vm, inputText])

  const buildWrongbookNote = useCallback((): string => {
    const lines: string[] = ['# 錯題筆記', '']

    if (explainView) {
      lines.push(`- 題幹：${explainView.stem?.en ?? inputText}`)
      if (explainView.answer?.label || explainView.answer?.text) {
        lines.push(`- 答案：${safeText(explainView.answer.label, '')} ${safeText(explainView.answer.text, '')}`.trim())
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

    lines.push(safeTrim(inputText, ''))
    return lines.join('\n')
  }, [explainView, inputText])

  // Simplified: Always allow rendering (like ChatGPT)
  // Removed: canRender check - always show whatever we have
  const clarityStripeData = useMemo<ClarityStripeData | null>(() => {
    if (vm) {
      const answerString = safeText(vm.answer, '')
      const answerMatch = safeMatch(answerString, /^\(?([A-E])\)?\s*(.*)$/i)

      return {
        answerLabel: answerMatch ? safeToUpperCase(answerMatch[1], '') : undefined,
        answerText: answerMatch ? safeTrim(answerMatch[2] || '', '') : answerString,
        reason: safeText(vm.briefReason, ''),
        confidence: undefined,
      }
    }

    return null
  }, [vm])

  // Fetch explanation with 4-phase loading + AbortController
  useEffect(() => {
    if (!safeTrim(inputText, '')) return

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    const loadingSteps = [
      '正在分析題目…',
      '正在生成詳解…',
    ]

    const fetchExplanation = async () => {
      // Create new AbortController
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      setError(null)
      setLoadingStep(0)
      setSaveStatus('idle')
      setSaveMessage('')
      onLoadingChange?.(true) // 通知父組件開始 loading

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

        console.log('[ExplainCard] Requesting explanation for:', inputText.substring(0, 50) + '...', conservative ? '(conservative mode)' : '')

        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: inputText },
            mode: 'deep', // Always use deep mode
            conservative: false, // 強制關閉保守模式，只使用 Universal Explainer
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          throw new Error(`API error: ${res.status}`)
        }

        const data = await res.json()
        const latency = performance.now() - startTime

        // 調試：記錄完整 API 回應
        console.log('[ExplainCard] API response:', {
          hasMarkdown: !!data.markdown,
          markdownLength: data.markdown?.length,
          status: data.status,
          keys: Object.keys(data),
          preview: data.markdown?.substring(0, 300),
        })

        // 優先處理共用題幹格式（最新格式，優先使用）
        if (data.sharedPassage && data.sharedPassage.sharedPassage && data.sharedPassage.questions?.length > 0) {
          console.log('[ExplainCard] Shared passage received:', {
            latency_ms: Math.round(latency),
            status: data.status,
            passageLength: data.sharedPassage.sharedPassage.length,
            questionCount: data.sharedPassage.questions.length,
          })

          setSharedPassage(data.sharedPassage)
          setQuestions(null) // 清除獨立題目格式
          setStructured(null) // 清除舊格式
          setMarkdown(null) // 清除 markdown
          setVm(null) // 清除舊格式
          setConservativeResult(null) // 清除保守模式結果
          setError(null) // 清除錯誤

          track('explain.render' as any, {
            mode: 'sharedPassage',
            latency_ms: Math.round(latency),
            status: data.status,
            questionCount: data.sharedPassage.questions.length,
          })
        }
        // 處理獨立題目格式
        else if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
          console.log('[ExplainCard] Questions array received:', {
            latency_ms: Math.round(latency),
            status: data.status,
            questionCount: data.questions.length,
            hasOptions: data.questions.every(q => Array.isArray(q.options) && q.options.length > 0),
          })

          setQuestions(data.questions)
          setSharedPassage(null) // 清除共用題幹格式
          setStructured(null) // 清除舊格式
          setMarkdown(null) // 清除 markdown
          setVm(null) // 清除舊格式
          setConservativeResult(null) // 清除保守模式結果
          setError(null) // 清除錯誤

          track('explain.render' as any, {
            mode: 'questions',
            latency_ms: Math.round(latency),
            status: data.status,
            questionCount: data.questions.length,
          })
        }
        // 處理舊版結構化 JSON 數據（向後兼容）
        else if (data.structured) {
          console.log('[ExplainCard] Structured explanation received:', {
            latency_ms: Math.round(latency),
            status: data.status,
            hasQuestion: !!data.structured.question,
            hasAnswer: !!data.structured.answer,
            hasReasoning: !!data.structured.reasoning,
            counterpointsCount: Object.keys(data.structured.counterpoints || {}).length,
          })

          setStructured(data.structured)
          setQuestions(null) // 清除新版格式
          setMarkdown(null) // 清除 markdown
          setVm(null) // 清除舊格式
          setConservativeResult(null) // 清除保守模式結果
          setError(null) // 清除錯誤

          track('explain.render' as any, {
            mode: 'structured',
            latency_ms: Math.round(latency),
            status: data.status,
          })
        }
        // 處理 Markdown 格式（fallback）
        else if (data.markdown) {
          console.log('[ExplainCard] Markdown explanation received:', {
            latency_ms: Math.round(latency),
            status: data.status,
            length: data.markdown.length,
            preview: data.markdown.substring(0, 200),
            hasAnswer: data.markdown.includes('✅ 答案'),
            hasOptions: data.markdown.includes('🔡 選項') || data.markdown.includes('🔘 選項'),
            hasExplanation: data.markdown.includes('🧠 詳解'),
          })

          // 確保 markdown 不為空且包含必要內容
          if (data.markdown && data.markdown.length > 50) {
            setMarkdown(data.markdown)
            setSharedPassage(null) // 清除共用題幹格式
            setQuestions(null) // 清除新版格式
            setStructured(null) // 清除結構化數據
            setVm(null) // 清除舊格式
            setConservativeResult(null) // 清除保守模式結果
            setError(null) // 清除錯誤

            track('explain.render' as any, {
              mode: 'markdown',
              latency_ms: Math.round(latency),
              status: data.status,
            })
          } else {
            console.warn('[ExplainCard] Markdown too short or empty:', {
              length: data.markdown?.length,
              content: data.markdown,
            })
            setError('無法生成詳解，請重試一次')
          }
        } else if (conservative && data.detected_type) {
          // Conservative mode response (保留以備不時之需，但應該不會用到)
          console.log('[ExplainCard] Conservative explanation received:', {
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
          // Fallback: Legacy format (應該不會發生，因為 API 現在總是返回 markdown)
          console.warn('[ExplainCard] Legacy format received (unexpected):', {
            latency_ms: Math.round(latency),
            hasAnswer: !!data.answer,
            hasReason: !!data.briefReason,
            dataKeys: Object.keys(data),
          })

          // 嘗試從舊格式構建基本顯示
          if (data.answer && data.briefReason) {
            setVm({
              kind: 'vocab',
              mode: 'deep',
              answer: safeText(data.answer, '-'),
              briefReason: safeText(data.briefReason, '-'),
              status: data.status || 'basic',
              cnTranslation: data.cnTranslation,
            } as ExplainViewModel)
          } else {
            setError('無法生成詳解，請重試一次')
          }

          setTimeout(() => {
            track('explain.render' as any, {
              mode: 'legacy',
              latency_ms: Math.round(latency),
              vm_valid: !!(data.answer && data.briefReason),
              missing_fields: !data.answer ? ['answer'] : !data.briefReason ? ['briefReason'] : [],
            })
          }, 0)
        }

        setIsLoading(false)
        onLoadingChange?.(false) // 通知父組件結束 loading
        console.log('[ExplainCard] Rendering completed')
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[ExplainCard] Request aborted')
          onLoadingChange?.(false) // 即使 abort 也要重置 loading
          return
        }
        
        console.error('[ExplainCard] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setIsLoading(false)
        onLoadingChange?.(false) // 錯誤時也要重置 loading
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

      const canonicalSkill = 'english' // Simplified: always english
      const questionTitle = explainView?.stem?.en ?? inputText.slice(0, 60)

      let userId: string | null = null
      try {
        const { supabaseBrowserClient } = await import('@/lib/supabase')
        const { data, error } = await supabaseBrowserClient.auth.getUser()
        if (error) {
          console.warn('[ExplainCard] supabase auth getUser error:', error.message)
        }
        userId = data?.user?.id ?? null
      } catch (err) {
        console.warn('[ExplainCard] Unable to retrieve Supabase user:', err)
      }

      if (!userId) {
        throw new Error('請先登入以收藏錯題')
      }

      const note_md = buildWrongbookNote()

      const res = await fetch('/api/backpack/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          question: questionTitle,
          canonical_skill: canonicalSkill ?? 'english',
          note_md,
        }),
      })

      if (!res.ok) {
        throw new Error('儲存錯題失敗，請稍後再試')
      }

      setSaveStatus('success')
      setSaveMessage('已加入錯題本')

      track('explain.action' as any, {
        action: 'save-error',
        mode: 'single',
        status: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '儲存錯題失敗'
      setSaveStatus('error')
      setSaveMessage(message)
      track('explain.action' as any, {
        action: 'save-error',
        mode: 'single',
        status: 'error',
        message,
      })
    } finally {
      setIsSaving(false)
    }
  }, [
    isSaving,
    buildWrongbookNote,
    explainView,
    inputText,
    vm,
  ])

  // Removed: kind-based tracking (no longer needed)

  return (
    <div className="relative flex min-h-[40vh] max-h-[70vh] flex-col overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-950/10 backdrop-blur">
      <ClarityStripe enabled={clarityStripeEnabled} data={clarityStripeData} />

      {/* 錯題本 CTA - 右上角 icon（不遮擋內容） */}
      {!isLoading && !conservativeResult && (markdown || explainView || vm) && (
        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isSaving}
          className="absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-full bg-sky-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 backdrop-blur-sm transition-all duration-200 hover:bg-sky-400 hover:shadow-xl hover:shadow-sky-500/30 active:scale-[0.95] focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          title="加入錯題本"
        >
          {isSaving ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>儲存中</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="hidden sm:inline">收藏</span>
            </>
          )}
        </button>
      )}

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

          {/* Status indicator for fallback modes */}
          {!isLoading && !error && vm && vm.status && vm.status !== 'full' && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/80">
              {vm.status === 'basic' && '已套用基本模式'}
              {vm.status === 'minimal' && '已套用降級模式'}
              {vm.meta?.hint && ` · ${vm.meta.hint}`}
            </div>
          )}

          {conservativeResult && !isLoading && (
            <ConservativePresenter result={conservativeResult} />
          )}

          {/* Render Shared Passage (newest format, highest priority) */}
          {sharedPassage && !isLoading && !conservativeResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <ExplainSheet sharedPassage={sharedPassage} />
            </motion.div>
          )}

          {/* Render Questions array (new format, independent questions) */}
          {!sharedPassage && questions && !isLoading && !conservativeResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <ExplainSheet questions={questions} />
            </motion.div>
          )}

          {/* Render Structured explanation (old format, backward compatible) */}
          {!questions && structured && !isLoading && !conservativeResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <ExplainCardContent data={structured} />
            </motion.div>
          )}

          {/* Render Markdown explanation (fallback) */}
          {!questions && !structured && markdown && !isLoading && !conservativeResult && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <MarkdownExplain markdown={markdown} />
            </motion.div>
          )}

          {/* Fallback: Legacy rendering for backward compatibility */}
          {!markdown && explainView && !isLoading && !conservativeResult && (
            <AnimatePresence mode="wait">
              {renderByKind(explainView)}
            </AnimatePresence>
          )}

          {/* Fallback: Show raw VM if no view - Enhanced formatting */}
          {!markdown && vm && !explainView && !isLoading && !conservativeResult && (
            <div className="space-y-4">
              {vm.answer && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4">
                  <div className="text-xs font-medium text-emerald-400 mb-2">答案</div>
                  <div className="text-base text-emerald-300 font-medium leading-relaxed whitespace-pre-wrap">
                    {safeText(vm.answer, '')}
                  </div>
                </div>
              )}
              {vm.briefReason && (
                <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
                  <div className="text-xs font-medium text-zinc-400 mb-2">解析</div>
                  <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {safeText(vm.briefReason, '')}
                  </div>
                </div>
              )}
              {vm.cnTranslation && (
                <div className="rounded-lg bg-zinc-900/40 border border-zinc-800/30 p-4">
                  <div className="text-xs font-medium text-zinc-400 mb-2">補充說明</div>
                  <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {safeText(vm.cnTranslation, '')}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Follow-up CTA (ChatGPT-like) - Only show if callback provided */}
          {(markdown || explainView) && !isLoading && !conservativeResult && onFollowUp && (
            <div className="mt-4 pt-4 border-t border-zinc-800/50">
              <button
                type="button"
                onClick={() => {
                  const followUpText = `關於這題，我想問：`
                  onFollowUp(followUpText)
                }}
                className="w-full text-left px-4 py-3 rounded-lg bg-zinc-900/40 border border-zinc-800/30 hover:bg-zinc-800/40 transition-colors text-sm text-zinc-300 hover:text-zinc-100"
              >
                <span className="opacity-60">💬</span> 追問或改寫題目...
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ActionFooter 已移至右上角，此處保留狀態訊息 */}
      {saveStatus !== 'idle' && !isLoading && !conservativeResult && (
        <div className="absolute bottom-4 right-4 z-30 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs backdrop-blur-sm">
          <span className={saveStatus === 'success' ? 'text-emerald-300' : 'text-amber-300'}>
            {saveMessage}
          </span>
        </div>
      )}
    </div>
  )
}

export { ClarityStripe, ActionFooter }
