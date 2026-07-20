import type { Exercise, Level } from '@/model'

export interface CatalogueExercise {
  exercise: Exercise
  exerciseIndex: number
  level: Level
  levelIndex: number
}

export function findCatalogueExercise(
  levels: readonly Level[],
  exerciseId: string,
): CatalogueExercise | undefined {
  for (const [levelIndex, level] of levels.entries()) {
    const exerciseIndex = level.exercises.findIndex(
      ({ id }) => id === exerciseId,
    )
    if (exerciseIndex >= 0) {
      return {
        exercise: level.exercises[exerciseIndex],
        exerciseIndex,
        level,
        levelIndex,
      }
    }
  }
}

export function nextCatalogueExercise(
  levels: readonly Level[],
  current: CatalogueExercise,
): Exercise | undefined {
  return (
    current.level.exercises[current.exerciseIndex + 1] ??
    levels[current.levelIndex + 1]?.exercises[0]
  )
}
