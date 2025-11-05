/**
 * Lightweight telemetry utility for reading explain events
 *
 * Design: Console wrapper for development, easy to replace with real analytics
 * Privacy: All events are opt-in and logged locally in dev mode
 */

import type { ReadingTelemetryEvent } from './reading/types'

const IS_DEV = process.env.NODE_ENV !== 'production'
const ENABLE_TELEMETRY = IS_DEV || process.env.NEXT_PUBLIC_ENABLE_TELEMETRY === 'true'

/**
 * Track a reading explain event
 *
 * @param event - Telemetry event with type and data
 */
export function track(event: ReadingTelemetryEvent): void {
  if (!ENABLE_TELEMETRY) return

  const { type, data } = event

  // Console logging in development
  if (IS_DEV) {
    console.log(`[telemetry] ${type}`, data)
  }

  // TODO: Replace with real analytics service
  // Example integrations:
  // - Google Analytics: gtag('event', type, data)
  // - Mixpanel: mixpanel.track(type, data)
  // - PostHog: posthog.capture(type, data)
  // - Custom: fetch('/api/analytics', { method: 'POST', body: JSON.stringify({ type, data }) })
}

/**
 * Track explain view with timing
 */
export function trackExplainView(data: {
  kind: string
  questionCount: number
  source: 'api' | 'conservative'
  startTime?: number
}) {
  const timeToFirstPaint = data.startTime ? performance.now() - data.startTime : undefined

  track({
    type: 'explain.view',
    data: {
      ...data,
      timeToFirstPaint,
    },
  })
}

/**
 * Track question view (when scrolled into viewport or expanded)
 */
export function trackQuestionView(data: { kind: string; qid: string; index: number }) {
  track({
    type: 'question.view',
    data,
  })
}

/**
 * Track evidence click (jump to passage paragraph)
 */
export function trackEvidenceView(data: { kind: string; qid: string; paraId: string; spans: number }) {
  track({
    type: 'evidence.view',
    data,
  })
}

/**
 * Track passage scroll (throttled)
 */
let passageScrollTimeout: NodeJS.Timeout | null = null

export function trackPassageScroll(data: { kind: string; paraId: string; scrollTop: number }) {
  if (passageScrollTimeout) return

  passageScrollTimeout = setTimeout(() => {
    track({
      type: 'passage.scroll',
      data,
    })
    passageScrollTimeout = null
  }, 1000) // Throttle to 1 event per second
}

/**
 * Track question expand/collapse
 */
export function trackQuestionExpand(data: { kind: string; qid: string; expanded: boolean }) {
  track({
    type: 'question.expand',
    data,
  })
}

/**
 * Performance mark for measuring time to first paint
 */
export function markExplainStart(kind: string): number {
  const startTime = performance.now()

  if (IS_DEV) {
    performance.mark(`explain-${kind}-start`)
  }

  return startTime
}

/**
 * Performance measure for explain rendering
 */
export function measureExplainRender(kind: string, startTime: number): void {
  if (!IS_DEV) return

  const duration = performance.now() - startTime

  try {
    performance.mark(`explain-${kind}-end`)
    performance.measure(`explain-${kind}`, `explain-${kind}-start`, `explain-${kind}-end`)

    console.log(`[perf] ${kind} render took ${duration.toFixed(2)}ms`)
  } catch (error) {
    // Ignore performance API errors
  }
}
