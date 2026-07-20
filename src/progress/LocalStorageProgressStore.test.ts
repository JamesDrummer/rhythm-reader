import { beforeEach, describe, expect, it } from 'vitest'
import { BUILT_IN_LEVELS } from '@/content'
import { LocalStorageProgressStore } from './LocalStorageProgressStore'

const learner = { learnerId: 'test-learner' }

beforeEach(() => localStorage.clear())

describe('LocalStorageProgressStore', () => {
  it('starts with level one unlocked and every later level locked', async () => {
    const progress = await new LocalStorageProgressStore(localStorage).load(
      learner,
      BUILT_IN_LEVELS,
    )

    expect(progress.levels[BUILT_IN_LEVELS[0].id].unlocked).toBe(true)
    expect(
      BUILT_IN_LEVELS.slice(1).every(
        (level) => progress.levels[level.id].unlocked === false,
      ),
    ).toBe(true)
  })

  it('keeps custom levels playable without changing built-in progression', async () => {
    const customLevel = {
      ...BUILT_IN_LEVELS[0],
      id: 'custom-level',
      order: 100,
      custom: true,
      exercises: [
        { ...BUILT_IN_LEVELS[0].exercises[0], id: 'custom-exercise' },
      ],
    }
    const catalogue = [...BUILT_IN_LEVELS, customLevel]
    const progress = await new LocalStorageProgressStore(localStorage).load(
      learner,
      catalogue,
    )

    expect(progress.levels[customLevel.id].unlocked).toBe(true)
    expect(progress.levels[BUILT_IN_LEVELS[1].id].unlocked).toBe(false)
  })

  it('unlocks level two only after every level-one exercise is complete with enough stars', async () => {
    const store = new LocalStorageProgressStore(localStorage)
    const firstLevel = BUILT_IN_LEVELS[0]

    for (const exercise of firstLevel.exercises.slice(0, -1)) {
      await store.recordAttempt(
        learner,
        { exerciseId: exercise.id, accuracyPercent: 76, stars: 2 },
        BUILT_IN_LEVELS,
      )
    }
    expect(
      (await store.load(learner, BUILT_IN_LEVELS)).levels[BUILT_IN_LEVELS[1].id]
        .unlocked,
    ).toBe(false)

    await store.recordAttempt(
      learner,
      {
        exerciseId: firstLevel.exercises.at(-1)!.id,
        accuracyPercent: 76,
        stars: 2,
      },
      BUILT_IN_LEVELS,
    )

    const reloadedStore = new LocalStorageProgressStore(localStorage)
    const reloaded = await reloadedStore.load(learner, BUILT_IN_LEVELS)
    expect(reloaded.levels[BUILT_IN_LEVELS[1].id].unlocked).toBe(true)
  })

  it('keeps the best result while counting every completed attempt', async () => {
    const store = new LocalStorageProgressStore(localStorage)
    const exerciseId = BUILT_IN_LEVELS[0].exercises[0].id

    await store.recordAttempt(
      learner,
      { exerciseId, accuracyPercent: 92, stars: 3 },
      BUILT_IN_LEVELS,
    )
    const result = await store.recordAttempt(
      learner,
      { exerciseId, accuracyPercent: 61, stars: 1 },
      BUILT_IN_LEVELS,
    )

    expect(result.exercises[exerciseId]).toMatchObject({
      completed: true,
      attempts: 2,
      bestAccuracyPercent: 92,
      bestStars: 3,
    })
  })
})
