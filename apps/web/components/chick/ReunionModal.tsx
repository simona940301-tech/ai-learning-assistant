'use client'

import { motion, AnimatePresence } from 'framer-motion'

type ReunionMood = 'happy' | 'sad' | 'runaway'

type ReunionModalProps = {
  open: boolean
  mood: ReunionMood
  daysAway: number
  onClose: () => void
  onWhistle?: () => Promise<void>
  isWhistleLoading?: boolean
  whistleError?: string | null
}

const moodCopy: Record<ReunionMood, { title: string; body: string; accent: string; bg: string }> = {
  happy: {
    title: '歡迎回來',
    body: '我等你很久了，我們繼續一起前進吧。',
    accent: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50',
  },
  sad: {
    title: '你去哪了',
    body: '這段時間我有點失落，今天能陪陪我嗎？',
    accent: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
  },
  runaway: {
    title: '離家出走了',
    body: '需要一聲召喚，我才敢回來。使用哨子把我叫回來吧。',
    accent: 'from-rose-500 to-red-500',
    bg: 'bg-rose-50',
  },
}

export function ReunionModal({
  open,
  mood,
  daysAway,
  onClose,
  onWhistle,
  isWhistleLoading,
  whistleError,
}: ReunionModalProps) {
  const copy = moodCopy[mood]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className={`p-6 pb-4 bg-gradient-to-r ${copy.accent} text-white`}>
              <div className="text-xs uppercase tracking-[0.2em] mb-2">久別重逢</div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{copy.title}</h2>
                <div className="text-sm font-semibold px-3 py-1 bg-white/20 rounded-full">
                  離開 {daysAway} 天
                </div>
              </div>
            </div>

            {/* Body */}
            <div className={`p-6 ${copy.bg}`}>
              <div className="space-y-3 text-sm text-neutral-800">
                <p className="text-base font-medium text-neutral-900">{copy.body}</p>
                {mood === 'runaway' && (
                  <p className="text-sm text-neutral-700">
                    哨子費用 50 金幣。若餘額不足，請先完成任務或練習補充金幣。
                  </p>
                )}
              </div>

              {/* State block */}
              <div className="mt-5 rounded-2xl border border-white/60 bg-white shadow-sm p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-sm font-semibold text-neutral-700">
                  {mood === 'runaway' ? '空巢' : mood === 'sad' ? '落寞' : '迎接'}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-neutral-900">
                    {mood === 'runaway' ? '夥伴暫時離開' : '夥伴在等待'}
                  </div>
                  <div className="text-xs text-neutral-600">
                    {mood === 'runaway'
                      ? '吹響哨子即可把牠叫回來，之後多陪陪牠。'
                      : '開啟今天的行程，讓牠放心。'}
                  </div>
                </div>
              </div>

              {whistleError && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {whistleError}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:border-neutral-300 transition"
                >
                  我回來了
                </button>
                {mood === 'runaway' && (
                  <button
                    onClick={onWhistle}
                    disabled={isWhistleLoading}
                    className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:from-amber-600 hover:to-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {isWhistleLoading ? '召回中...' : '使用哨子召回'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
