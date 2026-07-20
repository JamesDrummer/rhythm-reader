import { isNextLevelUnlocked, requiredStarsForLevel } from '@/config'
import type { Level } from '@/model'
import type { ExerciseProgressRecord, LevelProgressState } from './types'

export function deriveLevelProgress(
  levels: readonly Level[],
  exerciseProgress: Readonly<Record<string, ExerciseProgressRecord>>,
): Record<string, LevelProgressState> {
  const states: Record<string, LevelProgressState> = {}
  let builtInUnlocked = true

  for (const level of levels) {
    const records = level.exercises.map(({ id }) => exerciseProgress[id])
    const completedExercises = records.filter(
      (record) => record?.completed,
    ).length
    const totalStars = records.reduce(
      (sum, record) => sum + (record?.bestStars ?? 0),
      0,
    )

    states[level.id] = {
      levelId: level.id,
      unlocked: level.custom ? true : builtInUnlocked,
      completedExercises,
      exerciseCount: level.exercises.length,
      totalStars,
      requiredStars: requiredStarsForLevel(level.exercises.length),
    }

    if (!level.custom) {
      builtInUnlocked =
        builtInUnlocked &&
        isNextLevelUnlocked(
          records.map((record) => ({
            completed: record?.completed ?? false,
            stars: record?.bestStars ?? 0,
          })),
        )
    }
  }

  return states
}
