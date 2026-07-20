import { assertValidLevels } from './validation'
import type { CatalogueScope, ExerciseSource } from './types'
import type { Level } from '@/model'

export class MergedExerciseSource implements ExerciseSource {
  private readonly sources: readonly ExerciseSource[]

  constructor(sources: readonly ExerciseSource[]) {
    this.sources = sources
  }

  async loadLevels(scope: CatalogueScope): Promise<readonly Level[]> {
    const levels = (
      await Promise.all(this.sources.map((source) => source.loadLevels(scope)))
    )
      .flat()
      .toSorted((left, right) => left.order - right.order)

    assertValidLevels(levels)
    return levels satisfies Level[]
  }

  subscribe(listener: () => void): () => void {
    const unsubscribers = this.sources.flatMap((source) => {
      const unsubscribe = source.subscribe?.(listener)
      return unsubscribe ? [unsubscribe] : []
    })
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}
