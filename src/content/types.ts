import type { Level } from '@/model'

/** Identifies whose assigned/custom content should be loaded. */
export interface CatalogueScope {
  learnerId: string
}

export interface ExerciseSource {
  loadLevels(scope: CatalogueScope): Promise<readonly Level[]>
  subscribe?(listener: () => void): () => void
}

export interface WritableExerciseSource extends ExerciseSource {
  saveLevels(scope: CatalogueScope, levels: readonly Level[]): Promise<void>
}
