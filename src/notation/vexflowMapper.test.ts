import { describe, expect, it } from 'vitest'
import { AUDIO_DEMO_EXERCISE } from '@/audio/demoExercise'
import { SIX_EIGHT_PROOF_EXERCISE } from './demoExercises'
import { renderExerciseNotation } from './vexflowMapper'

function render(exercise: typeof AUDIO_DEMO_EXERCISE) {
  const container = document.createElement('div')
  document.body.append(container)
  const layout = renderExerciseNotation(container, exercise)
  container.remove()
  return layout
}

describe('renderExerciseNotation', () => {
  it('snapshots renderer-agnostic layout for every exercise event', () => {
    const layout = render(AUDIO_DEMO_EXERCISE)

    expect({
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
    }).toMatchSnapshot()
    expect(layout.noteLayouts).toHaveLength(AUDIO_DEMO_EXERCISE.events.length)
  })

  it('renders grouped 6/8 without error', () => {
    const layout = render(SIX_EIGHT_PROOF_EXERCISE)

    expect(layout.barBoundaries).toHaveLength(2)
    expect(layout.noteLayouts).toHaveLength(
      SIX_EIGHT_PROOF_EXERCISE.events.length,
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
