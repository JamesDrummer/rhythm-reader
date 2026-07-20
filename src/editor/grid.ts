import { PPQ, type Exercise, type NoteEvent, type Voice } from '@/model'

export type BeatResolution = 'sixteenth' | 'tripletEighth'

export interface EditorGrid {
  bars: 1 | 2 | 4
  resolutions: BeatResolution[]
  events: NoteEvent[]
}

const BEATS_PER_BAR = 4

export function beatCount(bars: EditorGrid['bars']): number {
  return bars * BEATS_PER_BAR
}

export function subdivisionTicks(resolution: BeatResolution): number {
  return resolution === 'sixteenth' ? PPQ / 4 : PPQ / 3
}

export function subdivisionCount(resolution: BeatResolution): number {
  return resolution === 'sixteenth' ? 4 : 3
}

export function createEditorGrid(bars: EditorGrid['bars'] = 1): EditorGrid {
  return {
    bars,
    resolutions: Array.from({ length: beatCount(bars) }, () => 'sixteenth'),
    events: [],
  }
}

export function gridFromExercise(exercise: Exercise): EditorGrid {
  const bars = exercise.bars === 2 || exercise.bars === 4 ? exercise.bars : 1
  const resolutions: BeatResolution[] = Array.from(
    { length: beatCount(bars) },
    (_, beatIndex) => {
      const beatStart = beatIndex * PPQ
      return exercise.events.some(
        (event) =>
          event.tick >= beatStart &&
          event.tick < beatStart + PPQ &&
          event.tuplet?.num === 3 &&
          event.tuplet.den === 2,
      )
        ? 'tripletEighth'
        : 'sixteenth'
    },
  )
  return { bars, resolutions, events: [...exercise.events] }
}

export function resizeGrid(
  grid: EditorGrid,
  bars: EditorGrid['bars'],
): EditorGrid {
  const nextBeatCount = beatCount(bars)
  return {
    bars,
    resolutions: Array.from(
      { length: nextBeatCount },
      (_, index) => grid.resolutions[index] ?? 'sixteenth',
    ),
    events: grid.events.filter((event) => event.tick < nextBeatCount * PPQ),
  }
}

export function setBeatResolution(
  grid: EditorGrid,
  beatIndex: number,
  resolution: BeatResolution,
): EditorGrid {
  const beatStart = beatIndex * PPQ
  const step = subdivisionTicks(resolution)
  const validTicks = new Set(
    Array.from(
      { length: subdivisionCount(resolution) },
      (_, index) => beatStart + index * step,
    ),
  )
  const resolutions = [...grid.resolutions]
  resolutions[beatIndex] = resolution
  const events = grid.events.flatMap((event): NoteEvent[] => {
    if (event.tick < beatStart || event.tick >= beatStart + PPQ) return [event]
    if (!validTicks.has(event.tick)) return []
    return [
      {
        voice: event.voice,
        tick: event.tick,
        duration: step,
        ...(resolution === 'tripletEighth'
          ? { tuplet: { num: 3, den: 2 } }
          : {}),
      },
    ]
  })
  return { ...grid, resolutions, events }
}

export function toggleGridHit(
  grid: EditorGrid,
  voice: Voice,
  beatIndex: number,
  subdivisionIndex: number,
): EditorGrid {
  const resolution = grid.resolutions[beatIndex]
  const step = subdivisionTicks(resolution)
  const tick = beatIndex * PPQ + subdivisionIndex * step
  const existingIndex = grid.events.findIndex(
    (event) => event.voice === voice && event.tick === tick,
  )
  const events = [...grid.events]
  if (existingIndex >= 0) {
    events.splice(existingIndex, 1)
  } else {
    events.push({
      voice,
      tick,
      duration: step,
      ...(resolution === 'tripletEighth' ? { tuplet: { num: 3, den: 2 } } : {}),
    })
  }
  return {
    ...grid,
    events: events.toSorted(
      (left, right) =>
        left.tick - right.tick || left.voice.localeCompare(right.voice),
    ),
  }
}
