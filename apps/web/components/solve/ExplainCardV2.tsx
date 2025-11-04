'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ExplainViewModel, ExplainMode } from '@/lib/types'
import type { ConservativeResult } from '@/lib/ai/conservative-types'
import { track } from '@plms/shared/analytics'
import Typewriter from './Typewriter'
import ConservativePresenter from './explain/ConservativePresenter'

interface ExplainCardV2Props {
  inputText: string
  mode?: ExplainMode
  onModeChange?: (mode: ExplainMode) => void
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
 * Fast mode presenter - minimal output
 */
function FastModePresenter({ vm }: { vm: ExplainViewModel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">答案</div>
        <div className="text-lg text-green-400 font-semibold">{vm.answer}</div>
      </div>
      
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">理由</div>
        <div className="text-base text-zinc-200">
          <Typewriter text={vm.briefReason} />
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Deep mode presenter - full explanation
 */
function DeepModePresenter({ vm }: { vm: ExplainViewModel }) {
  const articleRef = useRef<HTMLDivElement | null>(null)

  // Preserve scroll/highlight behavior for reading questions
  useEffect(() => {
    if (vm.kind === 'reading' && vm.evidenceBlocks && vm.evidenceBlocks.length > 0) {
      // Wire up evidence highlight if needed
      console.log('[ExplainCardV2] Evidence blocks available for highlighting:', vm.evidenceBlocks)
    }
  }, [vm.kind, vm.evidenceBlocks])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      ref={articleRef}
    >
      {/* Answer */}
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
        <div className="text-sm font-medium text-zinc-300 mb-2">答案</div>
        <div className="text-lg text-green-400 font-semibold">{vm.answer}</div>
      </div>

      {/* Translation (if available) */}
      {vm.cnTranslation && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">中譯</div>
          <div className="text-base text-zinc-200">
            <Typewriter text={vm.cnTranslation} />
          </div>
        </div>
      )}

      {/* Full Explanation (Markdown-ready) */}
      {vm.fullExplanation && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">詳解</div>
          <div className="text-base text-zinc-200 whitespace-pre-wrap">
            <Typewriter text={vm.fullExplanation} />
          </div>
        </div>
      )}

      {/* Distractor Notes */}
      {vm.distractorNotes && vm.distractorNotes.length > 0 && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">選項分析</div>
          <div className="space-y-2">
            {vm.distractorNotes.map((note, idx) => (
              <div key={idx} className="text-sm text-zinc-300">
                <span className="font-medium text-zinc-400">{note.option}:</span> {note.note}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grammar Highlights */}
      {vm.grammarHighlights && vm.grammarHighlights.length > 0 && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">核心語法點</div>
          <ul className="space-y-1 list-disc list-inside text-sm text-zinc-300">
            {vm.grammarHighlights.map((highlight, idx) => (
              <li key={idx}>{highlight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Evidence Blocks (Reading) */}
      {vm.evidenceBlocks && vm.evidenceBlocks.length > 0 && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">關鍵證據</div>
          <div className="space-y-2">
            {vm.evidenceBlocks.map((evidence, idx) => (
              <div
                key={idx}
                className="text-sm text-zinc-300 p-2 rounded bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                onClick={() => {
                  // Scroll to evidence in original passage
                  console.log('[ExplainCardV2] Evidence clicked:', evidence)
                }}
              >
                {evidence}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discourse Role */}
      {vm.discourseRole && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">篇章功能</div>
          <div className="text-sm text-zinc-300">{vm.discourseRole}</div>
        </div>
      )}

      {/* Mix Answer Extra */}
      {vm.mixAnswerExtra && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">補充說明</div>
          <div className="text-sm text-zinc-300">{vm.mixAnswerExtra}</div>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Mode toggle button
 */
function ModeToggle({
  currentMode,
  onModeChange,
}: {
  currentMode: ExplainMode
  onModeChange?: (mode: ExplainMode) => void
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        onClick={() => onModeChange?.('fast')}
        className={`px-3 py-1 rounded transition-colors ${
          currentMode === 'fast'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800/70'
        }`}
      >
        快速
      </button>
      <button
        onClick={() => onModeChange?.('deep')}
        className={`px-3 py-1 rounded transition-colors ${
          currentMode === 'deep'
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800/70'
        }`}
      >
        深度
      </button>
    </div>
  )
}

/**
 * Main ExplainCardV2 component
 */
export default function ExplainCardV2({ inputText, mode: initialMode = 'fast', onModeChange, conservative = false }: ExplainCardV2Props) {
  const [vm, setVm] = useState<ExplainViewModel | null>(null)
  const [conservativeResult, setConservativeResult] = useState<ConservativeResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [mode, setMode] = useState<ExplainMode>(initialMode)
  const [error, setError] = useState<string | null>(null)

  // Fetch explanation with 4-phase loading
  useEffect(() => {
    if (!inputText.trim()) return

    const loadingSteps = [
      '正在分析題型…',
      '正在檢測語意結構…',
      '正在抽取關鍵訊息…',
      '正在生成詳解…',
    ]

    const fetchExplanation = async () => {
      setIsLoading(true)
      setError(null)
      setLoadingStep(0)

      // Phase 1-3: Rotate through loading messages (1.2s each)
      for (let i = 0; i < loadingSteps.length - 1; i++) {
        setLoadingStep(i)
        await new Promise((resolve) => setTimeout(resolve, 1200))
      }

      // Phase 4: Final step before API call
      setLoadingStep(loadingSteps.length - 1)

      try {
        // Track request
        track('explain.request', {
          mode: conservative ? 'conservative' : mode,
          input_len: inputText.length,
        })

        const startTime = performance.now()

        console.log('[ExplainCardV2] Requesting explanation for:', inputText.substring(0, 50) + '...', conservative ? '(conservative mode)' : '')

        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: inputText },
            mode,
            conservative,
          }),
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

          track('explain.render', {
            mode: 'conservative',
            kind: data.detected_type,
            latency_ms: Math.round(latency),
          })

          setConservativeResult(data as ConservativeResult)
        } else {
          // Normal TARS+KCE response
          console.log('[ExplainCardV2] Explanation received:', {
            kind: data.kind,
            mode: data.mode,
            latency_ms: Math.round(latency),
          })

          track('explain.render', {
            mode: data.mode,
            kind: data.kind,
            latency_ms: Math.round(latency),
          })

          setVm(data as ExplainViewModel)
        }

        setIsLoading(false)
        console.log('[ExplainCardV2] Rendering completed')
      } catch (err) {
        console.error('[ExplainCardV2] Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setIsLoading(false)
      }
    }

    fetchExplanation()
  }, [inputText, mode, conservative])

  // Handle mode change
  const handleModeChange = (newMode: ExplainMode) => {
    if (newMode === mode) return

    track('explain.mode_change', {
      from: mode,
      to: newMode,
      kind: vm?.kind,
    })

    setMode(newMode)
    onModeChange?.(newMode)
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex justify-end">
        <ModeToggle currentMode={mode} onModeChange={handleModeChange} />
      </div>

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

      {/* Content */}
      {conservativeResult && !isLoading && (
        <ConservativePresenter result={conservativeResult} />
      )}

      {vm && !isLoading && !conservativeResult && (
        <>
          {mode === 'fast' ? (
            <FastModePresenter vm={vm} />
          ) : (
            <DeepModePresenter vm={vm} />
          )}
        </>
      )}
    </div>
  )
}
