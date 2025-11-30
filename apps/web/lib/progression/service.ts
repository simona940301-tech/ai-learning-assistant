import type { SupabaseClient } from '@supabase/supabase-js'
import { computeMatchXp } from './xp'
import { levelForXp } from './leveling'
import { updateStreak } from './streak'
import { buildChestReward, getTimezoneDayKey } from './utils'
import { evaluateAchievements } from './achievements'
import type { BattleProgressionRequest, BattleParticipantPayload } from './types'
import { XP_CONFIG } from './constants'

type ProfileRow = {
  id: string
  xp: number | null
  level: number | null
  streak: number | null
  best_streak: number | null
  streak_reward_state: Record<string, any> | null
  coins: number | null
  total_matches?: number | null
  total_wins?: number | null
  total_pve_matches?: number | null
  total_pvp_matches?: number | null
  total_correct_answers?: number | null
  total_questions_answered?: number | null
  tutorial_completed_at?: string | null
  tutorial_badge_awarded?: boolean | null
}

type ProgressionStateRow = {
  user_id: string
  xp_multiplier: number | null
  xp_multiplier_expires_at: string | null
  daily_streak_count: number | null
  last_streaked_on: string | null
  streak_reward_cursor: number | null
  tutorial_forced?: boolean | null
  tutorial_reward_claimed?: boolean | null
  pending_rewards?: Record<string, any> | null
}

type MilestoneRow = {
  milestone_days: number
  reward_chest_type: 'BRONZE' | 'GOLD' | null
  reward_gold: number
  reward_xp: number
  reward_badge_code: string | null
  reward_buff_hours: number
  metadata: Record<string, any> | null
}

type AchievementDefinition = {
  code: string
  reward_chest_type: 'BRONZE' | 'GOLD' | null
  reward_gold: number
  reward_xp: number
  reward_badge_code: string | null
}

export interface ApplyBattleProgressionResult {
  userId: string
  xpGained: number
  newLevel: number
  leveledUp: boolean
  streakCount: number
  chestsGranted: string[]
  achievementsUnlocked: string[]
  badgesGranted: string[]
}

export async function applyBattleProgression(
  supabase: SupabaseClient,
  payload: BattleProgressionRequest,
): Promise<ApplyBattleProgressionResult[]> {
  if (!payload.participants?.length) return []

  const milestones = await fetchStreakMilestones(supabase)
  const achievementDefs = await fetchAchievementDefinitions(supabase)
  const now = new Date(payload.endedAt ?? new Date().toISOString())
  const results: ApplyBattleProgressionResult[] = []

  for (const participant of payload.participants) {
    const isPvp = participant.isPvp ?? participant.mode === 'PVP'
    const isTutorial = payload.matchMode === 'PVE_TUTORIAL'
    const isPerfectGame =
      participant.isPerfectGame ??
      (participant.correctAnswers >= participant.totalQuestions &&
        participant.totalQuestions > 0)

    const profile = await fetchProfile(supabase, participant.userId)
    if (!profile) continue

    const state = await fetchOrCreateProgressionState(supabase, participant.userId, profile)
    const statePayload = (state?.pending_rewards as Record<string, any>) || {}
    const activeMultiplier =
      state?.xp_multiplier && state.xp_multiplier_expires_at && new Date(state.xp_multiplier_expires_at) > now
        ? state.xp_multiplier
        : 1

    // Check well-fed buff (hunger < 30 gives +10% XP/coins)
    const { data: chickProfile } = await supabase
      .from('profiles')
      .select('chick_hunger')
      .eq('id', participant.userId)
      .single()

    const isWellFed = (chickProfile?.chick_hunger || 50) < 30
    const wellFedMultiplier = isWellFed ? 1.1 : 1.0

    const xpResult = computeMatchXp({
      correctAnswers: participant.correctAnswers,
      totalQuestions: participant.totalQuestions,
      didWin: participant.didWin,
      isTutorial,
      xpMultiplier: (participant.xpMultiplierOverride ?? activeMultiplier ?? 1) * wellFedMultiplier,
    })

    const previousXp = profile.xp || 0
    const newXp = previousXp + xpResult.totalXp
    const levelInfo = levelForXp(newXp)
    const leveledUp = levelInfo.level > (profile.level || 1)

    const previousStreak = profile.streak || 0
    const streakUpdate = updateStreak(
      { lastDayKey: state?.last_streaked_on || null, count: previousStreak },
      now,
    )
    const newStreak = streakUpdate.streakCount
    const newBest = Math.max(profile.best_streak || 0, newStreak)

    // P1-E: Send STREAK event to Chick system
    if (streakUpdate.hasProgress && newStreak !== previousStreak) {
      try {
        const { sendChickActionServer } = await import('@/lib/chick/server-action-bus')
        if (streakUpdate.brokeStreak) {
          // Streak broke (reset to 1)
          await sendChickActionServer(supabase, participant.userId, 'STREAK_BREAK', {
            streakDays: 0,
          })
        } else if (newStreak > previousStreak) {
          // Streak continued/increased
          await sendChickActionServer(supabase, participant.userId, 'STREAK_CONTINUE', {
            streakDays: newStreak,
          })
        }
      } catch (chickError) {
        // Non-blocking: log but don't fail the progression update
        console.warn('[applyBattleProgression] Failed to send STREAK event:', chickError)
      }
    }

    const totals = accumulateTotals(profile, participant, isPvp)

    const profileUpdate: Record<string, any> = {
      xp: newXp,
      level: levelInfo.level,
      streak: newStreak,
      best_streak: newBest,
      last_battle_at: now.toISOString(),
      total_matches: totals.matches,
      total_wins: totals.wins,
      total_pve_matches: totals.pveMatches,
      total_pvp_matches: totals.pvpMatches,
      total_correct_answers: totals.correctAnswers,
      total_questions_answered: totals.answered,
    }

    if (!profile.streak_reward_state) {
      profileUpdate.streak_reward_state = {}
    }

    if (payload.matchMode === 'PVE_TUTORIAL' && !profile.tutorial_completed_at) {
      profileUpdate.tutorial_completed_at = now.toISOString()
    }

    // Chick System: Increase hunger from battle activity (+15)
    try {
      const { increaseHungerFromActivity } = await import('@/lib/chick/hunger')
      await increaseHungerFromActivity(supabase, participant.userId, 15)
    } catch (chickError) {
      console.warn('[applyBattleProgression] Failed to update hunger:', chickError)
    }

    // Chick System: Grant food bowls reward (Win: +3, Lose: +1)
    try {
      const { grantBattleFoodReward } = await import('@/lib/chick/rewards')
      await grantBattleFoodReward(supabase, participant.userId, participant.didWin)
    } catch (chickError) {
      console.warn('[applyBattleProgression] Failed to grant food reward:', chickError)
    }

    // Daily Missions: Update progress for play_battle and win_battle
    try {
      await supabase.rpc('update_mission_progress', {
        p_user_id: participant.userId,
        p_mission_type: 'play_battle',
        p_increment: 1
      })

      if (participant.didWin) {
        await supabase.rpc('update_mission_progress', {
          p_user_id: participant.userId,
          p_mission_type: 'win_battle',
          p_increment: 1
        })
      }
    } catch (missionError) {
      console.warn('[applyBattleProgression] Failed to update mission progress:', missionError)
    }

    // Update profile row
    await supabase.from('profiles').update(profileUpdate).eq('id', participant.userId)

    // Update Elo Ratings (New Personalization Feature)
    try {
      await updateEloRatings(supabase, payload.matchId, participant.userId, participant.didWin)
    } catch (eloError) {
      console.warn('[applyBattleProgression] Failed to update Elo ratings:', eloError)
    }

    // Update progression state row
    const stateUpdate: Record<string, any> = {
      daily_streak_count: newStreak,
      last_streaked_on: streakUpdate.updatedDayKey,
      xp_multiplier: activeMultiplier,
      updated_at: new Date().toISOString(),
    }

    if (!state?.xp_multiplier_expires_at || new Date(state.xp_multiplier_expires_at) <= now) {
      stateUpdate.xp_multiplier = 1
      stateUpdate.xp_multiplier_expires_at = null
    }

    if (isPvp) {
      const previous = statePayload.pvpWinStreak || 0
      statePayload.pvpWinStreak = participant.didWin ? previous + 1 : 0
      stateUpdate.pending_rewards = statePayload
    }

    await supabase
      .from('battle_progression_state')
      .update(stateUpdate)
      .eq('user_id', participant.userId)

    const chestsGranted: string[] = []

    if (leveledUp) {
      const granted = await grantChest(supabase, participant.userId, 'BRONZE', 'level_up')
      if (granted) chestsGranted.push(granted)
    }

    const milestoneChests = await maybeGrantStreakMilestone(
      supabase,
      participant.userId,
      profile,
      streakUpdate.streakCount,
      milestones,
      streakUpdate.hasProgress,
    )
    chestsGranted.push(...milestoneChests)

    const tutorialBadge =
      isTutorial && participant.didWin
        ? await ensureBadge(supabase, participant.userId, 'rookie_warrior')
        : null

    const { achievementsUnlocked, badgesGranted, rewardChests } = await evaluateAndGrantAchievements(
      supabase,
      participant,
      totals,
      statePayload,
      achievementDefs,
      isPvp,
      isPerfectGame,
    )
    chestsGranted.push(...rewardChests)
    if (tutorialBadge && !badgesGranted.includes('rookie_warrior')) {
      badgesGranted.push('rookie_warrior')
    }

    results.push({
      userId: participant.userId,
      xpGained: xpResult.totalXp,
      newLevel: levelInfo.level,
      leveledUp,
      streakCount: newStreak,
      chestsGranted,
      achievementsUnlocked,
      badgesGranted,
    })
  }

  return results
}

function accumulateTotals(
  profile: ProfileRow,
  participant: BattleParticipantPayload,
  isPvp: boolean,
) {
  const matches = (profile.total_matches || 0) + 1
  const wins = (profile.total_wins || 0) + (participant.didWin ? 1 : 0)
  const pveMatches =
    (profile.total_pve_matches || 0) + (participant.mode.startsWith('PVE') ? 1 : 0)
  const pvpMatches = (profile.total_pvp_matches || 0) + (isPvp ? 1 : 0)
  const correctAnswers = (profile.total_correct_answers || 0) + participant.correctAnswers
  const answered = (profile.total_questions_answered || 0) + participant.answeredQuestions
  return { matches, wins, pveMatches, pvpMatches, correctAnswers, answered }
}

async function fetchProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select(
      'id,xp,level,streak,best_streak,streak_reward_state,coins,total_matches,total_wins,total_pve_matches,total_pvp_matches,total_correct_answers,total_questions_answered,tutorial_completed_at,tutorial_badge_awarded',
    )
    .eq('id', userId)
    .single()
  return data as ProfileRow | null
}

async function fetchOrCreateProgressionState(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileRow,
) {
  const { data } = await supabase
    .from('battle_progression_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (data) return data as ProgressionStateRow

  const insertPayload = {
    user_id: userId,
    daily_streak_count: profile.streak || 0,
    last_streaked_on: null,
  }
  await supabase.from('battle_progression_state').insert(insertPayload)
  return insertPayload as ProgressionStateRow
}

async function fetchStreakMilestones(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('battle_streak_milestones')
    .select('*')
    .order('milestone_days', { ascending: true })
  return (data || []) as MilestoneRow[]
}

async function fetchAchievementDefinitions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('battle_achievement_definitions')
    .select('code,reward_chest_type,reward_gold,reward_xp,reward_badge_code')
  const dictionary: Record<string, AchievementDefinition> = {}
  for (const row of data || []) {
    dictionary[row.code] = row as AchievementDefinition
  }
  return dictionary
}

async function grantChest(
  supabase: SupabaseClient,
  userId: string,
  type: 'BRONZE' | 'GOLD',
  source: string,
  overrideRewards?: Record<string, any>,
) {
  const rewards = overrideRewards || buildChestReward(type)
  const { data, error } = await supabase
    .from('battle_chests')
    .insert({
      user_id: userId,
      chest_type: type,
      source,
      rewards,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('[Progression] Failed to grant chest', error)
    return null
  }
  return data.id as string
}

async function maybeGrantStreakMilestone(
  supabase: SupabaseClient,
  userId: string,
  profile: ProfileRow,
  streakCount: number,
  milestones: MilestoneRow[],
  hasProgress: boolean,
) {
  if (!hasProgress || !milestones.length) return []
  const rewards: string[] = []
  const rewardState = (profile.streak_reward_state || {}) as Record<string, boolean>

  for (const milestone of milestones) {
    if (streakCount !== milestone.milestone_days) continue
    if (rewardState[milestone.milestone_days]) continue
    if (milestone.reward_chest_type) {
      const granted = await grantChest(
        supabase,
        userId,
        milestone.reward_chest_type,
        `streak_${milestone.milestone_days}`,
        milestone.reward_xp || milestone.reward_gold
          ? {
            gold: milestone.reward_gold,
            xp: milestone.reward_xp,
            label: milestone.metadata?.label ?? `streak_${milestone.milestone_days}`,
          }
          : undefined,
      )
      if (granted) rewards.push(granted)
    }
    if (milestone.reward_badge_code) {
      await ensureBadge(supabase, userId, milestone.reward_badge_code)
    }
    rewardState[milestone.milestone_days] = true
    await supabase.from('profiles').update({ streak_reward_state: rewardState }).eq('id', userId)

    if (milestone.reward_buff_hours > 0) {
      const expires = new Date()
      expires.setHours(expires.getHours() + milestone.reward_buff_hours)
      await supabase
        .from('battle_progression_state')
        .update({
          xp_multiplier: 1.2,
          xp_multiplier_expires_at: expires.toISOString(),
        })
        .eq('user_id', userId)
    }
  }

  return rewards
}

async function ensureBadge(supabase: SupabaseClient, userId: string, badgeCode: string) {
  const { data } = await supabase
    .from('user_badges')
    .select('badge_code')
    .eq('user_id', userId)
    .eq('badge_code', badgeCode)
    .maybeSingle()
  if (data) return null
  await supabase.from('user_badges').insert({ user_id: userId, badge_code: badgeCode })
  return badgeCode
}

async function evaluateAndGrantAchievements(
  supabase: SupabaseClient,
  participant: BattleParticipantPayload,
  totals: ReturnType<typeof accumulateTotals>,
  statePayload: Record<string, any>,
  definitions: Record<string, AchievementDefinition>,
  isPvp: boolean,
  isPerfectGame: boolean,
) {
  const { data: existing } = await supabase
    .from('user_achievements')
    .select('achievement_code')
    .eq('user_id', participant.userId)
  const unlockedSet = new Set(existing?.map((entry) => entry.achievement_code))

  const unlocked = evaluateAchievements({
    totalMatches: totals.matches,
    totalQuestions: totals.answered,
    totalCorrectAnswers: totals.correctAnswers,
    consecutivePvpWins: statePayload.pvpWinStreak || 0,
    justWonPvp: Boolean(isPvp && participant.didWin),
    isPerfectGame,
    firstPvpWinUnlocked: unlockedSet.has('first_pvp_win'),
    perfectUnlocked: unlockedSet.has('perfect_accuracy'),
    pvpStreakUnlocked: unlockedSet.has('pvp_win_streak_5'),
    matches50Unlocked: unlockedSet.has('fifty_matches'),
    answers200Unlocked: unlockedSet.has('two_hundred_answers'),
  })

  if (unlocked.length === 0) {
    return { achievementsUnlocked: [], badgesGranted: [], rewardChests: [] }
  }

  const rewardChests: string[] = []
  const badgesGranted: string[] = []
  await supabase
    .from('user_achievements')
    .insert(unlocked.map((code) => ({ user_id: participant.userId, achievement_code: code })))

  for (const code of unlocked) {
    const def = definitions[code]
    if (!def) continue
    if (def.reward_chest_type) {
      const granted = await grantChest(
        supabase,
        participant.userId,
        def.reward_chest_type,
        `achievement_${code}`,
        def.reward_gold || def.reward_xp
          ? { gold: def.reward_gold, xp: def.reward_xp, label: code }
          : undefined,
      )
      if (granted) rewardChests.push(granted)
    }
    if (def.reward_badge_code) {
      const badge = await ensureBadge(supabase, participant.userId, def.reward_badge_code)
      if (badge) badgesGranted.push(def.reward_badge_code)
    }
  }

  return { achievementsUnlocked: unlocked, badgesGranted, rewardChests }
}

async function updateEloRatings(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
  didWinMatch: boolean
) {
  // 1. Fetch match history to get questions and answers
  const { data: match } = await supabase
    .from('match_history')
    .select('question_list, player1_id, player2_id, player1_answers, player2_answers')
    .eq('id', matchId)
    .single()

  if (!match || !match.question_list) return

  // 2. Determine which player is the current user
  const isPlayer1 = match.player1_id === userId
  const answers = isPlayer1 ? match.player1_answers : match.player2_answers

  if (!answers || !Array.isArray(answers)) return

  const questions = match.question_list as any[]

  // 3. Iterate through questions and update Elo for each tag
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]
    const userAnswer = answers[i]

    // Skip if no answer or no tags
    if (!userAnswer || !question.skill_tags || !Array.isArray(question.skill_tags)) continue

    const isCorrect = userAnswer.trim().toUpperCase() === question.correct_answer?.trim().toUpperCase()

    // For each tag, update Elo
    // We treat each question as a "mini-match" against the concept
    // If correct, we "win" against the concept. If wrong, we "lose".
    for (const tag of question.skill_tags) {
      await supabase.rpc('update_user_tag_elo', {
        p_user_id: userId,
        p_tag: tag,
        p_won: isCorrect,
        p_expected_score: 0.5 // TODO: Calculate based on difficulty vs current Elo
      })
    }
  }
}
