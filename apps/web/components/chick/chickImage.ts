import type { ChickEmotion, ChickState } from '@/packages/server/chick/types'

type Args = {
  emotionState: ChickEmotion
  fatigue: number
  iq: number
}

/**
 * 舊的 getChickImage 函數，保留向後相容性
 * @deprecated 使用 getChickImagePath 代替，接收完整狀態對象
 */
export function getChickImage({ emotionState, fatigue, iq }: Args): string {
  // Special States
  if (emotionState === 'sick') return '/chicks/statussick.png'
  if (emotionState === 'runaway') return '/chicks/status_runaway.png'
  if (emotionState === 'meditate') return '/chicks/status_meditate_v2.png'

  if (emotionState === 'hibernate') return '/chicks/emotion_hibernate.png'
  if (emotionState === 'distant') return '/chicks/emotion_distant.png'
  if (emotionState === 'cold') return '/chicks/emotion_cold.png'
  if (fatigue >= 2) return '/chicks/fatigue_tired.png'

  if (iq <= 2) return '/chicks/iq_low.png'
  if (iq >= 8) return '/chicks/iq_high.png'
  if (iq >= 4) return '/chicks/iq_mid.png'
  // default
  return '/chicks/normal.png'
}

/**
 * 統一的小雞圖片路徑工具函數
 * 接收完整的 ChickState 狀態對象，根據優先級返回對應圖片路徑
 */
export function getChickImagePath(state: ChickState): string {
  const { emotionState, fatigue, iq } = state

  // 優先級順序：特殊狀態 > 情緒狀態 > 疲勞狀態 > IQ狀態 > 預設

  // 1. 特殊狀態（最高優先級）
  if (emotionState === 'sick') return '/chicks/statussick.png'
  if (emotionState === 'runaway') return '/chicks/status_runaway.png'
  if (emotionState === 'meditate') return '/chicks/status_meditate_v2.png'

  // 2. 情緒狀態
  if (emotionState === 'hibernate') return '/chicks/emotion_hibernate.png'
  if (emotionState === 'distant') return '/chicks/emotion_distant.png'
  if (emotionState === 'cold') return '/chicks/emotion_cold.png'

  // 3. 疲勞狀態
  if (fatigue >= 2) return '/chicks/fatigue_tired.png'

  // 4. IQ狀態（注意順序：low -> high -> mid）
  if (iq <= 2) return '/chicks/iq_low.png'
  if (iq >= 8) return '/chicks/iq_high.png'
  if (iq >= 4) return '/chicks/iq_mid.png'

  // 5. 預設狀態
  return '/chicks/normal.png'
}
