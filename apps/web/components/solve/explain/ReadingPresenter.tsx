'use client'

import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { ExplainViewModel } from '@/lib/types'
import Typewriter from '../Typewriter'

interface ReadingPresenterProps {
  vm: ExplainViewModel
  onEvidenceClick?: (evidence: string) => void
}

/**
 * Reading presenter: fullExplanation · evidenceBlocks ≤3
 * Preserves scroll/highlight behavior
 */
export default function ReadingPresenter({ vm, onEvidenceClick }: ReadingPresenterProps) {
  const articleRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (vm.evidenceBlocks && vm.evidenceBlocks.length > 0) {
      console.log('[ReadingPresenter] Evidence blocks available:', vm.evidenceBlocks)
    }
  }, [vm.evidenceBlocks])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
      ref={articleRef}
    >
      {vm.fullExplanation && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">詳解</div>
          <div className="text-base text-zinc-200 whitespace-pre-wrap">
            <Typewriter text={vm.fullExplanation} />
          </div>
        </div>
      )}

      {vm.evidenceBlocks && vm.evidenceBlocks.length > 0 && (
        <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 p-4">
          <div className="text-sm font-medium text-zinc-300 mb-2">關鍵證據</div>
          <div className="space-y-2">
            {vm.evidenceBlocks.slice(0, 3).map((evidence, idx) => (
              <div
                key={idx}
                className="text-sm text-zinc-300 p-2 rounded bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer transition-colors"
                onClick={() => {
                  onEvidenceClick?.(evidence)
                  // Scroll to evidence in original passage
                  console.log('[ReadingPresenter] Evidence clicked:', evidence)
                }}
              >
                {evidence}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
