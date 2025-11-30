/**
 * 🎯 Guidance System Demo Page
 *
 * 用於測試和演示引導系統的各種功能
 */

'use client'

import { useState } from 'react'
import { useGuidance, useInefficientRepetition, useErrorCorrection } from '@/lib/guidance/useGuidance'
import { guidanceEngine } from '@/lib/guidance/guidance-engine'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function GuidanceDemoPage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 19)])
  }

  // T04: Post-Onboarding
  const { showGuidance, recordOperation, getStats, resetAll } = useGuidance({
    autoDetectT04: false, // 手動觸發
    autoDetectT01: {
      enabled: true,
      delayMs: 5000, // 5 秒（測試用）
    },
    page: 'play',
  })

  // T02: Inefficient Repetition
  const { trackAction: trackManualAction, count: manualCount } = useInefficientRepetition(
    'manual-action',
    3,
    () => addLog('✅ T02 引導已觸發！')
  )

  // T03: Error Correction
  const { trackError, count: errorCount } = useErrorCorrection(
    'upload-error',
    2,
    () => addLog('✅ T03 引導已觸發！')
  )

  const stats = getStats()

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
        <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">🎯 引導系統測試頁面</h1>
          <p className="mt-2 text-gray-600">測試極簡主義情境化引導系統的各種功能</p>
        </div>

        {/* Stats Card */}
        <Card className="border-2 border-blue-200 bg-white/80 p-6 backdrop-blur">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">📊 引導統計</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalGuidance}</div>
              <div className="text-xs text-gray-600">總引導數</div>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.shownGuidance}</div>
              <div className="text-xs text-gray-600">已顯示</div>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.dismissedGuidance}</div>
              <div className="text-xs text-gray-600">已關閉</div>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.completedGuidance}</div>
              <div className="text-xs text-gray-600">已完成</div>
            </div>
            <div className="rounded-lg bg-pink-50 p-3 text-center">
              <div className="text-2xl font-bold text-pink-600">
                {stats.onboardingPhaseCompleted ? '✅' : '⏳'}
              </div>
              <div className="text-xs text-gray-600">T04 階段</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => {
                resetAll()
                addLog('🔄 已重置所有引導狀態')
                window.location.reload()
              }}
              variant="destructive"
              size="sm"
            >
              重置所有狀態
            </Button>
            <Button
              onClick={() => {
                console.log('Current Stats:', stats)
                console.log('Storage:', {
                  guidanceStates: localStorage.getItem('moonshot_guidance_state'),
                  cooldownState: localStorage.getItem('moonshot_cooldown_state'),
                  operationCount: localStorage.getItem('moonshot_operation_count'),
                  dismissedFeatures: localStorage.getItem('moonshot_dismissed_features'),
                })
                addLog('📋 已輸出到 Console')
              }}
              variant="outline"
              size="sm"
            >
              查看詳細數據
            </Button>
          </div>
        </Card>

        {/* Test Triggers */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* T04 Tests */}
          <Card className="border-2 border-purple-200 bg-white/80 p-6 backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-purple-900">
              T04: Post-Onboarding First Run
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              優先級: 0 (最高) | 冷卻: 30 分鐘 | 限制: 3 個引導
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  sessionStorage.setItem('first_run_after_onboarding', 'true')
                  addLog('✅ 已設置 T04 標記，刷新頁面觸發')
                }}
                className="w-full"
              >
                設置 Post-Onboarding 標記
              </Button>

              <Button
                data-mode-card="system"
                onClick={() => {
                  showGuidance('T04_PostOnboardingFirstRun')
                  addLog('🎯 手動觸發 T04 引導')
                }}
                variant="outline"
                className="w-full"
              >
                手動觸發 T04 引導
              </Button>

              <Button
                onClick={() => {
                  recordOperation()
                  addLog(`📝 記錄操作 (共 ${guidanceEngine.getStats().totalGuidance} 次)`)
                }}
                variant="secondary"
                className="w-full"
              >
                記錄用戶操作
              </Button>
            </div>
          </Card>

          {/* T03 Tests */}
          <Card className="border-2 border-red-200 bg-white/80 p-6 backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-red-900">
              T03: Minor Error Correction
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              優先級: 1 | 閾值: 2 次錯誤 | 當前: {errorCount}/2
            </p>

            <div className="space-y-3">
              <Button
                data-upload-type="link"
                onClick={() => {
                  trackError({ fileSize: '10MB' })
                  addLog(`❌ 追蹤錯誤 (${errorCount + 1}/2)`)
                }}
                variant="destructive"
                className="w-full"
              >
                模擬上傳錯誤
              </Button>

              <Button
                onClick={() => {
                  showGuidance('T03_MinorErrorCorrection')
                  addLog('🎯 手動觸發 T03 引導')
                }}
                variant="outline"
                className="w-full"
              >
                手動觸發 T03 引導
              </Button>
            </div>
          </Card>

          {/* T02 Tests */}
          <Card className="border-2 border-yellow-200 bg-white/80 p-6 backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-yellow-900">
              T02: Inefficient Repetition
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              優先級: 2 | 閾值: 3 次重複 | 當前: {manualCount}/3
            </p>

            <div className="space-y-3">
              <Button
                data-action="batch-organize"
                onClick={() => {
                  trackManualAction()
                  addLog(`🔄 追蹤重複操作 (${manualCount + 1}/3)`)
                }}
                className="w-full bg-yellow-500 hover:bg-yellow-600"
              >
                模擬手動操作
              </Button>

              <Button
                onClick={() => {
                  showGuidance('T02_InefficientRepetition')
                  addLog('🎯 手動觸發 T02 引導')
                }}
                variant="outline"
                className="w-full"
              >
                手動觸發 T02 引導
              </Button>
            </div>
          </Card>

          {/* T01 Tests */}
          <Card className="border-2 border-green-200 bg-white/80 p-6 backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-green-900">
              T01: Exploration Stall
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              優先級: 3 (最低) | 觸發: 5 秒無操作 (Demo 模式)
            </p>

            <div className="space-y-3">
              <div className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-700">
                ⏳ 停留 5 秒不動即可觸發引導
              </div>

              <Button
                data-tab="summary"
                onClick={() => {
                  showGuidance('T01_ExplorationStall')
                  addLog('🎯 手動觸發 T01 引導')
                }}
                variant="outline"
                className="w-full"
              >
                手動觸發 T01 引導
              </Button>
            </div>
          </Card>
        </div>

        {/* Visual Examples */}
        <Card className="border-2 border-indigo-200 bg-white/80 p-6 backdrop-blur">
          <h2 className="mb-4 text-xl font-semibold text-indigo-900">🎨 視覺示例</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Level 1: Halo */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Level 1: 微光提示</div>
              <Button
                data-mode-card="practice"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
              >
                目標按鈕
              </Button>
              <p className="text-xs text-gray-500">極低侵入性，僅視覺高亮</p>
            </div>

            {/* Level 2: Tooltip */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Level 2: 提示氣泡</div>
              <Button
                data-mode-card="focus"
                className="w-full bg-gradient-to-r from-green-500 to-teal-500"
              >
                目標按鈕
              </Button>
              <p className="text-xs text-gray-500">中等侵入性，7 秒自動消失</p>
            </div>

            {/* Level 3: Modal */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Level 3: 半模態</div>
              <Button
                data-widget="daily-mission"
                className="w-full bg-gradient-to-r from-red-500 to-pink-500"
              >
                目標按鈕
              </Button>
              <p className="text-xs text-gray-500">高侵入性，僅限關鍵操作</p>
            </div>
          </div>
        </Card>

        {/* Logs */}
        <Card className="border-2 border-gray-200 bg-white/80 p-6 backdrop-blur">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">📜 操作日誌</h2>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-center text-gray-400">暫無日誌</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="text-gray-700">
                  {log}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Documentation */}
        <Card className="border-2 border-blue-200 bg-blue-50/50 p-6 backdrop-blur">
          <h2 className="mb-4 text-xl font-semibold text-blue-900">📚 使用說明</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <strong>T04 測試:</strong> 點擊「設置 Post-Onboarding 標記」後刷新頁面
            </p>
            <p>
              <strong>T03 測試:</strong> 連續點擊「模擬上傳錯誤」2 次
            </p>
            <p>
              <strong>T02 測試:</strong> 連續點擊「模擬手動操作」3 次
            </p>
            <p>
              <strong>T01 測試:</strong> 停留在頁面 5 秒不動（不要點擊、滾動）
            </p>
            <p className="mt-4 rounded-lg bg-yellow-50 p-3 text-yellow-800">
              ⚠️ 注意：觸發引導後有冷卻期限制，如需重複測試請點擊「重置所有狀態」
            </p>
          </div>
        </Card>
      </div>
    </div>
    </AuthGuard>
  )
}
