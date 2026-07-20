import { assertValidExercise, type Level } from '@/model'

export function assertValidLevels(levels: readonly Level[]): void {
  const levelIds = new Set<string>()
  const exerciseIds = new Set<string>()

  for (const level of levels) {
    if (!level.id || !level.title || !level.description) {
      throw new Error('Every level needs an id, title and description.')
    }
    if (!Number.isInteger(level.order) || level.order < 1) {
      throw new Error(`Level ${level.id} needs a positive integer order.`)
    }
    if (levelIds.has(level.id)) {
      throw new Error(`Duplicate level id: ${level.id}`)
    }
    if (level.exercises.length === 0) {
      throw new Error(`Level ${level.id} must contain exercises.`)
    }
    levelIds.add(level.id)

    for (const exercise of level.exercises) {
      if (exerciseIds.has(exercise.id)) {
        throw new Error(`Duplicate exercise id: ${exercise.id}`)
      }
      exerciseIds.add(exercise.id)
      assertValidExercise(exercise)
    }
  }
}
