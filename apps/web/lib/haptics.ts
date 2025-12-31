/**
 * 🎮 Super Mario 風格觸覺反饋系統
 *
 * 支援:
 * - Vibration API (標準)
 * - 遊戲化反饋模式
 * - 自動降級處理
 */

type HapticPattern =
  | 'coin' // 💰 收集金幣 (短促)
  | 'jump' // 🦘 跳躍 (輕彈)
  | 'power-up' // ⭐ 升級 (級聯)
  | 'hit' // 💥 答對 (雙擊)
  | 'miss' // ❌ 答錯 (長震)
  | 'warning' // ⚠️ 警告 (急促3次)
  | 'victory' // 🎉 勝利 (慶祝序列)
  | 'defeat' // 😢 失敗 (低沉)
  | 'button' // 🔘 按鈕點擊
  | 'notification' // 🔔 通知

/** 振動模式配置 (毫秒) */
const hapticPatterns: Record<HapticPattern, number | number[]> = {
  // 短促反饋
  coin: 50, // 單次短震
  button: 10, // 極短震
  jump: [20, 10, 20], // 雙擊

  // 遊戲事件
  hit: [40, 20, 60], // 短-停-中
  miss: [200, 50, 100], // 長-停-中
  warning: [100, 50, 100, 50, 100], // 三次急促

  // 特殊事件
  'power-up': [50, 30, 70, 30, 90, 30, 110], // 漸強級聯
  victory: [100, 50, 100, 50, 200, 50, 100, 50, 100], // 慶祝序列
  defeat: [300, 100, 200], // 沉重兩次
  notification: [80, 40, 80], // 標準通知
}

/**
 * 檢查裝置是否支援震動
 */
export function isHapticSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'vibrate' in navigator
}

/**
 * 執行觸覺反饋
 */
export function triggerHaptic(pattern: HapticPattern): boolean {
  if (!isHapticSupported()) {
    console.debug('[Haptics] Vibration API not supported')
    return false
  }

  try {
    const vibrationPattern = hapticPatterns[pattern]
    const success = navigator.vibrate(vibrationPattern)

    if (!success) {
      console.debug('[Haptics] Vibration blocked or failed:', pattern)
    }

    return success
  } catch (error) {
    console.error('[Haptics] Error triggering vibration:', error)
    return false
  }
}

/**
 * 取消當前震動
 */
export function cancelHaptic(): boolean {
  if (!isHapticSupported()) return false

  try {
    return navigator.vibrate(0)
  } catch (error) {
    console.error('[Haptics] Error canceling vibration:', error)
    return false
  }
}

/**
 * 🎯 React Hook: 使用觸覺反饋
 *
 * @example
 * ```tsx
 * const haptic = useHaptic()
 *
 * <button onClick={() => haptic('button')}>
 *   點擊我
 * </button>
 * ```
 */
export function useHaptic() {
  return (pattern: HapticPattern) => triggerHaptic(pattern)
}

/**
 * 🎮 遊戲場景專用觸覺反饋
 */
export const GameHaptics = {
  /** 💰 收集金幣 */
  collectCoin: () => triggerHaptic('coin'),

  /** ✅ 答對題目 */
  answerCorrect: () => triggerHaptic('hit'),

  /** ❌ 答錯題目 */
  answerWrong: () => triggerHaptic('miss'),

  /** 🎉 獲勝慶祝 */
  celebrate: () => triggerHaptic('victory'),

  /** 😢 失敗 */
  fail: () => triggerHaptic('defeat'),

  /** ⚠️ 時間警告 (最後3秒) */
  timeWarning: () => triggerHaptic('warning'),

  /** ⭐ 升級/Power Up */
  powerUp: () => triggerHaptic('power-up'),

  /** 🔘 UI 交互 */
  buttonPress: () => triggerHaptic('button'),

  /** 🦘 跳躍/過渡 */
  transition: () => triggerHaptic('jump'),

  /** 🔔 通知 */
  notify: () => triggerHaptic('notification'),
}

/**
 * 🎵 觸覺 + 音效組合
 *
 * 同時觸發震動和音效,增強反饋
 */
export function triggerHapticWithSound(
  pattern: HapticPattern,
  audioContext?: AudioContext,
  frequency?: number
): void {
  // 觸發震動
  triggerHaptic(pattern)

  // 觸發音效 (如果提供了 AudioContext)
  if (audioContext && frequency) {
    try {
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      const now = audioContext.currentTime
      gainNode.gain.setValueAtTime(0.002, now)
      gainNode.gain.exponentialRampToValueAtTime(0.00001, now + 0.1)

      oscillator.start(now)
      oscillator.stop(now + 0.1)
    } catch (error) {
      console.error('[Haptics] Error playing sound:', error)
    }
  }
}

/**
 * 💡 自動觸覺反饋 Hook
 *
 * 根據用戶設置自動啟用/禁用觸覺反饋
 */
export function useAutoHaptic(enabled: boolean = true) {
  return (pattern: HapticPattern) => {
    if (!enabled) return false
    return triggerHaptic(pattern)
  }
}

/**
 * 🎯 預設偏好檢測
 *
 * 檢查用戶是否偏好減少動畫 (無障礙)
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  return mediaQuery.matches
}

/**
 * 🔧 智能觸覺反饋
 *
 * 根據系統偏好自動調整
 */
export function smartHaptic(pattern: HapticPattern): boolean {
  // 如果用戶偏好減少動畫,則禁用震動
  if (shouldReduceMotion()) {
    console.debug('[Haptics] Reduced motion preferred, skipping vibration')
    return false
  }

  return triggerHaptic(pattern)
}
