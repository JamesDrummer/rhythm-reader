import { deriveLevelProgress } from './unlocks'
import type {
  AttemptResult,
  ExerciseProgressRecord,
  ProgressScope,
  ProgressSnapshot,
  ProgressStore,
} from './types'
import type { Level } from '@/model'

export const PROGRESS_STORAGE_PREFIX = 'rhythm-reader:progress:v1'

interface StoredProgress {
  exercises: Record<string, ExerciseProgressRecord>
}

function storageKey(scope: ProgressScope): string {
  return `${PROGRESS_STORAGE_PREFIX}:${scope.learnerId}`
}

function browserStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function emptyProgress(): StoredProgress {
  return { exercises: {} }
}

export class LocalStorageProgressStore implements ProgressStore {
  private readonly storage: Storage | null

  constructor(storage: Storage | null = browserStorage()) {
    this.storage = storage
  }

  private read(scope: ProgressScope): StoredProgress {
    try {
      const raw = this.storage?.getItem(storageKey(scope))
      if (!raw) return emptyProgress()
      const parsed = JSON.parse(raw) as StoredProgress
      return parsed && typeof parsed.exercises === 'object'
        ? parsed
        : emptyProgress()
    } catch {
      return emptyProgress()
    }
  }

  load(
    scope: ProgressScope,
    catalogue: readonly Level[],
  ): Promise<ProgressSnapshot> {
    const stored = this.read(scope)
    return Promise.resolve({
      exercises: stored.exercises,
      levels: deriveLevelProgress(catalogue, stored.exercises),
    })
  }

  async recordAttempt(
    scope: ProgressScope,
    attempt: AttemptResult,
    catalogue: readonly Level[],
  ): Promise<ProgressSnapshot> {
    const stored = this.read(scope)
    const previous = stored.exercises[attempt.exerciseId]
    stored.exercises[attempt.exerciseId] = {
      exerciseId: attempt.exerciseId,
      completed: true,
      bestAccuracyPercent: Math.max(
        previous?.bestAccuracyPercent ?? 0,
        attempt.accuracyPercent,
      ),
      bestStars: Math.max(previous?.bestStars ?? 0, attempt.stars) as
        0 | 1 | 2 | 3,
      attempts: (previous?.attempts ?? 0) + 1,
    }
    try {
      this.storage?.setItem(storageKey(scope), JSON.stringify(stored))
    } catch {
      // Results remain available for this run when browser storage is blocked.
    }
    return this.load(scope, catalogue)
  }
}
