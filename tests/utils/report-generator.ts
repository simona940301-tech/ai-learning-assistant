/**
 * UX 審查報告生成器
 * 將測試結果轉換為可讀的 Markdown 報告
 */

// 類型定義
export interface PerformanceMetrics {
  fcp?: number
  lcp?: number
  fid?: number
  cls?: number
  tti?: number
  domContentLoaded?: number
  loadComplete?: number
  totalLoadTime?: number
  resourceCount?: number
  resourceSize?: number
  apiCalls?: Array<{
    url: string
    duration: number
    status: number
    method: string
  }>
  memoryUsage?: {
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }
}

export interface TestResult {
  step: string
  url: string
  loadTime: number
  metrics: PerformanceMetrics
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

export interface FlowReport {
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

interface PerformanceIssue {
  metric: string
  value: number
  standard: number
  severity: 'high' | 'medium' | 'low'
  page: string
  url: string
}

export class ReportGenerator {
  /**
   * 生成完整的 Markdown 報告
   */
  static generateMarkdownReport(report: FlowReport): string {
    const lines: string[] = []

    // 標題
    lines.push('# 🎯 完整 User Flow UX 審查報告')
    lines.push('')
    lines.push(`**測試時間**: ${new Date(report.testStartTime).toLocaleString('zh-TW')}`)
    lines.push(`**測試耗時**: ${(report.testDuration / 1000).toFixed(1)} 秒`)
    lines.push(`**測試步驟數**: ${report.summary.totalSteps}`)
    lines.push('')

    // 執行摘要
    lines.push('## 📊 執行摘要')
    lines.push('')
    lines.push('| 項目 | 數量 |')
    lines.push('|------|------|')
    lines.push(`| 總步驟數 | ${report.summary.totalSteps} |`)
    lines.push(`| ✅ 通過 | ${report.summary.passedSteps} |`)
    lines.push(`| ❌ 失敗 | ${report.summary.failedSteps} |`)
    lines.push(`| ⚠️ 性能問題 | ${report.summary.performanceIssues} |`)
    lines.push(`| 🔴 嚴重問題 | ${report.summary.criticalIssues} |`)
    lines.push('')

    // 性能評分
    const performanceScores = report.results.map((r) => r.performanceScore)
    const goodCount = performanceScores.filter((s) => s === 'good').length
    const needsImprovementCount = performanceScores.filter((s) => s === 'needs-improvement').length
    const poorCount = performanceScores.filter((s) => s === 'poor').length

    lines.push('## 🎯 性能評分總覽')
    lines.push('')
    lines.push('| 評分 | 數量 | 百分比 |')
    lines.push('|------|------|--------|')
    lines.push(
      `| ✅ 良好 (Good) | ${goodCount} | ${((goodCount / report.summary.totalSteps) * 100).toFixed(1)}% |`
    )
    lines.push(
      `| ⚠️ 需改善 (Needs Improvement) | ${needsImprovementCount} | ${((needsImprovementCount / report.summary.totalSteps) * 100).toFixed(1)}% |`
    )
    lines.push(
      `| 🔴 差 (Poor) | ${poorCount} | ${((poorCount / report.summary.totalSteps) * 100).toFixed(1)}% |`
    )
    lines.push('')

    // 收集所有性能問題
    const allIssues: PerformanceIssue[] = []
    report.results.forEach((result) => {
      result.issues.forEach((issue) => {
        allIssues.push({
          ...issue,
          page: result.step,
          url: result.url,
        })
      })
    })

    // 按嚴重程度排序
    const severityOrder = { high: 0, medium: 1, low: 2 }
    allIssues.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return b.value - a.value // 數值大的在前
    })

    // 性能問題列表
    if (allIssues.length > 0) {
      lines.push('## ⚠️ 性能問題清單')
      lines.push('')
      lines.push('### 🔴 嚴重問題 (High Severity)')
      lines.push('')
      const highIssues = allIssues.filter((i) => i.severity === 'high')
      if (highIssues.length > 0) {
        lines.push('| 指標 | 當前值 | 標準值 | 頁面 | 差距 |')
        lines.push('|------|--------|--------|------|------|')
        highIssues.forEach((issue) => {
          const gap = ((issue.value / issue.standard - 1) * 100).toFixed(1)
          lines.push(
            `| ${issue.metric} | ${issue.value.toFixed(0)}ms | ${issue.standard}ms | ${issue.page} | +${gap}% |`
          )
        })
        lines.push('')
      } else {
        lines.push('無嚴重問題 ✅')
        lines.push('')
      }

      lines.push('### 🟡 中等問題 (Medium Severity)')
      lines.push('')
      const mediumIssues = allIssues.filter((i) => i.severity === 'medium')
      if (mediumIssues.length > 0) {
        lines.push('| 指標 | 當前值 | 標準值 | 頁面 | 差距 |')
        lines.push('|------|--------|--------|------|------|')
        mediumIssues.forEach((issue) => {
          const gap = ((issue.value / issue.standard - 1) * 100).toFixed(1)
          lines.push(
            `| ${issue.metric} | ${issue.value.toFixed(0)}ms | ${issue.standard}ms | ${issue.page} | +${gap}% |`
          )
        })
        lines.push('')
      } else {
        lines.push('無中等問題 ✅')
        lines.push('')
      }

      lines.push('### 🟢 輕微問題 (Low Severity)')
      lines.push('')
      const lowIssues = allIssues.filter((i) => i.severity === 'low')
      if (lowIssues.length > 0) {
        lines.push('| 指標 | 當前值 | 標準值 | 頁面 | 差距 |')
        lines.push('|------|--------|--------|------|------|')
        lowIssues.forEach((issue) => {
          const gap = ((issue.value / issue.standard - 1) * 100).toFixed(1)
          lines.push(
            `| ${issue.metric} | ${issue.value.toFixed(0)}ms | ${issue.standard}ms | ${issue.page} | +${gap}% |`
          )
        })
        lines.push('')
      } else {
        lines.push('無輕微問題 ✅')
        lines.push('')
      }
    }

    // API 性能
    lines.push('## 📡 API 性能分析')
    lines.push('')
    lines.push('| 指標 | 數值 |')
    lines.push('|------|------|')
    lines.push(`| 平均響應時間 | ${report.apiPerformance.average}ms |`)
    lines.push(`| P95 | ${report.apiPerformance.p95}ms |`)
    lines.push(`| P99 | ${report.apiPerformance.p99}ms |`)
    lines.push('')

    if (report.apiPerformance.slowest.length > 0) {
      lines.push('### 🐌 最慢的 API 端點')
      lines.push('')
      lines.push('| 排名 | API 端點 | 響應時間 |')
      lines.push('|------|----------|----------|')
      report.apiPerformance.slowest.forEach((api, index) => {
        const shortUrl = api.url.length > 60 ? api.url.substring(0, 57) + '...' : api.url
        lines.push(`| ${index + 1} | ${shortUrl} | ${api.duration}ms |`)
      })
      lines.push('')
    }

    // 詳細步驟結果
    lines.push('## 📋 詳細步驟結果')
    lines.push('')
    report.results.forEach((result, index) => {
      lines.push(`### ${index + 1}. ${result.step}`)
      lines.push('')
      lines.push(`**URL**: \`${result.url}\``)
      lines.push(`**載入時間**: ${result.loadTime}ms`)
      lines.push(`**性能評分**: ${this.formatScore(result.performanceScore)}`)
      lines.push('')

      // 性能指標
      if (result.metrics) {
        lines.push('**性能指標:**')
        lines.push('')
        if (result.metrics.fcp) lines.push(`- FCP (First Contentful Paint): ${result.metrics.fcp.toFixed(0)}ms`)
        if (result.metrics.lcp)
          lines.push(`- LCP (Largest Contentful Paint): ${result.metrics.lcp.toFixed(0)}ms`)
        if (result.metrics.cls !== undefined)
          lines.push(`- CLS (Cumulative Layout Shift): ${result.metrics.cls.toFixed(3)}`)
        if (result.metrics.totalLoadTime)
          lines.push(`- 總載入時間: ${result.metrics.totalLoadTime.toFixed(0)}ms`)
        lines.push('')
      }

      // 錯誤
      if (result.errors.length > 0) {
        lines.push('**❌ 錯誤:**')
        lines.push('')
        result.errors.forEach((error) => {
          lines.push(`- ${error}`)
        })
        lines.push('')
      }

      // 警告
      if (result.warnings.length > 0) {
        lines.push('**⚠️ 警告:**')
        lines.push('')
        result.warnings.forEach((warning) => {
          lines.push(`- ${warning}`)
        })
        lines.push('')
      }

      // 性能問題
      if (result.issues.length > 0) {
        lines.push('**性能問題:**')
        lines.push('')
        result.issues.forEach((issue) => {
          const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢'
          lines.push(`- ${severityIcon} ${issue.metric}: ${issue.value.toFixed(0)}ms (標準: ${issue.standard}ms)`)
        })
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    })

    // 優化建議
    lines.push('## 💡 優化建議')
    lines.push('')
    
    const highIssues = allIssues.filter((i) => i.severity === 'high')
    if (highIssues.length > 0) {
      lines.push('### 優先級 1: 嚴重問題（立即處理）')
      lines.push('')
      highIssues.forEach((issue) => {
        lines.push(`#### ${issue.metric} - ${issue.page}`)
        lines.push('')
        lines.push(`- **問題**: ${issue.metric} 為 ${issue.value.toFixed(0)}ms，超過標準 ${issue.standard}ms`)
        lines.push(`- **影響**: 嚴重影響用戶體驗`)
        lines.push(`- **建議**: ${this.getOptimizationSuggestion(issue.metric, issue.value, issue.standard)}`)
        lines.push('')
      })
    }

    const mediumIssues = allIssues.filter((i) => i.severity === 'medium')
    if (mediumIssues.length > 0) {
      lines.push('### 優先級 2: 中等問題（近期處理）')
      lines.push('')
      mediumIssues.forEach((issue) => {
        lines.push(`#### ${issue.metric} - ${issue.page}`)
        lines.push('')
        lines.push(`- **問題**: ${issue.metric} 為 ${issue.value.toFixed(0)}ms，超過標準 ${issue.standard}ms`)
        lines.push(`- **影響**: 影響用戶體驗`)
        lines.push(`- **建議**: ${this.getOptimizationSuggestion(issue.metric, issue.value, issue.standard)}`)
        lines.push('')
      })
    }

    // 總結
    lines.push('## 📝 總結')
    lines.push('')
    if (report.summary.criticalIssues === 0 && report.summary.performanceIssues === 0) {
      lines.push('✅ **恭喜！未發現性能問題。**')
    } else {
      lines.push(`共發現 ${report.summary.performanceIssues} 個性能問題，其中 ${report.summary.criticalIssues} 個為嚴重問題。`)
      lines.push('')
      lines.push('**建議行動:**')
      lines.push(`1. 優先處理 ${report.summary.criticalIssues} 個嚴重問題`)
      lines.push(`2. 制定優化計劃，逐步改善其他 ${report.summary.performanceIssues - report.summary.criticalIssues} 個問題`)
      lines.push('3. 建立性能監控機制，持續追蹤改善效果')
    }
    lines.push('')
    lines.push(`---`)
    lines.push(`*報告生成時間: ${new Date().toLocaleString('zh-TW')}*`)

    return lines.join('\n')
  }

  /**
   * 格式化評分
   */
  private static formatScore(score: 'good' | 'needs-improvement' | 'poor'): string {
    const icons = {
      good: '✅ 良好',
      'needs-improvement': '⚠️ 需改善',
      poor: '🔴 差',
    }
    return icons[score]
  }

  /**
   * 獲取優化建議
   */
  private static getOptimizationSuggestion(metric: string, value: number, standard: number): string {
    if (metric.includes('FCP') || metric.includes('First Contentful Paint')) {
      return '優化關鍵 CSS、減少阻塞渲染的資源、使用 CDN 加速靜態資源載入'
    }
    if (metric.includes('LCP') || metric.includes('Largest Contentful Paint')) {
      return '優化最大內容元素（圖片/文字）、使用圖片懶加載、預加載關鍵資源'
    }
    if (metric.includes('CLS') || metric.includes('Cumulative Layout Shift')) {
      return '為圖片和媒體設置明確尺寸、避免在現有內容上方插入內容、使用 CSS transform 動畫'
    }
    if (metric.includes('Page Load Time')) {
      return '減少 JavaScript bundle 大小、使用代碼分割、優化 API 響應時間、啟用 HTTP/2'
    }
    if (metric.includes('API Response Time')) {
      return '優化數據庫查詢、使用緩存、減少 API 呼叫次數、考慮使用 GraphQL 減少過度獲取'
    }
    return '檢查代碼性能、優化算法、減少不必要的計算'
  }
}

// 類型定義
export interface FlowReport {
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

export interface TestResult {
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
