import type { NoteEvent, TimeSignature, Voice } from './types'
import { PPQ } from './types'

export type BinarySubdivision = 'quarter' | 'eighth' | 'sixteenth'
export type MetricSubdivision = BinarySubdivision | 'tripletEighth'

const SUBDIVISION_TICKS: Record<MetricSubdivision, number> = {
  quarter: PPQ,
  eighth: PPQ / 2,
  sixteenth: PPQ / 4,
  tripletEighth: PPQ / 3,
}

function requirePositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer`)
  }
}

function requireNonNegativeInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative integer`)
  }
}

function gridFromStep(totalTicks: number, stepTicks: number): number[] {
  const grid: number[] = []

  for (let tick = 0; tick < totalTicks; tick += stepTicks) {
    grid.push(tick)
  }

  return grid
}

/** The duration of one denominator beat, such as an eighth-note beat in 6/8. */
export function ticksPerBeat(timeSignature: TimeSignature): number {
  requirePositiveInteger(timeSignature.beats, 'Time-signature beats')
  requirePositiveInteger(timeSignature.beatValue, 'Time-signature beat value')

  const ticks = (PPQ * 4) / timeSignature.beatValue

  if (!Number.isInteger(ticks)) {
    throw new RangeError(
      `A 1/${timeSignature.beatValue} beat cannot be represented at ${PPQ} PPQ`,
    )
  }

  return ticks
}

export function ticksPerBar(timeSignature: TimeSignature): number {
  return timeSignature.beats * ticksPerBeat(timeSignature)
}

export function tickToSeconds(tick: number, tempo: number): number {
  requireNonNegativeInteger(tick, 'Tick')

  if (!Number.isFinite(tempo) || tempo <= 0) {
    throw new RangeError('Tempo must be greater than zero')
  }

  return (tick / PPQ) * (60 / tempo)
}

/** Returns the start tick of every denominator beat, excluding the end boundary. */
export function generateBeatGrid(
  timeSignature: TimeSignature,
  bars = 1,
): number[] {
  requirePositiveInteger(bars, 'Bars')
  return gridFromStep(
    ticksPerBar(timeSignature) * bars,
    ticksPerBeat(timeSignature),
  )
}

/** Returns binary note-value positions, excluding the exercise end boundary. */
export function generateBinaryGrid(
  timeSignature: TimeSignature,
  subdivision: BinarySubdivision,
  bars = 1,
): number[] {
  requirePositiveInteger(bars, 'Bars')
  return gridFromStep(
    ticksPerBar(timeSignature) * bars,
    SUBDIVISION_TICKS[subdivision],
  )
}

/** Returns triplet-eighth positions: three equal 160-tick steps per quarter note. */
export function generateTripletEighthGrid(
  timeSignature: TimeSignature,
  bars = 1,
): number[] {
  requirePositiveInteger(bars, 'Bars')
  return gridFromStep(
    ticksPerBar(timeSignature) * bars,
    SUBDIVISION_TICKS.tripletEighth,
  )
}

export function generateSubdivisionGrid(
  timeSignature: TimeSignature,
  subdivision: MetricSubdivision,
  bars = 1,
): number[] {
  return subdivision === 'tripletEighth'
    ? generateTripletEighthGrid(timeSignature, bars)
    : generateBinaryGrid(timeSignature, subdivision, bars)
}

/**
 * Finds unoccupied grid positions. An event occupies positions from its tick up
 * to (but not including) tick + duration. Pass a voice to derive per-voice rests.
 */
export function deriveRestPositions(
  events: readonly NoteEvent[],
  metricGrid: readonly number[],
  voice?: Voice,
): number[] {
  const relevantEvents = voice
    ? events.filter((event) => event.voice === voice)
    : events

  return metricGrid.filter(
    (position) =>
      !relevantEvents.some(
        (event) =>
          position >= event.tick && position < event.tick + event.duration,
      ),
  )
}
