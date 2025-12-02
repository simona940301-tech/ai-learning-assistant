'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ModeTabs from '@/components/ask/ModeTabs'
import AnySubjectSolver from '@/components/ask/AnySubjectSolver'
import SummaryCard from '@/components/ask/SummaryCard'
import { installGlobalFetchGuard } from '@/lib/api-client'

const TAB_STORAGE_KEY = 'ask_active_tab'

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

  // Restore last selected tab (or ?tab=summary) to prevent jumpbacks on refresh/hot-reload
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const saved = (tabParam || localStorage.getItem(TAB_STORAGE_KEY)) as 'solve' | 'summary' | null
    if (saved === 'solve' || saved === 'summary') {
      setActiveTab(saved)
    }
  }, [])

  const handleTabChange = (tab: 'solve' | 'summary') => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem(TAB_STORAGE_KEY, tab)
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.replaceState({}, '', url.toString())
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <motion.div
        className="fixed inset-x-0 top-0 z-20 flex justify-center border-b border-border bg-background/95 px-4 py-4 backdrop-blur"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ModeTabs active={activeTab} onChange={handleTabChange} />
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
