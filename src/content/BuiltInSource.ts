import library from './library/levels.json'
import { parseLibraryJson } from './libraryFormat'
import { assertValidLevels } from './validation'
import type { ExerciseSource } from './types'
import type { Level } from '@/model'

export const BUILT_IN_LEVELS: readonly Level[] = parseLibraryJson(
  JSON.stringify(library),
).toSorted((left, right) => left.order - right.order)

assertValidLevels(BUILT_IN_LEVELS)

export class BuiltInSource implements ExerciseSource {
  loadLevels(): Promise<readonly Level[]> {
    return Promise.resolve(BUILT_IN_LEVELS)
  }
}
