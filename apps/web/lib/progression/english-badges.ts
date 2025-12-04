import type { SupabaseClient } from '@supabase/supabase-js'
import { getTimezoneDayKey, diffDays } from './utils'

export interface EnglishPerformanceSnapshot {
  totalQuestions: number
  weightedAccuracy: number
  avgResponseTimeMs: number
  readyPct: number
}

type DailyCounts = Record<string, number>

async function fetchEnglishDailyCounts(
  supabase: SupabaseClient,
  userId: string,
  daysWindow: number,
): Promise<DailyCounts> {
  const since = new Date()
  since.setDate(since.getDate() - daysWindow)

  const { data, error } = await supabase
    .from('user_answers')
    .select('created_at, metadata')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())

  if (error) {
    console.error('[EnglishBadges] Failed to fetch user_answers for streak:', error)
    return {}
  }

  const counts: DailyCounts = {}

  for (const ans of data || []) {
    const metadata = (ans as any).metadata || {}
    if (metadata.subject !== 'english') continue

    const createdAt = (ans as any).created_at as string
    const { dayKey } = getTimezoneDayKey(createdAt)
    counts[dayKey] = (counts[dayKey] || 0) + 1
  }

  return counts
}

function hasStreak(counts: DailyCounts, requiredDays: number, minQuestionsPerDay: number): boolean {
  if (!requiredDays) return false

  const dayKeys = Object.keys(counts).sort()
  if (!dayKeys.length) return false

  let currentStreak = 0

  for (let i = 0; i < dayKeys.length; i++) {
    const day = dayKeys[i]
    const meetsThreshold = (counts[day] || 0) >= minQuestionsPerDay

    if (i === 0) {
      currentStreak = meetsThreshold ? 1 : 0
    } else {
      const prevDay = dayKeys[i - 1]
      const gap = diffDays(prevDay, day)

      if (gap > 1) {
        // There is at least one missing day between prevDay and day -> streak resets.
        currentStreak = 0
      }

      if (meetsThreshold) {
        currentStreak += 1
      } else {
        currentStreak = 0
      }
    }

    if (currentStreak >= requiredDays) {
      return true
    }
  }

  return false
}

/**
 * Evaluate and grant English-specific badges based on:
 * - Total English questions
 * - Weighted accuracy
 * - Average response time
 * - DreamSchool Ready percentage
 * - English-specific streak (per-day question count)
 *
 * This function is designed to be idempotent:
 * it uses upsert on (user_id, badge_code), so repeated calls are safe.
 */
export async function evaluateAndGrantEnglishBadges(
  supabase: SupabaseClient,
  userId: string,
  snapshot: EnglishPerformanceSnapshot,
): Promise<void> {
  try {
    const { totalQuestions, weightedAccuracy, avgResponseTimeMs, readyPct } = snapshot

    const candidateBadges: string[] = []

    // -----------------------------
    // Volume / 投入 (全期間題量)
    // -----------------------------
    if (totalQuestions >= 200) {
      candidateBadges.push('eng_volume_basic') // 基礎構築者
    }
    if (totalQuestions >= 1000) {
      candidateBadges.push('eng_volume_advanced') // 熟練工匠
    }
    if (totalQuestions >= 3000) {
      candidateBadges.push('eng_volume_expert') // 題庫征服者
    }
    if (totalQuestions >= 5000) {
      candidateBadges.push('eng_volume_grandmaster') // 詞彙宗師
    }

    // -----------------------------
    // Quality / 品質
    // -----------------------------
    if (totalQuestions >= 200 && weightedAccuracy >= 0.9) {
      candidateBadges.push('eng_accuracy_high') // 高效精準
    }
    if (totalQuestions >= 500 && weightedAccuracy >= 0.95) {
      candidateBadges.push('eng_accuracy_flawless') // 無暇執行
    }

    // Speed / 自動化反應
    if (
      totalQuestions >= 200 &&
      weightedAccuracy >= 0.8 &&
      avgResponseTimeMs > 0 &&
      avgResponseTimeMs <= 20000
    ) {
      candidateBadges.push('eng_speed_automatic')
    }

    // -----------------------------
    // Outcome / Dream Ready 百分比
    // -----------------------------
    if (readyPct >= 70) {
      candidateBadges.push('eng_ready_70')
    }
    if (readyPct >= 85) {
      candidateBadges.push('eng_ready_85')
    }
    if (readyPct >= 100) {
      candidateBadges.push('eng_ready_100')
    }
    if (readyPct >= 110) {
      candidateBadges.push('eng_ready_110')
    }

    // -----------------------------
    // Consistency / Streak (英文題量)
    // -----------------------------
    // 90 天視窗足以涵蓋最高 90 天 streak
    const dailyCounts = await fetchEnglishDailyCounts(supabase, userId, 120)

    if (Object.keys(dailyCounts).length > 0) {
      if (hasStreak(dailyCounts, 7, 15)) {
        candidateBadges.push('eng_streak_weekly') // 每週節奏
      }
      if (hasStreak(dailyCounts, 30, 20)) {
        candidateBadges.push('eng_streak_habit') // 習慣機器
      }
      if (hasStreak(dailyCounts, 60, 40)) {
        candidateBadges.push('eng_streak_prep') // 高強度備戰
      }
      if (hasStreak(dailyCounts, 90, 50)) {
        candidateBadges.push('eng_streak_iron') // 鋼鐵意志
      }
    }

    if (!candidateBadges.length) return

    const rows = candidateBadges.map(code => ({
      user_id: userId,
      badge_code: code,
    }))

    const { error: upsertError } = await supabase
      .from('user_badges')
      .upsert(rows, { onConflict: 'user_id,badge_code' })

    if (upsertError) {
      console.error('[EnglishBadges] Failed to upsert badges:', upsertError)
    }
  } catch (error) {
    console.error('[EnglishBadges] Unexpected error during evaluation:', error)
  }
}
