import { TIMING_WINDOWS_MS } from '@/config'
import { PPQ, type Exercise, type Tier } from '@/model'
import { describe, expect, it } from 'vitest'
import {
  classifyLiveHit,
  deriveExpectedNotes,
  scoreExercise,
  type CalibratedHit,
} from './index'

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'scoring-test',
    title: 'Scoring test',
    tempo: 120,
    timeSignature: { beats: 4, beatValue: 4 },
    bars: 1,
    events: [{ voice: 'snare', tick: 0, duration: PPQ }],
    tier: 'beginner',
    listenFirstAllowed: true,
    modes: ['playAlong'],
    ...overrides,
  }
}

const beginner = TIMING_WINDOWS_MS.beginner

describe('expected note timing', () => {
  it('derives note times from ticks, tempo, and a full metric count-in bar', () => {
    const expected = deriveExpectedNotes(
      exercise({
        tempo: 60,
        timeSignature: { beats: 6, beatValue: 8, grouping: [3, 3] },
        events: [
          { voice: 'kick', tick: 0, duration: 240 },
          { voice: 'snare', tick: 720, duration: 240 },
        ],
      }),
    )

    expect(expected.map(({ expectedTimeMs }) => expectedTimeMs)).toEqual([
      3_000, 4_500,
    ])
  })
})

describe('timing-window boundaries', () => {
  it.each([
    [-80, 'perfect'],
    [80, 'perfect'],
    [-81, 'good'],
    [81, 'good'],
    [-160, 'good'],
    [160, 'good'],
  ] as const)(
    'classifies a hit at signed offset %i ms as %s',
    (offsetMs, rating) => {
      const record = scoreExercise(exercise(), beginner, [
        { voice: 'snare', timeMs: 2_000 + offsetMs },
      ])

      expect(record.noteResults[0]).toMatchObject({ rating, errorMs: offsetMs })
      expect(record.extraHits).toEqual([])
    },
  )

  it.each([-161, 161])(
    'treats a hit outside the Good edge (%i ms) as an extra and the note as missed',
    (offsetMs) => {
      const record = scoreExercise(exercise(), beginner, [
        { voice: 'snare', timeMs: 2_000 + offsetMs },
      ])

      expect(record.noteResults[0]).toMatchObject({
        rating: 'miss',
        hitIndex: null,
        errorMs: null,
      })
      expect(record.extraHits).toHaveLength(1)
    },
  )
})

describe('matching and penalties', () => {
  it('matches the nearest same-voice hit and consumes each hit only once', () => {
    const record = scoreExercise(
      exercise({
        events: [
          { voice: 'kick', tick: 0, duration: 120 },
          { voice: 'kick', tick: 120, duration: 120 },
        ],
      }),
      beginner,
      [
        { voice: 'kick', timeMs: 2_050 },
        { voice: 'kick', timeMs: 2_125 },
      ],
    )

    expect(record.noteResults).toEqual([
      expect.objectContaining({ hitIndex: 0, errorMs: 50 }),
      expect.objectContaining({ hitIndex: 1, errorMs: 0 }),
    ])
    expect(record.extraHits).toEqual([])
  })

  it('counts a wrong-voice hit as a missed note plus an extra hit', () => {
    const record = scoreExercise(exercise(), beginner, [
      { voice: 'kick', timeMs: 2_000 },
    ])

    expect(record.noteResults[0].rating).toBe('miss')
    expect(record.extraHits).toEqual([
      {
        hitIndex: 0,
        hit: { voice: 'kick', timeMs: 2_000 },
      },
    ])
    expect(record.perVoice.snare).toMatchObject({
      missCount: 1,
      accuracyPercent: 0,
    })
    expect(record.perVoice.kick).toMatchObject({
      expectedCount: 0,
      extraHitCount: 1,
      accuracyPercent: 0,
    })
  })

  it('deducts the configured extra-hit penalty from overall and voice accuracy', () => {
    const record = scoreExercise(exercise(), beginner, [
      { voice: 'snare', timeMs: 2_000 },
      { voice: 'snare', timeMs: 3_000 },
    ])

    expect(record.overallAccuracyPercent).toBe(90)
    expect(record.perVoice.snare.accuracyPercent).toBe(90)
    expect(record.perVoice.snare.extraHitCount).toBe(1)
    expect(record.stars).toBe(3)
  })

  it('reports per-voice accuracy and mean signed matched-note error', () => {
    const record = scoreExercise(
      exercise({
        events: [
          { voice: 'kick', tick: 0, duration: PPQ },
          { voice: 'kick', tick: PPQ, duration: PPQ },
          { voice: 'snare', tick: PPQ * 2, duration: PPQ },
        ],
      }),
      beginner,
      [
        { voice: 'kick', timeMs: 2_010 },
        { voice: 'kick', timeMs: 2_600 },
      ],
    )

    expect(record.perVoice.kick).toMatchObject({
      expectedCount: 2,
      perfectCount: 1,
      goodCount: 1,
      missCount: 0,
      accuracyPercent: 85,
      meanSignedErrorMs: 55,
    })
    expect(record.perVoice.snare).toMatchObject({
      expectedCount: 1,
      missCount: 1,
      accuracyPercent: 0,
      meanSignedErrorMs: null,
    })
    expect(record.overallAccuracyPercent).toBeCloseTo(170 / 3)
    expect(record.stars).toBe(0)
  })

  it('does not mutate the hit list and stores a raw-hit snapshot', () => {
    const hit = Object.freeze({ voice: 'snare' as const, timeMs: 2_000 })
    const hits: readonly CalibratedHit[] = Object.freeze([hit])

    const record = scoreExercise(exercise(), beginner, hits)

    expect(record.rawHits).toEqual(hits)
    expect(record.rawHits).not.toBe(hits)
    expect(record.rawHits[0]).not.toBe(hit)
  })
})

describe('tier windows', () => {
  it.each([
    ['beginner', 80, 160],
    ['intermediate', 60, 120],
    ['advanced', 40, 90],
  ] as const)(
    'scores the %s tier at its exact Perfect and Good edges',
    (tier, perfectMs, goodMs) => {
      const tierExercise = exercise({ tier })
      const config = TIMING_WINDOWS_MS[tier]

      expect(
        scoreExercise(tierExercise, config, [
          { voice: 'snare', timeMs: 2_000 + perfectMs },
        ]).noteResults[0].rating,
      ).toBe('perfect')
      expect(
        scoreExercise(tierExercise, config, [
          { voice: 'snare', timeMs: 2_000 + goodMs },
        ]).noteResults[0].rating,
      ).toBe('good')
    },
  )

  it('keeps the exercise tier in the score record', () => {
    const tiers: Tier[] = ['beginner', 'intermediate', 'advanced']

    for (const tier of tiers) {
      expect(
        scoreExercise(exercise({ tier }), TIMING_WINDOWS_MS[tier], []).tier,
      ).toBe(tier)
    }
  })
})

describe('live Play Along feedback', () => {
  it('classifies against the nearest expected note on the same voice', () => {
    const liveExercise = exercise({
      events: [
        { voice: 'snare', tick: 0, duration: PPQ },
        { voice: 'snare', tick: PPQ, duration: PPQ },
        { voice: 'kick', tick: PPQ, duration: PPQ },
      ],
    })

    expect(
      classifyLiveHit(liveExercise, beginner, {
        voice: 'snare',
        timeMs: 2_590,
      }),
    ).toEqual({
      rating: 'good',
      noteIndex: 1,
      expectedTimeMs: 2_500,
      errorMs: 90,
    })
    expect(
      classifyLiveHit(liveExercise, beginner, {
        voice: 'hihat',
        timeMs: 2_500,
      }),
    ).toEqual({
      rating: 'miss',
      noteIndex: null,
      expectedTimeMs: null,
      errorMs: null,
    })
  })
})

describe('5/4 scoring proof', () => {
  it('scores expected times after a complete five-beat count-in', () => {
    const fiveFour = exercise({
      id: 'five-four-proof',
      title: 'Five-four proof',
      timeSignature: { beats: 5, beatValue: 4, grouping: [3, 2] },
      events: [
        { voice: 'kick', tick: 0, duration: PPQ },
        { voice: 'snare', tick: 1_440, duration: PPQ },
        { voice: 'hihat', tick: 1_920, duration: PPQ },
      ],
      tier: 'advanced',
    })
    const hits: CalibratedHit[] = [
      { voice: 'kick', timeMs: 2_500 },
      { voice: 'snare', timeMs: 4_000 },
      { voice: 'hihat', timeMs: 4_500 },
    ]

    const record = scoreExercise(fiveFour, TIMING_WINDOWS_MS.advanced, hits)

    expect(
      record.noteResults.map(({ expectedTimeMs }) => expectedTimeMs),
    ).toEqual([2_500, 4_000, 4_500])
    expect(record.noteResults.map(({ rating }) => rating)).toEqual([
      'perfect',
      'perfect',
      'perfect',
    ])
    expect(record.overallAccuracyPercent).toBe(100)
    expect(record.stars).toBe(3)
  })
})
