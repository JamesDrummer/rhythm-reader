import { act, cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PPQ, type Exercise } from '@/model'
import { Overlay } from './Overlay'
import { interpolatePlayheadPosition, interpolatePlayheadX } from './playhead'
import type { NotationLayout, OverlayHandle } from './types'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('interpolatePlayheadX', () => {
  const anchors = [
    { tick: 0, x: 100 },
    { tick: 480, x: 200 },
    { tick: 960, x: 350 },
  ]

  it('hides before the exercise and interpolates smoothly between notes', () => {
    expect(interpolatePlayheadX(-1, anchors)).toBeNull()
    expect(interpolatePlayheadX(240, anchors)).toBe(150)
    expect(interpolatePlayheadX(720, anchors)).toBe(275)
  })

  it('clamps at the rendered exercise boundaries', () => {
    expect(interpolatePlayheadX(0, anchors)).toBe(100)
    expect(interpolatePlayheadX(1_440, anchors)).toBe(350)
  })

  it('moves to the next staff row at a stacked bar boundary', () => {
    const stackedAnchors = [
      { tick: 0, x: 100, staffTop: 50, staffBottom: 100 },
      { tick: 479.999, x: 450, staffTop: 50, staffBottom: 100 },
      { tick: 480, x: 100, staffTop: 266, staffBottom: 316 },
      { tick: 960, x: 450, staffTop: 266, staffBottom: 316 },
    ]

    expect(interpolatePlayheadPosition(479.999, stackedAnchors)).toMatchObject({
      x: 450,
      staffTop: 50,
    })
    expect(interpolatePlayheadPosition(480, stackedAnchors)).toMatchObject({
      x: 100,
      staffTop: 266,
    })
    expect(interpolatePlayheadPosition(720, stackedAnchors)).toMatchObject({
      x: 275,
      staffTop: 266,
    })
  })
})

describe('Overlay theme colours', () => {
  const event = { voice: 'snare' as const, tick: 0, duration: PPQ }
  const exercise: Exercise = {
    id: 'overlay-theme',
    title: 'Overlay theme',
    tempo: 60,
    timeSignature: { beats: 4, beatValue: 4 },
    bars: 1,
    events: [event],
    tier: 'beginner',
    listenFirstAllowed: false,
    modes: ['playAlong'],
  }
  const layout: NotationLayout = {
    width: 500,
    height: 216,
    noteLayouts: [
      {
        event,
        x: 100,
        y: 100,
        bbox: { x: 94, y: 94, width: 12, height: 12 },
      },
    ],
    barBoundaries: [80, 480],
    barLayouts: [
      {
        startTick: 0,
        endTick: PPQ * 4,
        startX: 80,
        endX: 480,
        staffTop: 70,
        staffBottom: 150,
        contentTop: 70,
      },
    ],
    staffBounds: { top: 70, bottom: 150 },
  }

  it('uses semantic feedback colours', () => {
    const overlayRef = createRef<OverlayHandle>()
    const { container } = render(
      <Overlay exercise={exercise} layout={layout} ref={overlayRef} />,
    )

    act(() => overlayRef.current?.showFeedback(event, 'perfect'))

    expect(container.querySelector('rect')).toHaveAttribute(
      'fill',
      'rgb(var(--bhda-perfect))',
    )
    expect(container.querySelector('text')).toHaveAttribute(
      'fill',
      'rgb(var(--bhda-perfect))',
    )

    act(() => overlayRef.current?.showFeedback(event, 'good'))
    expect(container.querySelector('rect')).toHaveAttribute(
      'fill',
      'rgb(var(--bhda-good))',
    )
    expect(container.querySelector('text')).toHaveAttribute(
      'fill',
      'rgb(var(--bhda-good-text))',
    )
  })

  it('uses the theme accent for the playhead', () => {
    let animationFrame: FrameRequestCallback | undefined
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      animationFrame = callback
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const { container } = render(
      <Overlay
        clock={{ getElapsedTicks: () => 0 }}
        exercise={exercise}
        layout={layout}
      />,
    )

    act(() => animationFrame?.(0))

    expect(container.querySelector('line')).toHaveAttribute(
      'stroke',
      'rgb(var(--bhda-accent))',
    )
  })
})
