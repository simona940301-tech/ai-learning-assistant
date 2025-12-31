/**
 * Smart Triggers System
 * Automatically triggers contextual chick guidance based on user behavior
 */

export type TriggerEvent =
  | 'IDLE_ON_HOME'
  | 'CONSECUTIVE_ERRORS'
  | 'FIRST_VISIT_PAGE'
  | 'LOW_ENERGY'
  | 'STREAK_BROKEN'

export type TriggerCondition = {
  event: TriggerEvent
  cooldownMs: number
  priority: 'low' | 'medium' | 'high'
  message: string
  targetSelector?: string
  persistent?: boolean
}

const TRIGGER_CONDITIONS: Record<TriggerEvent, TriggerCondition> = {
  IDLE_ON_HOME: {
    event: 'IDLE_ON_HOME',
    cooldownMs: 60 * 60 * 1000, // 1 hour
    priority: 'medium',
    message: '不知道從哪裡開始？試試每日挑戰！',
    targetSelector: '[data-daily-challenge]',
    persistent: true,
  },
  CONSECUTIVE_ERRORS: {
    event: 'CONSECUTIVE_ERRORS',
    cooldownMs: 30 * 60 * 1000, // 30 minutes
    priority: 'high',
    message: '別灰心！我們先休息一下，喝口水？',
    persistent: true,
  },
  FIRST_VISIT_PAGE: {
    event: 'FIRST_VISIT_PAGE',
    cooldownMs: 24 * 60 * 60 * 1000, // 24 hours
    priority: 'low',
    message: '這裡有很多有趣的功能，讓我為你介紹！',
    persistent: true,
  },
  LOW_ENERGY: {
    event: 'LOW_ENERGY',
    cooldownMs: 2 * 60 * 60 * 1000, // 2 hours
    priority: 'high',
    message: '精力不足！記得適當休息，或是完成任務補充能量',
    persistent: true,
  },
  STREAK_BROKEN: {
    event: 'STREAK_BROKEN',
    cooldownMs: 6 * 60 * 60 * 1000, // 6 hours
    priority: 'medium',
    message: '沒關係，重新開始也是一種成長！今天繼續努力吧',
    persistent: true,
  },
}

class SmartTriggerManager {
  private static instance: SmartTriggerManager | null = null
  private listeners: Map<TriggerEvent, Set<(condition: TriggerCondition) => void>> = new Map()
  private cooldownMap: Map<TriggerEvent, number> = new Map()
  private idleTimer: NodeJS.Timeout | null = null
  private errorCount = 0
  private consecutiveErrorsStartTime = 0

  static getInstance(): SmartTriggerManager {
    if (!SmartTriggerManager.instance) {
      SmartTriggerManager.instance = new SmartTriggerManager()
    }
    return SmartTriggerManager.instance
  }

  subscribe(event: TriggerEvent, callback: (condition: TriggerCondition) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback)
    }
  }

  trigger(event: TriggerEvent, context?: Record<string, any>): void {
    const condition = TRIGGER_CONDITIONS[event]
    if (!condition) return

    // Check cooldown
    const lastTriggered = this.cooldownMap.get(event) || 0
    const now = Date.now()
    if (now - lastTriggered < condition.cooldownMs) return

    // Update cooldown
    this.cooldownMap.set(event, now)

    // Store in localStorage for persistence
    this.storeTriggerHistory(event, now)

    // Notify listeners
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(condition))
    }
  }

  // === Specific Trigger Methods ===

  startIdleDetection(timeoutMs = 10000): void {
    this.clearIdleTimer()
    this.idleTimer = setTimeout(() => {
      this.trigger('IDLE_ON_HOME')
    }, timeoutMs)
  }

  clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
  }

  resetActivity(): void {
    this.clearIdleTimer()
    this.startIdleDetection()
  }

  recordAnswer(isCorrect: boolean): void {
    const now = Date.now()
    
    if (isCorrect) {
      // Reset error tracking
      this.errorCount = 0
      this.consecutiveErrorsStartTime = 0
    } else {
      // Track consecutive errors
      if (this.errorCount === 0) {
        this.consecutiveErrorsStartTime = now
      }
      this.errorCount++

      // Trigger after 3 consecutive errors within 5 minutes
      if (this.errorCount >= 3) {
        const timeSinceFirstError = now - this.consecutiveErrorsStartTime
        if (timeSinceFirstError <= 5 * 60 * 1000) {
          this.trigger('CONSECUTIVE_ERRORS')
        }
        // Reset to prevent spam
        this.errorCount = 0
        this.consecutiveErrorsStartTime = 0
      }
    }
  }

  checkFirstVisit(pageKey: string): void {
    const visitedPagesKey = 'plms_visited_pages'
    const visitedPages = JSON.parse(localStorage.getItem(visitedPagesKey) || '[]')
    
    if (!visitedPages.includes(pageKey)) {
      visitedPages.push(pageKey)
      localStorage.setItem(visitedPagesKey, JSON.stringify(visitedPages))
      this.trigger('FIRST_VISIT_PAGE')
    }
  }

  checkEnergyLevel(currentEnergy: number, maxEnergy = 5): void {
    if (currentEnergy <= 2) {
      this.trigger('LOW_ENERGY')
    }
  }

  checkStreakBroken(previousStreak: number, currentStreak: number): void {
    if (previousStreak > currentStreak && currentStreak === 0) {
      this.trigger('STREAK_BROKEN')
    }
  }

  // === Persistence ===

  private storeTriggerHistory(event: TriggerEvent, timestamp: number): void {
    const key = 'plms_trigger_history'
    const history = JSON.parse(localStorage.getItem(key) || '{}')
    history[event] = timestamp
    localStorage.setItem(key, JSON.stringify(history))
  }

  private loadCooldowns(): void {
    const key = 'plms_trigger_history'
    const history = JSON.parse(localStorage.getItem(key) || '{}')
    for (const [event, timestamp] of Object.entries(history)) {
      this.cooldownMap.set(event as TriggerEvent, timestamp as number)
    }
  }

  // Initialize from localStorage on creation
  private constructor() {
    this.loadCooldowns()
  }
}

// Global instance
export const smartTriggers = SmartTriggerManager.getInstance()

// React hook for easy integration
export function useSmartTriggers() {
  return {
    startIdleDetection: (timeoutMs?: number) => smartTriggers.startIdleDetection(timeoutMs),
    resetActivity: () => smartTriggers.resetActivity(),
    recordAnswer: (isCorrect: boolean) => smartTriggers.recordAnswer(isCorrect),
    checkFirstVisit: (pageKey: string) => smartTriggers.checkFirstVisit(pageKey),
    checkEnergyLevel: (currentEnergy: number) => smartTriggers.checkEnergyLevel(currentEnergy),
    checkStreakBroken: (prev: number, current: number) => smartTriggers.checkStreakBroken(prev, current),
    subscribe: (event: TriggerEvent, callback: (condition: TriggerCondition) => void) => 
      smartTriggers.subscribe(event, callback),
  }
}