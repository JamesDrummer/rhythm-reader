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
const laterEvent = { voice: 'snare' as const, tick: PPQ * 2, duration: PPQ }
const tallEvent = { voice: 'hihat' as const, tick: PPQ * 4, duration: PPQ }
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
        contentTop: 40,
      },
    ],
    staffBounds: { top: 70, bottom: staffBottom },
  }
}

function appendSvg(container: HTMLDivElement) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  container.replaceChildren(svg)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Notation static annotations', () => {
  it('positions a rest count between notes above the tallest note and includes it in a cropped viewBox', () => {
    const topmostNoteTop = 30
    const countExercise: Exercise = {
      ...exercise,
      bars: 2,
      events: [event, laterEvent, tallEvent],
    }
    vi.mocked(renderExerciseNotation).mockImplementation((container) => {
      appendSvg(container)
      const base = layout(100, 150)
      return {
        ...base,
        noteLayouts: [
          {
            ...base.noteLayouts[0],
            bbox: { x: 94, y: 40, width: 12, height: 46 },
          },
          {
            event: laterEvent,
            x: 300,
            y: 80,
            bbox: { x: 294, y: 55, width: 12, height: 31 },
          },
          {
            event: tallEvent,
            x: 500,
            y: 80,
            bbox: { x: 494, y: topmostNoteTop, width: 12, height: 56 },
          },
        ],
        barBoundaries: [80, 320, 520],
        barLayouts: [
          { ...base.barLayouts[0], endX: 320 },
          {
            startTick: PPQ * 4,
            endTick: PPQ * 8,
            startX: 320,
            endX: 520,
            staffTop: 70,
            staffBottom: 150,
            contentTop: topmostNoteTop,
          },
        ],
        viewBox: { x: 0, y: 50, width: 540, height: 100 },
      }
    })

    const { container } = render(
      <Notation
        counts={[{ tick: PPQ, text: '2' }]}
        cropToContent
        exercise={countExercise}
      />,
    )
    const count = container.querySelector('[data-count-tick="480"]')
    const notationViewBox = container
      .querySelector('svg')
      ?.getAttribute('viewBox')
      ?.split(' ')
      .map(Number)

    expect(count).toHaveAttribute('x', '200')
    expect(Number(count?.getAttribute('x'))).toBeGreaterThan(100)
    expect(Number(count?.getAttribute('x'))).toBeLessThan(300)
    expect(Number(count?.getAttribute('y')) + 12).toBeLessThanOrEqual(
      topmostNoteTop - 8,
    )
    expect(notationViewBox?.[1]).toBeLessThan(Number(count?.getAttribute('y')))
    expect(
      (notationViewBox?.[1] ?? 0) + (notationViewBox?.[3] ?? 0),
    ).toBeGreaterThan(Number(count?.getAttribute('y')) + 12)
  })

  it('keeps note labels inside the cropped engraving viewBox', () => {
    vi.mocked(renderExerciseNotation).mockImplementation((container) => {
      appendSvg(container)
      return {
        ...layout(123, 150),
        viewBox: { x: 0, y: 50, width: 540, height: 100 },
      }
    })

    const { container } = render(
      <Notation
        cropToContent
        exercise={exercise}
        noteLabels={[{ eventIndex: 0, text: 'Beat one' }]}
      />,
    )
    const svgs = container.querySelectorAll('svg')
    const viewBoxes = [...svgs].map((svg) =>
      svg.getAttribute('viewBox')?.split(' ').map(Number),
    )
    const labelY = Number(
      container.querySelector('[data-note-label-index="0"]')?.getAttribute('y'),
    )

    expect(svgs).toHaveLength(2)
    expect(viewBoxes[0]).toEqual(viewBoxes[1])
    expect(viewBoxes[0]?.[1]).toBeGreaterThan(0)
    expect(viewBoxes[0]?.[3]).toBeLessThan(216)
    expect((viewBoxes[0]?.[1] ?? 0) + (viewBoxes[0]?.[3] ?? 0)).toBeGreaterThan(
      labelY + 12,
    )
  })

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
