import { describe, expect, it } from 'vitest'
import { renderExerciseNotation } from '@/notation'
import {
  deriveRestPositions,
  generateBinaryGrid,
  PPQ,
  type Exercise,
  validateExercise,
} from '@/model'
import { BUILT_IN_LEVELS } from './BuiltInSource'

const PRESERVED_EXERCISE_IDS = [
  'quarter-notes',
  'quarter-note-space',
  'quarter-note-two-gaps',
  'quarter-note-answer',
  'quarter-note-phrases',
  'quarter-kick-pulse',
  'quarter-hihat-pulse',
  'quarter-kick-snare-turns',
  'quarter-three-voices',
  'quarter-kit-phrase',
  'eighth-note-pairs',
  'eighth-note-first-halves',
  'eighth-note-offbeats',
  'eighth-note-short-groups',
  'eighth-note-phrase',
  'quarter-eighth-notes-at-the-end',
  'quarter-eighth-pairs-two-and-four',
  'quarter-eighth-pairs-one-and-three',
  'quarter-eighth-more-pairs',
  'quarter-eighth-two-bar-phrase',
  'eighth-note-hihat-layer',
  'eighth-note-kick-layer',
  'eighth-note-backbeat',
  'eighth-note-kick-variation',
  'layered-eighth-note-phrase',
  'eighth-rests-after-two-and-four',
  'eighth-rests-after-one-and-three',
  'eighth-rests-mixed-spaces',
  'eighth-rests-offbeat-answers',
  'eighth-rests-two-bar-phrase',
  'kit-rests-together',
  'kit-rests-shared-gaps',
  'kit-rests-kick-fills-gaps',
  'kit-rests-hands-feet-trade',
  'kit-rests-two-bar-phrase',
  'sixteenth-note-groups',
  'sixteenth-note-bursts',
  'sixteenth-eighth-combinations',
  'syncopated-sixteenths',
  'syncopated-kit-phrase',
  'triplet-eighth-introduction',
  'triplet-eighth-spaces',
  'triplet-kit-turns',
  'binary-triplet-switches',
  'final-mixed-subdivision-phrase',
] as const

function restRunLengthsByBeat(exercise: Exercise): number[] {
  const rests = new Set(
    deriveRestPositions(
      exercise.events,
      generateBinaryGrid(exercise.timeSignature, 'sixteenth', exercise.bars),
    ),
  )
  const runLengths: number[] = []

  for (
    let beatStart = 0;
    beatStart < exercise.bars * 4 * PPQ;
    beatStart += PPQ
  ) {
    let runLength = 0
    for (let offset = 0; offset < PPQ; offset += PPQ / 4) {
      if (rests.has(beatStart + offset)) {
        runLength += 1
      } else if (runLength > 0) {
        runLengths.push(runLength)
        runLength = 0
      }
    }
    if (runLength > 0) runLengths.push(runLength)
  }

  return runLengths
}

describe('built-in exercise library', () => {
  it('contains 17 sequenced levels and 85 valid exercises', () => {
    expect(BUILT_IN_LEVELS).toHaveLength(17)
    expect(BUILT_IN_LEVELS.map(({ order }) => order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
    ])
    expect(BUILT_IN_LEVELS.flatMap((level) => level.exercises)).toHaveLength(85)

    for (const level of BUILT_IN_LEVELS) {
      expect(level.exercises).toHaveLength(5)
      for (const exercise of level.exercises) {
        expect(validateExercise(exercise)).toEqual([])
      }
    }
  })

  it('enables Memorise from level two and flags subdivision introductions', () => {
    expect(
      BUILT_IN_LEVELS[0].exercises.every(
        (exercise) => !exercise.modes.includes('memorise'),
      ),
    ).toBe(true)
    expect(
      BUILT_IN_LEVELS.slice(1).every((level) =>
        level.exercises.every((exercise) =>
          exercise.modes.includes('memorise'),
        ),
      ),
    ).toBe(true)

    for (const id of [
      'eighth-note-pairs',
      'sixteenth-note-groups',
      'triplet-eighth-introduction',
    ]) {
      const exercise = BUILT_IN_LEVELS.flatMap((level) => level.exercises).find(
        (candidate) => candidate.id === id,
      )
      expect(exercise).toMatchObject({
        listenFirstAllowed: true,
        tier: 'beginner',
      })
    }
  })

  it('separates mixed note values, single-voice rests and kit rests', () => {
    const combinations = BUILT_IN_LEVELS[3]
    expect(combinations.id).toBe('level-4-quarter-eighth-combinations')
    expect(
      combinations.exercises.map(
        ({ listenFirstAllowed }) => listenFirstAllowed,
      ),
    ).toEqual([true, true, false, false, false])

    for (const exercise of combinations.exercises) {
      expect(new Set(exercise.events.map(({ voice }) => voice))).toEqual(
        new Set(['snare']),
      )
      expect(new Set(exercise.events.map(({ duration }) => duration))).toEqual(
        new Set([240, 480]),
      )
      expect(
        deriveRestPositions(
          exercise.events,
          generateBinaryGrid(exercise.timeSignature, 'eighth', exercise.bars),
        ),
      ).toEqual([])
    }

    const singleVoiceRests = BUILT_IN_LEVELS[5]
    expect(singleVoiceRests.id).toBe('level-6-eighth-note-rests')
    expect(
      singleVoiceRests.exercises.map(
        ({ listenFirstAllowed }) => listenFirstAllowed,
      ),
    ).toEqual([true, true, false, false, false])

    for (const exercise of singleVoiceRests.exercises) {
      expect(new Set(exercise.events.map(({ voice }) => voice))).toEqual(
        new Set(['snare']),
      )
      expect(new Set(exercise.events.map(({ duration }) => duration))).toEqual(
        new Set([240]),
      )
      expect(
        deriveRestPositions(
          exercise.events,
          generateBinaryGrid(exercise.timeSignature, 'eighth', exercise.bars),
        ).length,
      ).toBeGreaterThan(0)
    }

    const kitRests = BUILT_IN_LEVELS[7]
    expect(kitRests.id).toBe('level-8-kit-eighth-note-rests')
    expect(
      kitRests.exercises.map(({ listenFirstAllowed }) => listenFirstAllowed),
    ).toEqual([true, true, false, false, false])

    for (const exercise of kitRests.exercises) {
      expect(new Set(exercise.events.map(({ voice }) => voice))).toEqual(
        new Set(['hihat', 'snare', 'kick']),
      )
      expect(new Set(exercise.events.map(({ duration }) => duration))).toEqual(
        new Set([240]),
      )
      expect(exercise.notationSystems).toBe(2)
    }

    for (const exercise of kitRests.exercises.slice(0, 2)) {
      const grid = generateBinaryGrid(
        exercise.timeSignature,
        'eighth',
        exercise.bars,
      )
      expect(deriveRestPositions(exercise.events, grid).length).toBeGreaterThan(
        0,
      )
    }

    for (const exercise of kitRests.exercises.slice(2)) {
      const grid = generateBinaryGrid(
        exercise.timeSignature,
        'eighth',
        exercise.bars,
      )
      expect(deriveRestPositions(exercise.events, grid)).toEqual([])
      expect(
        deriveRestPositions(exercise.events, grid, 'hihat').length,
      ).toBeGreaterThan(0)
      expect(
        deriveRestPositions(exercise.events, grid, 'kick').length,
      ).toBeGreaterThan(0)
    }
  })

  it('builds the sixteenth-note arc one rhythmic idea at a time', () => {
    const foundations = BUILT_IN_LEVELS[9]
    const eighthsAndSixteenths = BUILT_IN_LEVELS[10]
    const threeValues = BUILT_IN_LEVELS[11]
    const quarterRests = BUILT_IN_LEVELS[12]
    const eighthRests = BUILT_IN_LEVELS[13]
    const sixteenthRests = BUILT_IN_LEVELS[14]
    const kitApplication = BUILT_IN_LEVELS[15]

    for (const level of BUILT_IN_LEVELS.slice(9, 15)) {
      expect(level.exercises.map(({ tier }) => tier)).toEqual([
        'beginner',
        'beginner',
        'intermediate',
        'intermediate',
        'intermediate',
      ])
      for (const exercise of level.exercises) {
        expect(new Set(exercise.events.map(({ voice }) => voice))).toEqual(
          new Set(['snare']),
        )
        expect(exercise.notationSystems).toBe(2)
      }
    }

    expect(foundations.id).toBe('level-10-sixteenth-note-foundations')
    expect(eighthsAndSixteenths.id).toBe(
      'level-11-eighth-sixteenth-combinations',
    )
    for (const exercise of eighthsAndSixteenths.exercises) {
      expect(new Set(exercise.events.map(({ duration }) => duration))).toEqual(
        new Set([120, 240]),
      )
      expect(restRunLengthsByBeat(exercise)).toEqual([])
    }

    expect(threeValues.id).toBe(
      'level-12-quarter-eighth-sixteenth-combinations',
    )
    expect(
      new Set(
        threeValues.exercises.flatMap((exercise) =>
          exercise.events.map(({ duration }) => duration),
        ),
      ),
    ).toEqual(new Set([120, 240, 480]))
    for (const exercise of threeValues.exercises) {
      expect(restRunLengthsByBeat(exercise)).toEqual([])
    }

    expect(quarterRests.id).toBe('level-13-mixed-quarter-rests')
    expect(
      quarterRests.exercises
        .flatMap(restRunLengthsByBeat)
        .every((length) => length === 4),
    ).toBe(true)

    expect(eighthRests.id).toBe('level-14-mixed-eighth-rests')
    expect(eighthRests.exercises.flatMap(restRunLengthsByBeat)).toContain(2)
    expect(
      eighthRests.exercises
        .flatMap(restRunLengthsByBeat)
        .every((length) => length === 2 || length === 4),
    ).toBe(true)

    expect(sixteenthRests.id).toBe('level-15-mixed-sixteenth-rests')
    expect(sixteenthRests.exercises.flatMap(restRunLengthsByBeat)).toContain(1)

    expect(kitApplication.id).toBe('level-16-mixed-binary-rhythms-around-kit')
    expect(
      new Set(
        kitApplication.exercises.flatMap((exercise) =>
          exercise.events.map(({ voice }) => voice),
        ),
      ),
    ).toEqual(new Set(['hihat', 'snare', 'kick']))
    expect(
      kitApplication.exercises.every(
        (exercise) => exercise.notationSystems === 2,
      ),
    ).toBe(true)
  })

  it('keeps new rests inside beats and enables Listen First at each stage opening', () => {
    for (const levelIndex of [6, 8, 9, 10, 11, 12, 13, 14, 15]) {
      expect(
        BUILT_IN_LEVELS[levelIndex].exercises.map(
          ({ listenFirstAllowed }) => listenFirstAllowed,
        ),
      ).toEqual([true, true, false, false, false])
    }

    for (const exercise of BUILT_IN_LEVELS.slice(9, 16).flatMap(
      (level) => level.exercises,
    )) {
      expect(exercise.timeSignature).toEqual({ beats: 4, beatValue: 4 })
      for (const event of exercise.events) {
        expect(
          (event.tick % PPQ) + event.duration,
          exercise.id,
        ).toBeLessThanOrEqual(PPQ)
      }

      for (let bar = 0; bar < exercise.bars; bar += 1) {
        expect(
          generateBinaryGrid(
            exercise.timeSignature,
            'sixteenth',
            exercise.bars,
          ),
        ).toContain(bar * 4 * PPQ + 2 * PPQ)
      }
    }
  })

  it('preserves every existing exercise identity after redistribution', () => {
    const allExercises = BUILT_IN_LEVELS.flatMap((level) => level.exercises)
    const allIds = allExercises.map(({ id }) => id)
    const locations = new Map(
      BUILT_IN_LEVELS.flatMap((level) =>
        level.exercises.map((exercise) => [exercise.id, level.order] as const),
      ),
    )

    expect(new Set(allIds).size).toBe(85)
    expect(allIds).toEqual(expect.arrayContaining([...PRESERVED_EXERCISE_IDS]))

    expect(locations.get('sixteenth-note-groups')).toBe(10)
    expect(locations.get('sixteenth-note-bursts')).toBe(10)
    expect(locations.get('sixteenth-eighth-combinations')).toBe(11)
    expect(locations.get('syncopated-sixteenths')).toBe(15)
    expect(locations.get('syncopated-kit-phrase')).toBe(16)
    expect(locations.get('triplet-eighth-introduction')).toBe(17)
  })

  it('renders every exercise through the production notation mapper', () => {
    for (const exercise of BUILT_IN_LEVELS.flatMap(
      (level) => level.exercises,
    )) {
      const output = document.createElement('div')
      const layout = renderExerciseNotation(output, exercise)

      expect(output.querySelector('svg'), exercise.id).not.toBeNull()
      expect(layout.noteLayouts, exercise.id).toHaveLength(
        exercise.events.length,
      )
      expect(layout.barBoundaries, exercise.id).toHaveLength(exercise.bars + 1)
    }
  })

  it('breaks sixteenth-note beams at rests', () => {
    const exercise = BUILT_IN_LEVELS.flatMap((level) => level.exercises).find(
      ({ id }) => id === 'syncopated-sixteenths',
    )
    if (!exercise) throw new Error('Expected the syncopated sixteenth exercise')

    const output = document.createElement('div')
    renderExerciseNotation(output, exercise)

    expect(output.querySelectorAll('.vf-beam')).toHaveLength(0)
  })

  it('engraves a visible rest when beat three is silent', () => {
    const exercise = BUILT_IN_LEVELS.flatMap((level) => level.exercises).find(
      ({ id }) => id === 'sixteenth-foundations-three-beat-sixteenth-phrase',
    )
    if (!exercise) throw new Error('Expected the three-beat sixteenth phrase')

    const output = document.createElement('div')
    renderExerciseNotation(output, exercise)

    expect(output.querySelectorAll('.vf-stavenote')).toHaveLength(13)
  })
})
