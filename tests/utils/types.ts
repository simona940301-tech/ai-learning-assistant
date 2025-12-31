/**
 * 測試相關類型定義
 */

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
