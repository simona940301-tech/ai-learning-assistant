'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ModeTabs from '@/components/ask/ModeTabs'
import AnySubjectSolver from '@/components/ask/AnySubjectSolver'
import SummaryCard from '@/components/ask/SummaryCard'
import { installGlobalFetchGuard } from '@/lib/api-client'

export default function AskPage() {
  const [activeTab, setActiveTab] = useState<'solve' | 'summary'>('solve')

  // FORCE SOLVER MODE: Block any legacy warmup flows
  useEffect(() => {
    // Set global flag to prevent any legacy code from activating warmup
    (window as any).__PLMS_FORCE_SOLVER__ = true;

    // Install comprehensive API guard
    installGlobalFetchGuard();

    console.log('✅ [ForceSolver] Solver-only mode active');
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <motion.div
        className="fixed inset-x-0 top-0 z-20 flex justify-center border-b border-border bg-background/95 px-4 py-4 backdrop-blur"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ModeTabs active={activeTab} onChange={setActiveTab} />
      </motion.div>

      <main className="flex-1 overflow-y-auto pt-24 pb-12">
        {activeTab === 'solve' ? (
          <AnySubjectSolver />
        ) : (
          <div className="mx-auto max-w-3xl px-4 py-6">
            <SummaryCard title="重點統整" bullets={['這裡可以顯示學習重點統整內容']} />
          </div>
        )}
      </main>
    </div>
  )
}
