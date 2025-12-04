import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckSquare, Square } from 'lucide-react'
import type { Question } from '@/lib/tutor-types'

interface BatchSelectionToastProps {
  visible: boolean
  questions: Question[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onSelectAll: () => void
  onStart: () => void
  onCancel: () => void
}

export default function BatchSelectionToast({
  visible,
  questions,
  selectedIds,
  onToggle,
  onSelectAll,
  onStart,
  onCancel,
}: BatchSelectionToastProps) {
  const allSelected = questions.length > 0 && selectedIds.length === questions.length

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onCancel}
          />

          {/* Toast Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-2xl"
          >
            <div className="rounded-[24px] border border-white/10 bg-[#141A20] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#F1F5F9]">
                    偵測到 {questions.length} 個問題
                  </h3>
                  <p className="mt-1 text-sm text-[#A9B7C8]">
                    選擇需要詳細解析的題目，其餘將顯示快速解答
                  </p>
                </div>
                <button
                  onClick={onCancel}
                  className="rounded-full p-2 text-[#A9B7C8] transition hover:bg-white/5 hover:text-[#F1F5F9]"
                  aria-label="關閉"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Question List */}
              <div className="mb-4 max-h-[400px] space-y-2 overflow-y-auto pr-2">
                {questions.slice(0, 10).map((question) => {
                  const isSelected = selectedIds.includes(question.id)
                  const stemPreview = question.text.substring(0, 80)
                  const needsEllipsis = question.text.length > 80

                  return (
                    <motion.button
                      key={question.id}
                      onClick={() => onToggle(question.id)}
                      className={`flex w-full items-start gap-3 rounded-[16px] border p-3 text-left transition ${
                        isSelected
                          ? 'border-[#6EC1E4]/60 bg-[#6EC1E4]/8'
                          : 'border-white/8 bg-[#10161C]/60 hover:border-white/15 hover:bg-[#10161C]'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-[#6EC1E4]" />
                        ) : (
                          <Square className="h-5 w-5 text-[#A9B7C8]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed text-[#E6EDF4]">
                          {stemPreview}
                          {needsEllipsis && (
                            <span className="text-[#A9B7C8]">...</span>
                          )}
                        </p>
                        {question.options && question.options.length > 0 && (
                          <div className="mt-1 text-xs text-[#A9B7C8]">
                            {question.options.length} 個選項
                          </div>
                        )}
                      </div>
                    </motion.button>
                  )
                })}

                {questions.length > 10 && (
                  <div className="pt-2 text-center text-xs text-[#A9B7C8]">
                    還有 {questions.length - 10} 題未顯示
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  onClick={onSelectAll}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-[#E6EDF4] transition hover:bg-white/10"
                >
                  {allSelected ? '取消全選' : '全選'}
                  <span className="text-xs text-[#A9B7C8]">
                    (⌘A / Ctrl+A)
                  </span>
                </button>

                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="flex-1 rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-[#E6EDF4] transition hover:bg-white/10 sm:flex-initial"
                  >
                    取消
                  </button>
                  <button
                    onClick={onStart}
                    disabled={selectedIds.length === 0}
                    className="flex-1 rounded-full border border-[#6EC1E4]/40 bg-[#18232B] px-6 py-3 text-sm font-semibold text-[#6EC1E4] shadow-[0_6px_18px_rgba(0,0,0,0.35)] transition hover:border-[#6EC1E4]/70 hover:shadow-[0_0_14px_rgba(110,193,228,0.35)] disabled:opacity-50 disabled:cursor-not-allowed sm:flex-initial"
                  >
                    開始解析
                    {selectedIds.length > 0 && (
                      <span className="ml-2 text-xs">
                        ({selectedIds.length} 題)
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
