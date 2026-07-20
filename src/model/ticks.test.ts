import { describe, expect, it } from 'vitest'
import {
  PPQ,
  deriveRestPositions,
  generateBeatGrid,
  generateBinaryGrid,
  generateSubdivisionGrid,
  generateTripletEighthGrid,
  tickToSeconds,
  ticksPerBar,
  ticksPerBeat,
  type NoteEvent,
  type TimeSignature,
} from './index'

const fourFour: TimeSignature = { beats: 4, beatValue: 4 }
const barTickCases: [TimeSignature, number][] = [
  [{ beats: 4, beatValue: 4 }, 1_920],
  [{ beats: 6, beatValue: 8, grouping: [3, 3] }, 1_440],
  [{ beats: 5, beatValue: 4, grouping: [3, 2] }, 2_400],
  [{ beats: 7, beatValue: 8, grouping: [2, 2, 3] }, 1_680],
]

describe('tick maths', () => {
  it('uses 480 pulses per quarter note', () => {
    expect(PPQ).toBe(480)
  })

  it.each(barTickCases)(
    'calculates ticks per bar for %o',
    (timeSignature, expected) => {
      expect(ticksPerBar(timeSignature)).toBe(expected)
    },
  )

  it('calculates denominator-beat lengths', () => {
    expect(ticksPerBeat(fourFour)).toBe(480)
    expect(ticksPerBeat({ beats: 6, beatValue: 8 })).toBe(240)
  })

  it.each([
    [0, 120, 0],
    [480, 120, 0.5],
    [1_920, 60, 4],
    [240, 80, 0.375],
  ])('converts tick %i at %i BPM to seconds', (tick, tempo, seconds) => {
    expect(tickToSeconds(tick, tempo)).toBe(seconds)
  })

  it('rejects timing inputs that cannot produce valid ticks', () => {
    expect(() => ticksPerBar({ beats: 0, beatValue: 4 })).toThrow()
    expect(() => ticksPerBar({ beats: 4, beatValue: 7 })).toThrow()
    expect(() => tickToSeconds(-1, 120)).toThrow()
    expect(() => tickToSeconds(480, 0)).toThrow()
  })
})

describe('metric grids', () => {
  it('generates denominator beats for simple and compound metres', () => {
    expect(generateBeatGrid(fourFour)).toEqual([0, 480, 960, 1_440])
    expect(
      generateBeatGrid({ beats: 6, beatValue: 8, grouping: [3, 3] }),
    ).toEqual([0, 240, 480, 720, 960, 1_200])
  })

  it.each([
    ['quarter', [0, 480, 960, 1_440]],
    ['eighth', [0, 240, 480, 720, 960, 1_200, 1_440, 1_680]],
    [
      'sixteenth',
      [
        0, 120, 240, 360, 480, 600, 720, 840, 960, 1_080, 1_200, 1_320, 1_440,
        1_560, 1_680, 1_800,
      ],
    ],
  ] as const)('generates the %s binary grid', (subdivision, expected) => {
    expect(generateBinaryGrid(fourFour, subdivision)).toEqual(expected)
  })

  it('generates exact triplet-eighth positions in every 4/4 beat', () => {
    expect(generateTripletEighthGrid(fourFour)).toEqual([
      0, 160, 320, 480, 640, 800, 960, 1_120, 1_280, 1_440, 1_600, 1_760,
    ])
  })

  it('generates grids across multiple bars without including the end boundary', () => {
    const grid = generateSubdivisionGrid(fourFour, 'quarter', 2)

    expect(grid).toEqual([0, 480, 960, 1_440, 1_920, 2_400, 2_880, 3_360])
    expect(grid).not.toContain(3_840)
  })
})

describe('rest derivation', () => {
  const events: NoteEvent[] = [
    { voice: 'snare', tick: 0, duration: 480 },
    { voice: 'kick', tick: 480, duration: 240 },
    { voice: 'snare', tick: 960, duration: 240 },
  ]
  const eighthGrid = generateBinaryGrid(fourFour, 'eighth')

  it('derives gaps on a metric grid and respects event duration', () => {
    expect(deriveRestPositions(events, eighthGrid)).toEqual([
      720, 1_200, 1_440, 1_680,
    ])
  })

  it('can derive rests independently for one voice', () => {
    expect(deriveRestPositions(events, eighthGrid, 'snare')).toEqual([
      480, 720, 1_200, 1_440, 1_680,
    ])
    expect(deriveRestPositions(events, eighthGrid, 'kick')).toEqual([
      0, 240, 720, 960, 1_200, 1_440, 1_680,
    ])
  })
})
