'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
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
import { toQuestionSetVM } from '@/lib/mapper/explain-presenter'
import { detectMultipleQuestions } from '@/lib/explain/multi-question-detector'
import QuestionSetExplain from './explain/QuestionSetExplain'
import type { QuestionSetVM } from '@/lib/mapper/vm/question-set'

interface ExplainCardV2Props {
  inputText: string
  conservative?: boolean // Enable conservative mode
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
      if (text) {
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
 * Generic Explain Component - 簡化版通用解析
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
export default function ExplainCardV2({ inputText, conservative = false }: ExplainCardV2Props) {
  const [vm, setVm] = useState<ExplainViewModel | null>(null)
  const [questionSetVM, setQuestionSetVM] = useState<QuestionSetVM | null>(null)
  const [conservativeResult, setConservativeResult] = useState<ConservativeResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Convert ExplainViewModel to ExplainCard, then to ExplainVM
  const explainView = useMemo<ExplainVM | null>(() => {
    if (!vm) return null

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

  // Check rendering threshold and get missing fields
  const missingFields = useMemo(() => getMissingFields(explainView), [explainView])
  const canRender = useMemo(() => missingFields.length === 0, [missingFields])

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
    <div className="space-y-4 min-h-[40vh] max-h-[70vh] overflow-y-auto">
      {/* Loading State with 4-phase animation */}
      <AnimatePresence mode="wait">
        {isLoading && <LoadingState key={loadingStep} currentStep={loadingStep} />}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Conservative Mode Content */}
      {conservativeResult && !isLoading && (
        <ConservativePresenter result={conservativeResult} />
      )}

      {/* E0 Question Set - 題組模式 */}
      {questionSetVM && !isLoading && !conservativeResult && (
        <QuestionSetExplain vm={questionSetVM} />
      )}

      {/* Unified Content - 使用專業組件系統（單題模式） */}
      {!questionSetVM && explainView && canRender && !isLoading && !conservativeResult && (
        <AnimatePresence mode="wait">
          {renderByKind(explainView)}
        </AnimatePresence>
      )}

      {/* Fallback UI for unknown kinds or missing fields */}
      {!questionSetVM && vm && (!explainView || !canRender) && !isLoading && !conservativeResult && (
        <DevFallbackUI 
          data={vm} 
          kind={toCanonicalKind(vm.kind)} 
          missingFields={missingFields}
        />
      )}
    </div>
  )
}
