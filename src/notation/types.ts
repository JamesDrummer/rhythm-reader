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
  /** Visible SVG region. Defaults to the full logical notation dimensions. */
  viewBox?: LayoutBox
  noteLayouts: NoteLayout[]
  /** Exercise start, each internal barline, and exercise end. */
  barBoundaries: number[]
  barLayouts: {
    startTick: number
    endTick: number
    startX: number
    endX: number
    staffTop: number
    staffBottom: number
  }[]
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

export interface NotationNoteLabel {
  eventIndex: number
  text: string
}

export interface NotationCount {
  tick: number
  text: string
}

export interface NotationRenderOptions {
  cropToContent?: boolean
  showClef?: boolean
  showTimeSignature?: boolean
}

export interface NotationProps extends NotationRenderOptions {
  exercise: Exercise
  clock?: NotationClock
  overlayRef?: Ref<OverlayHandle>
  noteLabels?: readonly NotationNoteLabel[]
  counts?: readonly NotationCount[]
  className?: string
  label?: string
}
