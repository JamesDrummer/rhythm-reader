import { describe, expect, it } from 'vitest'
import { renderExerciseNotation } from '@/notation'
import { validateExercise } from '@/model'
import { BUILT_IN_LEVELS } from './BuiltInSource'

describe('built-in exercise library', () => {
  it('contains six sequenced levels with five to eight valid exercises each', () => {
    expect(BUILT_IN_LEVELS).toHaveLength(6)
    expect(BUILT_IN_LEVELS.map(({ order }) => order)).toEqual([
      1, 2, 3, 4, 5, 6,
    ])

    for (const level of BUILT_IN_LEVELS) {
      expect(level.exercises.length).toBeGreaterThanOrEqual(5)
      expect(level.exercises.length).toBeLessThanOrEqual(8)
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
})
