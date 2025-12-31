import { CHEST_CONFIG, STREAK_CONFIG } from './constants'

export type TimezoneDateParts = {
  dayKey: string
  date: Date
}

export function randomInt(min: number, max: number): number {
  const lower = Math.ceil(min)
  const upper = Math.floor(max)
  return Math.floor(Math.random() * (upper - lower + 1)) + lower
}

export function buildChestReward(type: keyof typeof CHEST_CONFIG) {
  const config = CHEST_CONFIG[type]
  const gold = randomInt(config.gold.min, config.gold.max)
  const xp = randomInt(config.xp.min, config.xp.max)
  const reward: Record<string, any> = { gold, xp }
  if ('buff' in config && config.buff) {
    reward.buff = {
      multiplier: config.buff.multiplier,
      hours: config.buff.hours,
    }
  }
  return reward
}

export function getTimezoneDayKey(date: Date | string): TimezoneDateParts {
  const source = typeof date === 'string' ? new Date(date) : date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: STREAK_CONFIG.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const formatted = formatter.format(source)
  return { dayKey: formatted, date: source }
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(date.getDate() + days)
  return next
}

export function diffDays(dayA: string | null, dayB: string) {
  if (!dayA) return Number.POSITIVE_INFINITY
  return Math.floor(
    (new Date(dayB).getTime() - new Date(dayA).getTime()) / (1000 * 60 * 60 * 24)
  )
}
