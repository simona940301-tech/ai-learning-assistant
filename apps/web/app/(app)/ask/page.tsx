'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import ModeTabs from '@/components/ask/ModeTabs'
import AnySubjectSolver from '@/components/ask/AnySubjectSolver'
import { SummaryWorkbench } from '@/components/ask/SummaryWorkbench'
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
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <motion.div
        className="fixed inset-x-0 top-0 z-20 flex justify-center border-b border-border bg-background/95 px-4 py-4 backdrop-blur"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ModeTabs active={activeTab} onChange={setActiveTab} />
      </motion.div>

      <main className="flex flex-1 flex-col overflow-hidden pt-24">
        {activeTab === 'solve' ? (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">載入中...</div>}>
            <AnySubjectSolver />
          </Suspense>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <SummaryWorkbench />
          </div>
        )}
      </main>
    </div>
  )
}
