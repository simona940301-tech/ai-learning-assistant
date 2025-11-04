'use client'

import { motion } from 'framer-motion'
import type { ExplainViewModel } from '@/lib/types'
import Typewriter from '../Typewriter'

interface VocabPresenterProps {
  vm: ExplainViewModel
}

/**
 * Vocab presenter: translation · fullExplanation · distractorNotes
 */
export default function VocabPresenter({ vm }: VocabPresenterProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {vm.cnTranslation && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">中譯</div>
          <div className="text-base text-zinc-200">
            <Typewriter text={vm.cnTranslation} />
          </div>
        </div>
      )}

      {vm.fullExplanation && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">詳解</div>
          <div className="text-base text-zinc-200 whitespace-pre-wrap">
            <Typewriter text={vm.fullExplanation} />
          </div>
        </div>
      )}

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
    </motion.div>
  )
}
