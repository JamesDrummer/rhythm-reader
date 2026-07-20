import { beforeEach, describe, expect, it } from 'vitest'
import type { Level } from '@/model'
import { BuiltInSource } from './BuiltInSource'
import { CustomSource } from './CustomSource'
import { MergedExerciseSource } from './MergedExerciseSource'

const scope = { learnerId: 'content-test' }

const customLevel: Level = {
  id: 'custom-level',
  title: 'My practice level',
  description: 'A saved level for this learner.',
  order: 20,
  exercises: [
    {
      id: 'custom-quarter-note',
      title: 'My quarter notes',
      tempo: 70,
      timeSignature: { beats: 4, beatValue: 4 },
      bars: 1,
      events: [{ voice: 'snare', tick: 0, duration: 480 }],
      tier: 'beginner',
      listenFirstAllowed: true,
      modes: ['playAlong'],
    },
  ],
}

beforeEach(() => localStorage.clear())

describe('exercise sources', () => {
  it('persists custom levels within the supplied learner scope', async () => {
    const source = new CustomSource(localStorage)
    await source.saveLevels(scope, [customLevel])

    expect(await new CustomSource(localStorage).loadLevels(scope)).toEqual([
      customLevel,
    ])
    expect(await source.loadLevels({ learnerId: 'another-learner' })).toEqual(
      [],
    )
  })

  it('merges built-in and custom levels into one ordered catalogue', async () => {
    const custom = new CustomSource(localStorage)
    await custom.saveLevels(scope, [customLevel])

    const catalogue = await new MergedExerciseSource([
      new BuiltInSource(),
      custom,
    ]).loadLevels(scope)

    expect(catalogue).toHaveLength(7)
    expect(catalogue.at(-1)?.id).toBe(customLevel.id)
    expect(
      catalogue
        .flatMap((level) => level.exercises)
        .some((exercise) => exercise.id === 'custom-quarter-note'),
    ).toBe(true)
  })
})
