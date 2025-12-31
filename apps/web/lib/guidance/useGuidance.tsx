/**
 * 🎯 useGuidance Hook - 引導系統 React Hook
 *
 * 用法:
 * ```tsx
 * const { showGuidance, recordOperation } = useGuidance()
 *
 * // 在頁面載入時觸發 T04 引導
 * useEffect(() => {
 *   showGuidance('T04_PostOnboardingFirstRun')
 * }, [])
 *
 * // 記錄用戶操作
 * const handleClick = () => {
 *   recordOperation()
 *   // ... 其他邏輯
 * }
 * ```
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  guidanceEngine,
  type TriggerID,
  type GuidanceItem,
} from './guidance-engine'

// 🎯 全局狀態：當前顯示的引導（由各個頁面的 useGuidance 註冊）
let globalCurrentGuidance: GuidanceItem | null = null
let globalCurrentGuidanceListeners: Set<(guidance: GuidanceItem | null) => void> = new Set()

export function registerGlobalGuidance(guidance: GuidanceItem | null) {
  globalCurrentGuidance = guidance
  globalCurrentGuidanceListeners.forEach(listener => listener(guidance))
}

export function subscribeToGlobalGuidance(listener: (guidance: GuidanceItem | null) => void) {
  globalCurrentGuidanceListeners.add(listener)
  // 立即通知當前值
  listener(globalCurrentGuidance)
  return () => {
    globalCurrentGuidanceListeners.delete(listener)
  }
}

export interface UseGuidanceOptions {
  /**
   * 是否自動檢測 T04 (Post-Onboarding) 情境
   * 如果為 true，會在組件掛載後檢查是否應該顯示 T04 引導
   */
  autoDetectT04?: boolean

  /**
   * 是否自動檢測 T01 (Exploration Stall) 情境
   * 如果為 true，會在用戶停留超過 10 秒時觸發
   */
  autoDetectT01?: {
    enabled: boolean
    delayMs?: number // 默認 10000ms (10秒)
  }

  /**
   * 頁面標識（用於 T04 引導）
   */
  page?: 'play' | 'ask' | 'backpack' | 'community' | 'profile' | 'store'
}

export function useGuidance(options: UseGuidanceOptions = {}) {
  const [currentGuidance, setCurrentGuidance] = useState<GuidanceItem | null>(null)
  const stallTimerRef = useRef<NodeJS.Timeout>()

  /**
   * 顯示引導（如果符合條件）
   */
  const showGuidance = useCallback((
    triggerID: TriggerID,
    context?: Record<string, any>
  ) => {
    const guidance = guidanceEngine.shouldShowGuidance(triggerID, context)

    if (guidance) {
      console.log('[useGuidance] Showing guidance:', guidance.featureName)
      setCurrentGuidance(guidance)
      // 🎯 同時註冊到全局狀態
      registerGlobalGuidance(guidance)
      guidanceEngine.markAsShown(guidance.featureName)
    } else {
      console.log('[useGuidance] No guidance to show for:', triggerID)
    }
  }, [])

  /**
   * 關閉引導
   */
  const dismissGuidance = useCallback((dismissalType: 'permanent' | 'session') => {
    if (!currentGuidance) return

    console.log('[useGuidance] Dismissing guidance:', currentGuidance.featureName, dismissalType)
    guidanceEngine.dismissGuidance(currentGuidance.featureName, dismissalType)
    setCurrentGuidance(null)
    // 🎯 同時清除全局狀態
    registerGlobalGuidance(null)
  }, [currentGuidance])

  /**
   * 完成引導（用戶實際使用了功能）
   */
  const completeGuidance = useCallback(() => {
    if (!currentGuidance) return

    console.log('[useGuidance] Completing guidance:', currentGuidance.featureName)
    guidanceEngine.completeGuidance(currentGuidance.featureName)
    setCurrentGuidance(null)
    // 🎯 同時清除全局狀態
    registerGlobalGuidance(null)
  }, [currentGuidance])

  /**
   * 記錄用戶操作（用於 T04 階段的操作計數）
   */
  const recordOperation = useCallback(() => {
    guidanceEngine.recordOperation()
  }, [])

  /**
   * 檢查 T04 (Post-Onboarding First Run)
   */
  useEffect(() => {
    if (!options.autoDetectT04) return

    // 檢查是否剛完成 onboarding
    const urlParams = new URLSearchParams(window.location.search)
    const fromOnboarding = urlParams.get('from') === 'onboarding'

    // 或者檢查 sessionStorage 標記
    const isFirstRun = sessionStorage.getItem('first_run_after_onboarding') === 'true'

    if (fromOnboarding || isFirstRun) {
      console.log('[useGuidance] 🎯 Detected post-onboarding first run')

      // 🎯 強制重置 onboardingGuidanceCount，確保第一個引導能顯示
      // 這可以清除之前測試留下的殘留狀態
      // 通過檢查 localStorage 並重置（如果需要的話）
      if (typeof window !== 'undefined') {
        try {
          const cooldownKey = 'moonshot_cooldown_state'
          const stored = localStorage.getItem(cooldownKey)
          if (stored) {
            const cooldown = JSON.parse(stored)
            if (cooldown.onboardingGuidanceCount > 0) {
              console.log('[useGuidance] 🔄 Resetting onboardingGuidanceCount from', cooldown.onboardingGuidanceCount, 'to 0')
              localStorage.setItem(cooldownKey, JSON.stringify({
                ...cooldown,
                onboardingGuidanceCount: 0,
                onboardingPhaseCompleted: false,
              }))
            }
          }
        } catch (e) {
          console.warn('[useGuidance] Failed to reset cooldown state:', e)
        }
      }

      // 延遲 1 秒，等待頁面渲染完成
      const timer = setTimeout(() => {
        showGuidance('T04_PostOnboardingFirstRun', { page: options.page })
      }, 1000)

      // 清除標記（避免刷新頁面時重複顯示）
      sessionStorage.removeItem('first_run_after_onboarding')

      return () => clearTimeout(timer)
    }
  }, [options.autoDetectT04, options.page, showGuidance])

  /**
   * 檢查 T01 (Exploration Stall)
   */
  useEffect(() => {
    if (!options.autoDetectT01?.enabled) return

    const delayMs = options.autoDetectT01.delayMs || 10000

    // 重置計時器（用戶有操作時）
    const resetStallTimer = () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current)
      }

      stallTimerRef.current = setTimeout(() => {
        console.log('[useGuidance] Detected exploration stall')
        showGuidance('T01_ExplorationStall', { page: options.page })
      }, delayMs)
    }

    // 監聽用戶交互
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(event => {
      window.addEventListener(event, resetStallTimer, { passive: true })
    })

    // 初始啟動計時器
    resetStallTimer()

    return () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, resetStallTimer)
      })
    }
  }, [options.autoDetectT01, options.page, showGuidance])

  /**
   * 獲取引導統計
   */
  const getStats = useCallback(() => {
    return guidanceEngine.getStats()
  }, [])

  /**
   * 重置所有引導（僅用於測試）
   */
  const resetAll = useCallback(() => {
    guidanceEngine.resetAll()
    setCurrentGuidance(null)
  }, [])

  return {
    currentGuidance,
    showGuidance,
    dismissGuidance,
    completeGuidance,
    recordOperation,
    getStats,
    resetAll,
  }
}

/**
 * 🎯 簡化版 Hook: 用於檢測低效重複操作 (T02)
 *
 * 用法:
 * ```tsx
 * const { trackAction } = useInefficientRepetition('organize-item', 3)
 *
 * const handleOrganize = () => {
 *   trackAction() // 自動追蹤，達到閾值時觸發引導
 * }
 * ```
 */
export function useInefficientRepetition(
  actionName: string,
  threshold: number = 3,
  onTrigger?: () => void
) {
  const [count, setCount] = useState(0)
  const { showGuidance } = useGuidance()

  const trackAction = useCallback(() => {
    setCount(prev => {
      const newCount = prev + 1

      if (newCount >= threshold) {
        console.log(`[useInefficientRepetition] Threshold reached for ${actionName}`)
        showGuidance('T02_InefficientRepetition', { action: actionName })
        onTrigger?.()
        return 0 // 重置計數
      }

      return newCount
    })
  }, [actionName, threshold, showGuidance, onTrigger])

  const reset = useCallback(() => {
    setCount(0)
  }, [])

  return {
    count,
    trackAction,
    reset,
  }
}

/**
 * 🎯 簡化版 Hook: 用於錯誤糾正 (T03)
 *
 * 用法:
 * ```tsx
 * const { trackError } = useErrorCorrection('upload-file-size', 2)
 *
 * const handleUpload = (file) => {
 *   if (file.size > 5MB) {
 *     trackError({ fileSize: file.size })
 *   }
 * }
 * ```
 */
export function useErrorCorrection(
  errorType: string,
  threshold: number = 2,
  onTrigger?: () => void
) {
  const [count, setCount] = useState(0)
  const { showGuidance } = useGuidance()

  const trackError = useCallback((context?: Record<string, any>) => {
    setCount(prev => {
      const newCount = prev + 1

      if (newCount >= threshold) {
        console.log(`[useErrorCorrection] Threshold reached for ${errorType}`)
        showGuidance('T03_MinorErrorCorrection', { error: errorType, ...context })
        onTrigger?.()
        return 0 // 重置計數
      }

      return newCount
    })
  }, [errorType, threshold, showGuidance, onTrigger])

  const reset = useCallback(() => {
    setCount(0)
  }, [])

  return {
    count,
    trackError,
    reset,
  }
}
