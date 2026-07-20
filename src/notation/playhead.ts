import { ticksPerBar, type Exercise } from '@/model'
import type { NotationLayout } from './types'

export interface PositionAnchor {
  tick: number
  x: number
}

export function buildPositionAnchors(
  exercise: Exercise,
  layout: NotationLayout,
): PositionAnchor[] {
  const barTicks = ticksPerBar(exercise.timeSignature)
  const xByTick = new Map<number, number[]>()

  layout.noteLayouts.forEach(({ event, x }) => {
    const positions = xByTick.get(event.tick) ?? []
    positions.push(x)
    xByTick.set(event.tick, positions)
  })

  layout.barBoundaries.forEach((x, index) => {
    const tick = index * barTicks
    if (!xByTick.has(tick)) xByTick.set(tick, [x])
  })

  return [...xByTick.entries()]
    .map(([tick, positions]) => ({
      tick,
      x:
        positions.reduce((sum, position) => sum + position, 0) /
        positions.length,
    }))
    .toSorted((left, right) => left.tick - right.tick)
}

export function interpolatePlayheadX(
  tick: number,
  anchors: readonly PositionAnchor[],
): number | null {
  if (tick < 0 || anchors.length === 0) return null
  if (tick <= anchors[0].tick) return anchors[0].x

  const last = anchors.at(-1)
  if (!last) return null
  if (tick >= last.tick) return last.x

  const rightIndex = anchors.findIndex((anchor) => anchor.tick >= tick)
  const right = anchors[rightIndex]
  const left = anchors[rightIndex - 1]
  const progress = (tick - left.tick) / (right.tick - left.tick)
  return left.x + (right.x - left.x) * progress
}
