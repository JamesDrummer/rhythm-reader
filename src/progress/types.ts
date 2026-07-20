import type { StarRating } from '@/config'
import type { Level } from '@/model'

export interface ProgressScope {
  learnerId: string
}

export interface ExerciseProgressRecord {
  exerciseId: string
  completed: boolean
  bestAccuracyPercent: number
  bestStars: StarRating
  attempts: number
}

export interface AttemptResult {
  exerciseId: string
  accuracyPercent: number
  stars: StarRating
}

export interface LevelProgressState {
  levelId: string
  unlocked: boolean
  completedExercises: number
  exerciseCount: number
  totalStars: number
  requiredStars: number
}

export interface ProgressSnapshot {
  exercises: Readonly<Record<string, ExerciseProgressRecord>>
  levels: Readonly<Record<string, LevelProgressState>>
}

export interface ProgressStore {
  load(
    scope: ProgressScope,
    catalogue: readonly Level[],
  ): Promise<ProgressSnapshot>
  recordAttempt(
    scope: ProgressScope,
    attempt: AttemptResult,
    catalogue: readonly Level[],
  ): Promise<ProgressSnapshot>
}
