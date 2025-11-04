// LEGACY — not used by Solve flow. Kept for Ask page compatibility.
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RefreshCw, Save, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GrammarRow {
  category: string
  description: string
  example: string
}

export interface PastPaper {
  id: string
  stem: string
  tags: string[]
}

export type Difficulty = 'easy' | 'medium' | 'hard'

interface ExplanationCardProps {
  question: string
  conceptLabel: string
  summary: string
  steps: string[]
  grammarRows: GrammarRow[]
  encouragement: string
  onSave: () => void
  onRetry: () => void
  onNext?: () => void
  isSaving: boolean
  isRetrying: boolean
  isNextLoading?: boolean
  savedStatus: 'idle' | 'saved'
  isLastStep?: boolean
  // New props for Contract v2
  confidence?: number // 0-1
  difficulty?: Difficulty
  pastPapers?: PastPaper[]
}

const ExplanationCard = ({
  question,
  conceptLabel,
  summary,
  steps,
  grammarRows,
  encouragement,
  onSave,
  onRetry,
  onNext,
  isSaving,
  isRetrying,
  isNextLoading = false,
  savedStatus,
  isLastStep = false,
  confidence,
  difficulty,
  pastPapers = [],
}: ExplanationCardProps) => {
  const [pastPapersExpanded, setPastPapersExpanded] = useState(false)

  // Helper function to get difficulty color and label
  const getDifficultyBadge = (diff?: Difficulty) => {
    if (!diff) return null

    const badges = {
      easy: { label: '基礎', color: 'text-green-400 border-green-400/40 bg-green-400/8' },
      medium: { label: '中等', color: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/8' },
      hard: { label: '進階', color: 'text-red-400 border-red-400/40 bg-red-400/8' },
    }

    const badge = badges[diff]
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium', badge.color)}>
        {badge.label}
      </span>
    )
  }

  // Helper function to get confidence badge
  const getConfidenceBadge = (conf?: number) => {
    if (conf === undefined) return null

    const percentage = Math.round(conf * 100)
    const color = conf >= 0.8 ? 'text-green-400' : conf >= 0.6 ? 'text-yellow-400' : 'text-orange-400'

    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium', color)}>
        信心度 {percentage}%
      </span>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-[24px] border border-white/8 bg-[#141A20] p-6 shadow-[0_6px_18px_rgba(0,0,0,0.4)] sm:p-8"
    >
      <header className="mb-6 space-y-2">
        <div className="flex items-start justify-between">
          <div className="text-xs uppercase tracking-[0.35em] text-white/35">目前題目</div>
          {/* Badges: Confidence & Difficulty */}
          <div className="flex gap-2">
            {getConfidenceBadge(confidence)}
            {getDifficultyBadge(difficulty)}
          </div>
        </div>
        <p className="rounded-[18px] bg-[#10161C] px-4 py-3 text-sm leading-relaxed text-[#F1F5F9]">{question}</p>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#6EC1E4]/40 bg-[#18232B] px-4 py-1 text-xs text-[#6EC1E4]">
          考點：{conceptLabel}
        </div>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0 }}
        className="space-y-3"
      >
        <h3 className="text-xs uppercase tracking-[0.3em] text-white/40">✅ 一句話總結考點</h3>
        <p className="text-base leading-relaxed text-[#F1F5F9]">{summary}</p>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12 }}
        className="mt-6 space-y-3"
      >
        <h3 className="text-xs uppercase tracking-[0.3em] text-white/40">🔍 解題步驟</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#E2EAF2]">
          {steps.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.24 }}
        className="mt-6 space-y-3"
      >
        <h3 className="text-xs uppercase tracking-[0.3em] text-white/40">🧩 文法統整表</h3>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full border-collapse text-sm text-[#E6EDF4]">
            <thead className="bg-[#10161C]/80 text-xs uppercase tracking-[0.2em] text-[#A9B7C8]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">類別</th>
                <th className="px-4 py-3 text-left font-medium">說明</th>
                <th className="px-4 py-3 text-left font-medium">範例</th>
              </tr>
            </thead>
            <tbody>
              {grammarRows.map((row, index) => (
                <tr key={`${row.category}-${index}`} className="odd:bg-[#10161C]/60">
                  <td className="whitespace-pre-line px-4 py-3 text-[#F1F5F9]">{row.category}</td>
                  <td className="whitespace-pre-line px-4 py-3 text-[#C5D1DE]">{row.description}</td>
                  <td className="whitespace-pre-line px-4 py-3 text-[#9FB2C4]">{row.example || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* Past Papers Section */}
      {pastPapers.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="mt-6"
        >
          <button
            onClick={() => setPastPapersExpanded(!pastPapersExpanded)}
            className="flex w-full items-center justify-between rounded-[16px] border border-white/10 bg-[#10161C]/60 px-4 py-3 text-left transition hover:border-white/20 hover:bg-[#10161C]"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                📘 歷屆試題
              </span>
              <span className="rounded-full bg-[#6EC1E4]/20 px-2 py-0.5 text-xs text-[#6EC1E4]">
                {pastPapers.length}
              </span>
            </div>
            {pastPapersExpanded ? (
              <ChevronUp className="h-4 w-4 text-[#A9B7C8]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#A9B7C8]" />
            )}
          </button>

          <AnimatePresence>
            {pastPapersExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  {pastPapers.slice(0, 3).map((paper, index) => (
                    <motion.button
                      key={paper.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex w-full flex-col gap-2 rounded-[14px] border border-white/8 bg-[#0E1116]/80 p-3 text-left transition hover:border-[#6EC1E4]/40 hover:bg-[#0E1116]"
                    >
                      <p className="text-sm leading-relaxed text-[#E6EDF4]">
                        {paper.stem.length > 100
                          ? `${paper.stem.substring(0, 100)}...`
                          : paper.stem}
                      </p>
                      {paper.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {paper.tags.map((tag, tagIdx) => (
                            <span
                              key={tagIdx}
                              className="rounded-full bg-[#6EC1E4]/10 px-2 py-0.5 text-[10px] text-[#6EC1E4]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      )}

      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.36 }}
        className="mt-6 text-xs text-[#A9B7C8]"
      >
        {encouragement}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.42 }}
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"
      >
        <button
          onClick={onSave}
          disabled={isSaving}
          className={cn(
            'inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border border-[#6EC1E4]/40 bg-[#18232B] px-5 py-3 text-sm font-semibold text-[#6EC1E4] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:border-[#6EC1E4]/70 hover:shadow-[0_0_14px_rgba(110,193,228,0.35)]',
            isSaving && 'opacity-70'
          )}
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          存入書包
          {savedStatus === 'saved' && <span className="text-[11px] text-[#6EC1E4]">已儲存 ✓</span>}
        </button>

        {onNext && (
          <button
            onClick={onNext}
            disabled={isNextLoading}
            className={cn(
              'inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-[#E6EDF4] shadow-[0_6px_18px_rgba(0,0,0,0.3)] transition hover:bg-white/10',
              isNextLoading && 'opacity-70'
            )}
          >
            {isNextLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            {isLastStep ? '回到列表' : '下一題'}
          </button>
        )}

        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={cn(
            'inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-[#E6EDF4] shadow-[0_6px_18px_rgba(0,0,0,0.3)] transition hover:bg-white/10',
            isRetrying && 'opacity-70'
          )}
        >
          {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          再練一題
        </button>
      </motion.div>
    </motion.div>
  )
}

export default ExplanationCard
