import { describe, expect, it } from 'vitest'
import {
  PPQ,
  assertValidExercise,
  validateExercise,
  type Exercise,
} from './index'

function exercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'four-four-basics',
    title: 'Four-four basics',
    tempo: 80,
    timeSignature: { beats: 4, beatValue: 4 },
    bars: 1,
    events: [
      { voice: 'kick', tick: 0, duration: PPQ },
      { voice: 'snare', tick: PPQ, duration: PPQ },
    ],
    tier: 'beginner',
    listenFirstAllowed: true,
    modes: ['playAlong'],
    ...overrides,
  }
}

describe('exercise validation', () => {
  it('validates a 6/8 exercise with [3,3] grouping', () => {
    const sixEight = exercise({
      id: 'six-eight-proof',
      title: 'Six-eight proof',
      timeSignature: { beats: 6, beatValue: 8, grouping: [3, 3] },
      events: [
        { voice: 'kick', tick: 0, duration: 240 },
        { voice: 'snare', tick: 720, duration: 240 },
        { voice: 'hihat', tick: 1_200, duration: 240 },
      ],
    })

    expect(validateExercise(sixEight)).toEqual([])
    expect(() => assertValidExercise(sixEight)).not.toThrow()
  })

  it('validates a 5/4 exercise with [3,2] grouping', () => {
    const fiveFour = exercise({
      id: 'five-four-proof',
      title: 'Five-four proof',
      timeSignature: { beats: 5, beatValue: 4, grouping: [3, 2] },
      events: [
        { voice: 'kick', tick: 0, duration: PPQ },
        { voice: 'snare', tick: 1_440, duration: PPQ },
        { voice: 'hihat', tick: 1_920, duration: PPQ },
      ],
    })

    expect(validateExercise(fiveFour)).toEqual([])
    expect(() => assertValidExercise(fiveFour)).not.toThrow()
  })

  it('allows simultaneous events on different voices', () => {
    expect(
      validateExercise(
        exercise({
          events: [
            { voice: 'kick', tick: 0, duration: PPQ },
            { voice: 'snare', tick: 0, duration: PPQ },
            { voice: 'hihat', tick: 0, duration: PPQ },
          ],
        }),
      ),
    ).toEqual([])
  })

  it('rejects two events on the same voice at the same tick', () => {
    const issues = validateExercise(
      exercise({
        events: [
          { voice: 'snare', tick: 480, duration: 240 },
          { voice: 'snare', tick: 480, duration: 120 },
        ],
      }),
    )

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-event', path: 'events[1]' }),
    )
  })

  it.each([
    [{ voice: 'kick', tick: -1, duration: 120 }, 'invalid-tick'],
    [{ voice: 'kick', tick: 0, duration: 0 }, 'invalid-duration'],
    [{ voice: 'kick', tick: 1_920, duration: 120 }, 'event-out-of-bounds'],
    [{ voice: 'kick', tick: 1_800, duration: 240 }, 'event-out-of-bounds'],
  ] as const)('rejects an invalid or out-of-bounds event', (event, code) => {
    expect(validateExercise(exercise({ events: [event] }))).toEqual(
      expect.arrayContaining([expect.objectContaining({ code })]),
    )
  })

  it('accepts consistent triplet fields', () => {
    const triplets = exercise({
      events: [
        {
          voice: 'hihat',
          tick: 0,
          duration: 160,
          tuplet: { num: 3, den: 2 },
        },
        {
          voice: 'hihat',
          tick: 160,
          duration: 160,
          tuplet: { num: 3, den: 2 },
        },
        {
          voice: 'hihat',
          tick: 320,
          duration: 160,
          tuplet: { num: 3, den: 2 },
        },
      ],
    })

    expect(validateExercise(triplets)).toEqual([])
  })

  it.each([
    [{ num: 0, den: 2 }, 160],
    [{ num: 3, den: 0 }, 160],
    [{ num: 3.5, den: 2 }, 160],
    [{ num: 3, den: 2 }, 161],
  ])('rejects inconsistent tuplet fields', (tuplet, duration) => {
    const issues = validateExercise(
      exercise({
        events: [{ voice: 'hihat', tick: 0, duration, tuplet }],
      }),
    )

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid-tuplet' }),
      ]),
    )
  })

  it('rejects grouping that does not cover the bar', () => {
    const issues = validateExercise(
      exercise({
        timeSignature: { beats: 6, beatValue: 8, grouping: [2, 3] },
      }),
    )

    expect(issues).toContainEqual(
      expect.objectContaining({ code: 'invalid-grouping' }),
    )
  })

  it('throws a useful combined error when assertion validation fails', () => {
    expect(() => assertValidExercise(exercise({ bars: 0, tempo: 0 }))).toThrow(
      /bars: Bars must be a positive integer/,
    )
  })
})
