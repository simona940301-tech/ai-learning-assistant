/**
 * Analytics and Logging System
 * Based on PLMS Agent System principles: Transparency & Measurability
 */

interface AnalyticsEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: string
  userId?: string
  sessionId?: string
}

interface LearningMetric {
  action: string
  subject?: string
  difficulty?: string
  timeSpent?: number
  success?: boolean
  errorType?: string
}

class Analytics {
  private sessionId: string
  private userId?: string
  private events: AnalyticsEvent[] = []

  constructor() {
    this.sessionId = this.generateSessionId()
    this.loadUserId()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private loadUserId(): void {
    if (typeof window !== 'undefined') {
      this.userId = localStorage.getItem('edu_user_id') || undefined
    }
  }

  private createEvent(event: string, properties?: Record<string, any>): AnalyticsEvent {
    return {
      event,
      properties: {
        ...properties,
        url: typeof window !== 'undefined' ? window.location.pathname : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
    }
  }

  // Core Analytics Methods
  track(event: string, properties?: Record<string, any>): void {
    const analyticsEvent = this.createEvent(event, properties)
    this.events.push(analyticsEvent)
    
    // 即時發送重要事件
    if (this.isCriticalEvent(event)) {
      this.sendEvent(analyticsEvent)
    }

    // 批量發送
    if (this.events.length >= 10) {
      this.flush()
    }

    // 開發模式下記錄到控制台
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics:', analyticsEvent)
    }
  }

  // Learning-specific tracking
  trackLearning(metric: LearningMetric): void {
    this.track('learning_action', {
      ...metric,
      category: 'learning',
    })
  }

  trackAIInteraction(type: 'summary' | 'solve', solveType?: string, success?: boolean): void {
    this.track('ai_interaction', {
      type,
      solveType,
      success,
      category: 'ai',
    })
  }

  trackUserFlow(from: string, to: string, timeSpent?: number): void {
    this.track('user_flow', {
      from,
      to,
      timeSpent,
      category: 'navigation',
    })
  }

  trackError(error: Error, context?: string): void {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      context,
      category: 'error',
    })
  }

  trackPerformance(action: string, duration: number): void {
    this.track('performance', {
      action,
      duration,
      category: 'performance',
    })
  }

  // Utility Methods
  private isCriticalEvent(event: string): boolean {
    const criticalEvents = ['error', 'ai_interaction', 'learning_action']
    return criticalEvents.includes(event)
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // 在生產環境中，這裡會發送到實際的分析服務
      if (process.env.NODE_ENV === 'production') {
        // await fetch('/api/analytics', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(event),
        // })
      }
    } catch (error) {
      console.error('Failed to send analytics event:', error)
    }
  }

  async flush(): Promise<void> {
    if (this.events.length === 0) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      // 批量發送事件
      if (process.env.NODE_ENV === 'production') {
        // await fetch('/api/analytics/batch', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ events: eventsToSend }),
        // })
      }
    } catch (error) {
      console.error('Failed to flush analytics events:', error)
      // 失敗時重新加入事件
      this.events.unshift(...eventsToSend)
    }
  }

  // Learning Metrics
  getLearningMetrics(): {
    totalSessions: number
    averageSessionTime: number
    mostUsedFeatures: string[]
    errorRate: number
  } {
    const sessionEvents = this.events.filter(e => e.sessionId === this.sessionId)
    const learningEvents = sessionEvents.filter(e => e.event === 'learning_action')
    const errorEvents = sessionEvents.filter(e => e.event === 'error')
    
    return {
      totalSessions: 1, // 當前會話
      averageSessionTime: this.calculateSessionTime(sessionEvents),
      mostUsedFeatures: this.getMostUsedFeatures(sessionEvents),
      errorRate: errorEvents.length / Math.max(sessionEvents.length, 1),
    }
  }

  private calculateSessionTime(events: AnalyticsEvent[]): number {
    if (events.length < 2) return 0
    
    const firstEvent = events[0]
    const lastEvent = events[events.length - 1]
    
    return new Date(lastEvent.timestamp!).getTime() - new Date(firstEvent.timestamp!).getTime()
  }

  private getMostUsedFeatures(events: AnalyticsEvent[]): string[] {
    const featureCounts: Record<string, number> = {}
    
    events.forEach(event => {
      if (event.properties?.category) {
        featureCounts[event.properties.category] = (featureCounts[event.properties.category] || 0) + 1
      }
    })
    
    return Object.entries(featureCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature)
  }
}

// 單例實例
export const analytics = new Analytics()

// React Hook for easy usage
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    trackLearning: analytics.trackLearning.bind(analytics),
    trackAIInteraction: analytics.trackAIInteraction.bind(analytics),
    trackUserFlow: analytics.trackUserFlow.bind(analytics),
    trackError: analytics.trackError.bind(analytics),
    trackPerformance: analytics.trackPerformance.bind(analytics),
    getMetrics: analytics.getLearningMetrics.bind(analytics),
  }
}

// Performance monitoring
export function measurePerformance<T>(name: string, fn: () => T): T {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  
  analytics.trackPerformance(name, duration)
  
  return result
}

export async function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  
  analytics.trackPerformance(name, duration)
  
  return result
}
