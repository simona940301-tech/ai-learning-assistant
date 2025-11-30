export interface AchievementContext {
  totalMatches: number
  totalQuestions: number
  totalCorrectAnswers: number
  consecutivePvpWins: number
  justWonPvp: boolean
  isPerfectGame: boolean
  firstPvpWinUnlocked: boolean
  perfectUnlocked: boolean
  pvpStreakUnlocked: boolean
  matches50Unlocked: boolean
  answers200Unlocked: boolean
}

export function evaluateAchievements(ctx: AchievementContext) {
  const unlocked: string[] = []

  if (ctx.isPerfectGame && !ctx.perfectUnlocked) {
    unlocked.push('perfect_accuracy')
  }

  if (ctx.justWonPvp && !ctx.firstPvpWinUnlocked) {
    unlocked.push('first_pvp_win')
  }

  if (ctx.consecutivePvpWins >= 5 && !ctx.pvpStreakUnlocked) {
    unlocked.push('pvp_win_streak_5')
  }

  if (ctx.totalMatches >= 50 && !ctx.matches50Unlocked) {
    unlocked.push('fifty_matches')
  }

  if (ctx.totalQuestions >= 200 && !ctx.answers200Unlocked) {
    unlocked.push('two_hundred_answers')
  }

  return unlocked
}
