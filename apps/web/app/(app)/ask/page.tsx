'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ModeTabs from '@/components/ask/ModeTabs'
import AnySubjectSolver from '@/components/ask/AnySubjectSolver'
import { SummaryWorkbench } from '@/components/ask/SummaryWorkbench'
import { installGlobalFetchGuard } from '@/lib/api-client'
import { useGuidance } from '@/lib/guidance/useGuidance'

export default function AskPage() {
  const searchParams = useSearchParams()
  // 🎯 Phase 3: 從 URL 參數讀取 tab（支援從 Backpack 跳轉）
  const tabFromUrl = searchParams?.get('tab') as 'solve' | 'summary' | null
  const [activeTab, setActiveTab] = useState<'solve' | 'summary'>(tabFromUrl || 'solve')
  const [openMenuFn, setOpenMenuFn] = useState<(() => void) | null>(null)

  // 🎯 當 URL 參數改變時，同步更新 activeTab
  useEffect(() => {
    if (tabFromUrl && (tabFromUrl === 'solve' || tabFromUrl === 'summary')) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl])

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
    <div className="relative flex h-full flex-col overflow-hidden bg-background text-foreground" data-page="ask">
      {/* Top Bar: Menu + Tabs */}
      <div className="absolute inset-x-0 top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Hamburger Menu (only on summary tab) */}
          <div className="w-10">
            {activeTab === 'summary' && openMenuFn && (
              <Button
                variant="ghost"
                size="icon"
                onClick={openMenuFn}
                className="hover:bg-black/5 rounded-full"
              >
                <Menu className="h-6 w-6 text-foreground/80" />
              </Button>
            )}
          </div>

          {/* Center: Mode Tabs */}
          <motion.div
            className="flex-1 flex justify-center"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ModeTabs
              active={activeTab}
              onChange={(tab) => {
                recordOperation() // 🎯 記錄操作
                setActiveTab(tab)
              }}
            />
          </motion.div>

          {/* Right: Spacer for balance */}
          <div className="w-10" />
        </div>
      </div>

      <main className="flex flex-1 flex-col overflow-hidden pt-16">
        {activeTab === 'solve' ? (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]">載入中...</div>}>
            <AnySubjectSolver />
          </Suspense>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <SummaryWorkbench onMenuOpen={setOpenMenuFn} />
          </div>
        )}
      </main>
    </div>
  )
}
