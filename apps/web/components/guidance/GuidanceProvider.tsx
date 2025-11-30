/**
 * 🎯 Guidance Provider - 全局引導提供者
 *
 * 在應用的最頂層包裹此組件，以啟用全局引導系統
 *
 * 用法:
 * ```tsx
 * <GuidanceProvider>
 *   <YourApp />
 * </GuidanceProvider>
 * ```
 */

'use client'

import React, { createContext, useContext, ReactNode, useState, useCallback, useEffect } from 'react'
import { GuidanceTooltip } from './GuidanceTooltip'
import type { GuidanceItem } from '@/lib/guidance/guidance-engine'
import { guidanceEngine } from '@/lib/guidance/guidance-engine'
import type { TriggerID } from '@/lib/guidance/guidance-engine'
import { subscribeToGlobalGuidance, registerGlobalGuidance } from '@/lib/guidance/useGuidance'

interface GuidanceContextValue {
  showGuidance: (triggerID: TriggerID, context?: Record<string, any>) => void
  dismissGuidance: (dismissalType: 'permanent' | 'session') => void
  completeGuidance: () => void
  recordOperation: () => void
  getStats: () => ReturnType<typeof guidanceEngine.getStats>
  resetAll: () => void
}

const GuidanceContext = createContext<GuidanceContextValue | null>(null)

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const [currentGuidance, setCurrentGuidance] = useState<GuidanceItem | null>(null)

  // 🎯 訂閱全局引導狀態
  useEffect(() => {
    return subscribeToGlobalGuidance((guidance) => {
      setCurrentGuidance(guidance)
    })
  }, [])

  const showGuidance = useCallback((triggerID: TriggerID, context?: Record<string, any>) => {
    const guidance = guidanceEngine.shouldShowGuidance(triggerID, context)
    if (guidance) {
      console.log('[GuidanceProvider] Showing guidance:', guidance.featureName)
      registerGlobalGuidance(guidance) // 🎯 註冊到全局狀態
      guidanceEngine.markAsShown(guidance.featureName)
    } else {
      console.log('[GuidanceProvider] No guidance to show for:', triggerID)
    }
  }, [])

  const dismissGuidance = useCallback((dismissalType: 'permanent' | 'session') => {
    if (!currentGuidance) return
    console.log('[GuidanceProvider] Dismissing guidance:', currentGuidance.featureName, dismissalType)
    guidanceEngine.dismissGuidance(currentGuidance.featureName, dismissalType)
    registerGlobalGuidance(null) // 🎯 清除全局狀態
  }, [currentGuidance])

  const completeGuidance = useCallback(() => {
    if (!currentGuidance) return
    console.log('[GuidanceProvider] Completing guidance:', currentGuidance.featureName)
    guidanceEngine.completeGuidance(currentGuidance.featureName)
    registerGlobalGuidance(null) // 🎯 清除全局狀態
  }, [currentGuidance])

  const recordOperation = useCallback(() => {
    guidanceEngine.recordOperation()
  }, [])

  const getStats = useCallback(() => {
    return guidanceEngine.getStats()
  }, [])

  const resetAll = useCallback(() => {
    guidanceEngine.resetAll()
    registerGlobalGuidance(null) // 🎯 清除全局狀態
  }, [])

  return (
    <GuidanceContext.Provider
      value={{
        showGuidance,
        dismissGuidance,
        completeGuidance,
        recordOperation,
        getStats,
        resetAll,
      }}
    >
      {children}

      {/* Render guidance tooltip if active */}
      {currentGuidance && (
        <GuidanceTooltip
          item={currentGuidance}
          onDismiss={dismissGuidance}
          onComplete={completeGuidance}
        />
      )}
    </GuidanceContext.Provider>
  )
}

/**
 * Hook to access guidance context
 */
export function useGuidanceContext() {
  const context = useContext(GuidanceContext)
  if (!context) {
    throw new Error('useGuidanceContext must be used within GuidanceProvider')
  }
  return context
}
