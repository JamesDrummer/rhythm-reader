import { describe, expect, it } from 'vitest'
import { assertValidExercise } from '@/model'
import {
  createEditorGrid,
  normaliseDurations,
  resizeGrid,
  setBeatResolution,
  toggleGridHit,
} from './grid'

describe('editor mixed-resolution grid', () => {
  it('creates valid two-bar events with 16ths and triplet 8ths', () => {
    let grid = resizeGrid(createEditorGrid(), 2)
    grid = toggleGridHit(grid, 'snare', 0, 1)
    grid = setBeatResolution(grid, 1, 'tripletEighth')
    grid = toggleGridHit(grid, 'kick', 1, 2)
    grid = setBeatResolution(grid, 6, 'tripletEighth')
    grid = toggleGridHit(grid, 'hihat', 6, 1)

    expect(grid.events).toEqual([
      { voice: 'snare', tick: 120, duration: 120 },
      {
        voice: 'kick',
        tick: 800,
        duration: 160,
        tuplet: { num: 3, den: 2 },
      },
      {
        voice: 'hihat',
        tick: 3040,
        duration: 160,
        tuplet: { num: 3, den: 2 },
      },
    ])
    expect(() =>
      assertValidExercise({
        id: 'mixed-grid',
        title: 'Mixed grid',
        tempo: 70,
        timeSignature: { beats: 4, beatValue: 4 },
        bars: 2,
        events: grid.events,
        tier: 'beginner',
        listenFirstAllowed: true,
        modes: ['playAlong', 'memorise'],
      }),
    ).not.toThrow()
  })

  it('keeps shared downbeats and removes hits that do not fit a new grid', () => {
    let grid = createEditorGrid()
    grid = toggleGridHit(grid, 'kick', 0, 0)
    grid = toggleGridHit(grid, 'snare', 0, 1)
    grid = setBeatResolution(grid, 0, 'tripletEighth')

    expect(grid.events).toEqual([
      {
        voice: 'kick',
        tick: 0,
        duration: 160,
        tuplet: { num: 3, den: 2 },
      },
    ])
  })
})

describe('editor notation duration normalisation', () => {
  it('writes a quarter-note pulse as four quarter notes', () => {
    const events = [0, 480, 960, 1440].map((tick) => ({
      voice: 'snare' as const,
      tick,
      duration: 120,
    }))

    expect(
      normaliseDurations(events, [
        'sixteenth',
        'sixteenth',
        'sixteenth',
        'sixteenth',
      ]),
    ).toEqual(events.map((event) => ({ ...event, duration: 480 })))
  })

  it('writes hits on subdivisions one and three as two eighth notes', () => {
    expect(
      normaliseDurations(
        [
          { voice: 'hihat', tick: 0, duration: 120 },
          { voice: 'hihat', tick: 240, duration: 120 },
        ],
        ['sixteenth'],
      ),
    ).toEqual([
      { voice: 'hihat', tick: 0, duration: 240 },
      { voice: 'hihat', tick: 240, duration: 240 },
    ])
  })

  it('keeps a lone hit on subdivision four as a sixteenth note', () => {
    expect(
      normaliseDurations(
        [{ voice: 'kick', tick: 360, duration: 480 }],
        ['sixteenth'],
      ),
    ).toEqual([{ voice: 'kick', tick: 360, duration: 120 }])
  })

  it('keeps hits on a triplet beat as triplet eighths', () => {
    const events = [
      {
        voice: 'snare' as const,
        tick: 160,
        duration: 160,
        tuplet: { num: 3, den: 2 },
      },
    ]

    expect(normaliseDurations(events, ['tripletEighth'])).toEqual(events)
  })

  it('is idempotent', () => {
    const resolutions = ['sixteenth', 'tripletEighth'] as const
    const events = [
      { voice: 'kick' as const, tick: 0, duration: 120 },
      { voice: 'kick' as const, tick: 240, duration: 480 },
      {
        voice: 'snare' as const,
        tick: 640,
        duration: 480,
      },
    ]
    const once = normaliseDurations(events, resolutions)

    expect(normaliseDurations(once, resolutions)).toEqual(once)
  })
})
