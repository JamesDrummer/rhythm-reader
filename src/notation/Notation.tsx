import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Overlay } from './Overlay'
import { buildPositionAnchors, interpolatePlayheadPosition } from './playhead'
import type {
  NotationCount,
  NotationLayout,
  NotationNoteLabel,
  NotationProps,
} from './types'
import { renderExerciseNotation } from './vexflowMapper'

const NOTE_LABEL_HEIGHT = 12
const ANNOTATION_CROP_MARGIN = 8
const COUNT_STAFF_MARGIN = 8
const EMPTY_NOTE_LABELS: readonly NotationNoteLabel[] = []
const EMPTY_COUNTS: readonly NotationCount[] = []

function fullViewBox(layout: NotationLayout) {
  return (
    layout.viewBox ?? {
      x: 0,
      y: 0,
      width: layout.width,
      height: layout.height,
    }
  )
}

function positionedNoteLabels(
  exercise: NotationProps['exercise'],
  layout: NotationLayout,
  noteLabels: readonly NotationNoteLabel[],
) {
  return noteLabels.flatMap((noteLabel) => {
    const event = exercise.events[noteLabel.eventIndex]
    const noteLayout = layout.noteLayouts.find(
      (candidate) => candidate.event === event,
    )
    if (!noteLayout) return []

    const barLayout = layout.barLayouts.find(
      (bar, index) =>
        event.tick >= bar.startTick &&
        (event.tick < bar.endTick || index === layout.barLayouts.length - 1),
    )
    const staffBottom = barLayout?.staffBottom ?? layout.staffBounds.bottom

    return [
      {
        ...noteLabel,
        x: noteLayout.x,
        y: Math.max(
          staffBottom + 24,
          noteLayout.bbox.y + noteLayout.bbox.height + 18,
        ),
      },
    ]
  })
}

function positionedCounts(
  exercise: NotationProps['exercise'],
  layout: NotationLayout,
  counts: readonly NotationCount[],
) {
  if (counts.length === 0) return []
  const anchors = buildPositionAnchors(exercise, layout)
  return counts.flatMap((count) => {
    const position = interpolatePlayheadPosition(count.tick, anchors)
    if (!position) return []

    return [
      {
        ...count,
        x: position.x,
        y:
          (position.staffTop ?? layout.staffBounds.top) -
          NOTE_LABEL_HEIGHT -
          COUNT_STAFF_MARGIN,
      },
    ]
  })
}

export function Notation({
  exercise,
  clock,
  overlayRef,
  noteLabels = EMPTY_NOTE_LABELS,
  counts = EMPTY_COUNTS,
  cropToContent = false,
  showClef = true,
  showTimeSignature = true,
  className,
  label = `${exercise.title} drum notation`,
}: NotationProps) {
  const outputRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<NotationLayout | null>(null)
  const hasOverlay = clock !== undefined || overlayRef !== undefined

  useLayoutEffect(() => {
    if (!outputRef.current) return
    const output = outputRef.current
    const render = () => {
      const narrow = output.clientWidth > 0 && output.clientWidth < 480
      const nextLayout = renderExerciseNotation(
        output,
        exercise,
        narrow ? 1 : exercise.bars,
        { cropToContent, showClef, showTimeSignature },
      )
      const labels = positionedNoteLabels(exercise, nextLayout, noteLabels)
      const countLabels = positionedCounts(exercise, nextLayout, counts)
      const mappedViewBox = fullViewBox(nextLayout)
      const labelledBottom = labels.length
        ? Math.max(...labels.map(({ y }) => y + NOTE_LABEL_HEIGHT)) +
          ANNOTATION_CROP_MARGIN
        : mappedViewBox.y + mappedViewBox.height
      const labelledTop = countLabels.length
        ? Math.min(...countLabels.map(({ y }) => y)) - ANNOTATION_CROP_MARGIN
        : mappedViewBox.y
      const croppedTop = Math.min(mappedViewBox.y, labelledTop)
      const croppedBottom = Math.max(
        mappedViewBox.y + mappedViewBox.height,
        labelledBottom,
      )
      const viewBox = cropToContent
        ? {
            ...mappedViewBox,
            y: croppedTop,
            height: croppedBottom - croppedTop,
          }
        : mappedViewBox

      output
        .querySelector('svg')
        ?.setAttribute(
          'viewBox',
          `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`,
        )
      setLayout({ ...nextLayout, viewBox })
    }

    render()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(render)
    observer.observe(output)
    return () => observer.disconnect()
  }, [counts, cropToContent, exercise, noteLabels, showClef, showTimeSignature])

  const labels = layout
    ? positionedNoteLabels(exercise, layout, noteLabels)
    : []
  const countLabels = layout ? positionedCounts(exercise, layout, counts) : []
  const viewBox = layout ? fullViewBox(layout) : undefined

  return (
    <div
      aria-label={label}
      className={cn(
        'relative w-full overflow-hidden rounded-xl bg-bhda-surface text-bhda-notation shadow-sm',
        className,
      )}
      role="img"
    >
      <div ref={outputRef} />
      {layout && hasOverlay && (
        <Overlay
          clock={clock}
          exercise={exercise}
          layout={layout}
          ref={overlayRef}
        />
      )}
      {layout && viewBox && (labels.length > 0 || countLabels.length > 0) && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full text-bhda-text/70"
          preserveAspectRatio="xMidYMid meet"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        >
          {labels.map(({ eventIndex, text, x, y }, labelIndex) => (
            <text
              data-note-label-index={eventIndex}
              dominantBaseline="hanging"
              fill="currentColor"
              fontFamily="Montserrat, sans-serif"
              fontSize="12"
              fontWeight="600"
              key={`${eventIndex}-${labelIndex}`}
              textAnchor="middle"
              x={x}
              y={y}
            >
              {text}
            </text>
          ))}
          {countLabels.map(({ text, tick, x, y }, countIndex) => (
            <text
              data-count-tick={tick}
              dominantBaseline="hanging"
              fill="currentColor"
              fontFamily="Montserrat, sans-serif"
              fontSize="12"
              fontWeight="600"
              key={`${tick}-${countIndex}`}
              textAnchor="middle"
              x={x}
              y={y}
            >
              {text}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}
