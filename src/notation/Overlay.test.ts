import { describe, expect, it } from 'vitest'
import { interpolatePlayheadX } from './playhead'

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
})
