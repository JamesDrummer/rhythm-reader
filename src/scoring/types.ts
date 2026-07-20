import type { StarRating, TimingWindow } from '@/config'
import type { NoteEvent, Tier, Voice } from '@/model'

export interface CalibratedHit {
  voice: Voice
  /** Calibrated time in milliseconds on the attempt's audio timeline. */
  timeMs: number
}

export interface ExpectedNote {
  /** Index in Exercise.events. */
  noteIndex: number
  event: NoteEvent
  expectedTimeMs: number
}

export type HitRating = 'perfect' | 'good' | 'miss'

export interface NoteScoreResult extends ExpectedNote {
  rating: HitRating
  /** Index in ScoreRecord.rawHits, or null when the expected note was missed. */
  hitIndex: number | null
  /** Actual minus expected: negative is early, positive is late. */
  errorMs: number | null
}

export interface ExtraHitResult {
  hitIndex: number
  hit: CalibratedHit
}

export interface VoiceScore {
  voice: Voice
  expectedCount: number
  perfectCount: number
  goodCount: number
  missCount: number
  extraHitCount: number
  accuracyPercent: number
  /** Mean of matched-note errors. Negative is rushing; positive is dragging. */
  meanSignedErrorMs: number | null
}

export interface ScoreTimeline {
  /** Start of the exercise after the count-in, on the attempt timeline. */
  startTimeMs: number
  /** End of the final bar, on the attempt timeline. */
  endTimeMs: number
  /** Start, internal bar lines, and end of the exercise. */
  barLineTimeMs: number[]
}

export interface ScoreRecord {
  exerciseId: string
  tier: Tier
  noteResults: NoteScoreResult[]
  extraHits: ExtraHitResult[]
  perVoice: Record<Voice, VoiceScore>
  overallAccuracyPercent: number
  stars: StarRating
  rawHits: CalibratedHit[]
  /** Everything the results timeline needs, without the original Exercise. */
  timeline: ScoreTimeline
}

export interface LiveHitResult {
  rating: HitRating
  /** Nearest expected note on the same voice, even when the hit is a miss. */
  noteIndex: number | null
  expectedTimeMs: number | null
  /** Actual minus expected, or null when the exercise has no note on this voice. */
  errorMs: number | null
}

export type TierScoringConfig = TimingWindow
