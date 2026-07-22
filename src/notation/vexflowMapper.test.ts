import { describe, expect, it } from 'vitest'
import { AUDIO_DEMO_EXERCISE } from '@/audio/demoExercise'
import { PPQ, type Exercise } from '@/model'
import { SIX_EIGHT_PROOF_EXERCISE } from './demoExercises'
import type { NotationLayout } from './types'
import { renderExerciseNotation } from './vexflowMapper'

function renderAttached(exercise: Exercise) {
  const container = document.createElement('div')
  document.body.append(container)
  const layout = renderExerciseNotation(container, exercise)
  return { container, layout }
}

function render(exercise: Exercise) {
  const { container, layout } = renderAttached(exercise)
  container.remove()
  return layout
}

function snapshotLayout(layout: NotationLayout) {
  return {
    width: layout.width,
    height: layout.height,
    barBoundaries: layout.barBoundaries.map(Math.round),
    notes: layout.noteLayouts.map(({ event, x, y, bbox }) => ({
      voice: event.voice,
      tick: event.tick,
      x: Math.round(x),
      y: Math.round(y),
      bbox: {
        x: Math.round(bbox.x),
        y: Math.round(bbox.y),
        width: Math.round(bbox.width),
        height: Math.round(bbox.height),
      },
    })),
  }
}

function expectThemeAwareEngraving(container: HTMLDivElement) {
  const engraving = container.querySelectorAll(
    '.vf-stave, .vf-stavenote, .vf-stem, .vf-beam, .vf-tuplet',
  )
  expect(engraving.length).toBeGreaterThan(0)
  const unthemed = [...engraving].filter(
    (element) =>
      !element.closest('[fill="currentColor"], [stroke="currentColor"]'),
  )
  expect(unthemed.map((element) => element.outerHTML)).toEqual([])
  expect(container.innerHTML).not.toMatch(
    /(?:fill|stroke)="(?:black|#000000)"/i,
  )
}

describe('renderExerciseNotation', () => {
  it('snapshots renderer-agnostic layout for every exercise event', () => {
    const layout = render(AUDIO_DEMO_EXERCISE)

    expect(snapshotLayout(layout)).toMatchSnapshot()
    expect(layout.noteLayouts).toHaveLength(AUDIO_DEMO_EXERCISE.events.length)
  })

  it('snapshots the audio demo exercise in one-system notation', () => {
    const exercise: Exercise = {
      ...AUDIO_DEMO_EXERCISE,
      notationSystems: 1,
    }
    const { container, layout } = renderAttached(exercise)

    try {
      expect({
        ...snapshotLayout(layout),
        engraving: {
          beams: container.querySelectorAll('.vf-beam').length,
          staveNotes: container.querySelectorAll('.vf-stavenote').length,
          tuplets: container.querySelectorAll('.vf-tuplet').length,
        },
      }).toMatchSnapshot()
    } finally {
      container.remove()
    }
  })

  it('engraves a mixed-duration chord using the shortest duration', () => {
    const exercise: Exercise = {
      ...AUDIO_DEMO_EXERCISE,
      id: 'mixed-duration-chord',
      bars: 1,
      notationSystems: 1,
      events: [
        { voice: 'kick', tick: 0, duration: PPQ },
        { voice: 'snare', tick: 0, duration: PPQ / 4 },
        { voice: 'hihat', tick: PPQ / 4, duration: PPQ / 4 },
        { voice: 'hihat', tick: PPQ / 2, duration: PPQ / 4 },
        { voice: 'hihat', tick: (PPQ * 3) / 4, duration: PPQ / 4 },
      ],
    }
    const { container, layout } = renderAttached(exercise)

    try {
      const chordLayouts = layout.noteLayouts.filter(
        ({ event }) => event.tick === 0,
      )

      expect(chordLayouts).toHaveLength(2)
      expect(new Set(chordLayouts.map(({ x }) => Math.round(x))).size).toBe(1)
      expect(layout.noteLayouts.map(({ event }) => event.tick)).toEqual([
        0, 0, 120, 240, 360,
      ])
      expect(container.querySelector('.vf-beam')).not.toBeNull()
    } finally {
      container.remove()
    }
  })

  it('links simultaneous hi-hat and snare notes in the two-system hands voice', () => {
    const hihatEvents = Array.from({ length: 8 }, (_, index) => ({
      voice: 'hihat' as const,
      tick: index * (PPQ / 2),
      duration: PPQ / 2,
    }))
    const hihatOnly: Exercise = {
      ...AUDIO_DEMO_EXERCISE,
      id: 'two-system-hihat-only',
      bars: 1,
      notationSystems: 2,
      events: hihatEvents,
    }
    const withBackbeat: Exercise = {
      ...hihatOnly,
      id: 'two-system-hihat-backbeat',
      events: [
        ...hihatEvents,
        { voice: 'snare', tick: PPQ, duration: PPQ },
        { voice: 'snare', tick: PPQ * 3, duration: PPQ },
      ],
    }
    const hihatOnlyRender = renderAttached(hihatOnly)
    const backbeatRender = renderAttached(withBackbeat)

    try {
      const hihatTickables =
        hihatOnlyRender.container.querySelectorAll('.vf-stavenote').length
      const backbeatTickables =
        backbeatRender.container.querySelectorAll('.vf-stavenote').length
      const backbeatLayouts = backbeatRender.layout.noteLayouts.filter(
        ({ event }) => event.voice === 'snare',
      )

      expect(backbeatTickables).toBe(hihatTickables)
      expect(
        backbeatRender.container.querySelectorAll('.vf-rest'),
      ).toHaveLength(0)
      expect(backbeatLayouts).toHaveLength(2)
      for (const snare of backbeatLayouts) {
        const simultaneousHihat = backbeatRender.layout.noteLayouts.find(
          ({ event }) =>
            event.voice === 'hihat' && event.tick === snare.event.tick,
        )
        expect(Math.round(snare.x)).toBe(Math.round(simultaneousHihat?.x ?? -1))
      }
    } finally {
      hihatOnlyRender.container.remove()
      backbeatRender.container.remove()
    }
  })

  it('keeps interlocking hand notes when one written duration overlaps the next hit', () => {
    const exercise: Exercise = {
      ...AUDIO_DEMO_EXERCISE,
      id: 'two-system-interlocking-hands',
      bars: 1,
      notationSystems: 2,
      events: [
        { voice: 'hihat', tick: 0, duration: PPQ / 2 },
        { voice: 'snare', tick: PPQ / 4, duration: PPQ / 4 },
        { voice: 'hihat', tick: PPQ / 2, duration: PPQ / 2 },
      ],
    }

    expect(render(exercise).noteLayouts.map(({ event }) => event.tick)).toEqual(
      [0, 120, 240],
    )
  })

  it('renders grouped 6/8 without error', () => {
    const layout = render(SIX_EIGHT_PROOF_EXERCISE)

    expect(layout.barBoundaries).toHaveLength(2)
    expect(layout.noteLayouts).toHaveLength(
      SIX_EIGHT_PROOF_EXERCISE.events.length,
    )
  })

  it.each([1, 2] as const)(
    'uses the theme notation colour throughout a %s-system score',
    (notationSystems) => {
      const { container } = renderAttached({
        ...AUDIO_DEMO_EXERCISE,
        notationSystems,
      })

      try {
        expectThemeAwareEngraving(container)
      } finally {
        container.remove()
      }
    },
  )

  it('stacks bars for a narrow layout without shrinking each bar', () => {
    const layout = renderExerciseNotation(
      document.createElement('div'),
      AUDIO_DEMO_EXERCISE,
      1,
    )

    expect(layout.height).toBeGreaterThan(216)
    expect(layout.barLayouts[1].startX).toBe(layout.barLayouts[0].startX)
    expect(layout.barLayouts[1].staffTop).toBeGreaterThan(
      layout.barLayouts[0].staffBottom,
    )
  })

  it('rejects unsupported notation durations with the offending tick length', () => {
    const unsupportedExercise = {
      ...AUDIO_DEMO_EXERCISE,
      id: 'unsupported-duration',
      bars: 1,
      events: [{ voice: 'snare' as const, tick: 0, duration: 80 }],
    }

    expect(() => render(unsupportedExercise)).toThrow(
      'Unsupported notation duration: 80 ticks',
    )
  })
})
