import { TIMING_WINDOWS_MS } from '@/config'
import { BUILT_IN_LEVELS } from '@/content'
import { scoreExercise } from '@/scoring'
import { describe, expect, it } from 'vitest'
import {
  calloutRatingForHit,
  resultForHit,
  visibleNoteFeedback,
} from './liveFeedback'

const exercise = BUILT_IN_LEVELS[0].exercises[0]
const timing = TIMING_WINDOWS_MS[exercise.tier]

describe('Play Along live feedback', () => {
  it('uses the complete score record for the label shown for a hit', () => {
    const firstExpectedTime = scoreExercise(exercise, timing, []).noteResults[0]
      .expectedTimeMs
    const record = scoreExercise(exercise, timing, [
      { voice: 'snare', timeMs: firstExpectedTime + 70 },
    ])

    expect(resultForHit(record, 0)?.rating).toBe('perfect')
    expect(
      visibleNoteFeedback(record, firstExpectedTime + 70, timing.goodMs),
    ).toEqual([expect.objectContaining({ rating: 'perfect' })])
  })

  it('waits until the Good window closes before revealing a miss', () => {
    const record = scoreExercise(exercise, timing, [])
    const firstExpectedTime = record.noteResults[0].expectedTimeMs

    expect(
      visibleNoteFeedback(
        record,
        firstExpectedTime + timing.goodMs - 1,
        timing.goodMs,
      ),
    ).toEqual([])
    expect(
      visibleNoteFeedback(
        record,
        firstExpectedTime + timing.goodMs,
        timing.goodMs,
      ),
    ).toEqual([
      expect.objectContaining({ event: exercise.events[0], rating: 'miss' }),
    ])
  })

  it('shows no callout for an unmatched hit inside a same-voice Good window', () => {
    const firstExpectedTime = scoreExercise(exercise, timing, []).noteResults[0]
      .expectedTimeMs
    const record = scoreExercise(exercise, timing, [
      { voice: 'snare', timeMs: firstExpectedTime },
      { voice: 'snare', timeMs: firstExpectedTime + timing.goodMs },
    ])

    expect(resultForHit(record, 1)).toBeUndefined()
    expect(calloutRatingForHit(exercise, timing, record, 1)).toBeNull()
  })

  it('shows an immediate Miss for an unmatched hit outside every same-voice Good window', () => {
    const firstExpectedTime = scoreExercise(exercise, timing, []).noteResults[0]
      .expectedTimeMs
    const record = scoreExercise(exercise, timing, [
      {
        voice: 'snare',
        timeMs: firstExpectedTime + timing.goodMs + 1,
      },
    ])

    expect(resultForHit(record, 0)).toBeUndefined()
    expect(calloutRatingForHit(exercise, timing, record, 0)).toBe('miss')
  })
})
