import type { Exercise, NoteEvent } from '@/model'
import {
  classifyLiveHit,
  type HitRating,
  type NoteScoreResult,
  type ScoreRecord,
  type TierScoringConfig,
} from '@/scoring'

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

/**
 * Matched hits get their rating immediately. An unmatched hit only gets an
 * immediate Miss when it is outside every same-voice Good window; otherwise it
 * may still resolve differently as more hits arrive.
 */
export function calloutRatingForHit(
  exercise: Exercise,
  config: TierScoringConfig,
  record: ScoreRecord,
  hitIndex: number,
): HitRating | null {
  const matchedResult = resultForHit(record, hitIndex)
  if (matchedResult) return matchedResult.rating

  const hit = record.rawHits[hitIndex]
  if (!hit) return null

  return classifyLiveHit(exercise, config, hit).rating === 'miss'
    ? 'miss'
    : null
}
