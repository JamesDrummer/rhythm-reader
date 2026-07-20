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
  it('keeps perfect windows positive and narrower than good windows', () => {
    Object.values(TIMING_WINDOWS_MS).forEach(({ goodMs, perfectMs }) => {
      expect(perfectMs).toBeGreaterThan(0)
      expect(perfectMs).toBeLessThan(goodMs)
    })
  })

  it('makes timing windows strictly tighter as tiers advance', () => {
    expect(TIMING_WINDOWS_MS.beginner.perfectMs).toBeGreaterThan(
      TIMING_WINDOWS_MS.intermediate.perfectMs,
    )
    expect(TIMING_WINDOWS_MS.intermediate.perfectMs).toBeGreaterThan(
      TIMING_WINDOWS_MS.advanced.perfectMs,
    )
    expect(TIMING_WINDOWS_MS.beginner.goodMs).toBeGreaterThan(
      TIMING_WINDOWS_MS.intermediate.goodMs,
    )
    expect(TIMING_WINDOWS_MS.intermediate.goodMs).toBeGreaterThan(
      TIMING_WINDOWS_MS.advanced.goodMs,
    )
  })

  it('keeps star thresholds ascending and within 0 to 100 percent', () => {
    const { one, three, two } = STAR_THRESHOLDS_PERCENT

    expect(one).toBeGreaterThanOrEqual(0)
    expect(one).toBeLessThan(two)
    expect(two).toBeLessThan(three)
    expect(three).toBeLessThanOrEqual(100)
  })

  it('keeps hit values ordered from perfect to miss', () => {
    const { good, miss, perfect } = PER_HIT_VALUES_PERCENT

    expect(perfect).toBeGreaterThanOrEqual(good)
    expect(good).toBeGreaterThanOrEqual(miss)
  })

  it('keeps penalties and count-in length configurable', () => {
    expect(EXTRA_HIT_PENALTY_PERCENT).toBeGreaterThanOrEqual(0)
    expect(COUNT_IN_BARS).toBeGreaterThanOrEqual(1)
    expect(REQUIRED_STARS_PER_EXERCISE).toBe(2)
  })
})

describe('star thresholds', () => {
  const { one, three, two } = STAR_THRESHOLDS_PERCENT
  const thresholdCases: [number, 0 | 1 | 2 | 3][] = [
    [one - 1, 0],
    [one, 1],
    [(one + two) / 2, 1],
    [two, 2],
    [(two + three) / 2, 2],
    [three, 3],
    [100, 3],
  ]

  it.each(thresholdCases)('awards %i stars for %f%%', (accuracy, expected) => {
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
