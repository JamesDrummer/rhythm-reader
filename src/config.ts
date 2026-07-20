import type { Tier } from './model'

export interface TimingWindow {
  perfectMs: number
  goodMs: number
}

export const TIMING_WINDOWS_MS: Record<Tier, TimingWindow> = {
  beginner: { perfectMs: 80, goodMs: 160 },
  intermediate: { perfectMs: 60, goodMs: 120 },
  advanced: { perfectMs: 40, goodMs: 90 },
}

export const STAR_THRESHOLDS_PERCENT = {
  one: 60,
  two: 75,
  three: 90,
} as const

export const PER_HIT_VALUES_PERCENT = {
  perfect: 100,
  good: 70,
  miss: 0,
} as const

// Ten points is deliberately small relative to one perfect hit (100 points).
export const EXTRA_HIT_PENALTY_PERCENT = 10
export const REQUIRED_STARS_PER_EXERCISE = 2
export const COUNT_IN_BARS = 1

export const AUDIO_SCHEDULER = {
  intervalMs: 25,
  lookaheadSeconds: 0.1,
  startDelaySeconds: 0.05,
} as const

export const CALIBRATION = {
  tempo: 90,
  tapCount: 16,
  discardCount: 4,
} as const

export type StarRating = 0 | 1 | 2 | 3

export interface ExerciseProgress {
  completed: boolean
  stars: StarRating
}

export function starsForAccuracy(accuracyPercent: number): StarRating {
  if (accuracyPercent >= STAR_THRESHOLDS_PERCENT.three) return 3
  if (accuracyPercent >= STAR_THRESHOLDS_PERCENT.two) return 2
  if (accuracyPercent >= STAR_THRESHOLDS_PERCENT.one) return 1
  return 0
}

export function isNextLevelUnlocked(
  exerciseProgress: readonly ExerciseProgress[],
): boolean {
  if (exerciseProgress.length === 0) return false

  const allComplete = exerciseProgress.every(({ completed }) => completed)
  const totalStars = exerciseProgress.reduce((sum, { stars }) => sum + stars, 0)

  return (
    allComplete &&
    totalStars >= REQUIRED_STARS_PER_EXERCISE * exerciseProgress.length
  )
}
