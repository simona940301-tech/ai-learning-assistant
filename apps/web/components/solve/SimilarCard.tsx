'use client'

import { motion } from 'framer-motion'
import { type SimilarResult, type SimilarQuestion } from '@/lib/solve-types'
import { useState } from 'react'

interface SimilarCardProps {
  result: SimilarResult
  onAddToQuiz?: (questionIds: string[]) => void
  onStoreRedirect?: () => void
}

function QuestionItem({
  question,
  index,
  selected,
  onToggleSelect,
}: {
  question: SimilarQuestion
  index: number
  selected: boolean
  onToggleSelect: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const difficultyColors: Record<SimilarQuestion['difficulty'], string> = {
    A1: 'bg-primary/10 text-primary',
    A2: 'bg-secondary text-foreground',
    B1: 'bg-accent text-accent-foreground',
    B2: 'bg-muted text-foreground/80',
    C1: 'bg-destructive/10 text-destructive',
    mixed: 'bg-border text-foreground/80',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-xl overflow-hidden bg-card/80 hover:border-primary/40 transition-all"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-secondary/60 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">{question.source}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${difficultyColors[question.difficulty]}`}>
                {question.difficulty}
              </span>
            </div>
            <div className="text-foreground text-sm line-clamp-2">{question.stem}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {question.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onToggleSelect()
              }}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                selected ? 'border-primary text-primary bg-primary/10' : 'border-border text-muted-foreground'
              }`}
            >
              {selected ? '已選取' : '加入'}
            </button>
            <div className="text-muted-foreground text-sm">{isExpanded ? '▼' : '▶'}</div>
          </div>
        </div>
      </button>

      {isExpanded && question.options && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          className="border-t border-border bg-secondary/60 p-4 space-y-2"
        >
          {question.options.map((option, idx) => (
            <div key={idx} className="text-sm text-foreground/90">
              {option}
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}

export default function SimilarCard({ result, onAddToQuiz, onStoreRedirect }: SimilarCardProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAddToQuiz = () => {
    if (selectedIds.size > 0 && onAddToQuiz) {
      onAddToQuiz(Array.from(selectedIds))
      setSelectedIds(new Set())
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-6">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-4">
          <div>
            <div className="text-lg font-bold">找到 {result.totalFound} 題相似題目</div>
            <div className="text-sm text-muted-foreground mt-1">顯示前 {result.questions.length} 題</div>
          </div>
        </div>

        {result.totalFound === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground border border-dashed border-border rounded-2xl">
            <p className="font-semibold text-foreground mb-2">尚未找到相似題</p>
            <p className="mb-4">換個關鍵字或逛逛題庫 Store</p>
            <button
              type="button"
              onClick={onStoreRedirect || (() => (window.location.href = '/store'))}
              className="px-4 py-2 rounded-xl bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              前往 Store
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 px-4">
              {result.questions.map((question, index) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  index={index}
                  selected={selectedIds.has(question.id)}
                  onToggleSelect={() => toggleSelection(question.id)}
                />
              ))}
            </div>
            {onAddToQuiz && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="sticky bottom-24 left-0 right-0 px-4"
              >
                <button
                  onClick={handleAddToQuiz}
                  disabled={selectedIds.size === 0}
                  className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  💾 加入題組 ({selectedIds.size} 題)
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
