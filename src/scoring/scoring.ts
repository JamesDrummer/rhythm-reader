import {
  COUNT_IN_BARS,
  EXTRA_HIT_PENALTY_PERCENT,
  PER_HIT_VALUES_PERCENT,
  starsForAccuracy,
} from '@/config'
import { tickToSeconds, ticksPerBar, type Exercise, type Voice } from '@/model'
import type {
  CalibratedHit,
  ExpectedNote,
  HitRating,
  LiveHitResult,
  NoteScoreResult,
  ScoreRecord,
  TierScoringConfig,
  VoiceScore,
} from './types'

interface IndexedHit {
  hit: CalibratedHit
  hitIndex: number
}

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, value))

function assertValidTimingWindow(config: TierScoringConfig): void {
  if (
    !Number.isFinite(config.perfectMs) ||
    !Number.isFinite(config.goodMs) ||
    config.perfectMs < 0 ||
    config.goodMs < config.perfectMs
  ) {
    throw new RangeError(
      'Timing windows must be finite, non-negative, and Perfect must not exceed Good',
    )
  }
}

function ratingForError(errorMs: number, config: TierScoringConfig): HitRating {
  const absoluteErrorMs = Math.abs(errorMs)

  if (absoluteErrorMs <= config.perfectMs) return 'perfect'
  if (absoluteErrorMs <= config.goodMs) return 'good'
  return 'miss'
}

function compareExpectedNotes(a: ExpectedNote, b: ExpectedNote): number {
  return a.expectedTimeMs - b.expectedTimeMs || a.noteIndex - b.noteIndex
}

function nearestHit(
  expected: ExpectedNote,
  hits: readonly IndexedHit[],
  consumedHitIndices: ReadonlySet<number>,
  goodWindowMs: number,
): IndexedHit | undefined {
  let nearest: IndexedHit | undefined
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const candidate of hits) {
    if (
      consumedHitIndices.has(candidate.hitIndex) ||
      candidate.hit.voice !== expected.event.voice
    ) {
      continue
    }

    const distance = Math.abs(candidate.hit.timeMs - expected.expectedTimeMs)
    if (distance > goodWindowMs) continue

    if (
      distance < nearestDistance ||
      (distance === nearestDistance &&
        (nearest === undefined ||
          candidate.hit.timeMs < nearest.hit.timeMs ||
          (candidate.hit.timeMs === nearest.hit.timeMs &&
            candidate.hitIndex < nearest.hitIndex)))
    ) {
      nearest = candidate
      nearestDistance = distance
    }
  }

  return nearest
}

function accuracyPercent(
  noteResults: readonly NoteScoreResult[],
  extraHitCount: number,
): number {
  if (noteResults.length === 0) return 0

  const earnedPoints = noteResults.reduce(
    (total, result) => total + PER_HIT_VALUES_PERCENT[result.rating],
    0,
  )
  const penalisedPoints =
    earnedPoints - extraHitCount * EXTRA_HIT_PENALTY_PERCENT

  return clampPercent(penalisedPoints / noteResults.length)
}

function voiceScore(
  voice: Voice,
  noteResults: readonly NoteScoreResult[],
  extraHitCount: number,
): VoiceScore {
  const voiceResults = noteResults.filter(
    (result) => result.event.voice === voice,
  )
  const errors = voiceResults.flatMap((result) =>
    result.errorMs === null ? [] : [result.errorMs],
  )

  return {
    voice,
    expectedCount: voiceResults.length,
    perfectCount: voiceResults.filter(({ rating }) => rating === 'perfect')
      .length,
    goodCount: voiceResults.filter(({ rating }) => rating === 'good').length,
    missCount: voiceResults.filter(({ rating }) => rating === 'miss').length,
    extraHitCount,
    accuracyPercent: accuracyPercent(voiceResults, extraHitCount),
    meanSignedErrorMs:
      errors.length === 0
        ? null
        : errors.reduce((total, error) => total + error, 0) / errors.length,
  }
}

/**
 * Converts exercise ticks to the attempt timeline. Time zero is the start of
 * the configured count-in, so the first exercise note follows one full bar.
 */
export function deriveExpectedNotes(exercise: Exercise): ExpectedNote[] {
  const countInTicks = ticksPerBar(exercise.timeSignature) * COUNT_IN_BARS

  return exercise.events.map((event, noteIndex) => ({
    noteIndex,
    event,
    expectedTimeMs:
      tickToSeconds(countInTicks + event.tick, exercise.tempo) * 1_000,
  }))
}

/** Scores a complete attempt without reading or changing any external state. */
export function scoreExercise(
  exercise: Exercise,
  config: TierScoringConfig,
  hits: readonly CalibratedHit[],
): ScoreRecord {
  assertValidTimingWindow(config)

  const indexedHits = hits.map((hit, hitIndex) => ({ hit, hitIndex }))
  const consumedHitIndices = new Set<number>()
  const chronologicalNotes =
    deriveExpectedNotes(exercise).sort(compareExpectedNotes)
  const resultsByIndex = new Map<number, NoteScoreResult>()

  for (const expected of chronologicalNotes) {
    const matchedHit = nearestHit(
      expected,
      indexedHits,
      consumedHitIndices,
      config.goodMs,
    )

    if (matchedHit === undefined) {
      resultsByIndex.set(expected.noteIndex, {
        ...expected,
        rating: 'miss',
        hitIndex: null,
        errorMs: null,
      })
      continue
    }

    consumedHitIndices.add(matchedHit.hitIndex)
    const errorMs = matchedHit.hit.timeMs - expected.expectedTimeMs
    resultsByIndex.set(expected.noteIndex, {
      ...expected,
      rating: ratingForError(errorMs, config),
      hitIndex: matchedHit.hitIndex,
      errorMs,
    })
  }

  const noteResults = exercise.events.map((_, noteIndex) => {
    const result = resultsByIndex.get(noteIndex)
    if (result === undefined) {
      throw new Error(`Missing score result for event ${noteIndex}`)
    }
    return result
  })
  const rawHits = hits.map((hit) => ({ ...hit }))
  const extraHits = rawHits.flatMap((hit, hitIndex) =>
    consumedHitIndices.has(hitIndex) ? [] : [{ hitIndex, hit }],
  )
  const extraHitsByVoice = (voice: Voice): number =>
    extraHits.filter(({ hit }) => hit.voice === voice).length
  const overallAccuracyPercent = accuracyPercent(noteResults, extraHits.length)

  return {
    exerciseId: exercise.id,
    tier: exercise.tier,
    noteResults,
    extraHits,
    perVoice: {
      kick: voiceScore('kick', noteResults, extraHitsByVoice('kick')),
      snare: voiceScore('snare', noteResults, extraHitsByVoice('snare')),
      hihat: voiceScore('hihat', noteResults, extraHitsByVoice('hihat')),
    },
    overallAccuracyPercent,
    stars: starsForAccuracy(overallAccuracyPercent),
    rawHits,
  }
}

/** Classifies one Play Along hit against the nearest note on the same voice. */
export function classifyLiveHit(
  exercise: Exercise,
  config: TierScoringConfig,
  hit: CalibratedHit,
): LiveHitResult {
  assertValidTimingWindow(config)

  const sameVoiceNotes = deriveExpectedNotes(exercise).filter(
    ({ event }) => event.voice === hit.voice,
  )
  let nearest: ExpectedNote | undefined
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const expected of sameVoiceNotes) {
    const distance = Math.abs(hit.timeMs - expected.expectedTimeMs)
    if (
      distance < nearestDistance ||
      (distance === nearestDistance &&
        (nearest === undefined || compareExpectedNotes(expected, nearest) < 0))
    ) {
      nearest = expected
      nearestDistance = distance
    }
  }

  if (nearest === undefined) {
    return {
      rating: 'miss',
      noteIndex: null,
      expectedTimeMs: null,
      errorMs: null,
    }
  }

  const errorMs = hit.timeMs - nearest.expectedTimeMs
  return {
    rating: ratingForError(errorMs, config),
    noteIndex: nearest.noteIndex,
    expectedTimeMs: nearest.expectedTimeMs,
    errorMs,
  }
}
