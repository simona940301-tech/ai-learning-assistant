'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { motion } from 'framer-motion'
import ModeTabs from '@/components/ask/ModeTabs'
import AnySubjectSolver from '@/components/ask/AnySubjectSolver'
import { SummaryWorkbench } from '@/components/ask/SummaryWorkbench'
import { installGlobalFetchGuard } from '@/lib/api-client'
import { useGuidance } from '@/lib/guidance/useGuidance'

export default function AskPage() {
  const [activeTab, setActiveTab] = useState<'solve' | 'summary'>('solve')

  // 🎯 引導系統：自動檢測 T04 (Onboarding 完成後) 和 T01 (停留過久)
  const { recordOperation } = useGuidance({
    autoDetectT04: true,  // 🎯 啟用 T04 引導 (拍照或輸入題目 學霸幫你解題!)
    autoDetectT01: {
      enabled: true,
      delayMs: 10000,
    },
    page: 'ask',
  })

  // Install comprehensive API guard on mount
  useEffect(() => {
    installGlobalFetchGuard();
    console.log('✅ [AskPage] API guard installed');
  }, [])

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background text-foreground" data-page="ask">
      <motion.div
        className="fixed inset-x-0 top-0 z-20 flex justify-center border-b border-border bg-background/95 px-4 py-4 backdrop-blur"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ModeTabs active={activeTab} onChange={(tab) => {
          recordOperation() // 🎯 記錄操作
          setActiveTab(tab)
        }} />
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
