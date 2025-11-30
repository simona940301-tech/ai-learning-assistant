/**
 * 🎯 Contextual Guidance Engine - 極簡主義引導系統
 *
 * 基於心理學原則的非侵入性功能引導引擎
 * - 認知負荷最小化 (< 7秒自動消失)
 * - 自主權賦予 (可隨時跳過)
 * - 情境化觸發 (基於實際行為)
 * - 漸進式揭露 (Progressive Disclosure)
 */

// Removed unused import: z from 'zod'

// ============================================
// Type Definitions
// ============================================

export type TriggerID = 'T04_PostOnboardingFirstRun' | 'T03_MinorErrorCorrection' | 'T02_InefficientRepetition' | 'T01_ExplorationStall'
export type PresentationLevel = 1 | 2 | 3
export type GuidanceStatus = 'pending' | 'shown' | 'dismissed' | 'completed'

export interface GuidanceItem {
  featureName: string
  triggerID: TriggerID
  priority: number // 0-3, 0 is highest
  presentationLevel: PresentationLevel
  copy: string
  activeForm?: string
  condition?: string
  dismissalOption: 'permanent' | 'session' | 'none'
  targetElement?: string // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export interface GuidanceState {
  featureName: string
  status: GuidanceStatus
  lastShownAt?: number
  dismissedAt?: number
  completedAt?: number
  showCount: number
}

export interface CooldownState {
  lastGuidanceShownAt: number | null
  onboardingPhaseCompleted: boolean
  onboardingGuidanceCount: number
}

// ============================================
// Configuration
// ============================================

const RULESET = {
  COGNITIVE_LOAD_MAX_SECONDS: 7,
  COPY_MAX_LENGTH: 8,
  COOLDOWN_INITIAL_T04_MINUTES: 30,
  COOLDOWN_STANDARD_HOURS: 4,
  ONBOARDING_MIN_OPERATION_GAP: 5, // 至少5個操作行為才顯示下一個引導
} as const

// ============================================
// Guidance Pool - 引導內容庫
// ============================================

export const GUIDANCE_POOL: GuidanceItem[] = [
  // ======================================
  // PHASE 1: Post-Onboarding (T04 - 限制3項)
  // ======================================
  {
    featureName: 'Play_StartBattle',
    triggerID: 'T04_PostOnboardingFirstRun',
    priority: 0,
    presentationLevel: 1,
    copy: '解鎖歷屆魔王題！',
    targetElement: '[data-mode-card="system"]',
    position: 'top',
    dismissalOption: 'none',
  },
  {
    featureName: 'Ask_QuickSolve',
    triggerID: 'T04_PostOnboardingFirstRun',
    priority: 0,
    presentationLevel: 1,
    copy: '拍照或輸入題目 學霸幫你解題!',
    targetElement: '[data-page="ask"]',
    position: 'bottom',
    dismissalOption: 'none',
  },
  {
    featureName: 'Backpack_ViewNotes',
    triggerID: 'T04_PostOnboardingFirstRun',
    priority: 0,
    presentationLevel: 1,
    copy: '查看你的學測秘笈!',
    targetElement: '[data-page="backpack"]',
    position: 'bottom',
    dismissalOption: 'none',
  },

  // ======================================
  // PHASE 2: General Use (T01, T02, T03)
  // ======================================

  // T02: 效率優化 - 批次操作
  {
    featureName: 'Backpack_BatchOrganize',
    triggerID: 'T02_InefficientRepetition',
    priority: 2,
    presentationLevel: 2,
    copy: '學霸幫你統整學測秘笈！',
    condition: 'User manually organizes 3+ items one-by-one',
    targetElement: '[data-action="batch-organize"]',
    position: 'bottom',
    dismissalOption: 'permanent',
  },
  {
    featureName: 'Play_QuickMatch',
    triggerID: 'T02_InefficientRepetition',
    priority: 2,
    presentationLevel: 2,
    copy: '快速配對省時間',
    condition: 'User manually selects settings 3+ times',
    targetElement: '[data-quick-match="true"]',
    position: 'top',
    dismissalOption: 'permanent',
  },

  // T01: 探索停滯 - 提示隱藏功能
  {
    featureName: 'Ask_SummaryMode',
    triggerID: 'T01_ExplorationStall',
    priority: 3,
    presentationLevel: 2,
    copy: '學測考點速讀：試試摘要模式!',
    condition: 'User on Ask page > 10s without interaction',
    targetElement: '[data-tab="summary"]',
    position: 'bottom',
    dismissalOption: 'permanent',
  },
  {
    featureName: 'Play_PracticeMode',
    triggerID: 'T01_ExplorationStall',
    priority: 3,
    presentationLevel: 2,
    copy: '學測專家彙整精華習題!',
    condition: 'User on Play page > 10s without selecting mode',
    targetElement: '[data-mode-card="practice"]',
    position: 'top',
    dismissalOption: 'permanent',
  },
  {
    featureName: 'Play_FocusMode',
    triggerID: 'T01_ExplorationStall',
    priority: 3,
    presentationLevel: 2,
    copy: '進入學霸模式，和小雞一起專注！',
    condition: 'User completed 5+ battles without using focus mode',
    targetElement: '[data-mode-card="focus"]',
    position: 'top',
    dismissalOption: 'permanent',
  },

  // T03: 錯誤糾正
  {
    featureName: 'Backpack_FileSize',
    triggerID: 'T03_MinorErrorCorrection',
    priority: 1,
    presentationLevel: 3,
    copy: '檔案太大？試試雲端連結更方便!',
    condition: 'User attempts upload > 5MB twice',
    targetElement: '[data-upload-type="link"]',
    position: 'bottom',
    dismissalOption: 'permanent',
  },
  {
    featureName: 'Play_EnergyManagement',
    triggerID: 'T03_MinorErrorCorrection',
    priority: 1,
    presentationLevel: 2,
    copy: '體力用完了? 完成任務獲取體力!',
    condition: 'User tries to start battle with 0 energy',
    targetElement: '[data-widget="daily-mission"]',
    position: 'top',
    dismissalOption: 'permanent',
  },
]

// ============================================
// Storage Manager - 使用 localStorage
// ============================================

const STORAGE_KEYS = {
  GUIDANCE_STATE: 'moonshot_guidance_state',
  COOLDOWN_STATE: 'moonshot_cooldown_state',
  OPERATION_COUNT: 'moonshot_operation_count',
  DISMISSED_FEATURES: 'moonshot_dismissed_features',
} as const

class GuidanceStorageManager {
  private getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  }

  private setItem(key: string, value: unknown): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('[GuidanceStorage] Failed to save:', e)
    }
  }

  getGuidanceStates(): Record<string, GuidanceState> {
    return this.getItem(STORAGE_KEYS.GUIDANCE_STATE, {})
  }

  setGuidanceState(featureName: string, state: Partial<GuidanceState>): void {
    const states = this.getGuidanceStates()
    states[featureName] = {
      ...states[featureName],
      ...state,
      featureName
    } as GuidanceState
    this.setItem(STORAGE_KEYS.GUIDANCE_STATE, states)
  }

  getCooldownState(): CooldownState {
    return this.getItem(STORAGE_KEYS.COOLDOWN_STATE, {
      lastGuidanceShownAt: null,
      onboardingPhaseCompleted: false,
      onboardingGuidanceCount: 0,
    })
  }

  setCooldownState(state: Partial<CooldownState>): void {
    const current = this.getCooldownState()
    this.setItem(STORAGE_KEYS.COOLDOWN_STATE, { ...current, ...state })
  }

  getOperationCount(): number {
    return this.getItem(STORAGE_KEYS.OPERATION_COUNT, 0)
  }

  incrementOperationCount(): number {
    const count = this.getOperationCount() + 1
    this.setItem(STORAGE_KEYS.OPERATION_COUNT, count)
    return count
  }

  resetOperationCount(): void {
    this.setItem(STORAGE_KEYS.OPERATION_COUNT, 0)
  }

  getDismissedFeatures(): Set<string> {
    const arr = this.getItem<string[]>(STORAGE_KEYS.DISMISSED_FEATURES, [])
    return new Set(arr)
  }

  dismissFeature(featureName: string): void {
    const dismissed = Array.from(this.getDismissedFeatures())
    dismissed.push(featureName)
    this.setItem(STORAGE_KEYS.DISMISSED_FEATURES, dismissed)
  }

  isFeatureDismissed(featureName: string): boolean {
    return this.getDismissedFeatures().has(featureName)
  }
}

export const guidanceStorage = new GuidanceStorageManager()

// ============================================
// Guidance Engine - 核心引擎
// ============================================

export class GuidanceEngine {
  private storage: GuidanceStorageManager

  constructor() {
    this.storage = guidanceStorage
  }

  /**
   * 檢查是否在冷卻期內
   */
  private isInCooldown(): boolean {
    const cooldown = this.storage.getCooldownState()
    if (!cooldown.lastGuidanceShownAt) return false

    const now = Date.now()
    const elapsed = now - cooldown.lastGuidanceShownAt

    // T04 階段：30分鐘冷卻
    if (!cooldown.onboardingPhaseCompleted) {
      const minMs = RULESET.COOLDOWN_INITIAL_T04_MINUTES * 60 * 1000
      return elapsed < minMs
    }

    // 標準階段：4小時冷卻
    const standardMs = RULESET.COOLDOWN_STANDARD_HOURS * 60 * 60 * 1000
    return elapsed < standardMs
  }

  /**
   * 檢查操作數量是否滿足條件（T04階段）
   */
  private hasEnoughOperations(): boolean {
    const cooldown = this.storage.getCooldownState()
    if (cooldown.onboardingPhaseCompleted) return true

    const operationCount = this.storage.getOperationCount()
    return operationCount >= RULESET.ONBOARDING_MIN_OPERATION_GAP
  }

  /**
   * 獲取應該顯示的引導（基於優先級和觸發條件）
   * @param triggerID 觸發情境
   * @param context 額外上下文（用於條件判斷）
   */
  shouldShowGuidance(
    triggerID: TriggerID,
    context?: Record<string, any>
  ): GuidanceItem | null {
    const cooldown = this.storage.getCooldownState()

    // T04 階段：
    // - 第一個 T04 引導（onboardingGuidanceCount=0）應立即顯示，跳過冷卻期和操作數量檢查
    // - 後續 T04 引導才需要檢查冷卻期和操作數量
    if (triggerID === 'T04_PostOnboardingFirstRun') {
      const isFirstT04Guidance = cooldown.onboardingGuidanceCount === 0
      
      // 🎯 診斷日誌
      console.log('[GuidanceEngine] 🔍 T04 check:', {
        onboardingGuidanceCount: cooldown.onboardingGuidanceCount,
        isFirstT04Guidance,
        lastGuidanceShownAt: cooldown.lastGuidanceShownAt,
        inCooldown: this.isInCooldown(),
        onboardingPhaseCompleted: cooldown.onboardingPhaseCompleted,
      })
      
      if (isFirstT04Guidance) {
        // 🎯 第一個 T04 引導：跳過所有檢查，直接顯示
        // 即使有冷卻期記錄，第一個引導也應該顯示（可能是之前測試留下的）
        console.log('[GuidanceEngine] ✅ First T04 guidance, skipping cooldown and operation checks')
      } else {
        // 後續 T04 引導：檢查冷卻期
        if (this.isInCooldown()) {
          console.log('[GuidanceEngine] ⏸️ In cooldown period, skipping subsequent T04 guidance')
          return null
        }
        // 檢查操作數量
        if (!this.hasEnoughOperations()) {
          console.log('[GuidanceEngine] ⏸️ Not enough operations for subsequent T04 guidance')
          return null
        }
      }
    } else {
      // 非 T04 引導：正常檢查冷卻期
      if (this.isInCooldown()) {
        console.log('[GuidanceEngine] ⏸️ In cooldown period, skipping')
        return null
      }
    }

    // 過濾符合條件的引導
    let candidates = GUIDANCE_POOL
      .filter(item => item.triggerID === triggerID)
      .filter(item => !this.storage.isFeatureDismissed(item.featureName))
      .filter(item => {
        const state = this.storage.getGuidanceStates()[item.featureName]
        return !state || state.status === 'pending'
      })

    // 🎯 根據頁面過濾（T04 引導需要匹配頁面）
    if (triggerID === 'T04_PostOnboardingFirstRun' && context?.page) {
      const pageMap: Record<string, string> = {
        'play': 'Play_StartBattle',
        'ask': 'Ask_QuickSolve',
        'backpack': 'Backpack_ViewNotes',
      }
      const targetFeature = pageMap[context.page]
      if (targetFeature) {
        candidates = candidates.filter(item => item.featureName === targetFeature)
      }
    }

    // 按優先級排序
    candidates.sort((a, b) => a.priority - b.priority)

    if (candidates.length === 0) return null

    // 返回優先級最高的引導
    return candidates[0]
  }

  /**
   * 標記引導已顯示
   */
  markAsShown(featureName: string): void {
    this.storage.setGuidanceState(featureName, {
      status: 'shown',
      lastShownAt: Date.now(),
      showCount: (this.storage.getGuidanceStates()[featureName]?.showCount || 0) + 1,
    })

    // 更新冷卻狀態
    this.storage.setCooldownState({
      lastGuidanceShownAt: Date.now(),
    })

    // T04 階段：增加引導計數
    const cooldown = this.storage.getCooldownState()
    if (!cooldown.onboardingPhaseCompleted) {
      const newCount = cooldown.onboardingGuidanceCount + 1
      this.storage.setCooldownState({
        onboardingGuidanceCount: newCount,
      })

      // 如果已顯示3個T04引導，標記T04階段完成
      if (newCount >= 3) {
        this.storage.setCooldownState({
          onboardingPhaseCompleted: true,
        })
        console.log('[GuidanceEngine] T04 phase completed')
      }
    }

    // 重置操作計數
    this.storage.resetOperationCount()
  }

  /**
   * 標記引導已關閉（永久或暫時）
   */
  dismissGuidance(featureName: string, dismissalType: 'permanent' | 'session'): void {
    this.storage.setGuidanceState(featureName, {
      status: 'dismissed',
      dismissedAt: Date.now(),
    })

    if (dismissalType === 'permanent') {
      this.storage.dismissFeature(featureName)
    }
  }

  /**
   * 標記引導已完成（用戶實際使用了功能）
   */
  completeGuidance(featureName: string): void {
    this.storage.setGuidanceState(featureName, {
      status: 'completed',
      completedAt: Date.now(),
    })

    // 永久標記為已完成
    this.storage.dismissFeature(featureName)
  }

  /**
   * 記錄用戶操作（用於T04階段的操作計數）
   */
  recordOperation(): void {
    this.storage.incrementOperationCount()
  }

  /**
   * 獲取引導統計
   */
  getStats(): {
    totalGuidance: number
    shownGuidance: number
    dismissedGuidance: number
    completedGuidance: number
    onboardingPhaseCompleted: boolean
  } {
    const states = this.storage.getGuidanceStates()
    const cooldown = this.storage.getCooldownState()

    return {
      totalGuidance: GUIDANCE_POOL.length,
      shownGuidance: Object.values(states).filter(s => s.status === 'shown').length,
      dismissedGuidance: Object.values(states).filter(s => s.status === 'dismissed').length,
      completedGuidance: Object.values(states).filter(s => s.status === 'completed').length,
      onboardingPhaseCompleted: cooldown.onboardingPhaseCompleted,
    }
  }

  /**
   * 重置所有引導狀態（僅用於測試）
   */
  resetAll(): void {
    if (typeof window === 'undefined') return
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('[GuidanceEngine] All guidance state reset')
  }
}

// ============================================
// Export singleton instance
// ============================================

export const guidanceEngine = new GuidanceEngine()
