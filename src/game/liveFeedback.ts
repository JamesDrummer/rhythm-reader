import type { NoteEvent } from '@/model'
import type { HitRating, NoteScoreResult, ScoreRecord } from '@/scoring'

export interface VisibleNoteFeedback {
  event: NoteEvent
  rating: HitRating
}

/**
 * Matched notes are visible immediately. Unmatched notes become misses only
 * after their Good window closes, so the UI never marks a playable note late.
 */
export function visibleNoteFeedback(
  record: ScoreRecord,
  elapsedAttemptMs: number,
  goodWindowMs: number,
): VisibleNoteFeedback[] {
  return record.noteResults.flatMap((result) => {
    const isSettledMiss =
      result.rating === 'miss' &&
      elapsedAttemptMs >= result.expectedTimeMs + goodWindowMs

    return result.hitIndex !== null || isSettledMiss
      ? [{ event: result.event, rating: result.rating }]
      : []
  })
}

export function resultForHit(
  record: ScoreRecord,
  hitIndex: number,
): NoteScoreResult | undefined {
  return record.noteResults.find((result) => result.hitIndex === hitIndex)
}
