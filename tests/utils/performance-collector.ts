/**
 * Performance Metrics Collector
 * 收集 Core Web Vitals 和其他性能指標
 */

export interface PerformanceMetrics {
  // Core Web Vitals
  fcp?: number // First Contentful Paint
  lcp?: number // Largest Contentful Paint
  fid?: number // First Input Delay
  cls?: number // Cumulative Layout Shift
  tti?: number // Time to Interactive
  
  // Navigation Timing
  domContentLoaded?: number
  loadComplete?: number
  totalLoadTime?: number
  
  // Resource Timing
  resourceCount?: number
  resourceSize?: number
  
  // API Performance
  apiCalls?: Array<{
    url: string
    duration: number
    status: number
    method: string
  }>
  
  // Memory (if available)
  memoryUsage?: {
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }
}

export class PerformanceCollector {
  private metrics: PerformanceMetrics = {}
  private apiCalls: Array<{
    url: string
    duration: number
    status: number
    method: string
    startTime: number
  }> = []

  constructor(private page: any) {
    this.setupNetworkInterception()
  }

  /**
   * 設置網絡攔截以追蹤 API 調用
   */
  private setupNetworkInterception() {
    this.page.on('request', (request: any) => {
      const url = request.url()
      if (url.includes('/api/') || url.includes('supabase')) {
        const startTime = Date.now()
        request.request()._startTime = startTime
      }
    })

    this.page.on('response', async (response: any) => {
      const url = response.url()
      if (url.includes('/api/') || url.includes('supabase')) {
        const request = response.request()
        const startTime = (request as any)._startTime || Date.now()
        const duration = Date.now() - startTime
        const status = response.status()
        const method = request.method()

        this.apiCalls.push({
          url,
          duration,
          status,
          method,
          startTime,
        })
      }
    })
  }

  /**
   * 收集所有性能指標
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    // 收集 Core Web Vitals 和 Navigation Timing
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paintEntries = performance.getEntriesByType('paint')
      const layoutShiftEntries = performance.getEntriesByType('layout-shift') as PerformanceEntry[]
      
      // FCP (First Contentful Paint)
      const fcpEntry = paintEntries.find((entry: any) => entry.name === 'first-contentful-paint')
      const fcp = fcpEntry ? fcpEntry.startTime : undefined

      // LCP (Largest Contentful Paint) - 需要額外的 observer
      let lcp: number | undefined
      
      // CLS (Cumulative Layout Shift)
      let cls = 0
      layoutShiftEntries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          cls += entry.value
        }
      })

      // Navigation Timing
      const domContentLoaded = navigation
        ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        : undefined
      
      const loadComplete = navigation
        ? navigation.loadEventEnd - navigation.loadEventStart
        : undefined
      
      const totalLoadTime = navigation
        ? navigation.loadEventEnd - navigation.fetchStart
        : undefined

      // Resource count and size
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const resourceCount = resources.length
      const resourceSize = resources.reduce((sum, r) => {
        const size = (r as any).transferSize || 0
        return sum + size
      }, 0)

      // Memory usage (if available)
      const memory = (performance as any).memory

      return {
        fcp,
        lcp,
        cls,
        domContentLoaded,
        loadComplete,
        totalLoadTime,
        resourceCount,
        resourceSize,
        memory: memory ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        } : undefined,
      }
    })

    // 設置 LCP observer (需要在頁面載入前設置)
    try {
      await this.page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1] as any
            ;(window as any).__lcpValue = lastEntry.renderTime || lastEntry.loadTime
          })
          
          observer.observe({ entryTypes: ['largest-contentful-paint'] })
          
          // 等待一段時間確保 LCP 已經收集
          setTimeout(() => {
            resolve((window as any).__lcpValue)
          }, 2000)
        })
      })
    } catch (error) {
      console.warn('LCP collection failed:', error)
    }

    // 獲取 LCP 值
    const lcp = await this.page.evaluate(() => (window as any).__lcpValue)

    // 收集 FID (需要用戶互動)
    // 這個需要在實際互動時收集，所以我們先不收集

    this.metrics = {
      ...metrics,
      lcp,
      apiCalls: this.apiCalls.map(({ startTime, ...rest }) => rest),
    }

    return this.metrics
  }

  /**
   * 收集互動響應時間（點擊按鈕等）
   */
  async measureInteraction(
    action: () => Promise<void>,
    actionName: string
  ): Promise<number> {
    const startTime = Date.now()
    await action()
    const duration = Date.now() - startTime
    console.log(`⏱️  ${actionName}: ${duration}ms`)
    return duration
  }

  /**
   * 收集頁面載入時間
   */
  async measurePageLoad(url: string): Promise<number> {
    const startTime = Date.now()
    await this.page.goto(url, { waitUntil: 'networkidle' })
    const duration = Date.now() - startTime
    console.log(`⏱️  Page Load (${url}): ${duration}ms`)
    return duration
  }

  /**
   * 重置收集器
   */
  reset() {
    this.metrics = {}
    this.apiCalls = []
  }

  /**
   * 獲取當前指標
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 獲取 API 性能統計
   */
  getAPIPerformance(): {
    average: number
    p95: number
    p99: number
    slowest: Array<{ url: string; duration: number }>
  } {
    if (this.apiCalls.length === 0) {
      return {
        average: 0,
        p95: 0,
        p99: 0,
        slowest: [],
      }
    }

    const durations = this.apiCalls.map((c) => c.duration).sort((a, b) => a - b)
    const average = durations.reduce((a, b) => a + b, 0) / durations.length
    const p95Index = Math.floor(durations.length * 0.95)
    const p99Index = Math.floor(durations.length * 0.99)

    const slowest = this.apiCalls
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map((c) => ({
        url: c.url.split('?')[0], // 移除 query params
        duration: c.duration,
      }))

    return {
      average: Math.round(average),
      p95: durations[p95Index] || 0,
      p99: durations[p99Index] || 0,
      slowest,
    }
  }
}

/**
 * 性能標準（根據 Core Web Vitals）
 */
export const PERFORMANCE_STANDARDS = {
  fcp: { good: 1800, needsImprovement: 3000 }, // ms
  lcp: { good: 2500, needsImprovement: 4000 }, // ms
  fid: { good: 100, needsImprovement: 300 }, // ms
  cls: { good: 0.1, needsImprovement: 0.25 }, // score
  tti: { good: 3500, needsImprovement: 7300 }, // ms
  pageLoad: { good: 2000, needsImprovement: 3000 }, // ms
  apiResponse: { good: 500, needsImprovement: 1000 }, // ms (P95)
}

/**
 * 評估性能指標是否符合標準
 */
export function evaluatePerformance(
  metrics: PerformanceMetrics,
  standard = PERFORMANCE_STANDARDS
): {
  score: 'good' | 'needs-improvement' | 'poor'
  issues: Array<{ metric: string; value: number; standard: number; severity: 'high' | 'medium' | 'low' }>
} {
  const issues: Array<{
    metric: string
    value: number
    standard: number
    severity: 'high' | 'medium' | 'low'
  }> = []

  // 檢查 FCP
  if (metrics.fcp) {
    if (metrics.fcp > standard.fcp.needsImprovement) {
      issues.push({
        metric: 'FCP (First Contentful Paint)',
        value: metrics.fcp,
        standard: standard.fcp.needsImprovement,
        severity: metrics.fcp > standard.fcp.needsImprovement * 1.5 ? 'high' : 'medium',
      })
    }
  }

  // 檢查 LCP
  if (metrics.lcp) {
    if (metrics.lcp > standard.lcp.needsImprovement) {
      issues.push({
        metric: 'LCP (Largest Contentful Paint)',
        value: metrics.lcp,
        standard: standard.lcp.needsImprovement,
        severity: metrics.lcp > standard.lcp.needsImprovement * 1.5 ? 'high' : 'medium',
      })
    }
  }

  // 檢查 CLS
  if (metrics.cls !== undefined) {
    if (metrics.cls > standard.cls.needsImprovement) {
      issues.push({
        metric: 'CLS (Cumulative Layout Shift)',
        value: metrics.cls,
        standard: standard.cls.needsImprovement,
        severity: metrics.cls > standard.cls.needsImprovement * 2 ? 'high' : 'medium',
      })
    }
  }

  // 檢查頁面載入時間
  if (metrics.totalLoadTime) {
    if (metrics.totalLoadTime > standard.pageLoad.needsImprovement) {
      issues.push({
        metric: 'Page Load Time',
        value: metrics.totalLoadTime,
        standard: standard.pageLoad.needsImprovement,
        severity: metrics.totalLoadTime > standard.pageLoad.needsImprovement * 1.5 ? 'high' : 'medium',
      })
    }
  }

  // 檢查 API 性能
  if (metrics.apiCalls && metrics.apiCalls.length > 0) {
    const apiDurations = metrics.apiCalls.map((c) => c.duration).sort((a, b) => a - b)
    const p95 = apiDurations[Math.floor(apiDurations.length * 0.95)] || 0

    if (p95 > standard.apiResponse.needsImprovement) {
      issues.push({
        metric: 'API Response Time (P95)',
        value: p95,
        standard: standard.apiResponse.needsImprovement,
        severity: p95 > standard.apiResponse.needsImprovement * 1.5 ? 'high' : 'medium',
      })
    }
  }

  const score = issues.length === 0 ? 'good' : issues.some((i) => i.severity === 'high') ? 'poor' : 'needs-improvement'

  return { score, issues }
}
