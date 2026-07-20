import type { Ref } from 'react'
import type { Exercise, NoteEvent } from '@/model'

export interface LayoutBox {
  x: number
  y: number
  width: number
  height: number
}

export interface NoteLayout {
  event: NoteEvent
  x: number
  y: number
  bbox: LayoutBox
}

export interface NotationLayout {
  width: number
  height: number
  noteLayouts: NoteLayout[]
  /** Exercise start, each internal barline, and exercise end. */
  barBoundaries: number[]
  staffBounds: {
    top: number
    bottom: number
  }
}

export interface NotationClock {
  /** Current transport position in exercise ticks; negative during count-in. */
  getElapsedTicks(): number
}

export type NoteFeedback = 'perfect' | 'good' | 'miss'

export interface OverlayHandle {
  showFeedback(event: NoteEvent, feedback: NoteFeedback): void
  clearFeedback(event?: NoteEvent): void
}

export interface NotationProps {
  exercise: Exercise
  clock?: NotationClock
  overlayRef?: Ref<OverlayHandle>
  className?: string
  label?: string
}
