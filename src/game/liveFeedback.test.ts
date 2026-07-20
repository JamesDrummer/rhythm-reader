import { TIMING_WINDOWS_MS } from '@/config'
import { PLAY_ALONG_EXERCISES } from '@/game/playAlongExercises'
import { scoreExercise } from '@/scoring'
import { describe, expect, it } from 'vitest'
import { resultForHit, visibleNoteFeedback } from './liveFeedback'

const exercise = PLAY_ALONG_EXERCISES[0]
const timing = TIMING_WINDOWS_MS[exercise.tier]

describe('Play Along live feedback', () => {
  it('uses the complete score record for the label shown for a hit', () => {
    const record = scoreExercise(exercise, timing, [
      { voice: 'snare', timeMs: 3_333 + 70 },
    ])

    expect(resultForHit(record, 0)?.rating).toBe('perfect')
    expect(visibleNoteFeedback(record, 3_403, timing.goodMs)).toEqual([
      expect.objectContaining({ rating: 'perfect' }),
    ])
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
})
