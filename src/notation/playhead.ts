import { ticksPerBar, type Exercise } from '@/model'
import type { NotationLayout } from './types'

export interface PositionAnchor {
  tick: number
  x: number
  staffTop?: number
  staffBottom?: number
}

export interface PlayheadPosition {
  x: number
  staffTop?: number
  staffBottom?: number
}

export function buildPositionAnchors(
  exercise: Exercise,
  layout: NotationLayout,
): PositionAnchor[] {
  const barTicks = ticksPerBar(exercise.timeSignature)
  const positionsByTick = new Map<
    number,
    { positions: number[]; staffTop?: number; staffBottom?: number }
  >()

  const barForTick = (tick: number) =>
    layout.barLayouts.find(
      (bar, index) =>
        tick >= bar.startTick &&
        (tick < bar.endTick || index === layout.barLayouts.length - 1),
    )

  layout.noteLayouts.forEach(({ event, x }) => {
    const bar = barForTick(event.tick)
    const entry = positionsByTick.get(event.tick) ?? {
      positions: [],
      staffTop: bar?.staffTop,
      staffBottom: bar?.staffBottom,
    }
    entry.positions.push(x)
    positionsByTick.set(event.tick, entry)
  })

  layout.barLayouts.forEach((bar, index) => {
    positionsByTick.set(bar.startTick, {
      positions: positionsByTick.get(bar.startTick)?.positions ?? [bar.startX],
      staffTop: bar.staffTop,
      staffBottom: bar.staffBottom,
    })
    const isLast = index === layout.barLayouts.length - 1
    positionsByTick.set(isLast ? bar.endTick : bar.endTick - 0.001, {
      positions: [bar.endX],
      staffTop: bar.staffTop,
      staffBottom: bar.staffBottom,
    })
  })

  if (layout.barLayouts.length === 0) {
    layout.barBoundaries.forEach((x, index) => {
      const tick = index * barTicks
      if (!positionsByTick.has(tick)) {
        positionsByTick.set(tick, { positions: [x] })
      }
    })
  }

  return [...positionsByTick.entries()]
    .map(([tick, { positions, staffBottom, staffTop }]) => ({
      tick,
      x:
        positions.reduce((sum, position) => sum + position, 0) /
        positions.length,
      staffTop,
      staffBottom,
    }))
    .toSorted((left, right) => left.tick - right.tick)
}

export function interpolatePlayheadPosition(
  tick: number,
  anchors: readonly PositionAnchor[],
): PlayheadPosition | null {
  if (tick < 0 || anchors.length === 0) return null
  if (tick <= anchors[0].tick) return anchors[0]

  const last = anchors.at(-1)
  if (!last) return null
  if (tick >= last.tick) return last

  const rightIndex = anchors.findIndex((anchor) => anchor.tick >= tick)
  const right = anchors[rightIndex]
  const left = anchors[rightIndex - 1]
  const progress = (tick - left.tick) / (right.tick - left.tick)
  return {
    x: left.x + (right.x - left.x) * progress,
    staffTop: progress < 1 ? left.staffTop : right.staffTop,
    staffBottom: progress < 1 ? left.staffBottom : right.staffBottom,
  }
}

export function interpolatePlayheadX(
  tick: number,
  anchors: readonly PositionAnchor[],
): number | null {
  return interpolatePlayheadPosition(tick, anchors)?.x ?? null
}
