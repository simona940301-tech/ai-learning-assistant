import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import { levelForXp } from '@/lib/progression'
import { getTimezoneDayKey } from '@/lib/progression/utils'

export async function GET(req: NextRequest) {
  const { supabase, user, errorType } = await getApiUser(req)
  if (!user) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: errorType },
      { status: 401 },
    )
  }

  const [{ data: profile }, { data: state }, { data: chests }, { data: badges }, { data: milestones }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'xp,level,streak,best_streak,coins,streak_reward_state,total_matches,total_wins,total_correct_answers,total_questions_answered,tutorial_completed_at',
        )
        .eq('id', user.id)
        .single(),
      supabase
        .from('battle_progression_state')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('battle_chests')
        .select('id,chest_type,source,rewards,granted_at')
        .eq('user_id', user.id)
        .eq('status', 'UNOPENED')
        .order('granted_at', { ascending: true }),
      supabase
        .from('user_badges')
        .select('badge_code,awarded_at')
        .eq('user_id', user.id)
        .order('awarded_at', { ascending: false })
        .limit(8),
      supabase
        .from('battle_streak_milestones')
        .select('milestone_days,reward_chest_type,reward_badge_code')
        .order('milestone_days', { ascending: true }),
    ])

  const xpValue = profile?.xp || 0
  const levelInfo = levelForXp(xpValue)
  const currentStreak = profile?.streak || 0
  const bestStreak = profile?.best_streak || 0
  const xpBuffActive =
    state?.xp_multiplier &&
    state?.xp_multiplier_expires_at &&
    new Date(state.xp_multiplier_expires_at) > new Date()

  const lastDay = state?.last_streaked_on
  const { dayKey: todayKey } = getTimezoneDayKey(new Date())
  const todayCompleted = lastDay === todayKey

  const nextMilestone =
    milestones?.find((m) => m.milestone_days > currentStreak) || milestones?.[milestones.length - 1]

  return NextResponse.json({
    success: true,
    progression: {
      xp: {
        total: xpValue,
        level: levelInfo.level,
        progress: levelInfo.progressPct,
        nextLevelXp: levelInfo.nextLevelXp,
      },
      streak: {
        current: currentStreak,
        best: bestStreak,
        todayCompleted,
        nextMilestone: nextMilestone
          ? {
              dayCount: nextMilestone.milestone_days,
              rewardChest: nextMilestone.reward_chest_type,
              rewardBadge: nextMilestone.reward_badge_code,
            }
          : null,
      },
      xpBuff: xpBuffActive
        ? {
            multiplier: state?.xp_multiplier,
            expiresAt: state?.xp_multiplier_expires_at,
          }
        : null,
      totalMatches: profile?.total_matches || 0,
      totalWins: profile?.total_wins || 0,
      totalCorrectAnswers: profile?.total_correct_answers || 0,
      tutorialCompleted: Boolean(profile?.tutorial_completed_at),
      shouldForceTutorial: (profile?.total_matches || 0) === 0,
    },
    chests: (chests || []).map((chest) => ({
      id: chest.id,
      chestType: chest.chest_type,
      source: chest.source,
      rewards: chest.rewards,
      grantedAt: chest.granted_at,
    })),
    badges: badges || [],
    timestamp: new Date().toISOString(),
  })
}
