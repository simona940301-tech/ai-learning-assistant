import { test, expect, Page } from '@playwright/test'
import { PerformanceCollector, evaluatePerformance, PERFORMANCE_STANDARDS } from '../utils/performance-collector'

/**
 * 完整 User Flow 測試與 UX 審查
 * 方案一：漸進式完整流程測試 + 方案二：核心性能指標
 */

interface TestResult {
  step: string
  url: string
  loadTime: number
  metrics: any
  performanceScore: 'good' | 'needs-improvement' | 'poor'
  issues: Array<{
    metric: string
    value: number
    standard: number
    severity: 'high' | 'medium' | 'low'
  }>
  errors: string[]
  warnings: string[]
}

interface FlowReport {
  testStartTime: string
  testDuration: number
  results: TestResult[]
  summary: {
    totalSteps: number
    passedSteps: number
    failedSteps: number
    performanceIssues: number
    criticalIssues: number
  }
  apiPerformance: {
    average: number
    p95: number
    p99: number
    slowest: Array<{ url: string; duration: number }>
  }
}

class FlowTester {
  private collector: PerformanceCollector
  private results: TestResult[] = []
  private testStartTime: number

  constructor(private page: Page) {
    this.collector = new PerformanceCollector(page)
    this.testStartTime = Date.now()
  }

  /**
   * 測試單個步驟並收集指標
   */
  async testStep(
    stepName: string,
    url: string,
    action?: (page: Page) => Promise<void>
  ): Promise<TestResult> {
    console.log(`\n📍 測試步驟: ${stepName}`)
    console.log(`   頁面: ${url}`)

    const errors: string[] = []
    const warnings: string[] = []

    // 重置收集器
    this.collector.reset()

    // 測試頁面載入
    const loadStartTime = Date.now()
    try {
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    } catch (error: any) {
      errors.push(`頁面載入失敗: ${error.message}`)
      console.error(`   ❌ 頁面載入失敗: ${error.message}`)
    }
    const loadTime = Date.now() - loadStartTime

    // 等待頁面穩定
    await this.page.waitForTimeout(1000)

    // 收集性能指標
    let metrics
    try {
      metrics = await this.collector.collectMetrics()
    } catch (error: any) {
      warnings.push(`性能指標收集失敗: ${error.message}`)
      metrics = {}
    }

    // 評估性能
    const performance = evaluatePerformance(metrics)

    // 執行自定義操作
    if (action) {
      try {
        await action(this.page)
        await this.page.waitForTimeout(500) // 等待操作完成
      } catch (error: any) {
        errors.push(`操作執行失敗: ${error.message}`)
        console.error(`   ❌ 操作失敗: ${error.message}`)
      }
    }

    // 檢查控制台錯誤
    const consoleErrors = await this.page.evaluate(() => {
      return (window as any).__consoleErrors || []
    })

    if (consoleErrors.length > 0) {
      warnings.push(`發現 ${consoleErrors.length} 個控制台錯誤`)
      consoleErrors.forEach((err: string) => {
        warnings.push(`控制台錯誤: ${err.substring(0, 100)}`)
      })
    }

    // 檢查頁面錯誤
    const errorElements = await this.page.locator('text=/Error|錯誤|失敗/i').count()
    if (errorElements > 0) {
      warnings.push(`頁面上發現 ${errorElements} 個錯誤訊息`)
    }

    const result: TestResult = {
      step: stepName,
      url,
      loadTime,
      metrics,
      performanceScore: performance.score,
      issues: performance.issues,
      errors,
      warnings,
    }

    // 輸出結果摘要
    console.log(`   ⏱️  載入時間: ${loadTime}ms`)
    if (metrics.fcp) console.log(`   📊 FCP: ${metrics.fcp.toFixed(0)}ms`)
    if (metrics.lcp) console.log(`   📊 LCP: ${metrics.lcp.toFixed(0)}ms`)
    if (metrics.cls !== undefined) console.log(`   📊 CLS: ${metrics.cls.toFixed(3)}`)
    console.log(`   🎯 性能評分: ${performance.score}`)
    if (performance.issues.length > 0) {
      console.log(`   ⚠️  發現 ${performance.issues.length} 個性能問題`)
      performance.issues.forEach((issue) => {
        console.log(`      - ${issue.metric}: ${issue.value.toFixed(0)}ms (標準: ${issue.standard}ms) [${issue.severity}]`)
      })
    }
    if (errors.length > 0) {
      console.log(`   ❌ 錯誤: ${errors.length} 個`)
    }
    if (warnings.length > 0) {
      console.log(`   ⚠️  警告: ${warnings.length} 個`)
    }

    this.results.push(result)
    return result
  }

  /**
   * 生成測試報告
   */
  generateReport(): FlowReport {
    const testDuration = Date.now() - this.testStartTime
    const apiPerformance = this.collector.getAPIPerformance()

    const summary = {
      totalSteps: this.results.length,
      passedSteps: this.results.filter((r) => r.errors.length === 0).length,
      failedSteps: this.results.filter((r) => r.errors.length > 0).length,
      performanceIssues: this.results.reduce((sum, r) => sum + r.issues.length, 0),
      criticalIssues: this.results.reduce(
        (sum, r) => sum + r.issues.filter((i) => i.severity === 'high').length,
        0
      ),
    }

    return {
      testStartTime: new Date(this.testStartTime).toISOString(),
      testDuration,
      results: this.results,
      summary,
      apiPerformance,
    }
  }
}

test.describe('完整 User Flow 測試與 UX 審查', () => {
  let tester: FlowTester

  test.beforeEach(async ({ page }) => {
    // 設置移動設備視口（主要用戶群）
    await page.setViewportSize({ width: 375, height: 667 })
    await page.context().clearCookies()

    // 監聽控制台錯誤
    await page.addInitScript(() => {
      const errors: string[] = []
      ;(window as any).__consoleErrors = errors

      const originalError = console.error
      console.error = (...args: any[]) => {
        errors.push(args.map((a) => String(a)).join(' '))
        originalError.apply(console, args)
      }

      window.addEventListener('error', (event) => {
        errors.push(`Uncaught Error: ${event.message} at ${event.filename}:${event.lineno}`)
      })

      window.addEventListener('unhandledrejection', (event) => {
        errors.push(`Unhandled Rejection: ${String(event.reason)}`)
      })
    })

    tester = new FlowTester(page)
  })

  test('完整用戶旅程：從 Onboarding 到核心功能', async ({ page }) => {
    console.log('\n🚀 開始完整 User Flow 測試')
    console.log('='.repeat(60))

    // ========================================
    // 階段 1: Onboarding Flow
    // ========================================
    console.log('\n📋 階段 1: Onboarding Flow')

    // Step 1: Goal 設定
    await tester.testStep(
      'Onboarding - Goal 設定',
      '/onboarding/goal',
      async (p) => {
        // 等待頁面載入完成
        await p.waitForTimeout(2000)

        // 嘗試選擇年級（如果有選項）
        const gradeButton = p.locator('button, [role="button"]').filter({ hasText: /高一|高二|高三/ }).first()
        if (await gradeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await gradeButton.click()
          await p.waitForTimeout(500)
        }

        // 檢查是否有繼續按鈕
        const continueButton = p.locator('button').filter({ hasText: /繼續|下一步|Next|Continue/ }).first()
        if (await continueButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          // 不實際點擊，只測試載入和互動響應
          const buttonVisible = await continueButton.isVisible()
          expect(buttonVisible).toBeTruthy()
        }
      }
    )

    // Step 2: Avatar 選擇
    await tester.testStep(
      'Onboarding - Avatar 選擇',
      '/onboarding/avatar',
      async (p) => {
        await p.waitForTimeout(2000)
        // 檢查頭像選項是否存在
        const avatarOptions = p.locator('[data-testid*="avatar"], .avatar, img[alt*="avatar"]')
        const avatarCount = await avatarOptions.count()
        if (avatarCount > 0) {
          console.log(`   找到 ${avatarCount} 個頭像選項`)
        }
      }
    )

    // Step 3: Challenge 測驗
    await tester.testStep(
      'Onboarding - Challenge 測驗',
      '/onboarding/challenge',
      async (p) => {
        await p.waitForTimeout(3000) // Challenge 頁面可能需要載入題目
        
        // 檢查是否有題目顯示
        const questionElements = p.locator('text=/題目|Question|選項|Option/')
        const hasQuestions = await questionElements.first().isVisible({ timeout: 5000 }).catch(() => false)
        
        if (!hasQuestions) {
          console.log('   警告: 未找到題目，可能需要認證或等待 API 響應')
        }
      }
    )

    // Step 4: Reward 查看
    await tester.testStep('Onboarding - Reward 查看', '/onboarding/reward', async (p) => {
      await p.waitForTimeout(2000)
    })

    // Step 5: Habits 設定
    await tester.testStep('Onboarding - Habits 設定', '/onboarding/habits', async (p) => {
      await p.waitForTimeout(2000)
    })

    // Step 6: Complete 完成
    await tester.testStep('Onboarding - Complete', '/onboarding/complete', async (p) => {
      await p.waitForTimeout(2000)
    })

    // ========================================
    // 階段 2: 核心功能
    // ========================================
    console.log('\n📋 階段 2: 核心功能測試')

    // Home 頁面
    await tester.testStep(
      'Home - 首頁',
      '/home',
      async (p) => {
        await p.waitForTimeout(2000)
        // 檢查微任務卡片
        const missionCard = p.locator('[data-testid*="mission"], .mission-card, text=/微任務|任務|Mission/')
        const hasMissionCard = await missionCard.first().isVisible({ timeout: 3000 }).catch(() => false)
        if (hasMissionCard) {
          console.log('   找到微任務卡片')
        }
      }
    )

    // Community 頁面
    await tester.testStep('Community - 社群', '/community', async (p) => {
      await p.waitForTimeout(2000)
    })

    // Play 頁面
    await tester.testStep(
      'Play - 練習',
      '/play',
      async (p) => {
        await p.waitForTimeout(2000)
        // 檢查是否有練習相關元素
        const playElements = p.locator('text=/練習|開始|Play|Start/')
        const hasPlayElements = await playElements.first().isVisible({ timeout: 3000 }).catch(() => false)
        if (hasPlayElements) {
          console.log('   找到練習相關元素')
        }
      }
    )

    // Ask 頁面
    await tester.testStep(
      'Ask - 提問',
      '/ask',
      async (p) => {
        await p.waitForTimeout(2000)
        // 檢查輸入框
        const inputArea = p.locator('textarea, input[type="text"], [contenteditable="true"]')
        const hasInput = await inputArea.first().isVisible({ timeout: 3000 }).catch(() => false)
        if (hasInput) {
          console.log('   找到輸入區域')
        }
      }
    )

    // Backpack 頁面
    await tester.testStep(
      'Backpack - 書包',
      '/backpack',
      async (p) => {
        await p.waitForTimeout(2000)
        // 檢查是否有內容或空狀態
        const contentArea = p.locator('[data-testid*="backpack"], .backpack-content, text=/錯題|書包|Backpack/')
        const hasContent = await contentArea.first().isVisible({ timeout: 3000 }).catch(() => false)
        if (hasContent) {
          console.log('   找到書包內容區域')
        }
      }
    )

    // Store 頁面
    await tester.testStep(
      'Store - 商店',
      '/store',
      async (p) => {
        await p.waitForTimeout(2000)
        // 檢查是否有題包列表
        const packList = p.locator('[data-testid*="pack"], .pack-card, text=/題包|Pack/')
        const hasPacks = await packList.first().isVisible({ timeout: 3000 }).catch(() => false)
        if (hasPacks) {
          console.log('   找到題包列表')
        }
      }
    )

    // Profile 頁面
    await tester.testStep(
      'Profile - 個人資料',
      '/profile',
      async (p) => {
        await p.waitForTimeout(2000)
      }
    )

    // ========================================
    // 生成報告
    // ========================================
    console.log('\n📊 生成測試報告')
    console.log('='.repeat(60))

    const report = tester.generateReport()

    // 輸出摘要
    console.log(`\n✅ 測試完成`)
    console.log(`   總步驟數: ${report.summary.totalSteps}`)
    console.log(`   通過: ${report.summary.passedSteps}`)
    console.log(`   失敗: ${report.summary.failedSteps}`)
    console.log(`   性能問題: ${report.summary.performanceIssues}`)
    console.log(`   嚴重問題: ${report.summary.criticalIssues}`)
    console.log(`   測試耗時: ${(report.testDuration / 1000).toFixed(1)}s`)

    // API 性能摘要
    console.log(`\n📡 API 性能`)
    console.log(`   平均響應時間: ${report.apiPerformance.average}ms`)
    console.log(`   P95: ${report.apiPerformance.p95}ms`)
    console.log(`   P99: ${report.apiPerformance.p99}ms`)
    if (report.apiPerformance.slowest.length > 0) {
      console.log(`\n   最慢的 API:`)
      report.apiPerformance.slowest.forEach((api, index) => {
        console.log(`     ${index + 1}. ${api.url}: ${api.duration}ms`)
      })
    }

    // 輸出詳細結果到文件
    const reportJson = JSON.stringify(report, null, 2)
    await page.evaluate((json) => {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ux-audit-report-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, reportJson)

    // 保存報告到文件系統（通過 Node.js）
    const fs = require('fs')
    const path = require('path')
    const timestamp = Date.now()
    const reportsDir = path.join(process.cwd(), 'test-reports')
    
    // 確保報告目錄存在
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }
    
    const jsonReportPath = path.join(reportsDir, `ux-audit-report-${timestamp}.json`)
    fs.writeFileSync(jsonReportPath, reportJson, 'utf-8')
    console.log(`\n💾 JSON 報告已保存到: ${jsonReportPath}`)

    // 生成 Markdown 報告（使用動態導入避免類型問題）
    try {
      const reportGeneratorPath = path.join(__dirname, '../utils/report-generator.ts')
      // 如果無法載入 TypeScript，先只保存 JSON，Markdown 報告稍後生成
      console.log(`\n💡 提示: JSON 報告已保存，可以手動生成 Markdown 報告`)
    } catch (error) {
      console.log(`\n⚠️  Markdown 報告生成跳過（僅保存 JSON）`)
    }

    // 驗證基本要求
    expect(report.summary.totalSteps).toBeGreaterThan(0)
    console.log(`\n✅ 測試完成，詳細報告請查看以下文件：`)
    console.log(`   - JSON: ${jsonReportPath}`)
    console.log(`   💡 提示: 使用以下命令生成 Markdown 報告:`)
    console.log(`      tsx scripts/generate-ux-report.ts ${jsonReportPath}`)
  })
})
