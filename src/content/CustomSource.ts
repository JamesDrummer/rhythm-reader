import { assertValidLevels } from './validation'
import type { CatalogueScope, WritableExerciseSource } from './types'
import type { Level } from '@/model'

export const CUSTOM_LEVELS_STORAGE_PREFIX = 'rhythm-reader:custom-levels:v1'

function storageKey(scope: CatalogueScope): string {
  return `${CUSTOM_LEVELS_STORAGE_PREFIX}:${scope.learnerId}`
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export class CustomSource implements WritableExerciseSource {
  private readonly storage: Storage | null

  constructor(storage: Storage | null = browserStorage()) {
    this.storage = storage
  }

  loadLevels(scope: CatalogueScope): Promise<readonly Level[]> {
    try {
      const raw = this.storage?.getItem(storageKey(scope))
      if (!raw) return Promise.resolve([])
      const levels = JSON.parse(raw) as Level[]
      assertValidLevels(levels)
      return Promise.resolve(levels)
    } catch {
      return Promise.resolve([])
    }
  }

  saveLevels(scope: CatalogueScope, levels: readonly Level[]): Promise<void> {
    assertValidLevels(levels)
    this.storage?.setItem(storageKey(scope), JSON.stringify(levels))
    return Promise.resolve()
  }
}
