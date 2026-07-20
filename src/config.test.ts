import { describe, expect, it } from 'vitest'
import {
  COUNT_IN_BARS,
  EXTRA_HIT_PENALTY_PERCENT,
  PER_HIT_VALUES_PERCENT,
  REQUIRED_STARS_PER_EXERCISE,
  STAR_THRESHOLDS_PERCENT,
  TIMING_WINDOWS_MS,
  isNextLevelUnlocked,
  starsForAccuracy,
} from './config'

describe('game tuning config', () => {
  it('defines timing windows for every tier', () => {
    expect(TIMING_WINDOWS_MS).toEqual({
      beginner: { perfectMs: 80, goodMs: 160 },
      intermediate: { perfectMs: 60, goodMs: 120 },
      advanced: { perfectMs: 40, goodMs: 90 },
    })
  })

  it('defines star thresholds and per-hit values as percentages', () => {
    expect(STAR_THRESHOLDS_PERCENT).toEqual({ one: 60, two: 75, three: 90 })
    expect(PER_HIT_VALUES_PERCENT).toEqual({
      perfect: 100,
      good: 70,
      miss: 0,
    })
  })

  it('keeps penalties and count-in length configurable', () => {
    expect(EXTRA_HIT_PENALTY_PERCENT).toBe(10)
    expect(COUNT_IN_BARS).toBe(1)
    expect(REQUIRED_STARS_PER_EXERCISE).toBe(2)
  })
})

describe('star thresholds', () => {
  it.each([
    [0, 0],
    [59.99, 0],
    [60, 1],
    [74.99, 1],
    [75, 2],
    [89.99, 2],
    [90, 3],
    [100, 3],
  ] as const)('awards %i stars for %f%%', (accuracy, expected) => {
    expect(starsForAccuracy(accuracy)).toBe(expected)
  })
})

describe('level unlocking', () => {
  it('unlocks only when every exercise is complete and stars average at least two', () => {
    expect(
      isNextLevelUnlocked([
        { completed: true, stars: 3 },
        { completed: true, stars: 2 },
        { completed: true, stars: 1 },
      ]),
    ).toBe(true)
  })

  it('stays locked when the star total is too low', () => {
    expect(
      isNextLevelUnlocked([
        { completed: true, stars: 2 },
        { completed: true, stars: 1 },
      ]),
    ).toBe(false)
  })

  it('stays locked when any exercise is incomplete, even with enough stars', () => {
    expect(
      isNextLevelUnlocked([
        { completed: true, stars: 3 },
        { completed: false, stars: 3 },
      ]),
    ).toBe(false)
  })

  it('does not unlock an empty level', () => {
    expect(isNextLevelUnlocked([])).toBe(false)
  })
})
