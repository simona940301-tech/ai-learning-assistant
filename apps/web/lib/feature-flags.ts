/**
 * Feature Flags Configuration
 * 
 * Enterprise-grade feature flag system for controlling feature visibility.
 * Supports environment variable overrides for easy deployment management.
 * 
 * @module feature-flags
 */

// ============================================
// Hotfix Feature Flags (Existing)
// ============================================

const HOTFIX_FLAGS = {
  // Batch 1
  HOTFIX_BATCH1: process.env.NEXT_PUBLIC_HOTFIX_BATCH1 !== 'false', // Enabled by default
  HOTFIX_QR_ONE_STEP: process.env.NEXT_PUBLIC_HOTFIX_QR_ONE_STEP !== 'false',
  HOTFIX_MICRO_CARD: process.env.NEXT_PUBLIC_HOTFIX_MICRO_CARD !== 'false',
  HOTFIX_SAVED_BADGE: process.env.NEXT_PUBLIC_HOTFIX_SAVED_BADGE !== 'false',
  HOTFIX_CTA_TEXT: process.env.NEXT_PUBLIC_HOTFIX_CTA_TEXT !== 'false',
  // Batch 1.5
  HOTFIX_BATCH1_5: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5 !== 'false',
  HOTFIX_BATCH1_5_SINGLE_CTA: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA !== 'false',
  HOTFIX_BATCH1_5_NEAR_DIFFICULTY:
    process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY !== 'false',
  HOTFIX_BATCH1_5_BATCH_API: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API !== 'false',
  HOTFIX_BATCH1_5_SAMPLER_PERF: process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF !== 'false',
} as const

type HotfixFlag = keyof typeof HOTFIX_FLAGS

// ============================================
// Game Mode Feature Flags (New)
// ============================================

/**
 * Game mode feature flags
 */
export type GameModeFlag =
  | 'DETECTIVE_MODE'
  | 'EDITOR_MODE'
  | 'FOCUS_MODE'
  | 'PRACTICE_MODE'
  | 'UGC_MODE'
  | 'SYSTEM_BATTLE'
  | 'CUSTOM_BATTLE'
  | 'LYRICAL_FLOW'

/**
 * Game mode defaults
 * Production-ready features are enabled by default.
 * Incomplete features are disabled by default.
 * 
 * 🎯 MVP 階段：暫時關閉對戰功能進行修復
 * - LYRICAL_FLOW: 單字滑卡
 * - FOCUS_MODE: 專注模式
 */
const GAME_MODE_DEFAULTS: Record<GameModeFlag, boolean> = {
  // ✅ MVP 核心功能 (enabled by default)
  LYRICAL_FLOW: true,    // 單字滑卡
  FOCUS_MODE: true,      // 專注模式

  // ⏸️ 暫時關閉進行修復 (disabled by default, 可透過環境變數啟用)
  // 設定 NEXT_PUBLIC_ENABLE_SYSTEM_BATTLE=true 來啟用
  SYSTEM_BATTLE: true,  // 系統對戰 - 已復原
  CUSTOM_BATTLE: false,  // 自訂對戰（PVP）
  UGC_MODE: false,       // 內容貢獻
  PRACTICE_MODE: false,  // 無限練習

  // 🚧 已完成功能 (enabled)
  DETECTIVE_MODE: true, // 偵探模式 - API V1 完成 (三層驗證)
  EDITOR_MODE: true,    // 編輯模式 - 包含 Onboarding 與 Celebration
}

/**
 * Environment variable mapping for game modes
 */
const GAME_MODE_ENV_MAP: Record<GameModeFlag, string> = {
  DETECTIVE_MODE: 'NEXT_PUBLIC_ENABLE_DETECTIVE',
  EDITOR_MODE: 'NEXT_PUBLIC_ENABLE_EDITOR',
  FOCUS_MODE: 'NEXT_PUBLIC_ENABLE_FOCUS',
  PRACTICE_MODE: 'NEXT_PUBLIC_ENABLE_PRACTICE',
  UGC_MODE: 'NEXT_PUBLIC_ENABLE_UGC',
  SYSTEM_BATTLE: 'NEXT_PUBLIC_ENABLE_SYSTEM_BATTLE',
  CUSTOM_BATTLE: 'NEXT_PUBLIC_ENABLE_CUSTOM_BATTLE',
  LYRICAL_FLOW: 'NEXT_PUBLIC_ENABLE_LYRICAL_FLOW',
}

// ============================================
// Unified API
// ============================================

/**
 * Check if a hotfix feature flag is enabled (legacy)
 */
export function isFeatureEnabled(flag: HotfixFlag): boolean {
  return HOTFIX_FLAGS[flag] === true
}

/**
 * Check if a game mode is enabled
 * 
 * Priority:
 * 1. Environment variable (if set)
 * 2. Default value
 * 
 * @param mode - Game mode to check
 * @returns true if mode is enabled, false otherwise
 * 
 * @example
 * ```ts
 * if (isGameModeEnabled('DETECTIVE_MODE')) {
 *   // Show detective mode UI
 * }
 * ```
 */
export function isGameModeEnabled(mode: GameModeFlag): boolean {
  const envVar = GAME_MODE_ENV_MAP[mode]
  const envValue = process.env[envVar]

  // If environment variable is explicitly set, use it
  if (envValue !== undefined) {
    return envValue === 'true'
  }

  // Otherwise, use default
  return GAME_MODE_DEFAULTS[mode]
}

/**
 * Get all enabled game modes
 * 
 * Useful for debugging and logging
 * 
 * @returns Array of enabled game mode flags
 */
export function getEnabledGameModes(): GameModeFlag[] {
  return (Object.keys(GAME_MODE_DEFAULTS) as GameModeFlag[]).filter(isGameModeEnabled)
}

/**
 * Get all disabled game modes
 * 
 * Useful for debugging and logging
 * 
 * @returns Array of disabled game mode flags
 */
export function getDisabledGameModes(): GameModeFlag[] {
  return (Object.keys(GAME_MODE_DEFAULTS) as GameModeFlag[]).filter(
    (mode) => !isGameModeEnabled(mode)
  )
}

// ============================================
// Legacy Exports (Preserved)
// ============================================

/**
 * Check if entire Batch 1 hotfix is enabled
 */
export function isBatch1Enabled(): boolean {
  return HOTFIX_FLAGS.HOTFIX_BATCH1
}

/**
 * Check if entire Batch 1.5 hotfix is enabled
 */
export function isBatch15Enabled(): boolean {
  return HOTFIX_FLAGS.HOTFIX_BATCH1_5
}

/**
 * React hook for hotfix feature flags
 */
export function useFeatureFlag(flag: HotfixFlag): boolean {
  return isFeatureEnabled(flag)
}

export { HOTFIX_FLAGS as FLAGS }

