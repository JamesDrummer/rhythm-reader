import library from './library/levels.json'
import { assertValidLevels } from './validation'
import type { ExerciseSource } from './types'
import type { Exercise, Level, NoteEvent, Voice } from '@/model'

interface EventGroup {
  voice: Voice
  duration: number
  ticks: number[]
  tuplet?: { num: number; den: number }
}

interface ExerciseDefinition extends Omit<Exercise, 'events'> {
  groups: EventGroup[]
}

interface LevelDefinition extends Omit<Level, 'exercises'> {
  exercises: ExerciseDefinition[]
}

function expandExercise(definition: ExerciseDefinition): Exercise {
  const { groups, ...exercise } = definition
  const events: NoteEvent[] = groups
    .flatMap(({ ticks, ...event }) => ticks.map((tick) => ({ ...event, tick })))
    .toSorted((left, right) => left.tick - right.tick)

  return { ...exercise, events }
}

export const BUILT_IN_LEVELS: readonly Level[] = (
  library as unknown as LevelDefinition[]
)
  .map((level) => ({
    ...level,
    exercises: level.exercises.map(expandExercise),
  }))
  .toSorted((left, right) => left.order - right.order)

assertValidLevels(BUILT_IN_LEVELS)

export class BuiltInSource implements ExerciseSource {
  loadLevels(): Promise<readonly Level[]> {
    return Promise.resolve(BUILT_IN_LEVELS)
  }
}
