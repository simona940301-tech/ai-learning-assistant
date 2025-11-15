'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, BookOpen, HelpCircle } from 'lucide-react'

interface ExplainPanelProps {
  selectedText: string
  result: {
    explanation?: string
    source?: { page: number; text: string }
    questions?: string[]
  } | null
  loading: boolean
  onClose: () => void
}

export function ExplainPanel({ selectedText, result, loading, onClose }: ExplainPanelProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200/50 dark:border-zinc-800/50 overflow-hidden"
      >
        <div className="p-4 border-b border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-sm">概念解釋</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
          {/* Selected Text */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">&quot;{selectedText}&quot;</p>
          </div>

          {loading && !result && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          )}

          {result && (
            <>
              {/* Explanation */}
              {result.explanation && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <BookOpen className="h-4 w-4" />
                    <span>概念速解</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {result.explanation}
                  </p>
                </div>
              )}

              {/* Source */}
              {result.source && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <span>出處</span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    第 {result.source.page} 頁
                  </p>
                </div>
              )}

              {/* Follow-up Questions */}
              {result.questions && result.questions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    <HelpCircle className="h-4 w-4" />
                    <span>延伸提問</span>
                  </div>
                  <ul className="space-y-2">
                    {result.questions.map((q, idx) => (
                      <li
                        key={idx}
                        className="text-sm text-zinc-600 dark:text-zinc-400 p-2 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg"
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

