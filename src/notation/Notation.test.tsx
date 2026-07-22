import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PPQ, type Exercise } from '@/model'
import { Notation } from './Notation'
import type { NotationLayout } from './types'
import { renderExerciseNotation } from './vexflowMapper'

vi.mock('./vexflowMapper', () => ({
  renderExerciseNotation: vi.fn(),
}))

const event = { voice: 'snare' as const, tick: 0, duration: PPQ }
const exercise: Exercise = {
  id: 'labelled-notation',
  title: 'Labelled notation',
  tempo: 60,
  timeSignature: { beats: 4, beatValue: 4 },
  bars: 1,
  events: [event],
  tier: 'beginner',
  listenFirstAllowed: false,
  modes: ['playAlong'],
}

function layout(x: number, staffBottom: number): NotationLayout {
  return {
    width: 540,
    height: 216,
    noteLayouts: [
      {
        event,
        x,
        y: 80,
        bbox: { x: x - 6, y: 74, width: 12, height: 12 },
      },
    ],
    barBoundaries: [80, 520],
    barLayouts: [
      {
        startTick: 0,
        endTick: PPQ * 4,
        startX: 80,
        endX: 520,
        staffTop: 70,
        staffBottom,
      },
    ],
    staffBounds: { top: 70, bottom: staffBottom },
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Notation note labels', () => {
  it('positions labels from noteLayouts and updates them after resize', () => {
    let resize: (() => void) | undefined
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        resize = () => callback([], this as unknown as ResizeObserver)
      }

      observe() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    vi.mocked(renderExerciseNotation)
      .mockReturnValueOnce(layout(123, 150))
      .mockReturnValueOnce(layout(287, 160))

    const { container } = render(
      <Notation
        exercise={exercise}
        noteLabels={[{ eventIndex: 0, text: 'Beat one' }]}
      />,
    )

    const label = container.querySelector('[data-note-label-index="0"]')
    expect(label).toHaveAttribute('x', '123')
    expect(label).toHaveAttribute('y', '174')

    act(() => resize?.())

    expect(
      container.querySelector('[data-note-label-index="0"]'),
    ).toHaveAttribute('x', '287')
    expect(
      container.querySelector('[data-note-label-index="0"]'),
    ).toHaveAttribute('y', '184')
  })
})
