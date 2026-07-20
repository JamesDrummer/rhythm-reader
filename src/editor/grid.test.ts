import { describe, expect, it } from 'vitest'
import { assertValidExercise } from '@/model'
import {
  createEditorGrid,
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
