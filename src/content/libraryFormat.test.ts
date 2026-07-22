import { describe, expect, it } from 'vitest'
import type { Level } from '@/model'
import { parseLibraryJson, serialiseLibrary } from './libraryFormat'

const mixedLevel: Level = {
  id: 'custom-mixed-level',
  title: 'Mixed grids',
  description: 'Binary and ternary reading.',
  order: 100,
  custom: true,
  guide: [
    {
      text: 'Count each beat, then place the off-beat notes halfway between.',
      example: {
        bars: 1,
        events: [
          { voice: 'hihat', tick: 0, duration: 240 },
          { voice: 'hihat', tick: 240, duration: 240 },
        ],
        notationSystems: 1,
      },
    },
  ],
  exercises: [
    {
      id: 'custom-mixed-exercise',
      title: 'Straight into triplets',
      tempo: 72,
      timeSignature: { beats: 4, beatValue: 4 },
      bars: 2,
      events: [
        { voice: 'snare', tick: 120, duration: 120 },
        {
          voice: 'kick',
          tick: 640,
          duration: 160,
          tuplet: { num: 3, den: 2 },
        },
      ],
      notationSystems: 2,
      tier: 'intermediate',
      listenFirstAllowed: true,
      modes: ['playAlong', 'memorise'],
    },
  ],
}

describe('built-in library JSON format', () => {
  it('round-trips custom content as grouped built-in definitions', () => {
    const json = serialiseLibrary([mixedLevel])
    const exported = JSON.parse(json) as Array<{
      exercises: Array<Record<string, unknown>>
    }>

    expect(json).toContain('"groups"')
    expect(exported[0].exercises[0]).not.toHaveProperty('events')
    expect(json).not.toContain('"custom"')
    expect(parseLibraryJson(json)).toEqual([
      { ...mixedLevel, custom: undefined },
    ])
  })

  it('gives clear errors for malformed files and invalid group data', () => {
    expect(() => parseLibraryJson('{broken')).toThrow(
      'The selected file is not valid JSON.',
    )
    expect(() =>
      parseLibraryJson(
        JSON.stringify([
          {
            id: 'bad',
            title: 'Bad level',
            description: 'Invalid data',
            order: 1,
            exercises: [
              {
                id: 'bad-exercise',
                title: 'Bad exercise',
                tempo: 70,
                timeSignature: { beats: 4, beatValue: 4 },
                bars: 1,
                groups: [{ voice: 'cowbell', duration: 120, ticks: [0] }],
                tier: 'beginner',
                listenFirstAllowed: false,
                modes: ['playAlong'],
              },
            ],
          },
        ]),
      ),
    ).toThrow('levels[0].exercises[0].groups[0].voice')
  })

  it('reports invalid guide example events at their library path', () => {
    const invalidGuideLevel: Level = {
      ...mixedLevel,
      custom: undefined,
      guide: [
        {
          text: 'This example runs beyond its bar.',
          example: {
            bars: 1,
            events: [{ voice: 'snare', tick: 1800, duration: 240 }],
          },
        },
      ],
    }

    expect(() =>
      parseLibraryJson(serialiseLibrary([invalidGuideLevel])),
    ).toThrow('levels[0].guide[0].example.events[0]')
  })
})
